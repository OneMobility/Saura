"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, FileText, Info, Users, Handshake, Armchair } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { TourProviderService, AvailableProvider, SeatLayout } from '@/types/shared';
import { Badge } from '@/components/ui/badge';
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
    number_of_people: 1, companions: [], extra_services: [],
    total_amount: 0, advance_payment: 0, total_paid: 0, status: 'pending',
    contractor_age: null, room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [roomDetails, setRoomDetails] = useState<RoomDetails>({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });

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
          setRoomDetails(clientData.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });

          // Fetch assigned seats
          const { data: seats } = await supabase.from('tour_seat_assignments').select('seat_number').eq('client_id', clientData.id);
          setClientSelectedSeats(seats?.map(s => s.seat_number) || []);
        }
        setLoadingInitialData(false);
      } else {
        setLoadingInitialData(false);
      }
    };

    if (!sessionLoading) fetchClientData();
  }, [clientIdFromParams, sessionLoading]);

  useEffect(() => {
    if (formData.tour_id) {
      const tour = availableTours.find(t => t.id === formData.tour_id);
      setSelectedTour(tour || null);
    } else {
      setSelectedTour(null);
    }
  }, [formData.tour_id, availableTours]);

  useEffect(() => {
    let adults = (formData.contractor_age === null || formData.contractor_age >= 12) ? 1 : 0;
    let children = (formData.contractor_age !== null && formData.contractor_age < 12) ? 1 : 0;
    formData.companions.forEach(c => { (c.age === null || c.age >= 12) ? adults++ : children++; });

    let calculatedTotalAmount = 0;
    if (selectedTour) {
      const rd = allocateRoomsForPeople(adults);
      calculatedTotalAmount = (rd.double_rooms * selectedTour.selling_price_double_occupancy * 2) +
                              (rd.triple_rooms * selectedTour.selling_price_triple_occupancy * 3) +
                              (rd.quad_rooms * selectedTour.selling_price_quad_occupancy * 4) +
                              (children * selectedTour.selling_price_child);
      setRoomDetails(rd);
    }

    const servicesTotal = (formData.extra_services || []).reduce((sum, s) => sum + (s.selling_price_per_unit_snapshot * s.quantity), 0);
    calculatedTotalAmount += servicesTotal;

    setFormData(prev => ({
      ...prev,
      number_of_people: adults + children,
      total_amount: calculatedTotalAmount,
    }));
  }, [formData.companions, formData.contractor_age, formData.extra_services, selectedTour]);

  const handleCompanionChange = (id: string, field: keyof Companion, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      companions: prev.companions.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const addCompanion = () => setFormData(p => ({ ...p, companions: [...p.companions, { id: uuidv4(), name: '', age: null }] }));
  const removeCompanion = (id: string) => setFormData(p => ({ ...p, companions: p.companions.filter(c => c.id !== id) }));

  const handleExtraServiceChange = (id: string, field: 'provider_id' | 'quantity', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      extra_services: prev.extra_services.map(s => {
        if (s.id === id) {
          if (field === 'provider_id') {
            const p = availableProviders.find(p => p.id === value);
            return p ? { ...s, provider_id: value as string, name_snapshot: p.name, cost_per_unit_snapshot: p.cost_per_unit, selling_price_per_unit_snapshot: p.selling_price_per_unit, service_type_snapshot: p.service_type, unit_type_snapshot: p.unit_type } : s;
          }
          return { ...s, quantity: typeof value === 'string' ? parseFloat(value) || 0 : value };
        }
        return s;
      })
    }));
  };

  const addExtraService = () => setFormData(p => ({
    ...p,
    extra_services: [...p.extra_services, { id: uuidv4(), provider_id: '', quantity: 1, cost_per_unit_snapshot: 0, selling_price_per_unit_snapshot: 0, name_snapshot: '', service_type_snapshot: '', unit_type_snapshot: 'person' }]
  }));

  const removeExtraService = (id: string) => setFormData(p => ({ ...p, extra_services: p.extra_services.filter(s => s.id !== id) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return setIsSubmitting(false);

    const clientDataToSave = {
      first_name: formData.first_name, last_name: formData.last_name,
      email: formData.email, phone: formData.phone, address: formData.address,
      contract_number: formData.contract_number,
      identification_number: formData.identification_number,
      tour_id: formData.tour_id,
      number_of_people: formData.number_of_people,
      companions: formData.companions,
      extra_services: formData.extra_services,
      total_amount: formData.total_amount,
      advance_payment: formData.advance_payment,
      status: formData.status,
      contractor_age: formData.contractor_age,
      room_details: roomDetails,
      user_id: authUser.id,
      updated_at: new Date().toISOString(),
    };

    let savedId = clientIdFromParams;
    if (clientIdFromParams) {
      await supabase.from('clients').update(clientDataToSave).eq('id', clientIdFromParams);
    } else {
      const { data } = await supabase.from('clients').insert(clientDataToSave).select('id').single();
      savedId = data?.id;
    }

    if (savedId && formData.tour_id) {
      await supabase.from('tour_seat_assignments').delete().eq('client_id', savedId).eq('tour_id', formData.tour_id);
      await supabase.from('tour_seat_assignments').insert(clientSelectedSeats.map(s => ({ tour_id: formData.tour_id, seat_number: s, status: 'booked', client_id: savedId })));
    }

    toast.success('Cliente guardado con éxito.');
    navigate('/admin/clients');
    setIsSubmitting(false);
  };

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  const currentBus = selectedTour?.bus_id ? availableBuses.find(b => b.id === selectedTour.bus_id) : null;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientIdFromParams ? 'Editar Cliente' : 'Nuevo Cliente'} />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Nombre</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Apellido</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="space-y-2"><Label>Identificación</Label><Input value={formData.identification_number || ''} onChange={e => setFormData({...formData, identification_number: e.target.value})} /></div>
                <div className="space-y-2"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
                <div className="md:col-span-2 space-y-2"><Label>Dirección</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-bold flex justify-between items-center"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-rosa-mexicano" /> Acompañantes</div><Button type="button" variant="outline" size="sm" onClick={addCompanion}><PlusCircle className="h-4 w-4 mr-2" /> Añadir</Button></h3>
                {formData.companions.map(c => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl items-end relative">
                    <div className="md:col-span-2 space-y-2"><Label className="text-xs">Nombre Completo</Label><Input value={c.name} onChange={e => handleCompanionChange(c.id, 'name', e.target.value)} /></div>
                    <div className="flex gap-2 items-end">
                      <div className="space-y-2 flex-grow"><Label className="text-xs">Edad</Label><Input type="number" value={c.age || ''} onChange={e => handleCompanionChange(c.id, 'age', parseInt(e.target.value) || null)} /></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCompanion(c.id)} className="text-red-400"><MinusCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-bold flex justify-between items-center"><div className="flex items-center gap-2"><Handshake className="h-5 w-5 text-rosa-mexicano" /> Servicios Extra</div><Button type="button" variant="outline" size="sm" onClick={addExtraService}><PlusCircle className="h-4 w-4 mr-2" /> Añadir</Button></h3>
                {formData.extra_services.map(s => (
                  <div key={s.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/30 p-4 rounded-xl items-end relative">
                    <div className="md:col-span-1 space-y-2">
                      <Label className="text-xs">Servicio</Label>
                      <Select value={s.provider_id} onValueChange={v => handleExtraServiceChange(s.id, 'provider_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>{availableProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.service_type})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label className="text-xs">Cantidad</Label><Input type="number" value={s.quantity} onChange={e => handleExtraServiceChange(s.id, 'quantity', e.target.value)} /></div>
                    <div className="flex gap-2 items-center justify-end">
                      <div className="text-right pr-4"><p className="text-[10px] text-gray-400 uppercase">Subtotal</p><p className="font-bold">${(s.selling_price_per_unit_snapshot * s.quantity).toLocaleString()}</p></div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeExtraService(s.id)} className="text-red-400"><MinusCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted rounded-xl border-l-4 border-rosa-mexicano grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><Label className="text-xs text-gray-400 uppercase">Monto Total</Label><p className="text-2xl font-black text-rosa-mexicano">${formData.total_amount.toLocaleString()}</p></div>
                <div className="space-y-2">
                  <Label>Tour Asociado</Label>
                  <Select value={formData.tour_id || 'none'} onValueChange={v => setFormData({...formData, tour_id: v === 'none' ? null : v})}>
                    <SelectTrigger><SelectValue placeholder="Elegir Tour" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Ninguno</SelectItem>{availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado de la Reserva</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue placeholder="Estado..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="confirmed">Confirmada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTour && (
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Armchair className="h-5 w-5 text-rosa-mexicano" /> Selección de Asientos</h3>
                  <div className="bg-blue-50 p-4 rounded-xl mb-4 text-xs text-blue-800 border border-blue-100">
                    Selecciona los <strong>{formData.number_of_people}</strong> asientos correspondientes a esta reserva.
                  </div>
                  <TourSeatMap 
                    tourId={selectedTour.id} 
                    busCapacity={selectedTour.bus_capacity} 
                    courtesies={selectedTour.courtesies} 
                    seatLayoutJson={currentBus?.seat_layout_json || null} 
                    onSeatsSelected={setClientSelectedSeats} 
                    initialSelectedSeats={clientSelectedSeats} 
                    currentClientId={clientIdFromParams} 
                  />
                  {clientSelectedSeats.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center gap-2">
                      <span className="font-bold text-sm">Asientos elegidos:</span>
                      <div className="flex gap-1">
                        {clientSelectedSeats.sort((a,b) => a-b).map(s => (
                          <Badge key={s} className="bg-rosa-mexicano">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-8"><Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano px-12 h-12 text-lg font-bold">{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Guardar Cliente</Button></div>
            </form>
          </div>
          {clientIdFromParams && <div className="mt-8"><ClientPaymentHistoryTable clientId={clientIdFromParams} onPaymentsUpdated={() => {}} /></div>}
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;