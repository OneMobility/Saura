"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2 } from 'lucide-react';

interface SeoSetting {
  id?: string;
  page_name: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
}

const SeoSettings = () => {
  const [globalSeo, setGlobalSeo] = useState<SeoSetting>({
    page_name: 'global',
    meta_title: '',
    meta_description: '',
    keywords: '',
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSeoSettings();
  }, []);

  const fetchSeoSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seo_settings')
      .select('*')
      .eq('page_name', 'global')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
      console.error('Error fetching SEO settings:', error);
      toast.error('Error al cargar la configuración SEO.');
    } else if (data) {
      setGlobalSeo(data);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setGlobalSeo((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (globalSeo.id) {
      // Update existing setting
      const { error } = await supabase
        .from('seo_settings')
        .update({
          meta_title: globalSeo.meta_title,
          meta_description: globalSeo.meta_description,
          keywords: globalSeo.keywords,
          updated_at: new Date().toISOString(),
        })
        .eq('id', globalSeo.id);

      if (error) {
        console.error('Error updating SEO settings:', error);
        toast.error('Error al actualizar la configuración SEO.');
      } else {
        toast.success('Configuración SEO actualizada con éxito.');
      }
    } else {
      // Insert new setting
      const { data, error } = await supabase
        .from('seo_settings')
        .insert({
          page_name: 'global',
          meta_title: globalSeo.meta_title,
          meta_description: globalSeo.meta_description,
          keywords: globalSeo.keywords,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting SEO settings:', error);
        toast.error('Error al guardar la configuración SEO.');
      } else if (data) {
        setGlobalSeo(data);
        toast.success('Configuración SEO guardada con éxito.');
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle className="mb-4">Configuración SEO</CardTitle>
        <CardDescription>Cargando configuración SEO...</CardDescription>
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano mt-4" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración SEO Global</CardTitle>
        <CardDescription>Optimiza la visibilidad de tu sitio en los motores de búsqueda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="meta_title">Meta Título</Label>
            <Input
              id="meta_title"
              value={globalSeo.meta_title || ''}
              onChange={handleChange}
              placeholder="Título que aparece en los resultados de búsqueda"
              maxLength={60}
            />
            <p className="text-sm text-gray-500">Máx. 60 caracteres. Actual: {globalSeo.meta_title?.length || 0}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta Descripción</Label>
            <Textarea
              id="meta_description"
              value={globalSeo.meta_description || ''}
              onChange={handleChange}
              placeholder="Descripción breve de tu sitio para los motores de búsqueda"
              maxLength={160}
            />
            <p className="text-sm text-gray-500">Máx. 160 caracteres. Actual: {globalSeo.meta_description?.length || 0}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywords">Palabras Clave (separadas por comas)</Label>
            <Input
              id="keywords"
              value={globalSeo.keywords || ''}
              onChange={handleChange}
              placeholder="viajes, tours, méxico, aventura"
            />
            <p className="text-sm text-gray-500">Ayuda a los motores de búsqueda a entender el contenido de tu sitio.</p>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Configuración SEO
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SeoSettings;