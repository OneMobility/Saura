"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Trash2, Loader2, Save, Upload, Megaphone } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Slide {
  id: string;
  image_url: string;
  title: string;
  description: string;
  order_index: number;
}

interface PopupSetting {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
}

const SlideshowSettings = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [newSlide, setNewSlide] = useState({ imageFile: null as File | null, imageUrlPreview: '', title: '', description: '' });
  const [popup, setPopup] = useState<PopupSetting | null>(null);
  const [popupFile, setPopupFile] = useState<File | null>(null);
  const [popupPreview, setPopupPreview] = useState('');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [slidesRes, popupRes] = await Promise.all([
      supabase.from('slides').select('*').order('order_index', { ascending: true }),
      supabase.from('popup_settings').select('*').single()
    ]);

    if (slidesRes.data) setSlides(slidesRes.data);
    if (popupRes.data) {
      setPopup(popupRes.data);
      setPopupPreview(popupRes.data.image_url || '');
    }
    setLoading(false);
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    setIsUploadingImage(true);
    const fileName = `${uuidv4()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('tour-images').upload(`${folder}/${fileName}`, file);
    setIsUploadingImage(false);
    if (error) return null;
    return supabase.storage.from('tour-images').getPublicUrl(`${folder}/${fileName}`).data.publicUrl;
  };

  const addSlide = async () => {
    if (!newSlide.imageFile) return toast.error('Selecciona una imagen');
    setIsSubmitting(true);
    const url = await uploadImage(newSlide.imageFile, 'slides');
    if (url) {
      const { data } = await supabase.from('slides').insert({ image_url: url, title: newSlide.title, description: newSlide.description, order_index: slides.length }).select().single();
      if (data) setSlides([...slides, data]);
      setNewSlide({ imageFile: null, imageUrlPreview: '', title: '', description: '' });
    }
    setIsSubmitting(false);
  };

  const deleteSlide = async (id: string) => {
    const { error } = await supabase.from('slides').delete().eq('id', id);
    if (!error) setSlides(slides.filter(s => s.id !== id));
  };

  const savePopup = async () => {
    if (!popup) return;
    setIsSubmitting(true);
    let url = popup.image_url;
    if (popupFile) {
      const newUrl = await uploadImage(popupFile, 'popups');
      if (newUrl) url = newUrl;
    }
    const { error } = await supabase.from('popup_settings').update({
      title: popup.title,
      image_url: url,
      link_url: popup.link_url,
      is_active: popup.is_active,
      updated_at: new Date().toISOString()
    }).eq('id', popup.id);

    if (!error) toast.success('Popup actualizado');
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-8">
      {/* Gestión de Popup */}
      <Card className="p-6 border-rosa-mexicano/20 shadow-md">
        <CardHeader className="px-0">
          <div className="flex items-center space-x-2">
            <Megaphone className="h-6 w-6 text-rosa-mexicano" />
            <CardTitle>Popup de Publicidad</CardTitle>
          </div>
          <CardDescription>Configura un aviso emergente que verán los usuarios al entrar al sitio.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          <div className="flex items-center justify-between p-4 bg-rosa-mexicano/5 rounded-lg border border-rosa-mexicano/10">
            <div className="space-y-0.5">
              <Label>Estado del Popup</Label>
              <p className="text-sm text-muted-foreground">Activa o desactiva la publicidad emergente</p>
            </div>
            <Switch checked={popup?.is_active || false} onCheckedChange={(val) => setPopup(p => p ? {...p, is_active: val} : null)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título del Aviso</Label>
              <Input value={popup?.title || ''} onChange={(e) => setPopup(p => p ? {...p, title: e.target.value} : null)} />
            </div>
            <div className="space-y-2">
              <Label>Enlace de Acción (URL)</Label>
              <Input placeholder="https://..." value={popup?.link_url || ''} onChange={(e) => setPopup(p => p ? {...p, link_url: e.target.value} : null)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagen del Popup</Label>
            <div className="flex items-center space-x-4">
              <Input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setPopupFile(f); setPopupPreview(URL.createObjectURL(f)); }
              }} />
              {popupPreview && <img src={popupPreview} className="w-20 h-20 object-cover rounded border" alt="Prev" />}
            </div>
          </div>

          <Button onClick={savePopup} disabled={isSubmitting} className="bg-rosa-mexicano">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Configuración Popup
          </Button>
        </CardContent>
      </Card>

      {/* Gestión de Slideshow (Existente) */}
      <Card className="p-6">
        <CardHeader className="px-0">
          <CardTitle>Diapositivas del Carrusel</CardTitle>
          <CardDescription>Añade imágenes y textos para la portada principal.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 space-y-6">
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold">Añadir Nueva Diapositiva</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Subir Imagen</Label>
                <Input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setNewSlide(prev => ({ ...prev, imageFile: f, imageUrlPreview: URL.createObjectURL(f) }));
                }} />
                {newSlide.imageUrlPreview && <img src={newSlide.imageUrlPreview} className="w-32 h-20 object-cover rounded mt-2" alt="Prev" />}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={newSlide.title} onChange={(e) => setNewSlide(p => ({...p, title: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={newSlide.description} onChange={(e) => setNewSlide(p => ({...p, description: e.target.value}))} />
                </div>
              </div>
            </div>
            <Button onClick={addSlide} disabled={isSubmitting} className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Diapositiva
            </Button>
          </div>

          <div className="grid gap-4">
            {slides.map((slide) => (
              <div key={slide.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                <img src={slide.image_url} className="w-16 h-12 object-cover rounded mr-4" alt="Slide" />
                <div className="flex-grow">
                  <p className="font-medium">{slide.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{slide.description}</p>
                </div>
                <Button variant="destructive" size="icon" onClick={() => deleteSlide(slide.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SlideshowSettings;