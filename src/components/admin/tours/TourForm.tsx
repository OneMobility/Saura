"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CalendarIcon, DollarSign, Hotel, Bus, Clock, MapPin, Receipt, Info, Upload, Image as ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
            departure_time: tourData.departure_time || '08:00',
            return_time: tourData.return_time || '18:00',
          });
          setImageUrlPreview(tourData.image_url);

          // Cargar pagos reales realizados
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    const isNumeric = ['selling_price_double_occupancy', 'selling_price_triple_occupancy', 'selling_price_quad_occupancy', 'selling_price_child', 'transport_only_price', 'other_income', 'bus_capacity', 'bus_cost', 'courtesies'].includes(id);
    
    setFormData(prev => ({
      ...prev,
      [id]: isNumeric ? parseFloat(value) || 0 : value
    }));

    if (id === 'title' && !tourId) {
      setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') }));
    }
  };

  const handleRichTextChange = (field: 'full_content' | 'description', content: string) => {
    setFormData(prev => ({ ...prev, [field]: content }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrlPreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileName = `${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from('tour-images').upload(`tours/${fileName}`, file);
    if (error) return null;
    const { data } = supabase.storage.from('tour-images').getPublicUrl(`tours/${fileName}`);
    return data.publicUrl;
  };

  // Gestión de Arreglos (Itinerario, Incluye, Hoteles, Proveedores)
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

    try {
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (uploaded) finalImageUrl = uploaded;
      }

      const tourData = { ...formData, image_url: finalImageUrl };
      const { error } = tourId && tourId !== 'new'
        ? await supabase.from('tours').update(tourData).eq('id', tourId)
        : await supabase.from('tours').insert([tourData]);

      if (error) throw error;
      toast.success("Tour guardado exitosamente");
      onSave();
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Información General */}
          <Card className="shadow-lg border-t-4 border-rosa-mexicano">
            <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" /> Información Principal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nombre del Tour</Label><Input id="title" value={formData.title} onChange={handleChange} required /></div>
                <div className="space-y-2"><Label>URL Amigable (Slug)</Label><Input id="slug" value={formData.slug} onChange={handleChange} required /></div>
              </div>
              <div className="space-y-2"><Label>Resumen Breve</Label><RichTextEditor value={formData.description} onChange={(c) => handleRichTextChange('description', c)} className="h-32 mb-12" /></div>
              <div className="space-y-2 pt-4"><Label>Contenido Detallado</Label><RichTextEditor value={formData.full_content} onChange={(c) => handleRichTextChange('full_content', c)} /></div>
            </CardContent>
          </Card>

          {/* Logística */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5" /> Logística de Viaje</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Autobús</Label>
                  <Select value={formData.bus_id || ''} onValueChange={v => setFormData({...formData, bus_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Elegir Bus" /></SelectTrigger>
                    <SelectContent>{availableBuses.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.total_capacity} pax)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Duración (Ej: 3 días, 2 noches)</Label><Input id="duration" value={formData.duration} onChange={handleChange} /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Fecha Salida</Label><Input type="date" id="departure_date" value={formData.departure_date || ''} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Hora Salida</Label><Input id="departure_time" value={formData.departure_time || ''} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Fecha Regreso</Label><Input type="date" id="return_date" value={formData.return_date || ''} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Hora Regreso</Label><Input id="return_time" value={formData.return_time || ''} onChange={handleChange} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Itinerario e Incluye */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Itinerario</CardTitle><Button type="button" size="sm" variant="outline" onClick={() => addItem('itinerary')}><PlusCircle className="h-4 w-4" /></Button></CardHeader>
              <CardContent className="space-y-3">
                {formData.itinerary.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="w-16" value={item.day} readOnly />
                    <Input value={item.activity} onChange={e => {
                      const newItin = [...formData.itinerary];
                      newItin[i].activity = e.target.value;
                      setFormData({...formData, itinerary: newItin});
                    }} placeholder="Actividad..." />
                    <Button type="button" variant="ghost" onClick={() => removeItem('itinerary', i)}><MinusCircle className="h-4 w-4 text-red-400" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Incluye</CardTitle><Button type="button" size="sm" variant="outline" onClick={() => addItem('includes')}><PlusCircle className="h-4 w-4" /></Button></CardHeader>
              <CardContent className="space-y-3">
                {formData.includes.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={item} onChange={e => {
                      const newInc = [...formData.includes];
                      newInc[i] = e.target.value;
                      setFormData({...formData, includes: newInc});
                    }} placeholder="Servicio incluido..." />
                    <Button type="button" variant="ghost" onClick={() => removeItem('includes', i)}><MinusCircle className="h-4 w-4 text-red-400" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Barra Lateral: Imagen, Precios y Pagos */}
        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Imagen de Portada</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300">
                {imageUrlPreview ? <img src={imageUrlPreview} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full text-gray-400"><ImageIcon className="h-12 w-12" /><p className="text-xs">Subir imagen</p></div>}
                <Input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 text-white shadow-xl">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Receipt className="h-5 w-5 text-rosa-mexicano" /> Pagos Proveedores</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">Pagado a Hotel</p>
                <p className="text-2xl font-black text-green-400">${providerPayments.hotel.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">Pagado a Autobús</p>
                <p className="text-2xl font-black text-green-400">${providerPayments.bus.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tarifas de Venta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Label>Doble (p/p)</Label><Input type="number" id="selling_price_double_occupancy" value={formData.selling_price_double_occupancy} onChange={handleChange} /></div>
              <div className="space-y-1"><Label>Triple (p/p)</Label><Input type="number" id="selling_price_triple_occupancy" value={formData.selling_price_triple_occupancy} onChange={handleChange} /></div>
              <div className="space-y-1"><Label>Cuádruple (p/p)</Label><Input type="number" id="selling_price_quad_occupancy" value={formData.selling_price_quad_occupancy} onChange={handleChange} /></div>
              <div className="space-y-1"><Label>Niño (-12 años)</Label><Input type="number" id="selling_price_child" value={formData.selling_price_child} onChange={handleChange} /></div>
              <div className="space-y-1 pt-4 border-t border-dashed">
                <Label className="text-blue-600 font-bold flex items-center gap-2"><Bus className="h-4 w-4" /> Solo Traslado Redondo ($)</Label>
                <Input type="number" id="transport_only_price" value={formData.transport_only_price} onChange={handleChange} className="border-blue-200 focus:ring-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano h-14 px-10 text-lg font-bold shadow-2xl rounded-2xl hover:scale-105 transition-transform">
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />} Guardar Tour
        </Button>
      </div>
    </form>
  );
};

export default TourForm;