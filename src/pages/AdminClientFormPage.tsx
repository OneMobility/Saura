"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Info, Users, Armchair, MapPin, DollarSign, Hotel, List } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<any>({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    contract_number: uuidv4().substring(0, 8).toUpperCase(),
    identification_number: null, tour_id: null,
    companions: [], total_amount: 0, total_paid: 0, status: 'pending',
    contractor_age: null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [roomsCount, setRoomsCount] = useState(0);

  useEffect(() => {
    const fetchDeps = async () => {
      const [toursRes, busesRes] = await Promise.all([
        supabase.from('tours').select('*').order('title', { ascending: true }),
        supabase.from('buses').select('*')
      ]);
      if (toursRes.data) setAvailableTours(toursRes.data);
      if (busesRes.data) setAvailableBuses(busesRes.data);
    };
    fetchDeps();
  }, []);

  const selectedTour = useMemo(() => availableTours.find(t => t.id === formData.tour_id), [formData.tour_id, availableTours]);
  const currentBus = useMemo(() => selectedTour?.bus_id ? availableBuses.find(b => b.id === selectedTour.bus_id) : null, [selectedTour, availableBuses]);

  useEffect(() => {
    if (!selectedTour) return;
    
    const totalPeople = clientSelectedSeats.length;
    setRoomsCount(Math.ceil(totalPeople / 4));

    let adults = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
    let children = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
    formData.companions.forEach((c: any) => { (c.age === null || c.age > 12) ? adults++ : children++; });

    let total = 0;
    if (adults === 1 && children === 1) {
      total = 2 * selectedTour.selling_price_double_occupancy;
    } else if (adults === 1 && (children === 2 || children === 3)) {
      total = 4 * selectedTour.selling_price_quad_occupancy;
    } else {
      total = (adults * selectedTour.selling_price_double_occupancy) + (children * selectedTour.selling_price_child);
    }
    setFormData((p: any) => ({ ...p, total_amount: total }));
  }, [clientSelectedSeats.length, formData.contractor_age, formData.companions, selectedTour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tour_id || clientSelectedSeats.length === 0) return toast.error("Selecciona tour y asientos.");
    setIsSubmitting(true);
    
    const { data } = await supabase.from('clients').insert({ ...formData, number_of_people: clientSelectedSeats.length }).select('id').single();
    if (data) {
      await supabase.from('tour_seat_assignments').insert(clientSelectedSeats.map(s => ({ tour_id: formData.tour_id, seat_number: s, status: 'booked', client_id: data.id })));
    }
    toast.success("Reserva guardada.");
    navigate('/admin/clients');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Consola de Reserva" />
        <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-lg border-t-4 border-rosa-mexicano">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" /> Datos del Viaje</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <Select value={formData.tour_id} onValueChange={v => setFormData({...formData, tour_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Elegir Tour" /></SelectTrigger>
                  <SelectContent>{availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>

                {selectedTour && (
                  <div className="pt-4 border-t">
                    <TourSeatMap tourId={selectedTour.id} busCapacity={selectedTour.bus_capacity} courtesies={selectedTour.courtesies} seatLayoutJson={currentBus?.seat_layout_json} onSeatsSelected={setClientSelectedSeats} initialSelectedSeats={clientSelectedSeats} />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-gray-900 text-white shadow-xl">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Hotel className="h-5 w-5 text-rosa-mexicano" /> Alojamiento</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="text-xs uppercase font-bold text-gray-400">Habitaciones</span>
                    <span className="text-2xl font-black text-rosa-mexicano">{roomsCount}</span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between font-black text-xl">
                    <span>Total:</span>
                    <span className="text-yellow-400">${formData.total_amount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-rosa-mexicano h-14 text-lg font-black shadow-xl">Confirmar</Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;