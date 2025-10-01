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

interface AgencySetting {
  id?: string;
  agency_name: string;
  agency_phone: string;
  agency_email: string;
  agency_address: string;
  logo_url: string | null; // NEW: Added logo_url
}

const AgencySettings = () => {
  const [agencyInfo, setAgencyInfo] = useState<AgencySetting>({
    agency_name: '',
    agency_phone: '',
    agency_email: '',
    agency_address: '',
    logo_url: null, // Initialize new field
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAgencySettings();
  }, []);

  const fetchAgencySettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
      console.error('Error fetching agency settings:', error);
      toast.error('Error al cargar la información de la agencia.');
    } else if (data) {
      setAgencyInfo(data);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setAgencyInfo((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!agencyInfo.agency_name) {
      toast.error('El nombre de la agencia es obligatorio.');
      setIsSubmitting(false);
      return;
    }

    if (agencyInfo.id) {
      // Update existing setting
      const { error } = await supabase
        .from('agency_settings')
        .update({
          agency_name: agencyInfo.agency_name,
          agency_phone: agencyInfo.agency_phone,
          agency_email: agencyInfo.agency_email,
          agency_address: agencyInfo.agency_address,
          logo_url: agencyInfo.logo_url, // NEW: Update logo_url
          updated_at: new Date().toISOString(),
        })
        .eq('id', agencyInfo.id);

      if (error) {
        console.error('Error updating agency settings:', error);
        toast.error('Error al actualizar la información de la agencia.');
      } else {
        toast.success('Información de la agencia actualizada con éxito.');
      }
    } else {
      // Insert new setting
      const { data, error } = await supabase
        .from('agency_settings')
        .insert({
          agency_name: agencyInfo.agency_name,
          agency_phone: agencyInfo.agency_phone,
          agency_email: agencyInfo.agency_email,
          agency_address: agencyInfo.agency_address,
          logo_url: agencyInfo.logo_url, // NEW: Insert logo_url
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting agency settings:', error);
        toast.error('Error al guardar la información de la agencia.');
      } else if (data) {
        setAgencyInfo(data);
        toast.success('Información de la agencia guardada con éxito.');
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle className="mb-4">Información de la Agencia</CardTitle>
        <CardDescription>Cargando configuración de la agencia...</CardDescription>
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano mt-4" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Información de Contacto de la Agencia</CardTitle>
        <CardDescription>Configura los datos de contacto de tu agencia para usarlos en documentos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="agency_name">Nombre de la Agencia</Label>
            <Input
              id="agency_name"
              value={agencyInfo.agency_name || ''}
              onChange={handleChange}
              placeholder="Ej: Saura Tours"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency_phone">Teléfono</Label>
            <Input
              id="agency_phone"
              value={agencyInfo.agency_phone || ''}
              onChange={handleChange}
              placeholder="Ej: +52 55 1234 5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency_email">Correo Electrónico</Label>
            <Input
              id="agency_email"
              type="email"
              value={agencyInfo.agency_email || ''}
              onChange={handleChange}
              placeholder="Ej: info@sauratours.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency_address">Dirección</Label>
            <Textarea
              id="agency_address"
              value={agencyInfo.agency_address || ''}
              onChange={handleChange}
              placeholder="Ej: Calle Falsa 123, Colonia Centro, Ciudad de México"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo_url">URL del Logo de la Agencia</Label>
            <Input
              id="logo_url"
              type="url"
              value={agencyInfo.logo_url || ''}
              onChange={handleChange}
              placeholder="https://tu-dominio.com/logo.png"
            />
            {agencyInfo.logo_url && (
              <div className="mt-2">
                <img src={agencyInfo.logo_url} alt="Vista previa del logo" className="w-32 h-auto object-contain rounded-md" />
              </div>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Información de Agencia
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgencySettings;