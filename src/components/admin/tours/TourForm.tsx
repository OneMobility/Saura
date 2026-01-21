"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Calculator, TrendingUp, AlertCircle, Info, Image as ImageIcon, MapPin, Clock } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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
  
  // Estados de simulación
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

  // Carga de dependencias
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

  // Organizar hoteles agrupados para el selector
  const groupedAndSortedQuotes = useMemo(() => {
    const groups: Record<string, HotelQuote[]> = {};
    availableHotelQuotes.forEach(quote => {
      if (!groups[quote.name]) groups[quote.name] = [];
      groups[quote.name].push(quote);
    });
    return Object.entries(groups).sort((a, b) => {
      const minA = Math.min(...a[1].map(q => q.estimated_total_cost));
      const minB = Math.min(...b[1].map(q => q.estimated_total_cost));
      return minA - minB;
    });
  }, [availableHotelQuotes]);

  // Carga de datos del tour si es edición
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

  // Lógica financiera avanzada
  const financialSummary = useMemo(() => {
    const bus = availableBuses.find(b => b.id === formData.bus_id);
    const busCost = bus?.rental_cost || 0;
    const providerCost = formData.provider_details.reduce((sum, p) => sum + (p.cost_per_unit_snapshot * p.quantity), 0);
    const hotelCost = formData.hotel_details.reduce((sum, d) => {
      const q = availableHotelQuotes.find(q => q.id === d.hotel_quote_id);
      return sum + (q?.estimated_total_cost || 0);
    }, 0);

    const totalCost = busCost + providerCost + hotelCost;
    const capacity = (formData.bus_capacity || bus?.total_capacity || 0) - formData.courtesies;
    
    const currentRevenue = (projectedSales.double * formData.selling_price_double_occupancy) +
                           (projectedSales.triple * formData.selling_price_triple_occupancy) +
                           (projectedSales.quad * formData.selling_price_quad_occupancy) +
                           (projectedSales.child * formData.selling_price_child) +
                           formData.other_income;
    
    const projectedProfit = currentRevenue - totalCost;

    const beQuad = formData.selling_price_quad_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_quad_occupancy) : 0;
    const beTriple = formData.selling_price_triple_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_triple_occupancy) : 0;
    const beDouble = formData.selling_price_double_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_double_occupancy) : 0;

    const targetRevenue = totalCost + desiredProfitFixed;
    const avgRequiredPerPerson = capacity > 0 ? targetRevenue / capacity : 0;

    return {
      busCost, hotelCost, providerCost,
      totalCost,
      capacity,
      currentRevenue,
      projectedProfit,
      beQuad, beTriple, beDouble,
      recPrice: {
        quad: avgRequiredPerPerson,
        triple: avgRequiredPerPerson * 1.12,
        double: avgRequiredPerPerson * 1.25,
        child: avgRequiredPerPerson * 0.75
      }
    };
  }, [formData, projectedSales, desiredProfitFixed, availableBuses, availableHotelQuotes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => {
      const numericFields = ['bus_capacity', 'courtesies', 'selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'other_income'];
      const updated = { ...prev, [id]: numericFields.includes(id) ? parseFloat(value) || 0 : value };
      if (id === 'title') updated.slug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      return updated;
    });
  };

  const handleDateSelect = (field: 'departure_date' | 'return_date', date: Date | undefined) => {
    const formatted = date ? format(date, 'yyyy-MM-dd') : null;
    if (field === 'departure_date') { setDepartureDate(date); setFormData(p => ({ ...p, departure_date: formatted })); }
    else { setReturnDate(date); setFormData(p => ({ ...p, return_date: formatted })); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrlPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const fileName = `${uuidv4()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage.from('tour-images').upload(fileName, imageFile);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    const dataToSave = { 
      ...formData, 
      image_url: finalImageUrl,
      user_id: user?.id,
      total_base_cost: financialSummary.totalCost,
      paying_clients_count: financialSummary.capacity,
      cost_per_paying_person: financialSummary.capacity > 0 ? financialSummary.totalCost / financialSummary.capacity : 0
    };
    
    const { error } = tourId 
      ? await supabase.from('tours').update(dataToSave).eq('id', tourId)
      : await supabase.from('tours').insert(dataToSave);
      
    if (error) toast.error('Error al guardar el tour.');
    else { toast.success('Tour publicado con éxito.'); onSave(); }
    setIsSubmitting(false);
  };

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Análisis Financiero (Simulador) */}
      <Card className="border-t-4 border-rosa-mexicano shadow-xl">
        <CardHeader className="bg-gray-50/50">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-rosa-mexicano" /> Calculadora de Rentabilidad Avanzada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gastos Reales */}
            <div className="p-5 bg-muted/40 rounded-2xl border border-dashed border-gray-300">
              <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">Gastos del Tour</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>🚌 Transporte:</span> <span className="font-bold">${financialSummary.busCost.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>🏨 Hospedaje:</span> <span className="font-bold">${financialSummary.hotelCost.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>🎟️ Proveedores:</span> <span className="font-bold">${financialSummary.providerCost.toLocaleString()}</span></div>
                <div className="pt-3 mt-2 border-t-2 border-rosa-mexicano/20 flex justify-between text-xl font-black text-rosa-mexicano">
                  <span>EGRESO TOTAL:</span>
                  <span>${financialSummary.totalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Punto de Equilibrio */}
            <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100">
              <h3 className="text-xs font-black uppercase text-blue-600 mb-4 flex items-center gap-1 tracking-widest">
                <AlertCircle className="h-4 w-4" /> Punto de Equilibrio
              </h3>
              <div className="space-y-3">
                <p className="text-[10px] leading-tight text-blue-800 font-medium">Asientos necesarios para cubrir costos según tipo de venta dominante:</p>
                <div className="flex justify-between text-sm"><span>Solo Cuádruple:</span> <span className="font-bold bg-blue-100 px-2 rounded">{financialSummary.beQuad} pax</span></div>
                <div className="flex justify-between text-sm"><span>Solo Triple:</span> <span className="font-bold bg-blue-100 px-2 rounded">{financialSummary.beTriple} pax</span></div>
                <div className="flex justify-between text-sm"><span>Solo Doble:</span> <span className="font-bold bg-blue-100 px-2 rounded">{financialSummary.beDouble} pax</span></div>
                <p className="text-[10px] text-gray-500 italic mt-2">* Basado en {financialSummary.capacity} asientos vendibles.</p>
              </div>
            </div>

            {/* Utilidad Meta y Recomendación */}
            <div className="p-5 bg-green-50/60 rounded-2xl border border-green-100">
              <h3 className="text-xs font-black uppercase text-green-600 mb-4 flex items-center gap-1 tracking-widest">
                <Calculator className="h-4 w-4" /> Utilidad Deseada
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] font-bold">Meta de ganancia neta ($):</Label>
                  <Input 
                    type="number" 
                    value={desiredProfitFixed} 
                    onChange={e => setDesiredProfitFixed(parseFloat(e.target.value) || 0)}
                    className="h-9 bg-white font-bold border-green-200"
                  />
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-green-100">
                  <p className="text-[10px] font-black text-gray-400 mb-2">PRECIOS RECOMENDADOS:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-black">
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
          <div className="p-6 bg-gray-900 rounded-3xl text-white shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp className="h-40 w-40" /></div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">Simulador de Escenario Mixto</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              {['double', 'triple', 'quad', 'child'].map((type) => (
                <div key={type} className="space-y-2">
                  <Label className="capitalize text-xs font-bold text-gray-400">Ventas {type}</Label>
                  <Input 
                    type="number" 
                    value={projectedSales[type as keyof typeof projectedSales]}
                    onChange={e => setProjectedSales({...projectedSales, [type]: parseInt(e.target.value) || 0})}
                    className="bg-white/10 border-white/20 text-white font-bold h-12 text-xl focus:bg-white/20"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-white/10 relative z-10">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Capacidad Bus</span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-4xl font-black",
                    (projectedSales.double + projectedSales.triple + projectedSales.quad + projectedSales.child) > financialSummary.capacity ? "text-red-500" : "text-rosa-mexicano"
                  )}>
                    {projectedSales.double + projectedSales.triple + projectedSales.quad + projectedSales.child}
                  </span>
                  <span className="text-xl text-gray-500">/ {financialSummary.capacity} pax</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Utilidad Estimada</span>
                <span className={cn(
                  "text-5xl font-black tracking-tighter",
                  financialSummary.projectedProfit >= 0 ? "text-green-400" : "text-red-500"
                )}>
                  ${financialSummary.projectedProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Formulario de Datos y Logística */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Columna Izquierda: Logística y Precios */}
          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="text-lg">Logística del Viaje</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Nombre del Tour</Label>
                  <Input id="title" value={formData.title} onChange={handleChange} placeholder="Ej: Semana Santa en Huasteca" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Autobús</Label>
                    <Select value={formData.bus_id || ''} onValueChange={val => {
                      const bus = availableBuses.find(b => b.id === val);
                      setFormData(p => ({ ...p, bus_id: val, bus_capacity: bus?.total_capacity || 0, bus_cost: bus?.rental_cost || 0 }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Elegir Bus" /></SelectTrigger>
                      <SelectContent>
                        {availableBuses.map(b => <SelectItem key={b.id} value={b.id}>{b.name} (${b.rental_cost})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coordinadores (Lugares ocupados)</Label>
                    <Input type="number" id="courtesies" value={formData.courtesies} onChange={handleChange} />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2"><HotelIcon className="h-4 w-4" /> Hoteles Vinculados</Label>
                  {formData.hotel_details.map((detail, index) => (
                    <div key={detail.id} className="flex gap-2">
                      <Select value={detail.hotel_quote_id} onValueChange={val => {
                        const newH = [...formData.hotel_details]; newH[index].hotel_quote_id = val;
                        setFormData({...formData, hotel_details: newH});
                      }}>
                        <SelectTrigger className="flex-grow">
                          <SelectValue placeholder="Seleccionar Cotización" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupedAndSortedQuotes.map(([name, quotes]) => (
                            <SelectGroup key={name}>
                              <SelectLabel className="bg-muted py-1 px-2 text-rosa-mexicano font-bold">{name}</SelectLabel>
                              {quotes.map(q => (
                                <SelectItem key={q.id} value={q.id}>
                                  ${q.estimated_total_cost.toFixed(0)} - {q.num_nights_quoted} Noches ({format(parseISO(q.quoted_date!), 'dd/MM')})
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, hotel_details: formData.hotel_details.filter(d => d.id !== detail.id)})}>
                        <MinusCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => setFormData({...formData, hotel_details: [...formData.hotel_details, { id: uuidv4(), hotel_quote_id: '' }]})}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Vincular otro Hotel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rosa-mexicano/30">
              <CardHeader><CardTitle className="text-lg">Precios de Venta Oficiales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doble (p/p)</Label>
                  <Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} className="border-rosa-mexicano/50 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Triple (p/p)</Label>
                  <Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} className="border-rosa-mexicano/50 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Cuádruple (p/p)</Label>
                  <Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} className="border-rosa-mexicano/50 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Niño (-12 años)</Label>
                  <Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} className="border-rosa-mexicano/50 font-bold" />
                </div>
                <div className="space-y-2 col-span-2 pt-2 border-t">
                  <Label>Otros Ingresos (Ej: Patrocinios)</Label>
                  <Input type="number" id="other_income" value={formData.other_income} onChange={handleChange} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Multimedia y Fechas */}
          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="text-lg">Fechas y Foto</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Foto de Portada</Label>
                    <div className="relative group cursor-pointer border-2 border-dashed rounded-xl h-48 flex items-center justify-center overflow-hidden">
                      {imageUrlPreview ? (
                        <img src={imageUrlPreview} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2" /><span>Subir Imagen</span></div>
                      )}
                      <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Salida</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">{departureDate ? format(departureDate, 'dd/MM/yy') : 'Fecha'}</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={departureDate} onSelect={d => handleDateSelect('departure_date', d)} locale={es} /></PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Input id="departure_time" value={formData.departure_time || ''} onChange={handleChange} placeholder="08:00" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción Corta (Venta)</Label>
                  <Textarea id="description" value={formData.description} onChange={handleChange} placeholder="Engancha a tus clientes..." className="h-24" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Itinerario y Detalles</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Días del Viaje</Label>
                  {formData.itinerary.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                      <div className="bg-rosa-mexicano text-white rounded-full h-6 w-6 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-2">{item.day}</div>
                      <Textarea 
                        value={item.activity} 
                        onChange={e => {
                          const newI = [...formData.itinerary]; newI[index].activity = e.target.value;
                          setFormData({...formData, itinerary: newI});
                        }} 
                        className="bg-white" 
                        placeholder="Actividades del día..."
                      />
                      <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, itinerary: formData.itinerary.filter((_, i) => i !== index)})}>
                        <MinusCircle className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={() => setFormData({...formData, itinerary: [...formData.itinerary, { day: formData.itinerary.length + 1, activity: '' }]})}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Día
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sección de Texto Largo (Debajo de las columnas) */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Información Detallada (Página del Tour)</CardTitle></CardHeader>
          <CardContent>
            <RichTextEditor 
              value={formData.full_content} 
              onChange={val => setFormData({...formData, full_content: val})} 
              placeholder="Detalles sobre puntos de reunión, recomendaciones, equipo necesario..."
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>

        <div className="fixed bottom-6 right-6 flex gap-4 z-50">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tours')} className="bg-white shadow-lg">Cancelar</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano text-white shadow-lg px-8 py-6 h-auto text-lg font-bold rounded-2xl">
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            {tourId ? 'Actualizar Tour' : 'Publicar Tour'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TourForm;