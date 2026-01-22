"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, FileText, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { TourProviderService, AvailableProvider, SeatLayout } from '@/types/shared';
import ClientPaymentHistoryTable from '@/components/admin/clients/ClientPaymentHistoryTable';

interface BusPassenger {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  identification_number: string | null;
  is_contractor: boolean;
  seat_number: number;
  email: string | null;
  phone: string | null;
}

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
  bus_passengers: BusPassenger[];
  extra_services: TourProviderService[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  contractor_age: number | null;
  room_details: RoomDetails;
  remaining_payment?: number;
  bus_capacity?: number;
  courtesies?: number;
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

interface BusRoute {
  id: string;
  name: string;
  bus_id: string | null;
}

interface Bus {
  id: string;
  name: string;
  rental_cost: number;
  total_capacity: number;
  seat_layout_json: SeatLayout | null;
}

interface BusSchedule {
  id: string;
  route_id: string;
  departure_time: string;
  day_of_week: number[];
  effective_date_start: string | null;
  effective_date_end: string | null;
}

interface AgencySettings {
  advance_payment_amount: number;
}

const allocateRoomsForPeople = (totalPeople: number): RoomDetails => {
  let double = 0;
  let triple = 0;
  let quad = 0;
  let remaining = totalPeople;
  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };
  quad = Math.floor(remaining / 4);
  remaining %= 4;
  if (remaining === 3) triple++;
  else if (remaining === 2) double++;
  else if (remaining === 1) {
    if (quad > 0) { quad--; triple++; double++; }
    else { double++; }
  }
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
    number_of_people: 1, companions: [], bus_passengers: [], extra_services: [],
    total_amount: 0, advance_payment: 0, total_paid: 0, status: 'pending',
    contractor_age: null, room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
    bus_capacity: 0, courtesies: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]); // ADDED
  const [availableBusRoutes, setAvailableBusRoutes] = useState<BusRoute[]>([]);
  const [availableBusSchedules, setAvailableBusSchedules] = useState<BusSchedule[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [selectedTourPrices, setSelectedTourPrices] = useState<Tour | null>(null);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [roomDetails, setRoomDetails] = useState<RoomDetails>({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
  const [agencySettings, setAgencySettings] = useState<AgencySettings | null>(null);
  const [calculatedMinAdvance, setCalculatedMinAdvance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [toursRes, routesRes, schedulesRes, settingsRes, providersRes, busesRes] = await Promise.all([
        supabase.from('tours').select('*').order('title', { ascending: true }),
        supabase.from('bus_routes').select('*').order('name', { ascending: true }),
        supabase.from('bus_schedules').select('*').order('departure_time', { ascending: true }),
        supabase.from('agency_settings').select('advance_payment_amount').single(),
        supabase.from('providers').select('*').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('buses').select('*').order('name', { ascending: true }) // ADDED
      ]);

      if (toursRes.data) setAvailableTours(toursRes.data);
      if (routesRes.data) setAvailableBusRoutes(routesRes.data);
      if (schedulesRes.data) setAvailableBusSchedules(schedulesRes.data);
      if (settingsRes.data) setAgencySettings(settingsRes.data);
      if (providersRes.data) setAvailableProviders(providersRes.data);
      if (busesRes.data) setAvailableBuses(busesRes.data); // ADDED
    };
    fetchData();
  }, []);

  const refreshClientData = useCallback(async () => {
    if (clientIdFromParams) {
      setLoadingInitialData(true);
      const { data: clientData } = await supabase.from('clients').select('*').eq('id', clientIdFromParams).single();
      if (clientData) {
        let companionsForForm = clientData.companions || [];
        let busPassengersForForm = [];
        let assignedSeats = [];
        
        let tourBusCapacity = 0;
        let tourCourtesies = 0;

        if (clientData.tour_id) {
          const { data: seats } = await supabase.from('tour_seat_assignments').select('seat_number').eq('client_id', clientData.id);
          assignedSeats = seats?.map(s => s.seat_number) || [];
          
          const { data: tourData } = await supabase.from('tours').select('bus_capacity, courtesies').eq('id', clientData.tour_id).single();
          if (tourData) {
            tourBusCapacity = tourData.bus_capacity;
            tourCourtesies = tourData.courtesies;
          }
        } else if (clientData.bus_route_id) {
          const { data: passengers } = await supabase.from('bus_passengers').select('*').eq('client_id', clientData.id);
          busPassengersForForm = passengers || [];
          assignedSeats = busPassengersForForm.map(p => p.seat_number);
        }
        
        setFormData({ 
          ...clientData, 
          companions: companionsForForm, 
          bus_passengers: busPassengersForForm,
          bus_capacity: tourBusCapacity,
          courtesies: tourCourtesies
        });
        setRoomDetails(clientData.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
        setClientSelectedSeats(assignedSeats);
      }
      setLoadingInitialData(false);
    } else {
      setLoadingInitialData(false);
    }
  }, [clientIdFromParams]);

  useEffect(() => { if (!sessionLoading) refreshClientData(); }, [sessionLoading, refreshClientData]);

  useEffect(() => {
    if (formData.tour_id) {
      const tour = availableTours.find(t => t.id === formData.tour_id);
      setSelectedTourPrices(tour || null);
      if (tour && agencySettings) {
        const minPrice = Math.min(
          tour.selling_price_double_occupancy,
          tour.selling_price_triple_occupancy,
          tour.selling_price_quad_occupancy,
          tour.selling_price_child
        );
        const fixed = agencySettings.advance_payment_amount || 500;
        const percent = minPrice * 0.10;
        setCalculatedMinAdvance(Math.max(fixed, percent));
        
        // Update bus data if switching tours
        setFormData(prev => ({ 
          ...prev, 
          bus_capacity: tour.bus_capacity, 
          courtesies: tour.courtesies 
        }));
      }
    }
  }, [formData.tour_id, availableTours, agencySettings]);

  useEffect(() => {
    let currentNumAdults = 0, currentNumChildren = 0, totalPeople = 0;
    if (formData.tour_id) {
      totalPeople = 1 + formData.companions.length;
      const ages = [formData.contractor_age, ...formData.companions.map(c => c.age)];
      ages.forEach(age => { (age === null || age >= 12) ? currentNumAdults++ : currentNumChildren++; });
    } else if (formData.bus_route_id) {
      totalPeople = formData.bus_passengers.length;
      formData.bus_passengers.forEach(p => { (p.age === null || p.age >= 12) ? currentNumAdults++ : currentNumChildren++; });
    }

    let calculatedTotalAmount = 0;
    if (formData.tour_id && selectedTourPrices) {
      const rd = allocateRoomsForPeople(currentNumAdults);
      calculatedTotalAmount = (rd.double_rooms * selectedTourPrices.selling_price_double_occupancy * 2) +
                              (rd.triple_rooms * selectedTourPrices.selling_price_triple_occupancy * 3) +
                              (rd.quad_rooms * selectedTourPrices.selling_price_quad_occupancy * 4) +
                              (currentNumChildren * selectedTourPrices.selling_price_child);
      setRoomDetails(rd);
    }

    const servicesTotal = (formData.extra_services || []).reduce((sum, s) => sum + (s.selling_price_per_unit_snapshot * s.quantity), 0);
    calculatedTotalAmount += servicesTotal;

    const totalAdvance = clientSelectedSeats.length * calculatedMinAdvance;

    setFormData(prev => ({
      ...prev,
      number_of_people: totalPeople,
      total_amount: calculatedTotalAmount,
      advance_payment: prev.advance_payment || totalAdvance
    }));
  }, [formData.companions.length, formData.bus_passengers.length, selectedTourPrices, formData.contractor_age, formData.companions, formData.bus_passengers, formData.extra_services, formData.tour_id, formData.bus_route_id, clientSelectedSeats.length, calculatedMinAdvance]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value === 'none' ? null : value }));
  };

  const handleSeatsSelected = useCallback((seats: number[]) => { setClientSelectedSeats(seats); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return setIsSubmitting(false);

    const clientDataToSave = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      contract_number: formData.contract_number,
      identification_number: formData.identification_number,
      tour_id: formData.tour_id,
      bus_route_id: formData.bus_route_id,
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
      const { error } = await supabase.from('clients').update(clientDataToSave).eq('id', clientIdFromParams);
      if (error) { toast.error('Error al actualizar.'); setIsSubmitting(false); return; }
    } else {
      const { data, error } = await supabase.from('clients').insert(clientDataToSave).select('id').single();
      if (error) { toast.error('Error al crear.'); setIsSubmitting(false); return; }
      savedId = data?.id;
    }

    if (savedId) {
      if (formData.tour_id) {
        await supabase.from('tour_seat_assignments').delete().eq('client_id', savedId).eq('tour_id', formData.tour_id);
        const newSeats = clientSelectedSeats.map(s => ({ tour_id: formData.tour_id, seat_number: s, status: 'booked', client_id: savedId }));
        await supabase.from('tour_seat_assignments').insert(newSeats);
      }
    }

    toast.success('Cambios guardados con éxito.');
    navigate('/admin/clients');
    setIsSubmitting(false);
  };

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  const currentBus = selectedTourPrices?.bus_id ? availableBuses.find(b => b.id === selectedTourPrices.bus_id) : null;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientIdFromParams ? 'Editar Cliente' : 'Nuevo Cliente'} />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Nombre</Label><Input id="first_name" value={formData.first_name} onChange={handleChange} required /></div>
                <div className="space-y-2"><Label>Apellido</Label><Input id="last_name" value={formData.last_name} onChange={handleChange} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} required /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input id="phone" value={formData.phone} onChange={handleChange} /></div>
              </div>

              <div className="p-4 bg-muted rounded-xl border-l-4 border-rosa-mexicano">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Sugerencia de Cobro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-xs text-gray-400">Total a Cobrar</Label>
                    <p className="text-2xl font-black text-rosa-mexicano">${formData.total_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Anticipo Sugerido (${calculatedMinAdvance.toFixed(0)} x {clientSelectedSeats.length})</Label>
                    <p className="text-2xl font-black text-blue-600">${(calculatedMinAdvance * clientSelectedSeats.length).toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Anticipo Pactado ($)</Label>
                    <Input 
                      type="number" 
                      value={formData.advance_payment} 
                      onChange={e => setFormData({...formData, advance_payment: parseFloat(e.target.value) || 0})}
                      className="bg-white border-2 border-rosa-mexicano/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div className="space-y-2">
                  <Label>Tour Asociado</Label>
                  <Select value={formData.tour_id || 'none'} onValueChange={v => handleSelectChange('tour_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Elegir Tour" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado del Contrato</Label>
                  <Select value={formData.status} onValueChange={v => handleSelectChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.tour_id && (
                <div className="pt-6 border-t">
                  <Label className="text-lg font-bold block mb-4">Selección de Asientos</Label>
                  <TourSeatMap 
                    tourId={formData.tour_id} 
                    busCapacity={formData.bus_capacity || 0} 
                    courtesies={formData.courtesies || 0} 
                    seatLayoutJson={currentBus?.seat_layout_json || null}
                    onSeatsSelected={handleSeatsSelected}
                    initialSelectedSeats={clientSelectedSeats}
                    currentClientId={formData.id}
                  />
                </div>
              )}

              <div className="flex justify-end pt-8">
                <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano px-12 h-12 text-lg font-bold">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                  Guardar Cliente
                </Button>
              </div>
            </form>
          </div>

          {formData.id && (
            <div className="mt-8">
              <ClientPaymentHistoryTable clientId={formData.id} onPaymentsUpdated={refreshClientData} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;