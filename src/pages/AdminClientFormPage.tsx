"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, MapPin, User, Users, BusFront, ArrowLeft, CreditCard } from 'lucide-react';
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

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<any>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    identification_number: '',
    contract_number: '',
    tour_id: null,
    companions: [],
    total_amount: 0,
    total_paid: 0,
    status: 'confirmed',
    contractor_age: null,
    is_transport_only: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0); // Para refrescar tabla tras cambios
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [roomsCount, setRoomsCount] = useState(0);
  const [breakdownDetails, setBreakdownDetails] = useState<string[]>([]);

  const fetchClientData = async () => {
    if (!clientIdFromParams) return;
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientIdFromParams)
      .single();

    if (error) {
      toast.error("Error al cargar los datos del cliente.");
      navigate('/admin/clients');
      return;
    }

    if (client) {
      setFormData({
        ...client,
        companions: client.companions || [],
        is_transport_only: client.is_transport_only || false
      });

      const { data: seats } = await supabase
        .from('tour_seat_assignments')
        .select('seat_number')
        .eq('client_id', clientIdFromParams);
      
      if (seats) setClientSelectedSeats(seats.map(s => s.seat_number));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      const [toursRes, busesRes] = await Promise.all([
        supabase.from('tours').select('*').order('title', { ascending: true }),
        supabase.from('buses').select('*')
      ]);
      
      if (toursRes.data) setAvailableTours(toursRes.data);
      if (busesRes.data) setAvailableBuses(busesRes.data);

      if (clientIdFromParams) {
        await fetchClientData();
      } else {
        setFormData((prev: any) => ({
          ...prev,
          contract_number: uuidv4().substring(0, 8).toUpperCase()
        }));
      }
      setIsLoadingData(false);
    };
    fetchData();
  }, [clientIdFromParams, navigate]);

  const selectedTour = useMemo(() => 
    availableTours.find(t => t.id === formData.tour_id), 
    [formData.tour_id, availableTours]
  );

  const currentBus = useMemo(() => 
    selectedTour?.bus_id ? availableBuses.find(b => b.id === selectedTour.bus_id) : null, 
    [selectedTour, availableBuses]
  );

  useEffect(() => {
    if (!selectedTour || isLoadingData) return;
    
    const totalPax = clientSelectedSeats.length;
    let newTotal = 0;
    let newRooms = 0;
    let newDetails: string[] = [];

    if (totalPax > 0) {
      if (formData.is_transport_only) {
        const price = selectedTour.transport_only_price || 0;
        newTotal = totalPax * price;
        newRooms = 0;
        newDetails = [`${totalPax} Pax en Solo Traslado ($${price} c/u)`];
      } else {
        newRooms = Math.ceil(totalPax / 4);
        let adultsCount = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
        let childrenCount = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
        
        formData.companions.forEach((c: any) => { 
          if (c.age !== null && c.age <= 12) childrenCount++;
          else adultsCount++;
        });

        let tempAdults = adultsCount;
        let tempChildren = childrenCount;

        for (let i = 0; i < newRooms; i++) {
          const paxInRoom = Math.min(4, tempAdults + tempChildren);
          const adultsInRoom = Math.min(paxInRoom, tempAdults);
          const childrenInRoom = paxInRoom - adultsInRoom;

          if ((paxInRoom === 1 && adultsInRoom === 1) || (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1)) {
            const price = selectedTour.selling_price_double_occupancy;
            newTotal += (2 * price);
            newDetails.push(`Hab. ${i+1}: Cargo Doble ($${price} c/u)`);
          } else {
            let occPrice = selectedTour.selling_price_quad_occupancy;
            let label = "Cuádruple";
            if (paxInRoom === 3) { occPrice = selectedTour.selling_price_triple_occupancy; label = "Triple"; }
            else if (paxInRoom === 2) { occPrice = selectedTour.selling_price_double_occupancy; label = "Doble"; }

            if (adultsInRoom > 0) {
              newTotal += (adultsInRoom * occPrice);
              newDetails.push(`Hab. ${i+1}: ${adultsInRoom} Adulto(s) en ${label} ($${occPrice} c/u)`);
            }
            if (childrenInRoom > 0) {
              newTotal += (childrenInRoom * selectedTour.selling_price_child);
              newDetails.push(`Hab. ${i+1}: ${childrenInRoom} Niño(s) ($${selectedTour.selling_price_child} c/u)`);
            }
          }
          tempAdults -= adultsInRoom;
          tempChildren -= childrenInRoom;
        }
      }
    }

    setRoomsCount(newRooms);
    setBreakdownDetails(newDetails);
    setFormData((prev: any) => ({ ...prev, total_amount: newTotal }));

    const neededComps = Math.max(0, totalPax - 1);
    if (neededComps !== formData.companions.length) {
      setFormData((p: any) => {
        let newComps = [...p.companions];
        if (neededComps > newComps.length) {
          const toAdd = neededComps - newComps.length;
          newComps = [...newComps, ...Array.from({ length: toAdd }, () => ({ id: uuidv4(), name: '', age: null }))];
        } else {
          newComps = newComps.slice(0, neededComps);
        }
        return { ...p, companions: newComps };
      });
    }
  }, [clientSelectedSeats.length, formData.contractor_age, formData.companions, formData.is_transport_only, selectedTour, isLoadingData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tour_id) return toast.error("Selecciona un tour.");
    if (clientSelectedSeats.length === 0) return toast.error("Selecciona asientos.");

    setIsSubmitting(true);
    try {
      const dataToSave = { 
        ...formData, 
        number_of_people: clientSelectedSeats.length,
        room_details: formData.is_transport_only ? { transport_only: true } : { rooms_count: roomsCount },
        updated_at: new Date().toISOString()
      };

      let currentId = clientIdFromParams;

      if (clientIdFromParams) {
        const { error } = await supabase.from('clients').update(dataToSave).eq('id', clientIdFromParams);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('clients').insert(dataToSave).select('id').single();
        if (error) throw error;
        currentId = data.id;
      }

      if (currentId) {
        await supabase.from('tour_seat_assignments').delete().eq('client_id', currentId);
        await supabase.from('tour_seat_assignments').insert(clientSelectedSeats.map(s => ({ 
          tour_id: formData.tour_id, 
          seat_number: s, 
          status: 'booked', 
          client_id: currentId 
        })));
      }

      toast.success(clientIdFromParams ? "Cliente actualizado." : "Reserva creada con éxito.");
      navigate('/admin/clients');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentsUpdated = () => {
    setRefreshHistoryKey(p => p + 1);
    fetchClientData(); // Recargar datos del cliente para ver el total_paid actualizado
  };

  if (sessionLoading || isLoadingData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientIdFromParams ? "Editar Cliente" : "Registro Manual de Cliente"}>
           <Button variant="outline" asChild><Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Link></Button>
        </AdminHeader>

        <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-rosa-mexicano" /> Datos del Contratante</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nombre(s)</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>Apellido(s)</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
                  <div className="space-y-2"><Label>WhatsApp</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
                  <div className="space-y-2"><Label>Identificación</Label><Input value={formData.identification_number} onChange={e => setFormData({...formData, identification_number: e.target.value})} /></div>
                  <div className="md:col-span-2 space-y-2"><Label>Dirección</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} /></div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-rosa-mexicano" /> Selección de Viaje y Asientos</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Destino / Tour</Label>
                    <Select value={formData.tour_id} onValueChange={v => setFormData({...formData, tour_id: v})}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Selecciona un tour" /></SelectTrigger>
                      <SelectContent>{availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {selectedTour && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-rosa-mexicano/5 rounded-xl border border-rosa-mexicano/10">
                        <div className="space-y-1">
                          <Label className="text-base font-bold flex items-center gap-2"><BusFront className="h-5 w-5 text-rosa-mexicano" /> Solo Traslado</Label>
                          <p className="text-xs text-muted-foreground">Activa si no requiere hotel.</p>
                        </div>
                        <Switch checked={formData.is_transport_only} onCheckedChange={val => setFormData({...formData, is_transport_only: val})} />
                      </div>
                      <div className="pt-4 border-t">
                        <Label className="mb-4 block font-bold">Mapa de Asientos ({clientSelectedSeats.length} pax)</Label>
                        <TourSeatMap 
                          tourId={selectedTour.id} 
                          busCapacity={selectedTour.bus_capacity} 
                          courtesies={selectedTour.courtesies} 
                          seatLayoutJson={currentBus?.seat_layout_json} 
                          onSeatsSelected={setClientSelectedSeats} 
                          initialSelectedSeats={clientSelectedSeats}
                          currentClientId={clientIdFromParams}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {clientIdFromParams && (
                <ClientPaymentHistoryTable 
                  clientId={clientIdFromParams} 
                  key={refreshHistoryKey} 
                  onPaymentsUpdated={handlePaymentsUpdated} 
                />
              )}
            </div>

            <div className="space-y-6">
              <Card className="bg-gray-900 text-white shadow-xl sticky top-8">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-rosa-mexicano" /> Resumen de Contrato</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                    <span className="text-xs font-bold text-gray-400">HABITACIONES</span>
                    <span className="text-3xl font-black text-rosa-mexicano">{roomsCount}</span>
                  </div>
                  <div className="space-y-2">
                    {breakdownDetails.map((d, i) => (
                      <div key={i} className="text-[11px] opacity-80 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rosa-mexicano mt-1 shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400">TOTAL CONTRATO:</span>
                      <span className="text-white">${formData.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-400">TOTAL ABONADO:</span>
                      <span className="text-green-400">${formData.total_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">PENDIENTE:</span>
                      <span className="text-4xl font-black text-yellow-400">${(formData.total_amount - formData.total_paid).toLocaleString()}</span>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting || !selectedTour} className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 h-14 text-lg font-black rounded-xl">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    {clientIdFromParams ? "Actualizar Contrato" : "Confirmar Contrato"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;