"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, User, Users, BusFront, ArrowLeft, CreditCard, Edit3, X, PlusCircle, MinusCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [isEditMode, setIsEditMode] = useState(!clientIdFromParams);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: '', contract_number: '', tour_id: null,
    companions: [], total_amount: 0, total_paid: 0, status: 'confirmed',
    contractor_age: null, is_transport_only: false
  });
  
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const clientData = { ...formData, updated_at: new Date().toISOString() };
      let finalClientId = clientIdFromParams;

      if (clientIdFromParams) {
        await supabase.from('clients').update(clientData).eq('id', clientIdFromParams);
      } else {
        const { data } = await supabase.from('clients').insert(clientData).select('id').single();
        finalClientId = data?.id;
      }

      // Actualizar asientos
      if (finalClientId) {
        await supabase.from('tour_seat_assignments').delete().eq('client_id', finalClientId);
        const assignments = clientSelectedSeats.map(s => ({
          tour_id: formData.tour_id, client_id: finalClientId, seat_number: s, status: 'booked'
        }));
        await supabase.from('tour_seat_assignments').insert(assignments);
      }

      toast.success("Información guardada.");
      if (!clientIdFromParams) navigate('/admin/clients');
      else { setIsEditMode(false); fetchData(); }
    } catch (err) {
      toast.error("Error al guardar.");
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
              {/* DATOS PERSONALES */}
              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b"><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-rosa-mexicano" /> Datos del Titular</CardTitle></CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1"><Label>Nombre(s)</Label><Input value={formData.first_name} disabled={!isEditMode} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Apellidos</Label><Input value={formData.last_name} disabled={!isEditMode} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
                   <div className="space-y-1"><Label>WhatsApp</Label><Input value={formData.phone} disabled={!isEditMode} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Email</Label><Input value={formData.email} disabled={!isEditMode} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Identificación</Label><Input value={formData.identification_number} disabled={!isEditMode} onChange={e => setFormData({...formData, identification_number: e.target.value})} /></div>
                   <div className="space-y-1"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} disabled={!isEditMode} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
                </CardContent>
              </Card>

              {/* VIAJE Y ASIENTOS */}
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

                  {formData.tour_id && (
                    <div className="pt-4 border-t">
                      <Label className="font-bold mb-4 block">Selección de Asientos ({clientSelectedSeats.length} pax)</Label>
                      <TourSeatMap 
                        tourId={formData.tour_id} busCapacity={selectedTour?.bus_capacity} courtesies={selectedTour?.courtesies} 
                        seatLayoutJson={currentBus?.seat_layout_json} onSeatsSelected={setClientSelectedSeats} 
                        initialSelectedSeats={clientSelectedSeats} readOnly={!isEditMode} 
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ACOMPAÑANTES */}
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

            {/* BARRA LATERAL FINANCIERA */}
            <div className="space-y-6">
              <Card className="bg-gray-900 text-white shadow-xl sticky top-8">
                <CardHeader className="border-b border-white/10"><CardTitle className="text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-rosa-mexicano" /> Resumen Financiero</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Inversión Total ($)</Label>
                    <Input type="number" value={formData.total_amount} disabled={!isEditMode} onChange={e => setFormData({...formData, total_amount: parseFloat(e.target.value)||0})} className="bg-white/10 border-white/20 text-white text-xl font-bold" />
                  </div>
                  <div className="flex justify-between text-green-400"><span>Abonado Real:</span><span className="font-bold">${formData.total_paid.toLocaleString()}</span></div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-gray-400">Pendiente:</span>
                    <span className="text-3xl font-black text-yellow-400">${(formData.total_amount - formData.total_paid).toLocaleString()}</span>
                  </div>
                  {isEditMode && (
                    <Button onClick={handleSave} disabled={isSaving} className="w-full bg-rosa-mexicano h-12 font-bold mt-4">
                      {isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar Cambios
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {clientIdFromParams && <ClientPaymentHistoryTable clientId={clientIdFromParams} onPaymentsUpdated={fetchData} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;