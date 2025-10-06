"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Trash2, Loader2, Upload } from 'lucide-react'; // Added Upload icon
import { v4 as uuidv4 } from 'uuid'; // For unique file names

interface Slide {
  id: string; // Changed to string to match Supabase UUID
  image_url: string; // Changed to image_url to match Supabase column name
  title: string;
  description: string;
  order_index: number; // Added order_index for sorting
}

const SlideshowSettings = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [newSlide, setNewSlide] = useState({ imageFile: null as File | null, imageUrlPreview: '', title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .order('order_index', { ascending: true }); // Order by order_index

    if (error) {
      console.error('Error fetching slides:', error);
      toast.error('Error al cargar las diapositivas.');
    } else {
      setSlides(data || []);
    }
    setLoading(false);
  };

  const handleNewSlideChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setNewSlide((prev) => ({ ...prev, [id]: value }));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewSlide((prev) => ({ ...prev, imageFile: file, imageUrlPreview: URL.createObjectURL(file) }));
    } else {
      setNewSlide((prev) => ({ ...prev, imageFile: null, imageUrlPreview: '' }));
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `public/${fileName}`; // Store in a 'public' folder within the bucket

    const { data, error } = await supabase.storage
      .from('tour-images') // Changed to 'tour-images' bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    setIsUploadingImage(false);

    if (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen.');
      return null;
    }

    // Get the public URL of the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from('tour-images') // Changed to 'tour-images' bucket
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const addSlide = async () => {
    if (!newSlide.imageFile || !newSlide.title || !newSlide.description) {
      toast.error('Por favor, selecciona una imagen y rellena todos los campos para la nueva diapositiva.');
      return;
    }
    setIsSubmitting(true);

    const imageUrl = await uploadImage(newSlide.imageFile);

    if (!imageUrl) {
      setIsSubmitting(false);
      return; // Image upload failed
    }

    const { data, error } = await supabase
      .from('slides')
      .insert({
        image_url: imageUrl,
        title: newSlide.title,
        description: newSlide.description,
        order_index: slides.length, // Assign a new order index
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding slide:', error);
      toast.error('Error al añadir la diapositiva.');
    } else if (data) {
      setSlides((prev) => [...prev, data]);
      setNewSlide({ imageFile: null, imageUrlPreview: '', title: '', description: '' });
      toast.success('Diapositiva añadida con éxito.');
    }
    setIsSubmitting(false);
  };

  const deleteSlide = async (id: string) => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from('slides')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting slide:', error);
      toast.error('Error al eliminar la diapositiva.');
    } else {
      setSlides((prev) => prev.filter((slide) => slide.id !== id));
      toast.success('Diapositiva eliminada con éxito.');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle className="mb-4">Configuración del Slideshow</CardTitle>
        <CardDescription>Cargando diapositivas...</CardDescription>
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano mt-4" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración del Slideshow</CardTitle>
        <CardDescription>Gestiona las imágenes y textos que aparecen en el carrusel principal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Añadir Nueva Diapositiva</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="image_file">Subir Imagen</Label>
              <Input
                id="image_file"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="file:text-rosa-mexicano file:font-semibold file:border-0 file:bg-transparent file:mr-4"
              />
              {newSlide.imageUrlPreview && (
                <div className="mt-2">
                  <img src={newSlide.imageUrlPreview} alt="Vista previa" className="w-32 h-20 object-cover rounded-md" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={newSlide.title}
                onChange={handleNewSlideChange}
                placeholder="Título de la diapositiva"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={newSlide.description}
              onChange={handleNewSlideChange}
              placeholder="Descripción breve de la diapositiva"
            />
          </div>
          <Button onClick={addSlide} disabled={isSubmitting || isUploadingImage}>
            {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isUploadingImage ? 'Subiendo imagen...' : 'Añadir Diapositiva'}
          </Button>
        </div>

        <div className="space-y-4 mt-8">
          <h3 className="text-xl font-semibold">Diapositivas Existentes</h3>
          {slides.length === 0 ? (
            <p className="text-gray-600">No hay diapositivas configuradas.</p>
          ) : (
            <div className="grid gap-4">
              {slides.map((slide) => (
                <Card key={slide.id} className="flex items-center p-4">
                  <img src={slide.image_url} alt={slide.title} className="w-24 h-16 object-cover rounded-md mr-4" />
                  <div className="flex-grow">
                    <p className="font-semibold">{slide.title}</p>
                    <p className="text-sm text-gray-600 line-clamp-1">{slide.description}</p>
                  </div>
                  <Button variant="destructive" size="icon" onClick={() => deleteSlide(slide.id)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SlideshowSettings;