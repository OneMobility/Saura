"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, TrendingUp, DollarSign, Hotel, Bus, Clock, MapPin, Receipt, AlertCircle, Info } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useNavigate } from 'react-router-dom';
import { TourProviderService, SeatLayout } from '@/types/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RichTextEditor from '@/components/RichTextEditor';
import TourSeatMap from '@/components/TourSeatMap';

interface Tour {
  id?: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  full_content: string;
  duration: string;
  includes: string[];
  itinerary: { day: number; activity: string }[];
  bus_id: string | null;
  bus_capacity: number;
  bus_cost: number;
  courtesies: number;
  hotel_details: { id: string; hotel_quote_id: string }[];
  provider_details: TourProviderService[];
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number;
  transport_only_price: number;
  other_income: number;
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
}

const TourForm: React.FC<{ tourId?: string; onSave: () => void }> = ({ tourId, onSave }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Tour>({
    title: '', slug: '', description: '', full_content: '', duration: '', includes: [], itinerary: [],
    bus_id: null, bus_capacity: 0, bus_cost: 0, courtesies: 0, hotel_details: [], provider_details: [],
    selling_price_double_occupancy: 0, selling_price_triple_occupancy: 0, selling_price_quad_occupancy: 0,
    selling_price_child: 0, transport_only_price: 0, other_income: 0,
    departure_date: null, return_date: null, departure_time: '08:00', return_time: '18:00',
  });

  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [providerPayments, setProviderPayments] = useState({ hotel: 0, bus: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const [hotelsRes, busesRes, providersRes] = await Promise.all([
        supabase.from('hotels').select('*'),
        supabase.from('buses').select('*'),
        supabase.from('providers').select('*'),
      ]);
      if (hotelsRes.data) setAvailableHotelQuotes(hotelsRes.data);
      if (busesRes.data) setAvailableBuses(busesRes.data);
      if (providersRes.data) setAvailableProviders(providersRes.data);

      if (tourId && tourId !== 'new') {
        const { data: tourData } = await supabase.from('tours').select('*').eq('id', tourId).single();
        if (tourData) {
          setFormData({ ...tourData, includes: tourData.includes || [], itinerary: tourData.itinerary || [], hotel_details: tourData.hotel_details || [], provider_details: tourData.provider_details || [] });
          
          if (tourData.bus_id) {
            const { data: bP } = await supabase.from('bus_payments').select('amount').eq('bus_id', tourData.bus_id);
            const busTotal = bP?.reduce((s, p) => s + p.amount, 0) || 0;
            setProviderPayments(prev => ({ ...prev, bus: busTotal }));
          }
          if (tourData.hotel_details?.length > 0) {
            const hId = tourData.hotel_details[0].hotel_quote_id;
            const { data: hP } = await supabase.from('hotel_payments').select('amount').eq('hotel_id', hId);
            const hotelTotal = hP?.reduce((s, p) => s + p.amount, 0) || 0;
            setProviderPayments(prev => ({ ...prev, hotel: hotelTotal }));
          }
        }
      }
      setLoadingInitialData(false);
    };
    fetchData();
  }, [tourId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: ['selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'transport_only_price', 'other_income'].includes(id) ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = tourId 
      ? await supabase.from('tours').update(formData).eq('id', tourId)
      : await supabase.from('tours').insert([formData]);
    if (error) toast.error("Error al guardar");
    else { toast.success("Tour guardado"); onSave(); }
  };

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg border-t-4 border-rosa-mexicano">
          <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" /> Configuración General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Nombre del Tour</Label><Input id="title" value={formData.title} onChange={handleChange} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bus Asignado</Label>
                <Select value={formData.bus_id || ''} onValueChange={val => setFormData({...formData, bus_id: val})}>
                  <SelectTrigger><SelectValue placeholder="Elegir Bus" /></SelectTrigger>
                  <SelectContent>{availableBuses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Precio Solo Traslado ($)</Label><Input type="number" id="transport_only_price" value={formData.transport_only_price} onChange={handleChange} className="border-blue-200" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 text-white shadow-xl">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Receipt className="h-5 w-5 text-rosa-mexicano" /> Pagos a Proveedores</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[10px] uppercase font-bold text-gray-400">Total Pagado a Hotel</p>
              <p className="text-2xl font-black text-green-400">${providerPayments.hotel.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-[10px] uppercase font-bold text-gray-400">Total Pagado a Autobús</p>
              <p className="text-2xl font-black text-green-400">${providerPayments.bus.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tarifas de Venta</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1"><Label>Doble (p/p)</Label><Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} /></div>
          <div className="space-y-1"><Label>Triple (p/p)</Label><Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} /></div>
          <div className="space-y-1"><Label>Cuádruple (p/p)</Label><Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} /></div>
          <div className="space-y-1"><Label>Niño</Label><Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} /></div>
        </CardContent>
      </Card>

      <div className="fixed bottom-6 right-6 z-50">
        <Button type="submit" className="bg-rosa-mexicano h-14 px-10 text-lg font-bold shadow-2xl">
          <Save className="mr-2" /> Guardar Tour
        </Button>
      </div>
    </form>
  );
};

export default TourForm;