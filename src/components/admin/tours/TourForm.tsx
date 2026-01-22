"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, Calculator, TrendingUp, ImageIcon, MapPin, Clock, Hotel, ListChecks, Armchair, Info, Star, DollarSign, Wallet, BusFront, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const TourForm: React.FC<TourFormProps> = ({ tourId, onSave }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Tour>({
    title: '', slug: '', description: '', full_content: '', duration: '', includes: [], itinerary: [],
    bus_id: null, bus_capacity: 0, bus_cost: 0, courtesies: 0, hotel_details: [], provider_details: [],
    selling_price_double_occupancy: 0, selling_price_triple_occupancy: 0, selling_price_quad_occupancy: 0,
    selling_price_child: 0, transport_only_price: 0, other_income: 0, departure_date: null, return_date: null, departure_time: '08:00', return_time: '18:00',
  });
  
  const [desiredProfitFixed, setDesiredProfitFixed] = useState(45000);
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
        setAvailableHotelQuotes(hotelsRes.data.map(q => ({
          ...q,
          estimated_total_cost: (((q.num_double_rooms || 0) * q.cost_per_night_double +
                                 (q.num_triple_rooms || 0) * q.cost_per_night_triple +
                                 (q.num_quad_rooms || 0) * q.cost_per_night_quad) -
                                 ((q.num_courtesy_rooms || 0) * (q.cost_per_night_quad || 0))) * (q.num_nights_quoted || 1)
        })));
      }
      if (busesRes.data) setAvailableBuses(busesRes.data);
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

    const targetRevenue = totalCost + desiredProfitFixed;
    const avgRequiredPerPerson = capacity > 0 ? targetRevenue / capacity : 0;

    return {
      busCost, busPaid, hotelCost, hotelPaid, providerCost, totalCost, totalPaidToSuppliers, capacity,
      clientsTotalContracted, clientsActuallyPaid,
      recPrice: {
        quad: avgRequiredPerPerson, triple: avgRequiredPerPerson * 1.12, double: avgRequiredPerPerson * 1.25, child: avgRequiredPerPerson * 0.75
      }
    };
  }, [formData, desiredProfitFixed, availableBuses, availableHotelQuotes]);

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
    const { data: { user } } = await supabase.auth.getUser();
    const dataToSave = { 
      ...formData, image_url: finalImageUrl, user_id: user?.id,
      total_base_cost: financialSummary.totalCost, paying_clients_count: financialSummary.capacity,
      cost_per_paying_person: financialSummary.capacity > 0 ? financialSummary.totalCost / financialSummary.capacity : 0,
      selling_price_per_person: formData.selling_price_double_occupancy 
    };
    const { error } = tourId ? await supabase.from('tours').update(dataToSave).eq('id', tourId) : await supabase.from('tours').insert(dataToSave);
    if (error) toast.error(`Error: ${error.message}`);
    else { toast.success('Tour guardado.'); onSave(); }
    setIsSubmitting(false);
  };

  // Helper functions for dynamic lists
  const addInclude = () => setFormData(p => ({ ...p, includes: [...p.includes, ''] }));
  const removeInclude = (idx: number) => setFormData(p => ({ ...p, includes: p.includes.filter((_, i) => i !== idx) }));
  const updateInclude = (idx: number, val: string) => setFormData(p => {
    const newI = [...p.includes]; newI[idx] = val; return { ...p, includes: newI };
  });

  const addItineraryDay = () => setFormData(p => ({ ...p, itinerary: [...p.itinerary, { day: p.itinerary.length + 1, activity: '' }] }));
  const removeItineraryDay = (idx: number) => setFormData(p => ({ ...p, itinerary: p.itinerary.filter((_, i) => i !== idx).map((day, i) => ({ ...day, day: i + 1 })) }));
  const updateItineraryDay = (idx: number, activity: string) => setFormData(p => {
    const newIt = [...p.itinerary]; newIt[idx].activity = activity; return { ...p, itinerary: newIt };
  });

  const addHotelDetail = () => setFormData(p => ({ ...p, hotel_details: [...p.hotel_details, { id: uuidv4(), hotel_quote_id: '' }] }));
  const removeHotelDetail = (id: string) => setFormData(p => ({ ...p, hotel_details: p.hotel_details.filter(h => h.id !== id) }));
  const updateHotelDetail = (id: string, quoteId: string) => setFormData(p => ({
    ...p, hotel_details: p.hotel_details.map(h => h.id === id ? { ...h, hotel_quote_id: quoteId } : h)
  }));

  const addProviderDetail = () => setFormData(p => ({
    ...p, provider_details: [...p.provider_details, { id: uuidv4(), provider_id: '', quantity: 1, cost_per_unit_snapshot: 0, selling_price_per_unit_snapshot: 0, name_snapshot: '', service_type_snapshot: '', unit_type_snapshot: 'person' }],
  }));
  const removeProviderDetail = (id: string) => setFormData(p => ({ ...p, provider_details: p.provider_details.filter(d => d.id !== id) }));
  const updateProviderDetail = (id: string, providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId);
    if (!provider) return;
    setFormData(prev => ({
      ...prev, provider_details: prev.provider_details.map(d => d.id === id ? {
        ...d, provider_id: providerId, name_snapshot: provider.name, service_type_snapshot: provider.service_type, 
        unit_type_snapshot: provider.unit_type, cost_per_unit_snapshot: provider.cost_per_unit, 
        selling_price_per_unit_snapshot: provider.selling_price_per_unit
      } : d)
    }));
  };

  if (loadingInitialData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-8 pb-24">
      {/* SECCIÓN FINANCIERA */}
      <Card className="border-t-4 border-rosa-mexicano shadow-xl overflow-hidden">
        <CardHeader className="bg-gray-50/80">
          <CardTitle className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-rosa-mexicano" /> Control Financiero del Tour</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/40 rounded-xl border border-dashed">
              <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Egresos Est.</p>
              <div className="text-2xl font-black text-gray-900">${financialSummary.totalCost.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 mt-1">Bus + Hoteles + Servicios</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-[10px] font-black uppercase text-amber-600 mb-2">Liquidación Prov.</p>
              <div className="text-2xl font-black text-amber-900">${financialSummary.totalPaidToSuppliers.toLocaleString()}</div>
              <p className="text-[9px] text-amber-700 mt-1">Faltan ${(financialSummary.totalCost - financialSummary.totalPaidToSuppliers).toLocaleString()} por pagar</p>
            </div>
            <div className="p-4 bg-rosa-mexicano/5 rounded-xl border border-rosa-mexicano/20">
              <p className="text-[10px] font-black uppercase text-rosa-mexicano mb-2">Cobranza Clientes</p>
              <div className="text-2xl font-black text-rosa-mexicano">${financialSummary.clientsActuallyPaid.toLocaleString()}</div>
              <p className="text-[9px] text-gray-500 mt-1">De una meta de ${financialSummary.clientsTotalContracted.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-black uppercase text-green-600">Precios Sug.</p>
                <Input type="number" value={desiredProfitFixed} onChange={e => setDesiredProfitFixed(parseFloat(e.target.value) || 0)} className="h-6 w-20 text-[10px] font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-x-2 text-[10px] font-bold text-green-700">
                <span>QUAD: ${financialSummary.recPrice.quad.toFixed(0)}</span>
                <span>TRIP: ${financialSummary.recPrice.triple.toFixed(0)}</span>
                <span>DBL: ${financialSummary.recPrice.double.toFixed(0)}</span>
                <span>NIÑO: ${financialSummary.recPrice.child.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-rosa-mexicano" /> Datos Básicos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Título del Viaje</Label><Input id="title" value={formData.title} onChange={handleChange} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Autobús</Label>
                    <Select value={formData.bus_id || ''} onValueChange={val => {
                      const bus = availableBuses.find(b => b.id === val);
                      setFormData(p => ({ ...p, bus_id: val, bus_capacity: bus?.total_capacity || 0 }));
                    }}><SelectTrigger><SelectValue placeholder="Bus" /></SelectTrigger><SelectContent>{availableBuses.map(b => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>Duración</Label><Input id="duration" value={formData.duration} onChange={handleChange} placeholder="Ej: 3 Días / 2 Noches" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Capacidad Bus</Label><Input type="number" id="bus_capacity" value={formData.bus_capacity} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label>Cortesías (Staff)</Label><Input type="number" id="courtesies" value={formData.courtesies} onChange={handleChange} /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-rosa-mexicano" /> Precios de Venta</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Doble (p/p)</Label><Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Triple (p/p)</Label><Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Cuádruple (p/p)</Label><Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Menor</Label><Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Solo Traslado</Label><Input type="number" id="transport_only_price" value={formData.transport_only_price} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Otros Ingresos</Label><Input type="number" id="other_income" value={formData.other_income} onChange={handleChange} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-rosa-mexicano" /> Logística de Fechas</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><Label>Salida</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start">{departureDate ? format(departureDate, 'dd/MM/yy') : 'Elegir'}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={departureDate} onSelect={d => handleDateSelect('departure_date', d)} locale={es} /></PopoverContent></Popover></div>
                   <div className="space-y-2"><Label>Hora</Label><Input id="departure_time" value={formData.departure_time || ''} onChange={handleChange} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2"><Label>Regreso</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start">{returnDate ? format(returnDate, 'dd/MM/yy') : 'Elegir'}</Button></PopoverTrigger><PopoverContent><Calendar mode="single" selected={returnDate} onSelect={d => handleDateSelect('return_date', d)} locale={es} /></PopoverContent></Popover></div>
                   <div className="space-y-2"><Label>Hora</Label><Input id="return_time" value={formData.return_time || ''} onChange={handleChange} /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-rosa-mexicano" /> Multimedia</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="relative border-2 border-dashed rounded-xl h-48 flex items-center justify-center overflow-hidden bg-gray-50 group transition-all hover:bg-gray-100">
                   {isUploadingImage ? <Loader2 className="animate-spin text-rosa-mexicano" /> : imageUrlPreview ? <img src={imageUrlPreview} className="w-full h-full object-cover" /> : <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-2" /><span className="text-xs">Sube la portada</span></div>}
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                </div>
                <div className="space-y-2"><Label>Resumen corto</Label><Textarea id="description" value={formData.description} onChange={handleChange} rows={3} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Hotel className="h-5 w-5 text-rosa-mexicano" /> Hoteles y Servicios</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="font-bold">Hospedaje Vinculado</Label>
                  {formData.hotel_details.map(h => (
                    <div key={h.id} className="flex gap-2">
                      <Select value={h.hotel_quote_id} onValueChange={val => updateHotelDetail(h.id, val)}><SelectTrigger className="flex-grow"><SelectValue placeholder="Elegir Cotización" /></SelectTrigger><SelectContent>{availableHotelQuotes.map(q => <SelectItem key={q.id} value={q.id}>{q.name} ({format(parseISO(q.quoted_date!), 'dd/MM')})</SelectItem>)}</SelectContent></Select>
                      <Button variant="destructive" size="icon" onClick={() => removeHotelDetail(h.id)}><MinusCircle className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addHotelDetail} className="w-full border-dashed"><PlusCircle className="mr-2 h-3 w-3" /> Agregar Hotel</Button>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="font-bold">Otros Servicios (Lanchas, Guías, etc)</Label>
                  {formData.provider_details.map(d => (
                    <div key={d.id} className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex gap-2">
                        <Select value={d.provider_id} onValueChange={val => updateProviderDetail(d.id, val)}><SelectTrigger className="flex-grow"><SelectValue placeholder="Servicio" /></SelectTrigger><SelectContent>{availableProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.service_type})</SelectItem>)}</SelectContent></Select>
                        <Button variant="destructive" size="icon" onClick={() => removeProviderDetail(d.id)}><MinusCircle className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px]">Cantidad:</Label>
                        <Input type="number" className="h-8 w-24" value={d.quantity} onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(p => ({ ...p, provider_details: p.provider_details.map(i => i.id === d.id ? { ...i, quantity: val } : i) }));
                        }} />
                        <span className="text-[10px] text-gray-500 font-bold">Costo: ${(d.cost_per_unit_snapshot * d.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addProviderDetail} className="w-full border-dashed"><PlusCircle className="mr-2 h-3 w-3" /> Agregar Servicio</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-5 w-5 text-rosa-mexicano" /> Qué Incluye e Itinerario</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-4">
               <Label className="font-bold">Puntos Incluidos</Label>
               {formData.includes.map((inc, i) => (
                 <div key={i} className="flex gap-2"><Input value={inc} onChange={e => updateInclude(i, e.target.value)} /><Button variant="ghost" onClick={() => removeInclude(i)}><MinusCircle className="h-4 w-4 text-red-500" /></Button></div>
               ))}
               <Button variant="outline" onClick={addInclude} className="w-full border-dashed"><PlusCircle className="h-4 w-4 mr-2" /> Añadir Punto</Button>
             </div>
             <div className="space-y-4">
               <Label className="font-bold">Actividades por Día</Label>
               {formData.itinerary.map((day, i) => (
                 <div key={i} className="space-y-1">
                   <Label className="text-[10px] font-bold">Día {day.day}</Label>
                   <div className="flex gap-2"><Input value={day.activity} onChange={e => updateItineraryDay(i, e.target.value)} /><Button variant="ghost" onClick={() => removeItineraryDay(i)}><MinusCircle className="h-4 w-4 text-red-500" /></Button></div>
                 </div>
               ))}
               <Button variant="outline" onClick={addItineraryDay} className="w-full border-dashed"><PlusCircle className="h-4 w-4 mr-2" /> Añadir Día</Button>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-rosa-mexicano" /> Contenido Detallado (Landing Page)</CardTitle></CardHeader>
          <CardContent><RichTextEditor value={formData.full_content} onChange={val => handleRichTextChange('full_content', val)} className="min-h-[400px]" /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Armchair className="h-5 w-5 text-rosa-mexicano" /> Bloqueo de Asientos</CardTitle></CardHeader>
          <CardContent>
            <TourSeatMap 
              tourId={tourId || 'new'} busCapacity={formData.bus_capacity} courtesies={formData.courtesies} 
              seatLayoutJson={selectedBusLayout} adminMode={true} readOnly={false} 
              onSeatsSelected={() => {}} 
            />
            <p className="text-xs text-muted-foreground mt-4 italic">Como administrador, haz clic en los asientos disponibles para bloquearlos/desbloquearlos manualmente.</p>
          </CardContent>
        </Card>

        <div className="fixed bottom-6 right-6 flex gap-4 z-50">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/tours')} className="bg-white shadow-xl h-14 px-8 rounded-2xl">Cancelar</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano h-14 px-12 text-lg font-black rounded-2xl shadow-2xl">
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            Guardar Tour Completo
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TourForm;