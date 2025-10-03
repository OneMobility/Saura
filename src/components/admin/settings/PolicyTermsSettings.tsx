"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2 } from 'lucide-react';

interface PolicyTermSetting {
  id?: string;
  page_type: 'privacy_policy' | 'terms_and_conditions';
  title: string;
  content: string;
}

const PolicyTermsSettings = () => {
  const [privacyPolicy, setPrivacyPolicy] = useState<PolicyTermSetting>({
    page_type: 'privacy_policy',
    title: '',
    content: '',
  });
  const [termsAndConditions, setTermsAndConditions] = useState<PolicyTermSetting>({
    page_type: 'terms_and_conditions',
    title: '',
    content: '',
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPolicyTermsSettings();
  }, []);

  const fetchPolicyTermsSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('policy_terms_settings')
      .select('*');

    if (error) {
      console.error('Error fetching policy/terms settings:', error);
      toast.error('Error al cargar las políticas y términos.');
    } else {
      const privacy = data?.find(item => item.page_type === 'privacy_policy');
      const terms = data?.find(item => item.page_type === 'terms_and_conditions');

      if (privacy) setPrivacyPolicy(privacy);
      if (terms) setTermsAndConditions(terms);
    }
    setLoading(false);
  };

  const handleChange = (pageType: 'privacy_policy' | 'terms_and_conditions', field: 'title' | 'content', value: string) => {
    if (pageType === 'privacy_policy') {
      setPrivacyPolicy(prev => ({ ...prev, [field]: value }));
    } else {
      setTermsAndConditions(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (pageType: 'privacy_policy' | 'terms_and_conditions', e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const currentSettings = pageType === 'privacy_policy' ? privacyPolicy : termsAndConditions;

    if (!currentSettings.title || !currentSettings.content) {
      toast.error('Por favor, rellena el título y el contenido.');
      setIsSubmitting(false);
      return;
    }

    const dataToSave = {
      page_type: currentSettings.page_type,
      title: currentSettings.title,
      content: currentSettings.content,
    };

    if (currentSettings.id) {
      const { error } = await supabase
        .from('policy_terms_settings')
        .update({
          ...dataToSave,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSettings.id);

      if (error) {
        console.error(`Error updating ${pageType} settings:`, error);
        toast.error(`Error al actualizar la ${pageType === 'privacy_policy' ? 'Política de Privacidad' : 'Términos y Condiciones'}.`);
      } else {
        toast.success(`${pageType === 'privacy_policy' ? 'Política de Privacidad' : 'Términos y Condiciones'} actualizada con éxito.`);
        fetchPolicyTermsSettings();
      }
    } else {
      const { data, error } = await supabase
        .from('policy_terms_settings')
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error(`Error inserting ${pageType} settings:`, error);
        toast.error(`Error al guardar la ${pageType === 'privacy_policy' ? 'Política de Privacidad' : 'Términos y Condiciones'}.`);
      } else if (data) {
        if (pageType === 'privacy_policy') setPrivacyPolicy(data);
        else setTermsAndConditions(data);
        toast.success(`${pageType === 'privacy_policy' ? 'Política de Privacidad' : 'Términos y Condiciones'} guardada con éxito.`);
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle className="mb-4">Configuración de Políticas y Términos</CardTitle>
        <CardDescription>Cargando configuración...</CardDescription>
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano mt-4" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración de Políticas y Términos</CardTitle>
        <CardDescription>Gestiona el contenido de tu Política de Privacidad y Términos y Condiciones.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="privacy_policy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="privacy_policy">Política de Privacidad</TabsTrigger>
            <TabsTrigger value="terms_and_conditions">Términos y Condiciones</TabsTrigger>
          </TabsList>
          <TabsContent value="privacy_policy">
            <form onSubmit={(e) => handleSubmit('privacy_policy', e)} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="privacy_title">Título de la Política de Privacidad</Label>
                <Input
                  id="privacy_title"
                  value={privacyPolicy.title || ''}
                  onChange={(e) => handleChange('privacy_policy', 'title', e.target.value)}
                  placeholder="Ej: Política de Privacidad de Saura Bus"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacy_content">Contenido de la Política de Privacidad</Label>
                <Textarea
                  id="privacy_content"
                  value={privacyPolicy.content || ''}
                  onChange={(e) => handleChange('privacy_policy', 'content', e.target.value)}
                  placeholder="Escribe aquí el contenido completo de tu política de privacidad. Puedes usar HTML básico."
                  rows={15}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Política de Privacidad
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="terms_and_conditions">
            <form onSubmit={(e) => handleSubmit('terms_and_conditions', e)} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="terms_title">Título de los Términos y Condiciones</Label>
                <Input
                  id="terms_title"
                  value={termsAndConditions.title || ''}
                  onChange={(e) => handleChange('terms_and_conditions', 'title', e.target.value)}
                  placeholder="Ej: Términos y Condiciones de Servicio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms_content">Contenido de los Términos y Condiciones</Label>
                <Textarea
                  id="terms_content"
                  value={termsAndConditions.content || ''}
                  onChange={(e) => handleChange('terms_and_conditions', 'content', e.target.value)}
                  placeholder="Escribe aquí el contenido completo de tus términos y condiciones. Puedes usar HTML básico."
                  rows={15}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Términos y Condiciones
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PolicyTermsSettings;