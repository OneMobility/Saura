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

interface AgencySetting {
  id?: string;
  agency_name: string;
  agency_phone: string;
  agency_email: string;
  agency_address: string;
  logo_url: string | null;
  favicon_url: string | null;
  contact_image_url: string | null;
}

const AgencySettings = () => {
  const [agencyInfo, setAgencyInfo] = useState<AgencySetting>({
    agency_name: '',
    agency_phone: '',
    agency_email: '',
    agency_address: '',
    logo_url: null,
    favicon_url: null,
    contact_image_url: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchAgencySettings();
  }, []);

  const fetchAgencySettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_settings')
      .select('id, agency_name, agency_phone, agency_email, agency_address, logo_url, favicon_url, contact_image_url')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setAgencyInfo(data);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setAgencyInfo((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof AgencySetting) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    const fileName = `${uuidv4()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('tour-images')
      .upload(`agency/${fileName}`, file);

    if (uploadError) {
      toast.error('Error al subir imagen.');
      setUploading(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(`agency/${fileName}`);
    setAgencyInfo(prev => ({ ...prev, [field]: publicUrl }));
    setUploading(null);
    toast.success('Imagen lista para guardar.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('agency_settings')
      .update({
        agency_name: agencyInfo.agency_name,
        agency_phone: agencyInfo.agency_phone,
        agency_email: agencyInfo.agency_email,
        agency_address: agencyInfo.agency_address,
        logo_url: agencyInfo.logo_url,
        favicon_url: agencyInfo.favicon_url,
        contact_image_url: agencyInfo.contact_image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agencyInfo.id);

    if (error) toast.error('Error al guardar.');
    else toast.success('Información de la agencia actualizada.');
    
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" /></div>;

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Información de la Agencia</CardTitle>
        <CardDescription>Datos de contacto y branding oficial.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agency_name">Nombre Comercial</Label>
              <Input id="agency_name" value={agencyInfo.agency_name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency_email">Email Público</Label>
              <Input id="agency_email" type="email" value={agencyInfo.agency_email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency_phone">WhatsApp de la Agencia</Label>
              <Input id="agency_phone" value={agencyInfo.agency_phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency_address">Dirección Física</Label>
              <Input id="agency_address" value={agencyInfo.agency_address} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <Label>Logo Principal</Label>
              <Input type="file" onChange={(e) => handleFileUpload(e, 'logo_url')} />
              {agencyInfo.logo_url && <img src={agencyInfo.logo_url} className="h-16 object-contain mt-2" alt="Logo" />}
            </div>
            <div className="space-y-2">
              <Label>Favicon (Ícono pestaña)</Label>
              <Input type="file" onChange={(e) => handleFileUpload(e, 'favicon_url')} />
              {agencyInfo.favicon_url && <img src={agencyInfo.favicon_url} className="w-8 h-8 object-contain mt-2" alt="Favicon" />}
            </div>
            <div className="space-y-2">
              <Label>Imagen Banner Contacto</Label>
              <Input type="file" onChange={(e) => handleFileUpload(e, 'contact_image_url')} />
              {agencyInfo.contact_image_url && <img src={agencyInfo.contact_image_url} className="h-16 w-full object-cover mt-2 rounded" alt="Banner" />}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || uploading !== null} className="bg-rosa-mexicano">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios de Agencia
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgencySettings;