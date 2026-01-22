"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, Info, Users, Handshake, Armchair, MapPin, DollarSign, CalendarDays } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { TourProviderService, AvailableProvider, SeatLayout } from '@/types/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientPaymentHistoryTable from '@/components/admin/clients/ClientPaymentHistoryTable';

interface Companion {
  id: string;
  name: string;
  age: number | null;
}

interface RoomDetails {
  double_rooms: number;
  triple_rooms: number;
  quad_rooms: number;
}

interface Client {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  contract_number: string;
  identification_number: string | null;
  tour_id: string | null;
  bus_route_id: string | null;
  number_of_people: number;
  companions: Companion[];
  extra_services: TourProviderService[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  contractor_age: number | null;
  room_details: RoomDetails;
}

interface Tour {
  id: string;
  title: string;
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number;
  bus_id: string | null;
  courtesies: number;
  bus_capacity: number;
}

interface Bus {
  id: string;
  name: string;
  total_capacity: number;
  seat_layout_json: SeatLayout | null;
}

const allocateRoomsForPeople = (totalPeople: number): RoomDetails => {
  let double = 0, triple = 0, quad = 0, remaining = totalPeople;
  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };
  quad = Math.floor(remaining / 4);
  remaining %= 4;
  if (remaining === 3) triple++;
  else if (remaining === 2) double++;
  else if (remaining === 1) { if (quad > 0) { quad--; triple++; double++; } else { double++; } }
  return { double_rooms: double, triple_rooms: triple, quad_rooms: quad };
};

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<Client>({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    contract_number: uuidv4().substring(0, 8).toUpperCase(),
    identification_number: null, tour_id: null, bus_route_id: null,
    number_of_people: 0, companions: [], extra_services: [],
    total_amount: 0, advance_payment: 0, total_paid: 0, status: 'pending',
    contractor_age: null, room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);

  useEffect(() => {
    const fetchDependencies = async () => {
      const [toursRes, providersRes, busesRes] = await Promise.all([
        supabase.from('tours').select('*').order('title', { ascending: true }),
        supabase.from('providers').select('*').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('buses').select('*').order('name', { ascending: true })
      ]);

      if (toursRes.data) setAvailableTours(toursRes.data);
      if (providersRes.data) setAvailableProviders(providersRes.data);
      if (busesRes.data) setAvailableBuses(busesRes.data);
    };
    fetchDependencies();
  }, []);

  useEffect(() => {
    const fetchClientData = async () => {
      if (clientIdFromParams) {
        setLoadingInitialData(true);
        const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientIdFromParams).single();
        if (clientData) {
          setFormData({
            ...clientData,
            companions: clientData.companions || [],
            extra_services: clientData.extra_services || []
          });
          const { data: seats } = await supabase.from('tour_seat_assignments').select('seat_number').eq('client_id', clientData.id);
          setClientSelectedSeats(seats?.map(s => s.seat_number) || []);
        }
      }
      setLoadingInitialData(false);
    };

    if (!sessionLoading) fetchClientData();
  }, [clientIdFromParams, sessionLoading]);

  const selectedTour = useMemo(() => {
    return availableTours.find(t => t.id === formData.tour_id) || null;
  }, [formData.tour_id, availableTours]);

  const currentBus = useMemo(() => {
    return selectedTour?.bus_id ? availableBuses.find(b => b.id === selectedTour.bus_id) : null;
  }, [selectedTour, availableBuses]);

  // Sincronizar número de acompañantes con asientos seleccionados
  useEffect(() => {
    const totalPeople = clientSelectedSeats.length;
    if (totalPeople > 0) {
      const neededCompanions = totalPeople - 1;
      setFormData(prev => {
        let newCompanions = [...prev.companions];
        if (neededCompanions > newCompanions.length) {
          const toAdd = neededCompanions - newCompanions.length;
          for(let i=0; i<toAdd; i++) newCompanions.push({ id: uuidv4(), name: '', age: null });
        } else if (neededCompanions < newCompanions.length) {
          newCompanions = newCompanions.slice(0, neededCompanions);
        }
        return { ...prev, companions: newCompanions, number_of_people: totalPeople };
      });
    }
  }, [clientSelectedSeats.length]);

  // Cálculos de precios y habitaciones
  useEffect(() => {
    if (!selectedTour) return;

    let adults = (formData.contractor_age === null || formData.contractor_age >= 12) ? 1 : 0;
    let children = (formData.contractor_age !== null && formData.contractor_age < 12) ? 1 : 0;
    formData.companions.forEach(c => { (c.age === null || c.age >= 12) ? adults++ : children++; });

    const rd = allocateRoomsForPeople(adults);
    const total = (rd.double_rooms * selectedTour.selling_price_double_occupancy * 2) +
                  (rd.triple_rooms * selectedTour.selling_price_triple_occupancy * 3) +
                  (rd.quad_rooms * selectedTour.selling_price_quad_occupancy * 4) +
                  (children * selectedTour.selling_price_child) +
                  (formData.extra_services || []).reduce((sum, s) => sum + (s.selling_price_per_unit_snapshot * s.quantity), 0);

    setFormData(prev => ({ ...prev, total_amount: total, room_details: rd }));
  }, [formData.companions, formData.contractor_age, formData.extra_services, selectedTour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tour_id) { toast.error('Selecciona un tour.'); return; }
    if (clientSelectedSeats.length === 0) { toast.error('Selecciona al menos un asiento.'); return; }

    setIsSubmitting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    const clientData = {
      ...formData,
      user_id: authUser?.id,
      updated_at: new Date().toISOString(),
    };

    let savedId = clientIdFromParams;
    if (clientIdFromParams) {
      await supabase.from('clients').update(clientData).eq('id', clientIdFromParams);
    } else {
      const { data } = await supabase.from('clients').insert(clientData).select('id').single();
      savedId = data?.id;
    }

    if (savedId) {
      await supabase.from('tour_seat_assignments').delete().eq('client_id', savedId).eq('tour_id', formData.tour_id);
      await supabase.from('tour_seat_assignments').insert(clientSelectedSeats.map(s => ({ 
        tour_id: formData.tour_id, seat_number: s, status: 'booked', client_id: savedId 
      })));
    }

    toast.success('Cliente registrado correctamente.');
    navigate('/admin/clients');
    setIsSubmitting(false);
  };

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientIdFromParams ? 'Editar Cliente' : 'Nueva Reserva Directa'} />
        <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECCIÓN 1: SELECCIÓN DEL VIAJE */}
            <Card className="border-t-4 border-rosa-mexicano shadow-lg">
              <CardHeader className="bg-gray-50/50">
                <CardTitle className="text-xl flex items-center gap-2">
                  <MapPin className="text-rosa-mexicano h-5 w-5" /> 1. Selección del Viaje
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Elegir Tour</Label>
                    <Select value={formData.tour_id || 'none'} onValueChange={v => setFormData({...formData, tour_id: v === 'none' ? null : v})}>
                      <SelectTrigger className="h-12 text-lg font-bold">
                        <SelectValue placeholder="Busca un tour activo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Seleccionar Tour --</SelectItem>
                        {availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTour && (
                    <div className="p-4 bg-muted rounded-xl grid grid-cols-2 gap-4 text-sm font-medium">
                      <div><p className="opacity-60 text-[10px] uppercase">Capacidad</p><p className="text-lg">{selectedTour.bus_capacity} pax</p></div>
                      <div><p className="opacity-60 text-[10px] uppercase">Coordinadores</p><p className="text-lg">{selectedTour.courtesies}</p></div>
                    </div>
                  )}
                </div>

                {selectedTour && (
                  <div className="pt-6 border-t animate-in fade-in duration-500">
                    <Label className="text-lg font-bold mb-4 flex items-center gap-2"><Armchair className="text-rosa-mexicano h-5 w-5" /> Selección de Asientos</Label>
                    <div className="max-w-3xl mx-auto">
                      <TourSeatMap 
                        tourId={selectedTour.id} 
                        busCapacity={selectedTour.bus_capacity} 
                        courtesies={selectedTour.courtesies} 
                        seatLayoutJson={currentBus?.seat_layout_json || null} 
                        onSeatsSelected={setClientSelectedSeats} 
                        initialSelectedSeats={clientSelectedSeats} 
                        currentClientId={clientIdFromParams} 
                      />
                    </div>
                    {clientSelectedSeats.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-bold">Asientos elegidos ({clientSelectedSeats.length}):</span>
                        {clientSelectedSeats.sort((a,b)=>a-b).map(s => <Badge key={s} className="bg-rosa-mexicano">{s}</Badge>)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECCIÓN 2: DATOS DEL CLIENTE Y PAGOS */}
            {clientSelectedSeats.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-2 space-y-8">
                  <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-rosa-mexicano" /> Datos del Contratante</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1"><Label>Nombre(s)</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required /></div>
                      <div className="space-y-1"><Label>Apellido(s)</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required /></div>
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
                      <div className="space-y-1"><Label>WhatsApp</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                      <div className="space-y-1"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
                      <div className="space-y-1"><Label>Identificación (Opcional)</Label><Input value={formData.identification_number || ''} onChange={e => setFormData({...formData, identification_number: e.target.value})} /></div>
                      <div className="md:col-span-2 space-y-1"><Label>Domicilio</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                    </CardContent>
                  </Card>

                  {formData.companions.length > 0 && (
                    <Card className="shadow-lg">
                      <CardHeader><CardTitle className="text-lg">Acompañantes</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {formData.companions.map((c, idx) => (
                          <div key={c.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl items-end">
                            <div className="md:col-span-2 space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Pasajero {idx + 2}</Label><Input value={c.name} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} /></div>
                            <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-gray-400">Edad</Label><Input type="number" value={c.age || ''} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, age: parseInt(e.target.value) || null} : x)})} /></div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-8">
                  <Card className="bg-gray-900 text-white shadow-xl">
                    <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-rosa-mexicano" /> Resumen Financiero</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm opacity-60"><span>Monto Total:</span><span className="font-bold">${formData.total_amount.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm text-green-400"><span>Abonado:</span><span className="font-bold">${formData.total_paid.toLocaleString()}</span></div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                          <span className="font-bold">PENDIENTE:</span>
                          <span className="text-3xl font-black text-red-500">${(formData.total_amount - formData.total_paid).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="space-y-2 pt-4">
                        <Label className="text-white opacity-60 text-xs">Estado del Contrato</Label>
                        <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                          <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="confirmed">Confirmada / Pagado</SelectItem>
                            <SelectItem value="cancelled">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col gap-3">
                    <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano h-14 text-lg font-black shadow-xl">
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                      {clientIdFromParams ? 'Actualizar Reserva' : 'Confirmar Reserva'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/admin/clients')} className="h-12 bg-white">Cancelar</Button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {clientIdFromParams && (
            <div className="mt-12">
              <ClientPaymentHistoryTable clientId={clientIdFromParams} onPaymentsUpdated={() => {}} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;