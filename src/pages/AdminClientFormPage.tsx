"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, User, Users, BusFront, ArrowLeft, CreditCard, Edit3, X, PlusCircle, MinusCircle, Calculator, Info, DollarSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import ClientPaymentHistoryTable from '@/components/admin/clients/ClientPaymentHistoryTable';
import ClientPaymentDialog from '@/components/admin/clients/ClientPaymentDialog';
import { cn } from '@/lib/utils';

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [isEditMode, setIsEditMode] = useState(!clientIdFromParams);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<any>( Episcopal{
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: '', contract_number: '', tour_id: null,
    companions: [], total_amount: 0, total_paid: 0, status: 'confirmed',
    contractor_age: null, is_transport_only: false
  });
  
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [calculationDetails, setCalculationDetails] = useState<string[]>([]);

  const fetchData = async () => {
    setIsLoadingData(true);
    const [toursRes, busesRes] = await Promise.all([
      supabase.from('tours').select('*').order('title', { ascending: true }),
      supabase.from('buses').select('*')
    ]);
    
    if (toursRes.data) setAvailableTours(toursRes.data);
    if (busesRes.data) setAvailableBuses(busesRes.data);

    if (clientIdFromParams) {
      const { data: client } = await supabase.from('clients').select('*').eq('id', clientIdFromParams).single();
      if (client) {
        setFormData(client);
        const { data: seats } = await supabase.from('tour_seat_assignments').select('seat_number').eq('client_id', clientIdFromParams);
        if (seats) setClientSelectedSeats(seats.map(s => s.seat_number));
      }
    } else {
      setFormData((p:any) => ({...p, contract_number: uuidv4().substring(0, 8).toUpperCase()}));
    }
    setIsLoadingData(false);
  };

  useEffect(() => { fetchData(); }, [clientIdFromParams]);

  const selectedTour = useMemo(() => availableTours.find(t => t.id === formData.tour_id), [formData.tour_id, availableTours]);
  const currentBus = useMemo(() => selectedTour?.bus_id ? availableBuses.find(b => b.id === selectedTour.bus_id) : null, [selectedTour, availableBuses]);

  useEffect(() => {
    if (!selectedTour || !isEditMode) return;

    const totalPax = 1 + formData.companions.length;
    if (totalPax === 0) return;

    if (formData.is_transport_only) {
      const price = selectedTour.transport_only_price || 0;
      const total = totalPax * price;
      setFormData((p: any) => ({ ...p, total_amount: total }));
      setCalculationDetails([`${totalPax} Pax en Solo Traslado ($${price} c/u)`]);
    } else {
      let adultsCount = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
      let childrenCount = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
      
      formData.companions.forEach((c: any) => { 
        if (c.age !== null && c.age <= 12) childrenCount++;
        else adultsCount++;
      });

      const neededRooms = Math.ceil(adultsCount / 4) || (adultsCount === 0 && childrenCount > 0 ? 1 : 0);
      let tempAdults = adultsCount;
      let tempChildren = childrenCount;
      let calculatedTotal = 0;
      let details: string[] = [];

      for (let i = 0; i < neededRooms; i++) {
        const paxInRoom = Math.min(4, tempAdults + tempChildren);
        const adultsInRoom = Math.min(paxInRoom, tempAdults);
        const childrenInRoom = paxInRoom - adultsInRoom;

        if ((paxInRoom === 1 && adultsInRoom === 1) || (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1)) {
          const price = selectedTour.selling_price_double_occupancy;
          calculatedTotal += (2 * price);
          details.push(`Hab. ${i+1}: Cargo base Doble (2 Adultos x $${price})`);
        } else {
          let occPrice = selectedTour.selling_price_quad_occupancy;
          let label = "Cuádruple";
          if (paxInRoom === 3) { occPrice = selectedTour.selling_price_triple_occupancy; label = "Triple"; }
          else if (paxInRoom === 2) { occPrice = selectedTour.selling_price_double_occupancy; label = "Doble"; }

          if (adultsInRoom > 0) {
            calculatedTotal += (adultsInRoom * occPrice);
            details.push(`Hab. ${i+1}: ${adultsInRoom} Adulto(s) en ${label} ($${occPrice} c/u)`);
          }
          if (childrenInRoom > 0) {
            calculatedTotal += (childrenInRoom * selectedTour.selling_price_child);
            details.push(`Hab. ${i+1}: ${childrenInRoom} Niño(s) ($${selectedTour.selling_price_child} c/u)`);
          }
        }
        tempAdults -= adultsInRoom;
        tempChildren -= childrenInRoom;
      }
      setFormData((p: any) => ({ ...p, total_amount: calculatedTotal }));
      setCalculationDetails(details);
    }
  }, [formData.tour_id, formData.companions, formData.contractor_age, formData.is_transport_only, selectedTour, isEditMode]);

  const handleSave = async () => {
    const totalPax = 1 + formData.companions.length;
    if (clientSelectedSeats.length !== totalPax) {
      toast.error(`Debes seleccionar exactamente ${totalPax} asientos.`);
      return;
    }

    setIsSaving(true);
    try {
      const clientData = { 
        ...formData, 
        number_of_people: totalPax,
        updated_at: new Date().toISOString() 
      };
      let finalClientId = clientIdFromParams;

      if (clientIdFromParams) {
        await supabase.from('clients').update(clientData).eq('id', clientIdFromParams);
      } else {
        const { data } = await supabase.from('clients').insert(clientData).select('id').single();
        finalClientId = data?.id;
      }

      if (finalClientId) {
        await supabase.from('tour_seat_assignments').delete().eq('client_id', finalClientId);
        const assignments = clientSelectedSeats.map(s => ({
          tour_id: formData.tour_id, client_id: finalClientId, seat_number: s, status: 'booked'
        }));
        await supabase.from('tour_seat_assignments').insert(assignments);
      }

      toast.success("Reserva guardada con éxito.");
      if (!clientIdFromParams) navigate('/admin/clients');
      else { setIsEditMode(false); fetchData(); }
    } catch (err) {
      toast.error("Error al procesar la reserva.");
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionLoading || isLoadingData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-rosa-mexicano" /></div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientIdFromParams ? "Ficha de Cliente" : "Registrar Nuevo Cliente"}>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Link></Button>
            {clientIdFromParams && (
              <Button onClick={() => setIsEditMode(!isEditMode)} variant={isEditMode ? "destructive" : "default"} className={!isEditMode ? "bg-blue-600" : ""}>
                {isEditMode ? <><X className="h-4 w-4 mr-2" /> Cancelar Edición</> : <><Edit3 className="h-4 w-4 mr-2" /> Editar Datos</>}
              </Button>
            )}
          </div>
        </AdminHeader>

        <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b"><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-rosa-mexicano" /> Datos del Titular</CardTitle></CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1"><Label>Nombre(s)</Label><Input value={formData.first_name} disabled={!isEditMode} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Apellidos</Label><Input value={formData.last_name} disabled={!isEditMode} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
                   <div className="space-y-1"><Label>WhatsApp</Label><Input value={formData.phone} disabled={!isEditMode} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email} disabled={!isEditMode} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Identificación</Label><Input value={formData.identification_number} disabled={!isEditMode} onChange={e => setFormData({...formData, identification_number: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} disabled={!isEditMode} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b"><CardTitle className="text-lg flex items-center gap-2"><BusFront className="h-5 w-5 text-rosa-mexicano" /> Asignación de Viaje</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Tour Seleccionado</Label>
                    <Select value={formData.tour_id || ''} disabled={!isEditMode} onValueChange={v => setFormData({...formData, tour_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Elegir tour..." /></SelectTrigger>
                      <SelectContent>{availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {selectedTour?.transport_only_price > 0 && (
                    <div className="flex items-center justify-between p-4 bg-rosa-mexicano/5 rounded-xl border border-rosa-mexicano/10">
                      <div className="space-y-0.5">
                        <Label className="text-base font-bold flex items-center gap-2"><BusFront className="h-4 w-4 text-rosa-mexicano" /> Solo Traslado</Label>
                        <p className="text-xs text-muted-foreground">Omitir costos de hotelería para este cliente.</p>
                      </div>
                      <Switch disabled={!isEditMode} checked={formData.is_transport_only} onCheckedChange={val => setFormData({...formData, is_transport_only: val})} />
                    </div>
                  )}

                  {formData.tour_id && (
                    <div className="pt-4 border-t">
                      <Label className="font-bold mb-4 block">Mapa de Asientos (Seleccionados: {clientSelectedSeats.length} / Total: {1 + formData.companions.length})</Label>
                      <TourSeatMap 
                        tourId={formData.tour_id} busCapacity={selectedTour?.bus_capacity} courtesies={selectedTour?.courtesies} 
                        seatLayoutJson={currentBus?.seat_layout_json} onSeatsSelected={setClientSelectedSeats} 
                        initialSelectedSeats={clientSelectedSeats} readOnly={!isEditMode} 
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b"><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-rosa-mexicano" /> Acompañantes</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {formData.companions.map((comp: any, idx: number) => (
                    <div key={comp.id} className="grid grid-cols-3 gap-2">
                      <Input className="col-span-2" placeholder="Nombre" value={comp.name} disabled={!isEditMode} onChange={e => {
                        const newC = [...formData.companions]; newC[idx].name = e.target.value; setFormData({...formData, companions: newC});
                      }} />
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Edad" value={comp.age || ''} disabled={!isEditMode} onChange={e => {
                          const newC = [...formData.companions]; newC[idx].age = parseInt(e.target.value) || null; setFormData({...formData, companions: newC});
                        }} />
                        {isEditMode && <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, companions: formData.companions.filter((_:any, i:number) => i !== idx)})} className="text-red-500"><MinusCircle className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                  ))}
                  {isEditMode && <Button variant="outline" onClick={() => setFormData({...formData, companions: [...formData.companions, {id: uuidv4(), name: '', age: null}]})} className="w-full"><PlusCircle className="h-4 w-4 mr-2" /> Añadir Acompañante</Button>}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gray-900 text-white shadow-xl sticky top-8">
                <CardHeader className="border-b border-white/10"><CardTitle className="text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-rosa-mexicano" /> Resumen del Contrato</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-4">
                  
                  {isEditMode && calculationDetails.length > 0 && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1 mb-4">
                      <p className="text-[10px] font-black text-rosa-mexicano uppercase tracking-widest mb-2 flex items-center gap-1"><Calculator className="h-3 w-3" /> Desglose sugerido</p>
                      {calculationDetails.map((d, i) => (
                        <p key={i} className="text-[10px] opacity-70 italic">• {d}</p>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-gray-400">Inversión Total ($)</Label>
                    <Input type="number" value={formData.total_amount} disabled={!isEditMode} onChange={e => setFormData({...formData, total_amount: parseFloat(e.target.value)||0})} className="bg-white/10 border-white/20 text-white text-xl font-bold" />
                  </div>

                  <div className="flex justify-between text-green-400"><span>Abonado Real:</span><span className="font-bold">${formData.total_paid.toLocaleString()}</span></div>
                  
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-gray-400">Saldo Pendiente:</span>
                    <span className="text-3xl font-black text-yellow-400">${(formData.total_amount - formData.total_paid).toLocaleString()}</span>
                  </div>

                  {!isEditMode && (
                    <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full bg-green-600 hover:bg-green-700 h-12 font-bold mt-4">
                      <DollarSign className="mr-2 h-4 w-4" /> Registrar Abono
                    </Button>
                  )}

                  {isEditMode && (
                    <Button onClick={handleSave} disabled={isSaving} className="w-full bg-rosa-mexicano h-12 font-bold mt-4">
                      {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar Reserva
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {clientIdFromParams && <ClientPaymentHistoryTable clientId={clientIdFromParams} onPaymentsUpdated={fetchData} />}
            </div>
          </div>
        </main>
      </div>

      {clientIdFromParams && (
        <ClientPaymentDialog
          isOpen={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          client={{
            ...formData,
            remaining_payment: formData.total_amount - formData.total_paid
          }}
          onPaymentRegistered={fetchData}
        />
      )}
    </div>
  );
};

export default AdminClientFormPage;