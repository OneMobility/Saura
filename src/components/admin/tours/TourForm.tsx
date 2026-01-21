"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Search, Hotel as HotelIcon, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parse, isValid, parseISO, addDays, differenceInDays, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import TourSeatMap from '@/components/TourSeatMap';
import { useNavigate } from 'react-router-dom';
import { TourProviderService, AvailableProvider, SeatLayout } from '@/types/shared';
import RichTextEditor from '@/components/RichTextEditor';

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
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  seat_layout_json: SeatLayout | null;
  advance_payment: number;
  total_paid: number;
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
  selling_price_per_person: number;
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number;
  other_income: number;
  user_id?: string;
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
}

const calculateIdealRoomAllocation = (numAdults: number) => {
  let double = 0, triple = 0, quad = 0, remaining = numAdults;
  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };
  quad = Math.floor(remaining / 4);
  remaining %= 4;
  if (remaining === 3) triple++;
  else if (remaining === 2) double++;
  else if (remaining === 1) {
    if (quad > 0) { quad--; triple++; double++; }
    else double++;
  }
  return { double_rooms: double, triple_rooms: triple, quad_rooms: quad };
};

const TourForm: React.FC<TourFormProps> = ({ tourId, onSave }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Tour>({
    title: '', slug: '', description: '', image_url: '', full_content: '', duration: '', includes: [], itinerary: [],
    bus_id: null, bus_capacity: 0, bus_cost: 0, courtesies: 0, hotel_details: [], provider_details: [],
    selling_price_per_person: 0, selling_price_double_occupancy: 0, selling_price_triple_occupancy: 0, selling_price_quad_occupancy: 0,
    selling_price_child: 0, other_income: 0, departure_date: null, return_date: null, departure_time: '08:00', return_time: '18:00',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<HotelQuote[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [selectedBusLayout, setSelectedBusLayout] = useState<SeatLayout | null>(null);

  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [departureDateInput, setDepartureDateInput] = useState<string>('');
  const [returnDateInput, setReturnDateInput] = useState<string>('');

  const numNightsTour = (departureDate && returnDate) ? differenceInDays(returnDate, departureDate) : 0;
  const [totalSoldSeats, setTotalSoldSeats] = useState(0);
  const [totalClientsRevenue, setTotalClientsRevenue] = useState(0);
  const [totalRemainingPayments, setTotalRemainingPayments] = useState(0);
  const [desiredProfitPercentage, setDesiredProfitPercentage] = useState(20);
  const [suggestedSellingPrice, setSuggestedSellingPrice] = useState(0);
  const [expectedClientsForBreakeven, setExpectedClientsForBreakeven] = useState(0);
  const [breakevenResult, setBreakevenResult] = useState<any>(null);

  // Fetch available data
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

  // NEW: Organize all quotes by group and price for the Select component
  const groupedAndSortedQuotes = useMemo(() => {
    const groups: Record<string, HotelQuote[]> = {};
    availableHotelQuotes.forEach(quote => {
      if (!groups[quote.name]) groups[quote.name] = [];
      groups[quote.name].push(quote);
    });

    // Sort quotes within each group by price
    Object.keys(groups).forEach(name => {
      groups[name].sort((a, b) => a.estimated_total_cost - b.estimated_total_cost);
    });

    // Sort groups themselves by the price of their cheapest quote
    return Object.entries(groups).sort((a, b) => {
      const minA = a[1][0].estimated_total_cost;
      const minB = b[1][0].estimated_total_cost;
      return minA - minB;
    });
  }, [availableHotelQuotes]);

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
          if (data.departure_date) {
            const d = parseISO(data.departure_date);
            setDepartureDate(d); setDepartureDateInput(format(d, 'dd/MM/yy'));
          }
          if (data.return_date) {
            const r = parseISO(data.return_date);
            setReturnDate(r); setReturnDateInput(format(r, 'dd/MM/yy'));
          }
          setExpectedClientsForBreakeven(data.paying_clients_count || 0);
        }
      }
      setLoadingInitialData(false);
    };
    fetchTourData();
  }, [tourId]);

  const calculateCosts = useCallback(() => {
    const totalProviderCost = formData.provider_details.reduce((sum, p) => sum + (p.cost_per_unit_snapshot * p.quantity), 0);
    const selectedBus = availableBuses.find(b => b.id === formData.bus_id);
    const busRentalCost = selectedBus?.rental_cost || 0;

    let totalHotelCost = 0;
    let currentRemaining = busRentalCost - (selectedBus?.total_paid || 0);

    formData.hotel_details.forEach(detail => {
      const quote = availableHotelQuotes.find(q => q.id === detail.hotel_quote_id);
      if (quote) {
        totalHotelCost += quote.estimated_total_cost;
        currentRemaining += (quote.estimated_total_cost - (quote.total_paid || 0));
      }
    });

    const totalBaseCost = busRentalCost + totalProviderCost + totalHotelCost;
    const payingClientsCount = formData.bus_capacity - formData.courtesies;
    const costPerPayingPerson = payingClientsCount > 0 ? totalBaseCost / payingClientsCount : 0;
    const averageAdultPrice = (formData.selling_price_double_occupancy + formData.selling_price_triple_occupancy + formData.selling_price_quad_occupancy) / 3;

    setFormData(prev => ({ ...prev, total_base_cost: totalBaseCost, paying_clients_count: payingClientsCount, cost_per_paying_person: costPerPayingPerson }));
    setTotalRemainingPayments(currentRemaining);
    setSuggestedSellingPrice(costPerPayingPerson > 0 ? costPerPayingPerson * (1 + desiredProfitPercentage / 100) : 0);
  }, [formData.bus_capacity, formData.bus_id, formData.courtesies, formData.provider_details, formData.hotel_details, formData.selling_price_double_occupancy, formData.selling_price_triple_occupancy, formData.selling_price_quad_occupancy, availableHotelQuotes, availableBuses, desiredProfitPercentage]);

  useEffect(() => { calculateCosts(); }, [calculateCosts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [id]: ['bus_capacity', 'bus_cost', 'courtesies', 'selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'other_income'].includes(id) ? parseFloat(value) || 0 : value };
      if (id === 'title') updated.slug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      return updated;
    });
  };

  const handleDateSelect = (field: 'departure_date' | 'return_date', date: Date | undefined) => {
    const formatted = date ? format(date, 'yyyy-MM-dd') : null;
    const input = date ? format(date, 'dd/MM/yy', { locale: es }) : '';
    if (field === 'departure_date') { setDepartureDate(date); setDepartureDateInput(input); setFormData(p => ({ ...p, departure_date: formatted })); }
    else { setReturnDate(date); setReturnDateInput(input); setFormData(p => ({ ...p, return_date: formatted })); }
  };

  const handleTourHotelChange = (index: number, value: string) => {
    setFormData(prev => {
      const newDetails = [...prev.hotel_details];
      newDetails[index] = { ...newDetails[index], hotel_quote_id: value };
      return { ...prev, hotel_details: newDetails };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const fileName = `${uuidv4()}.${imageFile.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('tour-images').upload(fileName, imageFile);
      if (error) { toast.error('Error al subir imagen.'); setIsSubmitting(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(fileName);
      finalImageUrl = publicUrl;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const dataToSave = { ...formData, image_url: finalImageUrl, user_id: user?.id };
    const { error } = tourId 
      ? await supabase.from('tours').update({ ...dataToSave, updated_at: new Date().toISOString() }).eq('id', tourId)
      : await supabase.from('tours').insert(dataToSave);
    if (error) toast.error('Error al guardar el tour.');
    else { toast.success('Tour guardado.'); onSave(); }
    setIsSubmitting(false);
  };

  if (loadingInitialData) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{tourId ? 'Editar Tour' : 'Crear Nuevo Tour'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="md:text-right">Título</Label>
          <Input id="title" value={formData.title} onChange={handleChange} className="md:col-span-3" required />
        </div>
        
        {/* Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label className="md:text-right">Fecha Salida</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("md:col-span-2 justify-start", !departureDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {departureDate ? format(departureDate, "PPP", { locale: es }) : "Selecciona fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={departureDate} onSelect={d => handleDateSelect('departure_date', d)} locale={es} /></PopoverContent>
          </Popover>
          <Input type="text" value={formData.departure_time || ''} onChange={e => setFormData(p => ({...p, departure_time: e.target.value}))} placeholder="HH:MM" className="md:col-span-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label className="md:text-right">Fecha Regreso</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("md:col-span-2 justify-start", !returnDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {returnDate ? format(returnDate, "PPP", { locale: es }) : "Selecciona fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={returnDate} onSelect={d => handleDateSelect('return_date', d)} locale={es} /></PopoverContent>
          </Popover>
          <Input type="text" value={formData.return_time || ''} onChange={e => setFormData(p => ({...p, return_time: e.target.value}))} placeholder="HH:MM" className="md:col-span-1" />
        </div>

        {/* Hoteles Agrupados */}
        <div className="space-y-4 col-span-full">
          <Label className="text-lg font-semibold">Hoteles Vinculados (Ordenados por Precio)</Label>
          {formData.hotel_details.map((detail, index) => {
            const selected = availableHotelQuotes.find(q => q.id === detail.hotel_quote_id);
            return (
              <div key={detail.id} className="flex gap-2 items-center">
                <Select value={detail.hotel_quote_id} onValueChange={val => handleTourHotelChange(index, val)}>
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder="Seleccionar Cotización" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedAndSortedQuotes.map(([hotelName, quotes]) => (
                      <SelectGroup key={hotelName}>
                        <SelectLabel className="bg-muted/50 py-1 px-2 text-rosa-mexicano font-bold">{hotelName}</SelectLabel>
                        {quotes.map(q => (
                          <SelectItem key={q.id} value={q.id}>
                            {`$${q.estimated_total_cost.toFixed(0)} - ${q.num_nights_quoted} Noches (${format(parseISO(q.quoted_date!), 'dd/MM')})`}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="destructive" size="icon" onClick={() => setFormData(p => ({...p, hotel_details: p.hotel_details.filter(d => d.id !== detail.id)}))}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" onClick={() => setFormData(p => ({...p, hotel_details: [...p.hotel_details, { id: uuidv4(), hotel_quote_id: '' }]}))}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Hotel
          </Button>
        </div>

        {/* Resumen Financiero */}
        <div className="col-span-full bg-gray-50 p-6 rounded-xl border grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs uppercase">Costo Base Total</Label>
            <p className="text-2xl font-bold">${formData.total_base_cost?.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs uppercase">Costo por Persona</Label>
            <p className="text-2xl font-bold text-blue-600">${formData.cost_per_paying_person?.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs uppercase">Precio Sugerido (+{desiredProfitPercentage}%)</Label>
            <p className="text-2xl font-bold text-green-600">${suggestedSellingPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Precios de Venta */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-xl bg-blue-50/30">
          <div className="space-y-2">
            <Label>Doble</Label>
            <Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} className="font-bold" />
          </div>
          <div className="space-y-2">
            <Label>Triple</Label>
            <Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} className="font-bold" />
          </div>
          <div className="space-y-2">
            <Label>Cuádruple</Label>
            <Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} className="font-bold" />
          </div>
          <div className="space-y-2">
            <Label>Niño</Label>
            <Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} className="font-bold" />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano w-full py-6 text-lg">
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
          Guardar Tour
        </Button>
      </form>
    </div>
  );
};

export default TourForm;