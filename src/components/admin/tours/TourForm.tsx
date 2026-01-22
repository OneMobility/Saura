"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, DollarSign, Hotel, Bus, Clock, MapPin, Receipt, Info, Image as ImageIcon, Calculator, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TourProviderService } from '@/types/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RichTextEditor from '@/components/RichTextEditor';

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
  const [formData, setFormData] = useState<Tour>({
    title: '', slug: '', description: '', full_content: '', duration: '', includes: [], itinerary: [],
    bus_id: null, bus_capacity: 0, bus_cost: 0, courtesies: 0, hotel_details: [], provider_details: [],
    selling_price_double_occupancy: 0, selling_price_triple_occupancy: 0, selling_price_quad_occupancy: 0,
    selling_price_child: 0, transport_only_price: 0, other_income: 0,
    departure_date: null, return_date: null, departure_time: '08:00', return_time: '18:00',
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableHotelQuotes, setAvailableHotelQuotes] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [providerPayments, setProviderPayments] = useState({ hotel: 0, bus: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const [hotelsRes, busesRes, providersRes] = await Promise.all([
        supabase.from('hotels').select('*').eq('is_active', true),
        supabase.from('buses').select('*'),
        supabase.from('providers').select('*').eq('is_active', true),
      ]);
      
      setAvailableHotelQuotes(hotelsRes.data || []);
      setAvailableBuses(busesRes.data || []);
      setAvailableProviders(providersRes.data || []);

      if (tourId && tourId !== 'new') {
        const { data: tourData } = await supabase.from('tours').select('*').eq('id', tourId).single();
        if (tourData) {
          setFormData({
            ...tourData,
            includes: tourData.includes || [],
            itinerary: tourData.itinerary || [],
            hotel_details: tourData.hotel_details || [],
            provider_details: tourData.provider_details || [],
          });
          setImageUrlPreview(tourData.image_url);

          if (tourData.bus_id) {
            const { data: bP } = await supabase.from('bus_payments').select('amount').eq('bus_id', tourData.bus_id);
            setProviderPayments(prev => ({ ...prev, bus: bP?.reduce((s, p) => s + p.amount, 0) || 0 }));
          }
          if (tourData.hotel_details?.length > 0) {
            const hId = tourData.hotel_details[0].hotel_quote_id;
            const { data: hP } = await supabase.from('hotel_payments').select('amount').eq('hotel_id', hId);
            setProviderPayments(prev => ({ ...prev, hotel: hP?.reduce((s, p) => s + p.amount, 0) || 0 }));
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [tourId]);

  // MOTOR DE CÁLCULOS FINANCIEROS (Restaurado)
  const financialMetrics = useMemo(() => {
    let hotelTotalCost = 0;
    formData.hotel_details.forEach(detail => {
      const quote = availableHotelQuotes.find(q => q.id === detail.hotel_quote_id);
      if (quote) {
        const total = (((quote.num_double_rooms || 0) * quote.cost_per_night_double) +
                      ((quote.num_triple_rooms || 0) * quote.cost_per_night_triple) +
                      ((quote.num_quad_rooms || 0) * quote.cost_per_night_quad) -
                      ((quote.num_courtesy_rooms || 0) * quote.cost_per_night_quad)) * (quote.num_nights_quoted || 1);
        hotelTotalCost += total;
      }
    });

    let providersTotalCost = 0;
    formData.provider_details.forEach(p => {
      providersTotalCost += (p.cost_per_unit_snapshot * p.quantity);
    });

    const totalBaseCost = (formData.bus_cost || 0) + hotelTotalCost + providersTotalCost - (formData.other_income || 0);
    const payingPax = Math.max(1, (formData.bus_capacity || 0) - (formData.courtesies || 0));
    const costPerPax = totalBaseCost / payingPax;

    return {
      totalBaseCost,
      payingPax,
      costPerPax,
      suggestedDouble: costPerPax * 1.4, // Margen sugerido del 40%
      suggestedQuad: costPerPax * 1.25
    };
  }, [formData, availableHotelQuotes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    const isNumeric = ['selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'transport_only_price', 'other_income', 'bus_capacity', 'bus_cost', 'courtesies'].includes(id);
    setFormData(prev => ({ ...prev, [id]: isNumeric ? parseFloat(value) || 0 : value }));
    if (id === 'title' && !tourId) setFormData(p => ({ ...p, slug: value.toLowerCase().replace(/\s+/g, '-') }));
  };

  const handleProviderSelect = (index: number, providerId: string) => {
    const provider = availableProviders.find(p => p.id === providerId);
    if (!provider) return;
    const newDetails = [...formData.provider_details];
    newDetails[index] = {
      ...newDetails[index],
      provider_id: providerId,
      name_snapshot: provider.name,
      cost_per_unit_snapshot: provider.cost_per_unit,
      selling_price_per_unit_snapshot: provider.selling_price_per_unit,
      service_type_snapshot: provider.service_type,
      unit_type_snapshot: provider.unit_type
    };
    setFormData({ ...formData, provider_details: newDetails });
  };

  const addItem = (field: 'includes' | 'itinerary' | 'hotel_details' | 'provider_details') => {
    setFormData(prev => {
      const newItem = field === 'itinerary' ? { day: prev.itinerary.length + 1, activity: '' } :
                      field === 'hotel_details' ? { id: uuidv4(), hotel_quote_id: '' } :
                      field === 'provider_details' ? { id: uuidv4(), provider_id: '', quantity: 1, cost_per_unit_snapshot: 0, selling_price_per_unit_snapshot: 0, name_snapshot: '', service_type_snapshot: '', unit_type_snapshot: 'person' } :
                      '';
      return { ...prev, [field]: [...(prev[field] as any[]), newItem] };
    });
  };

  const removeItem = (field: string, index: number) => {
    setFormData(prev => ({ ...prev, [field]: (prev[field] as any[]).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const fileName = `${uuidv4()}-${imageFile.name}`;
      await supabase.storage.from('tour-images').upload(`tours/${fileName}`, imageFile);
      const { data } = supabase.storage.from('tour-images').getPublicUrl(`tours/${fileName}`);
      finalImageUrl = data.publicUrl;
    }
    const { error } = tourId && tourId !== 'new'
      ? await supabase.from('tours').update({ ...formData, image_url: finalImageUrl }).eq('id', tourId)
      : await supabase.from('tours').insert([{ ...formData, image_url: finalImageUrl }]);
    
    if (!error) { toast.success("Guardado"); onSave(); }
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-24">
      {/* BARRA DE MÉTRICAS FINANCIERAS (RESTAURADA) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sticky top-4 z-40">
        <Card className="bg-gray-900 text-white border-none shadow-2xl">
          <CardContent className="p-4 flex items-center gap-4">
            <Calculator className="text-rosa-mexicano" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Costo Base Tour</p>
              <p className="text-xl font-black">${financialMetrics.totalBaseCost.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 text-white border-none shadow-2xl">
          <CardContent className="p-4 flex items-center gap-4">
            <TrendingUp className="text-green-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Punto Equilibrio (Pax)</p>
              <p className="text-xl font-black">{financialMetrics.payingPax} Pax</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-rosa-mexicano text-white border-none shadow-2xl">
          <CardContent className="p-4 flex items-center gap-4">
            <DollarSign />
            <div>
              <p className="text-[10px] uppercase font-bold text-white/60">Costo Neto x Pax</p>
              <p className="text-xl font-black">${financialMetrics.costPerPax.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-2 border-rosa-mexicano shadow-2xl">
          <CardContent className="p-4 flex items-center gap-4">
            <Receipt className="text-rosa-mexicano" />
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Abonado Prov.</p>
              <p className="text-xl font-black text-gray-900">${(providerPayments.bus + providerPayments.hotel).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-lg border-t-4 border-rosa-mexicano">
            <CardHeader><CardTitle>Información del Tour</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input id="title" value={formData.title} onChange={handleChange} placeholder="Nombre del Tour" required className="h-12 text-lg font-bold" />
              <RichTextEditor value={formData.description} onChange={c => setFormData({...formData, description: c})} className="h-32 mb-12" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" /> Costos de Logística</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                  <Label>Autobús</Label>
                  <Select value={formData.bus_id || ''} onValueChange={v => {
                    const bus = availableBuses.find(b => b.id === v);
                    setFormData({...formData, bus_id: v, bus_capacity: bus?.total_capacity || 0, bus_cost: bus?.rental_cost || 0});
                  }}>
                    <SelectTrigger><SelectValue placeholder="Elegir Bus" /></SelectTrigger>
                    <SelectContent>{availableBuses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="space-y-2"><Label>Costo Renta Bus ($)</Label><Input type="number" id="bus_cost" value={formData.bus_cost} onChange={handleChange} /></div>
               <div className="space-y-2"><Label>Coordinadores (Cortesías)</Label><Input type="number" id="courtesies" value={formData.courtesies} onChange={handleChange} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Hotel className="h-5 w-5" /> Hoteles y Hospedaje</CardTitle><Button type="button" size="sm" onClick={() => addItem('hotel_details')}><PlusCircle className="h-4 w-4" /></Button></CardHeader>
            <CardContent className="space-y-4">
              {formData.hotel_details.map((detail, i) => (
                <div key={detail.id} className="flex gap-4 items-end bg-gray-50 p-4 rounded-xl border">
                  <div className="flex-grow space-y-2">
                    <Label>Cotización de Hotel</Label>
                    <Select value={detail.hotel_quote_id} onValueChange={v => {
                      const newH = [...formData.hotel_details];
                      newH[i].hotel_quote_id = v;
                      setFormData({...formData, hotel_details: newH});
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar Cotización" /></SelectTrigger>
                      <SelectContent>{availableHotelQuotes.map(q => <SelectItem key={q.id} value={q.id}>{q.name} - {format(parseISO(q.quoted_date), 'dd/MM/yy')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => removeItem('hotel_details', i)}><MinusCircle className="text-red-500" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Otros Proveedores</CardTitle><Button type="button" size="sm" onClick={() => addItem('provider_details')}><PlusCircle className="h-4 w-4" /></Button></CardHeader>
            <CardContent className="space-y-4">
              {formData.provider_details.map((p, i) => (
                <div key={p.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border relative">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Servicio</Label>
                    <Select value={p.provider_id} onValueChange={v => handleProviderSelect(i, v)}>
                      <SelectTrigger><SelectValue placeholder="Elegir Proveedor" /></SelectTrigger>
                      <SelectContent>{availableProviders.map(ap => <SelectItem key={ap.id} value={ap.id}>{ap.name} ({ap.service_type})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Cantidad</Label><Input type="number" value={p.quantity} onChange={e => {
                    const newP = [...formData.provider_details];
                    newP[i].quantity = parseInt(e.target.value) || 0;
                    setFormData({...formData, provider_details: newP});
                  }} /></div>
                  <Button type="button" variant="ghost" className="absolute top-2 right-2" onClick={() => removeItem('provider_details', i)}><MinusCircle className="h-4 w-4 text-red-500" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Imagen y Fechas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed flex items-center justify-center">
                {imageUrlPreview ? <img src={imageUrlPreview} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300 h-12 w-12" />}
                <Input type="file" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { setImageFile(file); setImageUrlPreview(URL.createObjectURL(file)); }
                }} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Salida</Label><Input type="date" id="departure_date" value={formData.departure_date || ''} onChange={handleChange} /></div>
                <div className="space-y-1"><Label>Hora</Label><Input id="departure_time" value={formData.departure_time || ''} onChange={handleChange} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-blue-500">
            <CardHeader><CardTitle className="flex items-center gap-2 text-blue-600"><DollarSign /> Tarifas de Venta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center"><Label>Doble (p/p)</Label><span className="text-[10px] text-gray-400 font-bold">Sug: ${financialMetrics.suggestedDouble.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} className="font-bold border-blue-100" />
              </div>
              <div className="space-y-1"><Label>Triple (p/p)</Label><Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} /></div>
              <div className="space-y-1">
                <div className="flex justify-between items-center"><Label>Cuádruple (p/p)</Label><span className="text-[10px] text-gray-400 font-bold">Sug: ${financialMetrics.suggestedQuad.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} />
              </div>
              <div className="space-y-1"><Label>Niño</Label><Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} /></div>
              
              <div className="pt-4 border-t border-dashed mt-4">
                <Label className="text-blue-600 font-bold flex items-center gap-2"><Bus className="h-4 w-4" /> Solo Traslado Redondo ($)</Label>
                <Input type="number" id="transport_only_price" value={formData.transport_only_price} onChange={handleChange} className="border-blue-200 focus:ring-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano h-14 px-10 text-lg font-bold shadow-2xl rounded-2xl">
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />} Guardar Tour
        </Button>
      </div>
    </form>
  );
};

export default TourForm;