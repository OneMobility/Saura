"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Calculator, TrendingUp, ImageIcon, MapPin, Clock, Hotel, ListChecks, Armchair, Wallet, DollarSign, CheckCircle2, Star, BusFront } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  num_double_rooms: number;
  num_triple_rooms: number;
  num_quad_rooms: number;
  num_courtesy_rooms: number;
  is_active: boolean;
  total_paid: number;
  estimated_total_cost: number; // Added to interface
  quote_end_date: string | null;
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
  clients?: any[];
}

interface TourFormProps {
  tourId?: string;
  onSave: () => void;
  costOptimizationMode?: boolean;
}

// Helper function to calculate total cost
const calculateTotalQuoteCost = (h: any) => {
  return (((h.num_double_rooms || 0) * h.cost_per_night_double) +
          ((h.num_triple_rooms || 0) * h.cost_per_night_triple) +
          ((h.num_quad_rooms || 0) * h.cost_per_night_quad) -
          ((h.num_courtesy_rooms || 0) * (h.cost_per_night_quad || 0))) * (h.num_nights_quoted || 1);
};

const TourForm: React.FC<TourFormProps> = ({ tourId, onSave }) => {
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
  const [loadingData, setLoadingData] = useState(true);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<HotelQuote[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [hotelsRes, busesRes, providersRes] = await Promise.all([
        supabase.from('hotels').select('*').eq('is_active', true),
        supabase.from('buses').select('*').order('name', { ascending: true }),
        supabase.from('providers').select('*').eq('is_active', true).order('name', { ascending: true }),
      ]);

      if (hotelsRes.data) {
        setAvailableHotelQuotes(hotelsRes.data.map(q => {
          const total = calculateTotalQuoteCost(q);
          return {
            ...q, 
            estimated_total_cost: total,
            quoted_date: q.quoted_date || null,
          } as HotelQuote;
        }));
      }
      if (busesRes.data) setAvailableBuses(busesRes.data);
      if (providersRes.data) setAvailableProviders(providersRes.data);

      if (tourId && tourId !== 'new') {
        const { data } = await supabase.from('tours').select('*, clients ( total_amount, total_paid, status )').eq('id', tourId).single();
        if (data) {
          setFormData({ ...data, includes: data.includes || [], itinerary: data.itinerary || [], hotel_details: data.hotel_details || [], provider_details: data.provider_details || [] });
          setImageUrlPreview(data.image_url);
        }
      }
      setLoadingData(false);
    };
    fetchData();
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

    const totalCost = busCost + providerCost + hotelCost;
    const totalPaidToSuppliers = busPaid + hotelPaid;

    const activeClients = (formData.clients || []).filter((c: any) => c.status !== 'cancelled');
    const clientsContracted = activeClients.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
    const clientsPaid = activeClients.reduce((sum: number, c: any) => sum + (c.total_paid || 0), 0);

    const projectedRevenue = (projectedSales.double * formData.selling_price_double_occupancy) + (projectedSales.triple * formData.selling_price_triple_occupancy) + (projectedSales.quad * formData.selling_price_quad_occupancy) + (projectedSales.child * formData.selling_price_child) + formData.other_income;
    
    const capacity = (formData.bus_capacity || bus?.total_capacity || 0) - formData.courtesies;
    const avgRequired = capacity > 0 ? (totalCost + desiredProfitFixed) / capacity : 0;

    return {
      totalCost, busCost, busPaid, hotelCost, hotelPaid, providerCost, totalPaidToSuppliers,
      clientsContracted, clientsPaid,
      projectedProfit: projectedRevenue - totalCost,
      beQuad: formData.selling_price_quad_occupancy > 0 ? Math.ceil(totalCost / formData.selling_price_quad_occupancy) : 0,
      recPrices: { quad: avgRequired, triple: avgRequired * 1.12, double: avgRequired * 1.25, child: avgRequired * 0.75 }
    };
  }, [formData, projectedSales, desiredProfitFixed, availableBuses, availableHotelQuotes]);

  const handleRichTextChange = (field: 'description' | 'full_content', content: string) => {
    setFormData(prev => ({ ...prev, [field]: content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setValidationErrors({});

    const errors: Record<string, boolean> = {};
    if (!formData.title) errors.title = true;
    if (!formData.slug) errors.slug = true;
    if (!formData.description) errors.description = true;
    if (!formData.duration) errors.duration = true;
    if (!formData.image_url && !imageFile) errors.image_url = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Por favor, rellena los campos obligatorios marcados.');
      setIsSubmitting(false);
      return;
    }

    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const fileName = `${uuidv4()}-${imageFile.name}`;
      const { error: uploadError } = await supabase.storage.from('tour-images').upload(fileName, imageFile);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }
    }

    // Destructure out non-column fields like 'clients' and 'id' (if present)
    const { clients, id: tourIdInForm, ...restOfFormData } = formData; 

    const dataToSave = { 
      ...restOfFormData, 
      image_url: finalImageUrl, 
      total_base_cost: financialSummary.totalCost, 
      paying_clients_count: financialSummary.capacity,
      cost_per_paying_person: financialSummary.capacity > 0 ? financialSummary.totalCost / financialSummary.capacity : 0,
      selling_price_per_person: formData.selling_price_double_occupancy 
    };
    
    const { error } = tourId 
      ? await supabase.from('tours').update(dataToSave).eq('id', tourId) 
      : await supabase.from('tours').insert(dataToSave);

    if (!error) { toast.success('Tour guardado.'); onSave(); }
    else { toast.error('Error al guardar.'); }
    setIsSubmitting(false);
  };

  // --- Lógica de Agrupación y Ordenación de Cotizaciones de Hotel ---
  const groupedAndSortedHotelQuotes = useMemo(() => {
    const groups: Record<string, HotelQuote[]> = {};
    const bestPriceMap = new Map<string, number>(); // Key: `${location}-${num_nights_quoted}-${monthYear}`

    availableHotelQuotes.forEach(quote => {
      if (quote.quoted_date) {
        const monthYear = format(parseISO(quote.quoted_date), 'yyyy-MM');
        const key = `${quote.location}-${quote.num_nights_quoted}-${monthYear}`;
        const currentMin = bestPriceMap.get(key) ?? Infinity;
        if (quote.estimated_total_cost < currentMin) {
            bestPriceMap.set(key, quote.estimated_total_cost);
        }
      }
      
      if (!groups[quote.location]) { // Group by location
        groups[quote.location] = [];
      }
      groups[quote.location].push(quote);
    });

    // Sort each group by quoted_date (newest first) and then by cost (lowest first)
    Object.keys(groups).forEach(name => {
      groups[name].sort((a, b) => {
        const dateA = a.quoted_date ? parseISO(a.quoted_date).getTime() : 0;
        const dateB = b.quoted_date ? parseISO(b.quoted_date).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return a.estimated_total_cost - b.estimated_total_cost;
      });
    });

    return { groups, bestPriceMap };
  }, [availableHotelQuotes]);
  // --- Fin Lógica de Agrupación y Ordenación ---


  if (loadingData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <Card className="border-t-4 border-rosa-mexicano shadow-xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter">
            <TrendingUp className="text-rosa-mexicano" /> Análisis Financiero del Tour
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CARD 1: RESUMEN DE EGRESOS (PROVEEDORES) */}
            <div className="p-5 bg-gray-900 text-white rounded-2xl shadow-xl">
              <h3 className="text-[10px] font-black uppercase text-rosa-mexicano mb-3 tracking-widest">Resumen de Egresos</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs opacity-70"><span>Costo Total:</span><span>${financialSummary.totalCost.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs font-bold text-green-400"><span>Abonado a Prov:</span><span>${financialSummary.totalPaidToSuppliers.toLocaleString()}</span></div>
                <div className="pt-2 border-t border-white/10 flex justify-between">
                   <span className="text-[9px] uppercase font-black text-gray-400">Pendiente Prov:</span>
                   <span className="font-black text-yellow-400 text-lg">${(financialSummary.totalCost - financialSummary.totalPaidToSuppliers).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: COBRANZA CLIENTES */}
            <div className="p-5 bg-rosa-mexicano/5 rounded-2xl border border-rosa-mexicano/20">
              <h3 className="text-[10px] font-black uppercase text-rosa-mexicano mb-3 tracking-widest flex items-center gap-1"><Wallet className="h-3 w-3" /> Cobranza Clientes</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-500"><span>Venta Contratada:</span><span>${financialSummary.clientsContracted.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs font-bold text-green-600"><span>Abonado Real:</span><span>${financialSummary.clientsPaid.toLocaleString()}</span></div>
                <div className="pt-2 border-t border-rosa-mexicano/10">
                   <p className="text-[9px] uppercase font-black text-gray-400">Falta por Recaudar:</p>
                   <p className="text-2xl font-black text-rosa-mexicano">${(financialSummary.clientsContracted - financialSummary.clientsPaid).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
               <h3 className="text-[10px] font-black uppercase text-blue-600 mb-3 tracking-widest flex items-center gap-1"><Calculator className="h-3 w-3" /> Punto de Equilibrio</h3>
               <div className="space-y-1">
                 <p className="text-xs font-bold text-blue-900">Requiere vender:</p>
                 <p className="text-3xl font-black text-blue-600">{financialSummary.beQuad} <span className="text-xs uppercase">Pax Quad</span></p>
                 <p className="text-[9px] text-blue-400 font-bold mt-2">Para cubrir $0 de utilidad</p>
               </div>
            </div>

            <div className="p-5 bg-green-50/50 rounded-2xl border border-green-100">
               <h3 className="text-[10px] font-black uppercase text-green-600 mb-3 tracking-widest flex items-center gap-1"><Star className="h-3 w-3" /> Precios Sugeridos</h3>
               <div className="space-y-2">
                 <div className="flex items-center gap-2 mb-2">
                    <Label className="text-[9px] font-black uppercase">Meta $:</Label>
                    <Input type="number" value={desiredProfitFixed} onChange={e => setDesiredProfitFixed(parseFloat(e.target.value)||0)} className="h-6 text-[10px] font-bold" />
                 </div>
                 <div className="grid grid-cols-2 gap-2 text-[10px] font-black text-green-700">
                    <div className="bg-white p-1 rounded border">DBL: ${financialSummary.recPrices.double.toFixed(0)}</div>
                    <div className="bg-white p-1 rounded border">TRIP: ${financialSummary.recPrices.triple.toFixed(0)}</div>
                    <div className="bg-white p-1 rounded border">QUAD: ${financialSummary.recPrices.quad.toFixed(0)}</div>
                    <div className="bg-white p-1 rounded border">NIÑO: ${financialSummary.recPrices.child.toFixed(0)}</div>
                 </div>
               </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border">
            <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2"><Calculator className="h-4 w-4 text-rosa-mexicano" /> Simulación de Venta (Proyectado)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="space-y-1"><Label className="text-[10px] font-bold">Pax DBL</Label><Input type="number" value={projectedSales.double} onChange={e => setProjectedSales({...projectedSales, double: parseInt(e.target.value)||0})} /></div>
              <div className="space-y-1"><Label className="text-[10px] font-bold">Pax TRIP</Label><Input type="number" value={projectedSales.triple} onChange={e => setProjectedSales({...projectedSales, triple: parseInt(e.target.value)||0})} /></div>
              <div className="space-y-1"><Label className="text-[10px] font-bold">Pax QUAD</Label><Input type="number" value={projectedSales.quad} onChange={e => setProjectedSales({...projectedSales, quad: parseInt(e.target.value)||0})} /></div>
              <div className="space-y-1"><Label className="text-[10px] font-bold">Pax NIÑO</Label><Input type="number" value={projectedSales.child} onChange={e => setProjectedSales({...projectedSales, child: parseInt(e.target.value)||0})} /></div>
              <div className="flex flex-col justify-end">
                <div className={cn("p-2 rounded-xl text-center font-black", financialSummary.projectedProfit > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  Utilidad: ${financialSummary.projectedProfit.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <Card>
            <CardHeader className="bg-gray-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-rosa-mexicano" /> Información Base</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Título del Tour</Label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value, slug: e.target.value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')})} 
                  required 
                  className={cn(validationErrors.title && "border-red-500")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Autobús</Label><Select value={formData.bus_id || ''} onValueChange={v => setFormData({...formData, bus_id: v, bus_capacity: availableBuses.find(b => b.id === v)?.total_capacity || 0})}><SelectTrigger><SelectValue placeholder="Elegir Bus" /></SelectTrigger><SelectContent>{availableBuses.map(b => <SelectItem key={b.id} value={b.id}>{b.name} (Capacidad: {b.total_capacity})</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2">
                  <Label>Duración</Label>
                  <Input 
                    id="duration" 
                    value={formData.duration} 
                    onChange={e => setFormData({...formData, duration: e.target.value})} 
                    placeholder="Ej: 3 días, 2 noches" 
                    className={cn(validationErrors.duration && "border-red-500")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción Corta (Cards)</Label>
                <Textarea 
                  value={stripHtmlTags(formData.description)} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className={cn(validationErrors.description && "border-red-500")}
                />
              </div>
              <div className="space-y-2"><Label>Contenido Detallado</Label><RichTextEditor value={formData.full_content} onChange={v => handleRichTextChange('full_content', v)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gray-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><Hotel className="h-5 w-5 text-rosa-mexicano" /> Hotelería y Otros Gastos</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <Label className="font-bold">Cotizaciones de Hotel</Label>
                {formData.hotel_details.map((d: any, i: number) => {
                  const quote = availableHotelQuotes.find(q => q.id === d.hotel_quote_id);
                  const quoteDisplay = quote 
                    ? `${quote.name} ($${quote.estimated_total_cost.toLocaleString()} - ${quote.num_nights_quoted} Noches)`
                    : 'Elegir Cotización';
                  
                  return (
                    <div key={d.id} className="flex gap-2 items-center">
                      <Select value={d.hotel_quote_id} onValueChange={v => setFormData({...formData, hotel_details: formData.hotel_details.map((hd: any) => hd.id === d.id ? {...hd, hotel_quote_id: v} : hd)})}>
                        <SelectTrigger className="flex-grow"><SelectValue placeholder={quoteDisplay} /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedAndSortedHotelQuotes.groups).map(([location, quotes]) => (
                            <React.Fragment key={location}>
                              <div className="px-2 py-1 text-xs font-bold uppercase text-gray-500 bg-gray-100 sticky top-0 z-10">
                                {location}
                              </div>
                              {quotes.map(q => {
                                const monthYear = q.quoted_date ? format(parseISO(q.quoted_date), 'yyyy-MM') : 'N/A';
                                const key = `${q.location}-${q.num_nights_quoted}-${monthYear}`;
                                const isBestPrice = q.estimated_total_cost === groupedAndSortedHotelQuotes.bestPriceMap.get(key);
                                
                                return (
                                  <SelectItem key={q.id} value={q.id} className="flex items-center">
                                    {q.name} | {q.num_nights_quoted} Noches | ${q.estimated_total_cost.toLocaleString()}
                                    {isBestPrice && <Star className="h-3 w-3 ml-2 text-yellow-500 fill-yellow-500" title="Mejor Precio" />}
                                  </SelectItem>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="destructive" size="icon" onClick={() => setFormData({...formData, hotel_details: formData.hotel_details.filter((hd: any) => hd.id !== d.id)})}><MinusCircle className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" onClick={() => setFormData({...formData, hotel_details: [...formData.hotel_details, {id: uuidv4(), hotel_quote_id: ''}]})} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Vincular Hotel</Button>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="font-bold">Servicios Extras de Proveedores</Label>
                {formData.provider_details.map((pd: TourProviderService) => (
                  <div key={pd.id} className="grid grid-cols-3 gap-2 border p-3 rounded-lg relative">
                    <Select value={pd.provider_id} onValueChange={v => {
                      const p = availableProviders.find(ap => ap.id === v);
                      setFormData({...formData, provider_details: formData.provider_details.map((d: TourProviderService) => d.id === pd.id ? {...d, provider_id: v, cost_per_unit_snapshot: p?.cost_per_unit||0, selling_price_per_unit_snapshot: p?.selling_price_per_unit||0, name_snapshot: p?.name||'', service_type_snapshot: p?.service_type||'', unit_type_snapshot: p?.unit_type||'person'} : d)})
                    }}><SelectTrigger className="col-span-2"><SelectValue placeholder="Elegir Proveedor" /></SelectTrigger><SelectContent>{availableProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.service_type})</SelectItem>)}</SelectContent></Select>
                    <Input type="number" placeholder="Cant" value={pd.quantity} onChange={e => setFormData({...formData, provider_details: formData.provider_details.map((d: TourProviderService) => d.id === pd.id ? {...d, quantity: parseFloat(e.target.value)||0} : d)})} />
                    <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 text-red-500" onClick={() => setFormData({...formData, provider_details: formData.provider_details.filter((d: TourProviderService) => d.id !== pd.id)})}><MinusCircle className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setFormData({...formData, provider_details: [...formData.provider_details, {id: uuidv4(), provider_id: '', quantity: 1, cost_per_unit_snapshot: 0, selling_price_per_unit_snapshot: 0, name_snapshot: '', service_type_snapshot: '', unit_type_snapshot: 'person'}]})} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Gasto Extra</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gray-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-5 w-5 text-rosa-mexicano" /> Itinerario y Servicios</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-8">
               <div className="space-y-4">
                  <Label className="font-bold">Qué Incluye</Label>
                  {formData.includes.map((inc: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <Input value={inc} onChange={e => { const newI = [...formData.includes]; newI[i] = e.target.value; setFormData({...formData, includes: newI})}} />
                      <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, includes: formData.includes.filter((_: string, idx: number) => idx !== i)})}><MinusCircle className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, includes: [...formData.includes, '']})}><PlusCircle className="mr-2 h-3 w-3" /> Añadir ítem</Button>
               </div>
               <div className="space-y-4 border-t pt-4">
                  <Label className="font-bold">Itinerario</Label>
                  {formData.itinerary.map((it: { day: number; activity: string }, i: number) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Badge className="bg-rosa-mexicano shrink-0 mt-2">Día {it.day}</Badge>
                      <Textarea value={it.activity} onChange={e => { const newI = [...formData.itinerary]; newI[i].activity = e.target.value; setFormData({...formData, itinerary: newI})}} />
                      <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, itinerary: formData.itinerary.filter((_: any, idx: number) => idx !== i)})}><MinusCircle className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, itinerary: [...formData.itinerary, {day: formData.itinerary.length + 1, activity: ''}]})}><PlusCircle className="mr-2 h-3 w-3" /> Añadir día</Button>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader className="bg-gray-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-rosa-mexicano" /> Multimedia y Tiempos</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label>Imagen del Tour</Label>
                <div className={cn("relative border-2 border-dashed rounded-2xl h-48 flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group", validationErrors.image_url && "border-red-500")}>
                   {isUploadingImage ? <Loader2 className="animate-spin text-rosa-mexicano" /> : imageUrlPreview ? <img src={imageUrlPreview} className="w-full h-full object-cover" /> : <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2" /><span>Subir foto</span></div>}
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if(f) { setImageFile(f); setImageUrlPreview(URL.createObjectURL(f)); } }} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2"><Label>Salida</Label><Input type="date" value={formData.departure_date || ''} onChange={e => setFormData({...formData, departure_date: e.target.value})} /><Input type="time" value={formData.departure_time || ''} onChange={e => setFormData({...formData, departure_time: e.target.value})} /></div>
                <div className="space-y-2"><Label>Regreso</Label><Input type="date" value={formData.return_date || ''} onChange={e => setFormData({...formData, return_date: e.target.value})} /><Input type="time" value={formData.return_time || ''} onChange={e => setFormData({...formData, return_time: e.target.value})} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gray-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-rosa-mexicano" /> Precios de Venta</CardTitle></CardHeader>
            <CardContent className="pt-6 grid grid-cols-2 gap-4">
               <div className="space-y-1"><Label className="text-xs">Doble p/p</Label><Input type="number" value={formData.selling_price_double_occupancy} onChange={e => setFormData({...formData, selling_price_double_occupancy: parseFloat(e.target.value)||0})} className="font-bold text-rosa-mexicano" /></div>
               <div className="space-y-1"><Label className="text-xs">Triple p/p</Label><Input type="number" value={formData.selling_price_triple_occupancy} onChange={e => setFormData({...formData, selling_price_triple_occupancy: parseFloat(e.target.value)||0})} className="font-bold text-rosa-mexicano" /></div>
               <div className="space-y-1"><Label className="text-xs">Quad p/p</Label><Input type="number" value={formData.selling_price_quad_occupancy} onChange={e => setFormData({...formData, selling_price_quad_occupancy: parseFloat(e.target.value)||0})} className="font-bold text-rosa-mexicano" /></div>
               <div className="space-y-1"><Label className="text-xs">Menor</Label><Input type="number" value={formData.selling_price_child} onChange={e => setFormData({...formData, selling_price_child: parseFloat(e.target.value)||0})} className="font-bold text-rosa-mexicano" /></div>
               <div className="space-y-1 col-span-2 border-t pt-2 mt-2"><Label className="text-xs">Solo Traslado (Sin hotel)</Label><Input type="number" value={formData.transport_only_price} onChange={e => setFormData({...formData, transport_only_price: parseFloat(e.target.value)||0})} className="font-bold" /></div>
            </CardContent>
          </Card>

          <Card className="relative z-0">
            <CardHeader className="bg-gray-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2"><Armchair className="h-5 w-5 text-rosa-mexicano" /> Gestión de Asientos</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-xs">Capacidad</Label><Input type="number" value={formData.bus_capacity} onChange={e => setFormData({...formData, bus_capacity: parseInt(e.target.value)||0})} /></div>
                <div className="space-y-1"><Label className="text-xs">Coordinadores</Label><Input type="number" value={formData.courtesies} onChange={e => setFormData({...formData, courtesies: parseInt(e.target.value)||0})} /></div>
              </div>
              <TourSeatMap 
                tourId={formData.id || 'new'} 
                busCapacity={formData.bus_capacity} 
                courtesies={formData.courtesies} 
                seatLayoutJson={availableBuses.find(b => b.id === formData.bus_id)?.seat_layout_json || null} 
                adminMode={true}
                onSeatsSelected={() => {}}
              />
            </CardContent>
          </Card>
        </div>
      </form>

      <div className="fixed bottom-6 right-6 flex gap-4 z-50">
        <Button variant="outline" onClick={() => onSave()} className="bg-white shadow-lg h-14 px-8 rounded-2xl">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-rosa-mexicano shadow-2xl h-14 px-12 text-lg font-black rounded-2xl uppercase tracking-tighter">
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
          Guardar Configuración Tour
        </Button>
      </div>
    </div>
  );
};

export default TourForm;