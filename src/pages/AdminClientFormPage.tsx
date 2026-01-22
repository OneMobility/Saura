"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, MapPin, Hotel, Bus, Users, DollarSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const AdminClientFormPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<any>({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    contract_number: uuidv4().substring(0, 8).toUpperCase(),
    identification_number: null, tour_id: null,
    companions: [], total_amount: 0, total_paid: 0, status: 'pending',
    contractor_age: null, is_transport_only: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [roomsCount, setRoomsCount] = useState(0);
  const [breakdownDetails, setBreakdownDetails] = useState<string[]>([]);

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

  useEffect(() => {
    if (!selectedTour) return;
    
    const totalPax = clientSelectedSeats.length;
    if (formData.is_transport_only) {
      const total = totalPax * (selectedTour.transport_only_price || 0);
      setFormData((p: any) => ({ ...p, total_amount: total }));
      setRoomsCount(0);
      setBreakdownDetails([`${totalPax} Pasajeros en modalidad SOLO TRASLADO`]);
    } else {
      const neededRooms = Math.ceil(totalPax / 4);
      setRoomsCount(neededRooms);

      let adults = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
      let children = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
      formData.companions.forEach((c: any) => { (c.age === null || c.age > 12) ? adults++ : children++; });

      let tempAdults = adults;
      let tempChildren = children;
      let calculatedTotal = 0;
      let details: string[] = [];

      for (let i = 0; i < neededRooms; i++) {
        const paxInRoom = Math.min(4, tempAdults + tempChildren);
        const adultsInRoom = Math.min(paxInRoom, tempAdults);
        const childrenInRoom = paxInRoom - adultsInRoom;

        if (paxInRoom === 1 && adultsInRoom === 1) {
          calculatedTotal += (2 * selectedTour.selling_price_double_occupancy);
          details.push(`Hab. ${i+1}: 1 Ad (Costo Doble Full)`);
        } else if (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1) {
          calculatedTotal += (2 * selectedTour.selling_price_double_occupancy);
          details.push(`Hab. ${i+1}: 1 Ad + 1 Niñ (Costo Doble Full)`);
        } else {
          let occPrice = paxInRoom === 4 ? selectedTour.selling_price_quad_occupancy : (paxInRoom === 3 ? selectedTour.selling_price_triple_occupancy : selectedTour.selling_price_double_occupancy);
          calculatedTotal += (adultsInRoom * occPrice) + (childrenInRoom * selectedTour.selling_price_child);
          details.push(`Hab. ${i+1}: Ocupación ${paxInRoom} pax`);
        }
        tempAdults -= adultsInRoom;
        tempChildren -= childrenInRoom;
      }
      setFormData((p: any) => ({ ...p, total_amount: calculatedTotal }));
      setBreakdownDetails(details);
    }
  }, [clientSelectedSeats.length, formData.contractor_age, formData.companions, formData.is_transport_only, selectedTour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { data } = await supabase.from('clients').insert({ 
      ...formData, 
      number_of_people: clientSelectedSeats.length,
      room_details: { rooms_count: roomsCount }
    }).select('id').single();

    if (data) {
      await supabase.from('tour_seat_assignments').insert(clientSelectedSeats.map(s => ({ 
        tour_id: formData.tour_id, seat_number: s, status: 'booked', client_id: data.id 
      })));
    }
    toast.success("Reserva guardada.");
    navigate('/admin/clients');
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Registro Administrativo" />
        <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-lg border-t-4 border-rosa-mexicano">
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Viaje y Asientos</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <Select value={formData.tour_id} onValueChange={v => setFormData({...formData, tour_id: v})}>
                  <SelectTrigger className="h-12 font-bold"><SelectValue placeholder="Elegir Tour" /></SelectTrigger>
                  <SelectContent>{availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                </Select>

                {selectedTour && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bus className="h-5 w-5 text-blue-600" />
                      <Label className="text-blue-900 font-bold">¿Solo requiere traslado redondo?</Label>
                    </div>
                    <Switch checked={formData.is_transport_only} onCheckedChange={val => setFormData({...formData, is_transport_only: val})} />
                  </div>
                )}

                {selectedTour && (
                  <TourSeatMap tourId={selectedTour.id} busCapacity={selectedTour.bus_capacity} courtesies={selectedTour.courtesies} seatLayoutJson={availableBuses.find(b => b.id === selectedTour.bus_id)?.seat_layout_json} onSeatsSelected={setClientSelectedSeats} initialSelectedSeats={clientSelectedSeats} />
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-gray-900 text-white shadow-xl">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Hotel className="h-5 w-5 text-rosa-mexicano" /> Liquidación</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="text-xs font-bold text-gray-400">Modalidad</span>
                    <Badge className="bg-rosa-mexicano">{formData.is_transport_only ? 'SÓLO TRASLADO' : `${roomsCount} HABITACIONES`}</Badge>
                  </div>
                  <div className="space-y-1 pt-2 opacity-60 text-[10px]">
                    {breakdownDetails.map((d, i) => <p key={i}>- {d}</p>)}
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between font-black text-xl">
                    <span>Total:</span>
                    <span className="text-yellow-400">${formData.total_amount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-rosa-mexicano h-14 text-lg font-black shadow-xl">Generar Contrato</Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;