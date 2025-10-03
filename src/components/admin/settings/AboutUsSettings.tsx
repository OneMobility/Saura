"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import RichTextEditor from '@/components/RichTextEditor'; // Import the new RichTextEditor

interface AboutUsSetting {
  id?: string;
  title: string;
  content: string;
  image_url: string | null;
}

const AboutUsSettings = () => {
  const [aboutUsInfo, setAboutUsInfo] = useState<AboutUsSetting>({
    title: '',
    content: '',
    image_url: null,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    fetchAboutUsSettings();
  }, []);

  useEffect(() => {
    if (aboutUsInfo.image_url) {
      setImageUrlPreview(aboutUsInfo.image_url);
    } else if (!imageFile) {
      setImageUrlPreview('');
    }
  }, [aboutUsInfo.image_url, imageFile]);

  const fetchAboutUsSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('about_us_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
      console.error('Error fetching About Us settings:', error);
      toast.error('Error al cargar la configuración de "Sobre Nosotros".');
    } else if (data) {
      setAboutUsInfo(data);
      setImageUrlPreview(data.image_url || '');
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAboutUsInfo((prev) => ({ ...prev, [id]: value }));
  };

  const handleRichTextChange = (content: string) => {
    setAboutUsInfo((prev) => ({ ...prev, content }));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrlPreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImageUrlPreview(aboutUsInfo.image_url || '');
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `about-us-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from('tour-images')
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

    const { data: publicUrlData } = supabase.storage
      .from('tour-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!aboutUsInfo.title || !aboutUsInfo.content) {
      toast.error('Por favor, rellena el título y el contenido de "Sobre Nosotros".');
      setIsSubmitting(false);
      return;
    }

    let finalImageUrl = aboutUsInfo.image_url;

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    } else if (imageUrlPreview === '' && aboutUsInfo.image_url) {
      finalImageUrl = null;
    }

    const dataToSave = {
      title: aboutUsInfo.title,
      content: aboutUsInfo.content,
      image_url: finalImageUrl,
    };

    if (aboutUsInfo.id) {
      const { error } = await supabase
        .from('about_us_settings')
        .update({
          ...dataToSave,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aboutUsInfo.id);

      if (error) {
        console.error('Error updating About Us settings:', error);
        toast.error('Error al actualizar la información de "Sobre Nosotros".');
      } else {
        toast.success('Información de "Sobre Nosotros" actualizada con éxito.');
        fetchAboutUsSettings();
      }
    } else {
      const { data, error } = await supabase
        .from('about_us_settings')
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error('Error inserting About Us settings:', error);
        toast.error('Error al guardar la información de "Sobre Nosotros".');
      } else if (data) {
        setAboutUsInfo(data);
        toast.success('Información de "Sobre Nosotros" guardada con éxito.');
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle className="mb-4">Configuración "Sobre Nosotros"</CardTitle>
        <CardDescription>Cargando configuración...</CardDescription>
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano mt-4" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración "Sobre Nosotros"</CardTitle>
        <CardDescription>Gestiona el contenido de la sección "Sobre Nosotros" de tu sitio.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={aboutUsInfo.title || ''}
              onChange={handleChange}
              placeholder="Ej: Nuestra Historia y Misión"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Contenido</Label>
            <RichTextEditor
              value={aboutUsInfo.content || ''}
              onChange={handleRichTextChange}
              placeholder="Escribe aquí el contenido detallado de la sección 'Sobre Nosotros'."
              className="min-h-[200px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image_file">Imagen de Portada</Label>
            <Input
              id="image_file"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="file:text-rosa-mexicano file:font-semibold file:border-0 file:bg-transparent file:mr-4"
            />
            {imageUrlPreview && (
              <div className="mt-2">
                <img src={imageUrlPreview} alt="Vista previa" className="w-48 h-32 object-cover rounded-md" />
              </div>
            )}
            {!imageFile && !imageUrlPreview && (
              <p className="text-sm text-gray-500">Sube una imagen para la sección "Sobre Nosotros".</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting || isUploadingImage}>
            {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isUploadingImage ? 'Subiendo imagen...' : 'Guardar Configuración'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AboutUsSettings;