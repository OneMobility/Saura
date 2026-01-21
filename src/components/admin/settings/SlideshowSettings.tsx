"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Trash2, Loader2, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Slide {
  id: string;
  image_url: string;
  title: string;
  description: string;
  order_index: number;
}

const SlideshowSettings = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para el formulario de nueva slide
  const [newSlide, setNewSlide] = useState({
    title: '',
    description: '',
    imageFile: null as File | null,
    imageUrlPreview: ''
  });

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching slides:', error);
      toast.error('Error al cargar las diapositivas.');
    } else {
      setSlides(data || []);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewSlide(prev => ({
        ...prev,
        imageFile: file,
        imageUrlPreview: URL.createObjectURL(file)
      }));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `slides/${fileName}`;

    const { error } = await supabase.storage
      .from('tour-images')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen.');
      return null;
    }

    const { data } = supabase.storage
      .from('tour-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlide.imageFile && !newSlide.title) {
      toast.error('Por favor, selecciona una imagen y añade un título.');
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = '';

    if (newSlide.imageFile) {
      const uploadedUrl = await uploadImage(newSlide.imageFile);
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    }

    const { data, error } = await supabase
      .from('slides')
      .insert({
        title: newSlide.title,
        description: newSlide.description,
        image_url: finalImageUrl,
        order_index: slides.length
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding slide:', error);
      toast.error('Error al guardar la diapositiva.');
    } else {
      toast.success('Diapositiva añadida con éxito.');
      setSlides([...slides, data]);
      setNewSlide({ title: '', description: '', imageFile: null, imageUrlPreview: '' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteSlide = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta diapositiva?')) return;

    const { error } = await supabase
      .from('slides')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar.');
    } else {
      toast.success('Eliminada.');
      setSlides(slides.filter(s => s.id !== id));
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Diapositiva</CardTitle>
          <CardDescription>Añade contenido al carrusel de la página de inicio.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSlide} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slide_title">Título</Label>
                <Input 
                  id="slide_title" 
                  value={newSlide.title} 
                  onChange={e => setNewSlide({...newSlide, title: e.target.value})}
                  placeholder="Ej: ¡Aventuras inolvidables!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slide_image">Imagen</Label>
                <Input 
                  id="slide_image" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slide_desc">Descripción</Label>
              <Textarea 
                id="slide_desc" 
                value={newSlide.description} 
                onChange={e => setNewSlide({...newSlide, description: e.target.value})}
                placeholder="Texto secundario de la diapositiva..."
              />
            </div>
            {newSlide.imageUrlPreview && (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                <img src={newSlide.imageUrlPreview} className="w-full h-full object-cover" alt="Preview" />
              </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Añadir al Carrusel
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slides.map((slide) => (
          <Card key={slide.id} className="overflow-hidden group">
            <div className="relative h-40">
              <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button 
                  variant="destructive" 
                  size="icon" 
                  onClick={() => handleDeleteSlide(slide.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardContent className="p-4">
              <p className="font-bold truncate">{slide.title || 'Sin título'}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{slide.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SlideshowSettings;