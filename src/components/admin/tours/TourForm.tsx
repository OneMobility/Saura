"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Calculator, TrendingUp, AlertCircle, ImageIcon, MapPin, Clock, Hotel, ListChecks, Armchair, Info, Upload, Crown } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useNavigate } from 'react-router-dom';
import { TourProviderService, AvailableProvider, SeatLayout } from '@/types/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/RichTextEditor';
import TourSeatMap from '@/components/TourSeatMap';

interface HotelQuote {
  id: string;
  name: string;
  location: string;
  quoted_date: string | null;
  num_nights_quoted: number;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
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
  
  const [desiredProfitFixed, setDesiredProfitFixed] = useState(45000);
  const [projectedSales, setProjectedSales] = useState({ double: 0, triple: 0, quad: 0, child: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<HotelQuote[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);

  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);

  const selectedBusLayout = useMemo(() => {
    return availableBuses.find(b => b.id === formData.bus_id)?.seat_layout_json || null;
  }, [formData.bus_id, availableBuses]);

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

  // Lógica de recomendación y resaltado mensual para el selector de hoteles
  const hotelStats = useMemo(() => {
    const monthlyMins: Record<string, number> = {};
    let absMin = Infinity;
    let absId = '';

    availableHotelQuotes.forEach(q => {
      if (!q.quoted_date) return;
      const monthKey = format(parseISO(q.quoted_date), 'yyyy-MM');
      if (!monthlyMins[monthKey] || q.estimated_total_cost < monthlyMins[monthKey]) {
        monthlyMins[monthKey] = q.estimated_total_cost;
      }
      if (q.estimated_total_cost < absMin) {
        absMin = q.estimated_total_cost;
        absId = q.id;
      }
    });
    return { monthlyMins, absoluteCheapestId: absId };
  }, [availableHotelQuotes]);

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

  useEffect(() => {
    const fetchTourData = async () => {
      if (tourId && tourId !== 'new') {
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

    const targetRevenue = totalCost + desiredProfitFixed;
    const avgRequiredPerPerson = capacity > 0 ? targetRevenue / capacity : 0;

    return {
      busCost, hotelCost, providerCost, totalCost, capacity, projectedProfit,
      beQuad: formData.selling_price_quad_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_quad_occupancy) : 0,
      beTriple: formData.selling_price_triple_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_triple_occupancy) : 0,
      beDouble: formData.selling_price_double_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_double_occupancy) : 0,
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

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const fileName = `${uuidv4()}-${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('tour-images').upload(fileName, file);
      
      if (uploadError) {
        toast.error(`Error de subida: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      toast.error("Error inesperado al subir la imagen.");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalImageUrl = formData.image_url;

    if (!tourId && !imageFile) {
      toast.error("Debes seleccionar una imagen para publicar el tour.");
      setIsSubmitting(false);
      return;
    }

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadedUrl;
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
      
    if (error) {
      console.error(error);
      toast.error(`Error al guardar el tour: ${error.message}`);
    } else {
      toast.success('Tour publicado con éxito.');
      onSave();
    }
    setIsSubmitting(false);
  };

  const addInclude = () => setFormData(p => ({ ...p, includes: [...p.includes, ''] }));
  const removeInclude = (idx: number) => setFormData(p => ({ ...p, includes: p.includes.filter((_, i) => i !== idx) }));
  const updateInclude = (idx: number, val: string) => setFormData(p => {
    const newI = [...p.includes]; newI[idx] = val; return { ...p, includes: newI };
  });

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* SIMULADOR FINANCIERO */}
      <Card className="border-t-4 border-rosa-mexicano shadow-xl">
        <CardHeader className="bg-gray-50/50">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-rosa-mexicano" /> Simulador de Rentabilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 bg-muted/40 rounded-2xl border border-dashed border-gray-300">
              <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">Egresos</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>🚌 Bus:</span> <span className="font-bold">${financialSummary.busCost.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>🏨 Hotel:</span> <span className="font-bold">${financialSummary.hotelCost.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>🎟️ Servicios:</span> <span className="font-bold">${financialSummary.providerCost.toLocaleString()}</span></div>
                <div className="pt-3 mt-2 border-t-2 border-rosa-mexicano/20 flex justify-between text-xl font-black text-rosa-mexicano">
                  <span>TOTAL:</span>
                  <span>${financialSummary.totalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100">
              <h3 className="text-xs font-black uppercase text-blue-600 mb-4 flex items-center gap-1 tracking-widest">
                <AlertCircle className="h-4 w-4" /> Equilibrio
              </h3>
              <div className="space-y-3">
                <p className="text-[10px] leading-tight text-blue-800 font-medium">Pax para cubrir gastos:</p>
                <div className="flex justify-between text-sm"><span>En Cuádruple:</span> <span className="font-bold">{financialSummary.beQuad} pax</span></div>
                <div className="flex justify-between text-sm"><span>En Triple:</span> <span className="font-bold">{financialSummary.beTriple} pax</span></div>
                <div className="flex justify-between text-sm"><span>En Doble:</span> <span className="font-bold">{financialSummary.beDouble} pax</span></div>
              </div>
            </div>

            <div className="p-5 bg-green-50/60 rounded-2xl border border-green-100">
              <h3 className="text-xs font-black uppercase text-green-600 mb-4 flex items-center gap-1 tracking-widest">
                <Calculator className="h-4 w-4" /> Recomendaciones
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] font-bold text-gray-500">Ganancia meta ($):</Label>
                  <Input type="number" value={desiredProfitFixed} onChange={e => setDesiredProfitFixed(parseFloat(e.target.value) || 0)} className="h-8 bg-white font-bold" />
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-green-100 grid grid-cols-2 gap-2 text-[11px] font-black text-green-700">
                  <div>QUAD: ${financialSummary.recPrice.quad.toFixed(0)}</div>
                  <div>TRIP: ${financialSummary.recPrice.triple.toFixed(0)}</div>
                  <div>DBL: ${financialSummary.recPrice.double.toFixed(0)}</div>
                  <div>NIÑO: ${financialSummary.recPrice.child.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-900 rounded-3xl text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-6">Proyección de Utilidad Real</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {['double', 'triple', 'quad', 'child'].map((type) => (
                <div key={type} className="space-y-2">
                  <Label className="capitalize text-xs font-bold text-gray-400">Ventas {type}</Label>
                  <Input 
                    type="number" 
                    value={projectedSales[type as keyof typeof projectedSales]}
                    onChange={e => setProjectedSales({...projectedSales, [type]: parseInt(e.target.value) || 0})}
                    className="bg-white/10 border-white/20 text-white font-bold h-12 text-xl"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-bold uppercase">Ocupación:</span>
                <span className={cn("text-4xl font-black", (projectedSales.double + projectedSales.triple + projectedSales.quad + projectedSales.child) > financialSummary.capacity ? "text-red-500" : "text-rosa-mexicano")}>
                  {projectedSales.double + projectedSales.triple + projectedSales.quad + projectedSales.child}
                </span>
                <span className="text-xl text-gray-500">/ {financialSummary.capacity} pax</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-bold block mb-1">Utilidad Estimada</span>
                <span className={cn("text-5xl font-black", financialSummary.projectedProfit >= 0 ? "text-green-400" : "text-red-500")}>
                  ${financialSummary.projectedProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-rosa-mexicano" /> Datos Principales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Tour</Label>
                  <Input id="title" value={formData.title} onChange={handleChange} required />
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
                        {availableBuses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duración</Label>
                    <Input id="duration" value={formData.duration} onChange={handleChange} placeholder="Ej: 3 días, 2 noches" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Coordinadores (No pagan)</Label>
                    <Input type="number" id="courtesies" value={formData.courtesies} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Otros Ingresos ($)</Label>
                    <Input type="number" id="other_income" value={formData.other_income} onChange={handleChange} />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="flex items-center gap-2"><Hotel className="h-4 w-4" /> Hoteles Asociados</Label>
                  {formData.hotel_details.map((detail, index) => (
                    <div key={detail.id} className="flex gap-2">
                      <Select value={detail.hotel_quote_id} onValueChange={val => {
                        const newH = [...formData.hotel_details]; newH[index].hotel_quote_id = val;
                        setFormData({...formData, hotel_details: newH});
                      }}>
                        <SelectTrigger className="flex-grow">
                          <SelectValue placeholder="Elegir Cotización" />
                        </SelectTrigger>
                        <SelectContent>
                          {groupedAndSortedQuotes.map(([name, quotes]) => (
                            <SelectGroup key={name}>
                              <SelectLabel className="bg-muted py-1 px-2 text-rosa-mexicano font-bold">{name}</SelectLabel>
                              {quotes.map(q => {
                                const monthKey = q.quoted_date ? format(parseISO(q.quoted_date), 'yyyy-MM') : '';
                                const isMonthlyCheapest = hotelStats.monthlyMins[monthKey] === q.estimated_total_cost;
                                const isRecommended = q.id === hotelStats.absoluteCheapestId;

                                return (
                                  <SelectItem key={q.id} value={q.id} className="cursor-pointer">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(isMonthlyCheapest ? "text-green-600 font-bold" : "text-foreground")}>
                                          ${q.estimated_total_cost.toLocaleString()}
                                        </span>
                                        {isRecommended && (
                                          <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <Crown className="h-3 w-3 fill-yellow-900" /> RECOMENDADO
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-muted-foreground">
                                        {q.num_nights_quoted} noches • {q.quoted_date ? format(parseISO(q.quoted_date), 'dd/MM/yy') : 'Sin fecha'}
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
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
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Hotel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rosa-mexicano/30">
              <CardHeader><CardTitle className="text-lg">Precios de Venta</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Doble (p/p)</Label><Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} className="font-bold border-rosa-mexicano/30" /></div>
                <div className="space-y-2"><Label>Triple (p/p)</Label><Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} className="font-bold border-rosa-mexicano/30" /></div>
                <div className="space-y-2"><Label>Cuádruple (p/p)</Label><Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} className="font-bold border-rosa-mexicano/30" /></div>
                <div className="space-y-2"><Label>Niño</Label><Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} className="font-bold border-rosa-mexicano/30" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-5 w-5 text-rosa-mexicano" /> ¿Qué Incluye?</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {formData.includes.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={item} onChange={e => updateInclude(idx, e.target.value)} placeholder="Ej: Desayunos" />
                    <Button variant="ghost" size="icon" onClick={() => removeInclude(idx)}><MinusCircle className="h-4 w-4 text-red-400" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={addInclude}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Inclusión</Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-rosa-mexicano" /> Tiempos y Foto</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Imagen Principal (Obligatoria)</Label>
                  <div className="relative border-2 border-dashed rounded-xl h-48 flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors group">
                    {isUploadingImage ? (
                      <div className="text-center">
                        <Loader2 className="animate-spin mx-auto mb-2 text-rosa-mexicano" />
                        <span className="text-xs font-bold text-rosa-mexicano">Subiendo...</span>
                      </div>
                    ) : imageUrlPreview ? (
                      <div className="relative w-full h-full">
                        <img src={imageUrlPreview} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <p className="text-white text-xs font-bold flex items-center gap-1"><Upload className="h-3 w-3" /> Cambiar Imagen</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="mx-auto mb-2" />
                        <span className="text-xs">Haz clic para seleccionar foto</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                      onChange={handleFileChange} 
                      accept="image/*"
                      disabled={isUploadingImage}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salida</Label>
                    <Popover>
                      <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start gap-2"><CalendarIcon className="h-4 w-4" />{departureDate ? format(departureDate, 'dd/MM/yy') : 'Fecha'}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={departureDate} onSelect={d => handleDateSelect('departure_date', d)} locale={es} /></PopoverContent>
                    </Popover>
                    <Input id="departure_time" value={formData.departure_time || ''} onChange={handleChange} placeholder="08:00 AM" />
                  </div>
                  <div className="space-y-2">
                    <Label>Regreso</Label>
                    <Popover>
                      <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start gap-2"><CalendarIcon className="h-4 w-4" />{returnDate ? format(returnDate, 'dd/MM/yy') : 'Fecha'}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={returnDate} onSelect={d => handleDateSelect('return_date', d)} locale={es} /></PopoverContent>
                    </Popover>
                    <Input id="return_time" value={formData.return_time || ''} onChange={handleChange} placeholder="06:00 PM" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Descripción de Venta (Corta)</CardTitle></CardHeader>
              <CardContent>
                <RichTextEditor value={formData.description} onChange={val => setFormData({...formData, description: val})} placeholder="Breve texto comercial..." className="min-h-[150px]" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* GESTIÓN DE ASIENTOS */}
        {formData.bus_id && (
          <Card className="border-2 border-rosa-mexicano/20 shadow-lg">
            <CardHeader className="bg-rosa-mexicano/5">
              <CardTitle className="text-xl flex items-center gap-2">
                <Armchair className="text-rosa-mexicano" /> Gestión de Asientos para este Tour
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-blue-50 p-4 rounded-xl mb-6 flex gap-4 items-start border border-blue-100">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">Instrucciones para el Administrador:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90">
                    <li>Haz clic en un asiento disponible para <strong>bloquearlo</strong> (aparecerá en gris).</li>
                    <li>Los asientos de <strong>Coordinador</strong> (morados) se asignan automáticamente según el número de cortesías.</li>
                    <li>Los asientos <strong>Ocupados</strong> (rojos) son reservas ya confirmadas de clientes.</li>
                  </ul>
                </div>
              </div>
              
              <div className="max-w-3xl mx-auto">
                <TourSeatMap
                  tourId={tourId || 'new-tour'}
                  busCapacity={formData.bus_capacity}
                  courtesies={formData.courtesies}
                  seatLayoutJson={selectedBusLayout}
                  adminMode={true}
                  readOnly={false}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Itinerario Detallado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {formData.itinerary.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg border">
                <div className="bg-rosa-mexicano text-white rounded-full h-6 w-6 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-2">{item.day}</div>
                <Textarea value={item.activity} onChange={e => {
                  const newI = [...formData.itinerary]; newI[idx].activity = e.target.value;
                  setFormData({...formData, itinerary: newI});
                }} className="bg-white" />
                <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, itinerary: formData.itinerary.filter((_, i) => i !== idx)})}><MinusCircle className="h-4 w-4 text-red-400" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={() => setFormData({...formData, itinerary: [...formData.itinerary, { day: formData.itinerary.length + 1, activity: '' }]})}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Día</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Información Adicional (Políticas, etc)</CardTitle></CardHeader>
          <CardContent>
            <RichTextEditor value={formData.full_content} onChange={val => setFormData({...formData, full_content: val})} placeholder="Detalles extra..." className="min-h-[300px]" />
          </CardContent>
        </Card>

        <div className="fixed bottom-6 right-6 flex gap-4 z-50">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tours')} className="bg-white shadow-lg px-6 h-12">Cancelar</Button>
          <Button type="submit" disabled={isSubmitting || isUploadingImage} className="bg-rosa-mexicano text-white shadow-lg px-10 h-12 text-lg font-bold rounded-xl">
            {isSubmitting || isUploadingImage ? (
              <><Loader2 className="animate-spin mr-2" /> {isUploadingImage ? 'Subiendo imagen...' : 'Guardando...'}</>
            ) : (
              <><Save className="mr-2" /> {tourId ? 'Actualizar Tour' : 'Publicar Tour'}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TourForm;