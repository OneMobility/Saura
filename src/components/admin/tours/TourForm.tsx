"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Calculator, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useNavigate } from 'react-router-dom';
import { TourProviderService, AvailableProvider, SeatLayout } from '@/types/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HotelQuote {
  id: string;
  name: string;
  location: string;
  quoted_date: string | null;
  num_nights_quoted: number;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  num_double_rooms: number;
  num_triple_rooms: number;
  num_quad_rooms: number;
  num_courtesy_rooms: number;
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
  quote_end_date: string | null;
  estimated_total_cost: number;
}

interface TourHotelDetail {
  id: string;
  hotel_quote_id: string;
}

interface Bus {
  id: string;
  name: string;
  rental_cost: number;
  total_capacity: number;
  seat_layout_json: SeatLayout | null;
}

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
  hotel_details: TourHotelDetail[];
  provider_details: TourProviderService[];
  total_base_cost?: number;
  paying_clients_count?: number;
  cost_per_paying_person?: number;
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number;
  other_income: number;
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
}

const TourForm: React.FC<{ tourId?: string; onSave: () => void }> = ({ tourId, onSave }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Tour>({
    title: '', slug: '', description: '', image_url: '', full_content: '', duration: '', includes: [], itinerary: [],
    bus_id: null, bus_capacity: 0, bus_cost: 0, courtesies: 0, hotel_details: [], provider_details: [],
    selling_price_double_occupancy: 0, selling_price_triple_occupancy: 0, selling_price_quad_occupancy: 0,
    selling_price_child: 0, other_income: 0, departure_date: null, return_date: null, departure_time: '08:00', return_time: '18:00',
  });
  
  // Estados para simulación y rentabilidad
  const [desiredProfitFixed, setDesiredProfitFixed] = useState(45000);
  const [projectedSales, setProjectedSales] = useState({ double: 0, triple: 0, quad: 0, child: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<HotelQuote[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);

  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);

  // Fetch inicial
  useEffect(() => {
    const fetchData = async () => {
      const [hotelsRes, busesRes, providersRes] = await Promise.all([
        supabase.from('hotels').select('*').eq('is_active', true),
        supabase.from('buses').select('*').order('name', { ascending: true }),
        supabase.from('providers').select('*').eq('is_active', true).order('name', { ascending: true }),
      ]);

      if (hotelsRes.data) {
        const quotesWithCost = hotelsRes.data.map(quote => {
          const numNights = quote.num_nights_quoted || 1;
          const estimated_total_cost = (((quote.num_double_rooms || 0) * quote.cost_per_night_double +
                                       (quote.num_triple_rooms || 0) * quote.cost_per_night_triple +
                                       (quote.num_quad_rooms || 0) * quote.cost_per_night_quad) -
                                       (quote.num_courtesy_rooms || 0) * quote.cost_per_night_quad) * numNights;
          return { ...quote, estimated_total_cost };
        });
        setAvailableHotelQuotes(quotesWithCost);
      }
      if (busesRes.data) setAvailableBuses(busesRes.data);
      if (providersRes.data) setAvailableProviders(providersRes.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTourData = async () => {
      if (tourId) {
        setLoadingInitialData(true);
        const { data } = await supabase.from('tours').select('*').eq('id', tourId).single();
        if (data) {
          setFormData({
            ...data,
            includes: data.includes || [], itinerary: data.itinerary || [],
            hotel_details: data.hotel_details || [], provider_details: data.provider_details || [],
          });
          setImageUrlPreview(data.image_url);
          if (data.departure_date) setDepartureDate(parseISO(data.departure_date));
          if (data.return_date) setReturnDate(parseISO(data.return_date));
        }
      }
      setLoadingInitialData(false);
    };
    fetchTourData();
  }, [tourId]);

  // Cálculos Avanzados
  const financialSummary = useMemo(() => {
    const bus = availableBuses.find(b => b.id === formData.bus_id);
    const busCost = bus?.rental_cost || 0;
    const providerCost = formData.provider_details.reduce((sum, p) => sum + (p.cost_per_unit_snapshot * p.quantity), 0);
    const hotelCost = formData.hotel_details.reduce((sum, d) => {
      const q = availableHotelQuotes.find(q => q.id === d.hotel_quote_id);
      return sum + (q?.estimated_total_cost || 0);
    }, 0);

    const totalCost = busCost + providerCost + hotelCost;
    const capacity = formData.bus_capacity - formData.courtesies;
    
    // Proyección actual
    const currentRevenue = (projectedSales.double * formData.selling_price_double_occupancy) +
                           (projectedSales.triple * formData.selling_price_triple_occupancy) +
                           (projectedSales.quad * formData.selling_price_quad_occupancy) +
                           (projectedSales.child * formData.selling_price_child) +
                           formData.other_income;
    
    const projectedProfit = currentRevenue - totalCost;

    // Punto de equilibrio (cuántas personas en cada tipo)
    const beQuad = formData.selling_price_quad_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_quad_occupancy) : 0;
    const beTriple = formData.selling_price_triple_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_triple_occupancy) : 0;
    const beDouble = formData.selling_price_double_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_double_occupancy) : 0;

    // Recomendación de precios basada en utilidad deseada
    const targetRevenue = totalCost + desiredProfitFixed;
    const avgRequiredPerPerson = capacity > 0 ? targetRevenue / capacity : 0;

    return {
      totalCost,
      capacity,
      currentRevenue,
      projectedProfit,
      beQuad,
      beTriple,
      beDouble,
      recPrice: {
        quad: avgRequiredPerPerson,
        triple: avgRequiredPerPerson * 1.1, // Factor de ocupación menor
        double: avgRequiredPerPerson * 1.25, // Factor de ocupación mínimo
        child: avgRequiredPerPerson * 0.7 // Descuento para niños
      }
    };
  }, [formData, projectedSales, desiredProfitFixed, availableBuses, availableHotelQuotes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: ['bus_capacity', 'courtesies', 'selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'other_income'].includes(id) 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleDateSelect = (field: 'departure_date' | 'return_date', date: Date | undefined) => {
    const formatted = date ? format(date, 'yyyy-MM-dd') : null;
    if (field === 'departure_date') { setDepartureDate(date); setFormData(p => ({ ...p, departure_date: formatted })); }
    else { setReturnDate(date); setFormData(p => ({ ...p, return_date: formatted })); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // ... lógica de subida de imagen existente ...
    const { data: { user } } = await supabase.auth.getUser();
    const dataToSave = { 
      ...formData, 
      user_id: user?.id,
      total_base_cost: financialSummary.totalCost,
      paying_clients_count: financialSummary.capacity,
      cost_per_paying_person: financialSummary.capacity > 0 ? financialSummary.totalCost / financialSummary.capacity : 0
    };
    
    const { error } = tourId 
      ? await supabase.from('tours').update(dataToSave).eq('id', tourId)
      : await supabase.from('tours').insert(dataToSave);
      
    if (error) toast.error('Error al guardar.');
    else { toast.success('Tour guardado.'); onSave(); }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-rosa-mexicano" /> Análisis de Rentabilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gastos y Costos */}
            <div className="p-4 bg-muted/50 rounded-xl border border-dashed">
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">Estructura de Gastos</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Transporte:</span> <span className="font-bold">${(availableBuses.find(b => b.id === formData.bus_id)?.rental_cost || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>Hospedaje:</span> <span className="font-bold">${financialSummary.totalCost - (availableBuses.find(b => b.id === formData.bus_id)?.rental_cost || 0) - formData.provider_details.reduce((s, p) => s + (p.cost_per_unit_snapshot * p.quantity), 0)}</span></div>
                <div className="flex justify-between text-sm"><span>Proveedores:</span> <span className="font-bold">${formData.provider_details.reduce((s, p) => s + (p.cost_per_unit_snapshot * p.quantity), 0)}</span></div>
                <div className="pt-2 mt-2 border-t flex justify-between text-lg font-black text-rosa-mexicano">
                  <span>COSTO TOTAL:</span>
                  <span>${financialSummary.totalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Punto de Equilibrio */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <h3 className="text-sm font-bold uppercase text-blue-600 mb-4 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Punto de Equilibrio
              </h3>
              <div className="space-y-2">
                <p className="text-xs text-blue-800">Personas necesarias para cubrir costos según el tipo de venta:</p>
                <div className="flex justify-between text-sm"><span>Venta Cuádruple:</span> <span className="font-bold">{financialSummary.beQuad} pax</span></div>
                <div className="flex justify-between text-sm"><span>Venta Triple:</span> <span className="font-bold">{financialSummary.beTriple} pax</span></div>
                <div className="flex justify-between text-sm"><span>Venta Doble:</span> <span className="font-bold">{financialSummary.beDouble} pax</span></div>
                <div className="mt-2 p-2 bg-white rounded border border-blue-200 text-xs italic">
                  * Basado en {financialSummary.capacity} asientos disponibles.
                </div>
              </div>
            </div>

            {/* Utilidad Deseada */}
            <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
              <h3 className="text-sm font-bold uppercase text-green-600 mb-4 flex items-center gap-1">
                <Calculator className="h-4 w-4" /> Utilidad Meta
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">¿Cuánto quieres ganar libre?</Label>
                  <Input 
                    type="number" 
                    value={desiredProfitFixed} 
                    onChange={e => setDesiredProfitFixed(parseFloat(e.target.value) || 0)}
                    className="h-8 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-500">PRECIOS RECOMENDADOS:</p>
                  <div className="grid grid-cols-2 gap-x-4 text-[10px] font-bold">
                    <div className="text-green-700">QUAD: ${financialSummary.recPrice.quad.toFixed(0)}</div>
                    <div className="text-green-700">TRIP: ${financialSummary.recPrice.triple.toFixed(0)}</div>
                    <div className="text-green-700">DBL: ${financialSummary.recPrice.double.toFixed(0)}</div>
                    <div className="text-green-700">NIÑO: ${financialSummary.recPrice.child.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Simulador de Mezcla de Ventas */}
          <div className="p-6 bg-gray-50 rounded-2xl border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TRENDINGUP className="h-5 w-5 text-rosa-mexicano" /> Simulador de Escenario de Ventas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {['double', 'triple', 'quad', 'child'].map((type) => (
                <div key={type} className="space-y-1">
                  <Label className="capitalize text-xs">Ventas {type}</Label>
                  <Input 
                    type="number" 
                    value={projectedSales[type as keyof typeof projectedSales]}
                    onChange={e => setProjectedSales({...projectedSales, [type]: parseInt(e.target.value) || 0})}
                    className="bg-white"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border shadow-sm">
              <div>
                <span className="text-sm text-gray-500 block">Total Pasajeros Simulados</span>
                <span className={cn(
                  "text-2xl font-black",
                  (projectedSales.double + projectedSales.triple + projectedSales.quad + projectedSales.child) > financialSummary.capacity ? "text-red-500" : "text-gray-900"
                )}>
                  {projectedSales.double + projectedSales.triple + projectedSales.quad + projectedSales.child} / {financialSummary.capacity}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500 block">Utilidad Proyectada</span>
                <span className={cn(
                  "text-3xl font-black",
                  financialSummary.projectedProfit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  ${financialSummary.projectedProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <h2 className="text-xl font-bold border-b pb-2">Configuración de Precios de Venta</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Doble (Precio por persona)</Label>
            <Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} className="font-bold border-rosa-mexicano" />
          </div>
          <div className="space-y-2">
            <Label>Triple (Precio por persona)</Label>
            <Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} className="font-bold border-rosa-mexicano" />
          </div>
          <div className="space-y-2">
            <Label>Cuádruple (Precio por persona)</Label>
            <Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} className="font-bold border-rosa-mexicano" />
          </div>
          <div className="space-y-2">
            <Label>Niño (Hasta 12 años)</Label>
            <Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} className="font-bold border-rosa-mexicano" />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting} className="flex-grow bg-rosa-mexicano py-6 text-lg">
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            {tourId ? 'Actualizar Tour' : 'Publicar Tour'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tours')} className="py-6">Cancelar</Button>
        </div>
      </form>
    </div>
  );
};

export default TourForm;