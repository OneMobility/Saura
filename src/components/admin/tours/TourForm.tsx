"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Calculator, TrendingUp, AlertCircle, ImageIcon, MapPin, Clock, Hotel, ListChecks, Armchair, Info, Upload, Crown, Star, DollarSign, BusFront, CheckCircle2, Wallet } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, addDays } from 'date-fns';
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
import { stripHtmlTags } from '@/utils/html';
import { Badge } from '@/components/ui/badge';

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
  total_paid: number;
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
  total_paid: number;
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
  transport_only_price: number;
  other_income: number;
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
  clients?: any[];
}

interface TourFormProps {
  tourId?: string;
  onSave: () => void;
  costOptimizationMode?: boolean;
}

const TourForm: React.FC<TourFormProps> = ({ tourId, onSave, costOptimizationMode = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Tour>({
    title: '', slug: '', description: '', full_content: '', duration: '', includes: [], itinerary: [],
    bus_id: null, bus_capacity: 0, bus_cost: 0, courtesies: 0, hotel_details: [], provider_details: [],
    selling_price_double_occupancy: 0, selling_price_triple_occupancy: 0, selling_price_quad_occupancy: 0,
    selling_price_child: 0, transport_only_price: 0, other_income: 0, departure_date: null, return_date: null, departure_time: '08:00', return_time: '18:00',
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

  const selectedHotelQuote = useMemo(() => {
    if (formData.hotel_details.length > 0) {
      const quoteId = formData.hotel_details[0].hotel_quote_id;
      return availableHotelQuotes.find(q => q.id === quoteId);
    }
    return null;
  }, [formData.hotel_details, availableHotelQuotes]);

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
                                       ((quote.num_courtesy_rooms || 0) * (quote.cost_per_night_quad || 0))) * numNights;
          return { ...quote, estimated_total_cost, total_paid: quote.total_paid || 0 };
        });
        setAvailableHotelQuotes(quotesWithCost);
      }
      if (busesRes.data) setAvailableBuses(busesRes.data.map((b: any) => ({...b, total_paid: b.total_paid || 0})));
      if (providersRes.data) setAvailableProviders(providersRes.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTourData = async () => {
      if (tourId && tourId !== 'new') {
        setLoadingInitialData(true);
        const { data } = await supabase.from('tours').select('*, clients(total_amount, total_paid, status)').eq('id', tourId).single();
        if (data) {
          setFormData({
            ...data,
            includes: data.includes || [], itinerary: data.itinerary || [],
            hotel_details: data.hotel_details || [], provider_details: data.provider_details || [],
            description: stripHtmlTags(data.description)
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
    const busPaid = bus?.total_paid || 0;

    const providerCost = formData.provider_details.reduce((sum, p) => sum + (p.cost_per_unit_snapshot * p.quantity), 0);
    
    let hotelCost = 0;
    let hotelPaid = 0;
    formData.hotel_details.forEach(d => {
      const q = availableHotelQuotes.find(q => q.id === d.hotel_quote_id);
      hotelCost += (q?.estimated_total_cost || 0);
      hotelPaid += (q?.total_paid || 0);
    });

    const activeClients = (formData.clients || []).filter((c: any) => c.status !== 'cancelled');
    const clientsTotalContracted = activeClients.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
    const clientsActuallyPaid = activeClients.reduce((sum: number, c: any) => sum + (c.total_paid || 0), 0);

    const totalCost = busCost + providerCost + hotelCost;
    const totalPaidToSuppliers = busPaid + hotelPaid;
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
      busCost, busPaid, hotelCost, hotelPaid, providerCost, totalCost, totalPaidToSuppliers, capacity, projectedProfit,
      clientsTotalContracted, clientsActuallyPaid,
      beQuad: formData.selling_price_quad_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_quad_occupancy) : 0,
      beTriple: formData.selling_price_triple_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_triple_occupancy) : 0,
      beDouble: formData.selling_price_double_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_double_occupancy) : 0,
      recPrice: {
        quad: avgRequiredPerPerson, triple: avgRequiredPerPerson * 1.12, double: avgRequiredPerPerson * 1.25, child: avgRequiredPerPerson * 0.75
      }
    };
  }, [formData, projectedSales, desiredProfitFixed, availableBuses, availableHotelQuotes]);

  const generateDefaultDescription = useCallback((isFullContent: boolean) => {
    const hotelName = selectedHotelQuote?.name || 'Hospedaje de Calidad';
    const busName = availableBuses.find(b => b.id === formData.bus_id)?.name || 'Autobús Turístico';
    const departure = formData.departure_date ? format(parseISO(formData.departure_date), 'dd/MM/yy', { locale: es }) : 'Fecha de Salida';
    const returnDateStr = formData.return_date ? format(parseISO(formData.return_date), 'dd/MM/yy', { locale: es }) : 'Fecha de Regreso';
    const nights = selectedHotelQuote?.num_nights_quoted || 0;
    const nightsDisplay = nights > 0 ? `${nights} noche${nights > 1 ? 's' : ''}` : 'Estadía';

    if (!isFullContent) {
      return `🌴 VIAJE A ${formData.title.toUpperCase() || 'DESTINO'} 🌴\n🗓 Salida: ${departure}\n🏨 Estadía: ${nightsDisplay}\n🗓 Regreso: ${returnDateStr}\n🚍 Autobús: ${busName}\n🏨 Hotel: ${hotelName}`.substring(0, 160);
    }

    return `<h2>Detalles del Viaje</h2><p>🌴 VIAJE A ${formData.title.toUpperCase()} 🌴</p><p>🗓 Salida: ${departure}</p><p>🏨 Estadía: ${nightsDisplay}</p><p>🗓 Regreso: ${returnDateStr}</p><p>🚍 Autobús: ${busName}</p><p>🏨 Hotel: ${hotelName}</p><h2>Servicios Incluidos</h2><ul><li>Transporte en ${busName}</li><li>Hospedaje en ${hotelName}</li><li>Seguro de viajero</li></ul>`;
  }, [formData.title, formData.departure_date, formData.return_date, formData.bus_id, availableBuses, selectedHotelQuote]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => {
      const numericFields = ['bus_capacity', 'courtesies', 'selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'transport_only_price', 'other_income'];
      const updated = { ...prev, [id]: numericFields.includes(id) ? parseFloat(value) || 0 : value };
      if (id === 'title') updated.slug = value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      return updated;
    });
  };

  const handleRichTextChange = (field: 'description' | 'full_content', content: string) => {
    setFormData(prev => ({ ...prev, [field]: content }));
  };

  const handleDateSelect = (field: 'departure_date' | 'return_date', date: Date | undefined) => {
    const formatted = date ? format(date, 'yyyy-MM-dd') : null;
    if (field === 'departure_date') { setDepartureDate(date); setFormData(p => ({ ...p, departure_date: formatted })); }
    else { setReturnDate(date); setFormData(p => ({ ...p, return_date: formatted })); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImageUrlPreview(URL.createObjectURL(file)); }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const fileName = `${uuidv4()}-${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('tour-images').upload(fileName, file);
      if (uploadError) return null;
      const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) { return null; } finally { setIsUploadingImage(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) { setIsSubmitting(false); return; }
      finalImageUrl = uploadedUrl;
    }
    const finalDescription = formData.description.trim() === '' ? generateDefaultDescription(false) : formData.description;
    const finalFullContent = formData.full_content.trim() === '' ? generateDefaultDescription(true) : formData.full_content;
    const { data: { user } } = await supabase.auth.getUser();
    const dataToSave = { 
      ...formData, image_url: finalImageUrl, description: finalDescription, full_content: finalFullContent, user_id: user?.id,
      total_base_cost: financialSummary.totalCost, paying_clients_count: financialSummary.capacity,
      cost_per_paying_person: financialSummary.capacity > 0 ? financialSummary.totalCost / financialSummary.capacity : 0,
      selling_price_per_person: formData.selling_price_double_occupancy 
    };
    const { error } = tourId ? await supabase.from('tours').update(dataToSave).eq('id', tourId) : await supabase.from('tours').insert(dataToSave);
    if (error) toast.error(`Error: ${error.message}`);
    else { toast.success('Tour guardado.'); onSave(); }
    setIsSubmitting(false);
  };

  const addInclude = () => setFormData(p => ({ ...p, includes: [...p.includes, ''] }));
  const removeInclude = (idx: number) => setFormData(p => ({ ...p, includes: p.includes.filter((_, i) => i !== idx) }));
  const updateInclude = (idx: number, val: string) => setFormData(p => {
    const newI = [...p.includes]; newI[idx] = val; return { ...p, includes: newI };
  });

  const addProviderDetail = () => setFormData(p => ({
    ...p, provider_details: [...p.provider_details, { id: uuidv4(), provider_id: '', quantity: 1, cost_per_unit_snapshot: 0, selling_price_per_unit_snapshot: 0, name_snapshot: '', service_type_snapshot: '', unit_type_snapshot: 'person' }],
  }));

  const removeProviderDetail = (id: string) => setFormData(p => ({ ...p, provider_details: p.provider_details.filter(d => d.id !== id) }));

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <Card className="border-t-4 border-rosa-mexicano shadow-xl">
        <CardHeader className="bg-gray-50/50">
          <CardTitle className="text-2xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2"><TrendingUp className="text-rosa-mexicano" /> Simulador y Seguimiento Financiero</div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="p-5 bg-muted/40 rounded-2xl border border-dashed border-gray-300">
              <h3 className="text-[10px] font-black uppercase text-gray-500 mb-4 tracking-widest">Egresos Totales Est.</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span>🚌 Bus:</span> <span className="font-bold">${financialSummary.busCost.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>🏨 Hotel:</span> <span className="font-bold">${financialSummary.hotelCost.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span>🎟️ Servicios:</span> <span className="font-bold">${financialSummary.providerCost.toLocaleString()}</span></div>
                <div className="pt-3 mt-2 border-t-2 border-rosa-mexicano/20 flex justify-between text-xl font-black text-rosa-mexicano"><span>TOTAL:</span><span>${financialSummary.totalCost.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200">
              <h3 className="text-[10px] font-black uppercase text-amber-700 mb-4 flex items-center gap-1 tracking-widest"><DollarSign className="h-3 w-3" /> Liquidación Real</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs"><span>Pagado a Bus:</span> <span className="font-bold text-amber-900">${financialSummary.busPaid.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs"><span>Pagado a Hoteles:</span> <span className="font-bold text-amber-900">${financialSummary.hotelPaid.toLocaleString()}</span></div>
                <div className="pt-3 mt-2 border-t border-amber-200">
                   <div className="text-[9px] uppercase font-black text-amber-600 mb-1">Faltan para liquidar costos:</div>
                   <div className="text-2xl font-black text-amber-900">${(financialSummary.totalCost - financialSummary.totalPaidToSuppliers).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-rosa-mexicano/5 rounded-2xl border border-rosa-mexicano/20">
              <h3 className="text-[10px] font-black uppercase text-rosa-mexicano mb-4 flex items-center gap-1 tracking-widest"><Wallet className="h-3 w-3" /> Cobranza Clientes</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs"><span>Meta de Cobro:</span> <span className="font-bold text-gray-900">${financialSummary.clientsTotalContracted.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs"><span>Abonado Real:</span> <span className="font-bold text-green-600">${financialSummary.clientsActuallyPaid.toLocaleString()}</span></div>
                <div className="pt-3 mt-2 border-t border-rosa-mexicano/10">
                   <div className="text-[9px] uppercase font-black text-gray-400 mb-1">Pendiente por cobrar:</div>
                   <div className="text-2xl font-black text-rosa-mexicano">${(financialSummary.clientsTotalContracted - financialSummary.clientsActuallyPaid).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-green-50/60 rounded-2xl border border-green-100">
              <h3 className="text-[10px] font-black uppercase text-green-600 mb-4 flex items-center gap-1 tracking-widest"><Calculator className="h-3 w-3" /> Precios Sugeridos</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] font-black text-gray-500 uppercase">Utilidad Meta:</Label>
                  <Input type="number" value={desiredProfitFixed} onChange={e => setDesiredProfitFixed(parseFloat(e.target.value) || 0)} className="h-7 bg-white font-bold text-xs" />
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-green-100 grid grid-cols-2 gap-2 text-[10px] font-black text-green-700">
                  <div>QUAD: ${financialSummary.recPrice.quad.toFixed(0)}</div>
                  <div>TRIP: ${financialSummary.recPrice.triple.toFixed(0)}</div>
                  <div>DBL: ${financialSummary.recPrice.double.toFixed(0)}</div>
                  <div>NIÑO: ${financialSummary.recPrice.child.toFixed(0)}</div>
                </div>
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
                <div className="space-y-2"><Label>Nombre del Tour</Label><Input id="title" value={formData.title} onChange={handleChange} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Autobús</Label>
                    <Select value={formData.bus_id || ''} onValueChange={val => {
                      const bus = availableBuses.find(b => b.id === val);
                      setFormData(p => ({ ...p, bus_id: val, bus_capacity: bus?.total_capacity || 0, bus_cost: bus?.rental_cost || 0 }));
                    }}><SelectTrigger><SelectValue placeholder="Elegir Bus" /></SelectTrigger><SelectContent>{availableBuses.map(b => (<SelectItem key={b.id} value={b.id}>{b.name} (Costo: ${b.rental_cost.toLocaleString()})</SelectItem>))}</SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>Duración</Label><Input id="duration" value={formData.duration} onChange={handleChange} placeholder="Ej: 3 días, 2 noches" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rosa-mexicano/30">
              <CardHeader><CardTitle className="text-lg">Precios de Venta</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Doble (p/p)</Label><Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} className="font-bold" /></div>
                <div className="space-y-2"><Label>Triple (p/p)</Label><Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} className="font-bold" /></div>
                <div className="space-y-2"><Label>Cuádruple (p/p)</Label><Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} className="font-bold" /></div>
                <div className="space-y-2"><Label>Niño</Label><Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} className="font-bold" /></div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-rosa-mexicano" /> Tiempos y Foto</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2"><Label>Imagen Principal</Label><div className="relative border-2 border-dashed rounded-xl h-48 flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors group">{isUploadingImage ? (<div className="text-center"><Loader2 className="animate-spin mx-auto mb-2 text-rosa-mexicano" /><span className="text-xs font-bold text-rosa-mexicano">Subiendo...</span></div>) : imageUrlPreview ? (<div className="relative w-full h-full"><img src={imageUrlPreview} className="w-full h-full object-cover" alt="Preview" /></div>) : (<div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2" /><span className="text-xs">Haz clic para seleccionar foto</span></div>)}<input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={handleFileChange} accept="image/*" disabled={isUploadingImage} /></div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Salida</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start gap-2"><CalendarIcon className="h-4 w-4" />{departureDate ? format(departureDate, 'dd/MM/yy') : 'Fecha'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={departureDate} onSelect={d => handleDateSelect('departure_date', d)} locale={es} /></PopoverContent></Popover></div>
                  <div className="space-y-2"><Label>Regreso</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start gap-2"><CalendarIcon className="h-4 w-4" />{returnDate ? format(returnDate, 'dd/MM/yy') : 'Fecha'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={returnDate} onSelect={d => handleDateSelect('return_date', d)} locale={es} /></PopoverContent></Popover></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 flex gap-4 z-50"><Button type="button" variant="outline" onClick={() => navigate('/admin/tours')} className="bg-white shadow-lg px-6 h-12">Cancelar</Button><Button type="submit" disabled={isSubmitting || isUploadingImage} className="bg-rosa-mexicano text-white shadow-lg px-10 h-12 text-lg font-bold rounded-xl">{isSubmitting ? (<><Loader2 className="animate-spin mr-2" /> Guardando...</>) : (<><Save className="mr-2" /> Guardar Tour</>)}</Button></div>
      </form>
    </div>
  );
};

export default TourForm;