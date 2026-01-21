"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Upload, Globe } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AgencySetting {
  id?: string;
  agency_name: string;
  agency_phone: string;
  agency_email: string;
  agency_address: string;
  logo_url: string | null;
  favicon_url: string | null; // NEW
}

const AgencySettings = () => {
  const [agencyInfo, setAgencyInfo] = useState<AgencySetting>({
    agency_name: '',
    agency_phone: '',
    agency_email: '',
    agency_address: '',
    logo_url: null,
    favicon_url: null,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null); // NEW
  const [logoUrlPreview, setLogoUrlPreview] = useState<string>('');
  const [faviconUrlPreview, setFaviconUrlPreview] = useState<string>(''); // NEW
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    fetchAgencySettings();
  }, []);

  useEffect(() => {
    if (agencyInfo.logo_url) setLogoUrlPreview(agencyInfo.logo_url);
    else if (!logoFile) setLogoUrlPreview('');
  }, [agencyInfo.logo_url, logoFile]);

  useEffect(() => {
    if (agencyInfo.favicon_url) setFaviconUrlPreview(agencyInfo.favicon_url);
    else if (!faviconFile) setFaviconUrlPreview('');
  }, [agencyInfo.favicon_url, faviconFile]);

  const fetchAgencySettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching agency settings:', error);
      toast.error('Error al cargar la información de la agencia.');
    } else if (data) {
      setAgencyInfo(data);
      setLogoUrlPreview(data.logo_url || '');
      setFaviconUrlPreview(data.favicon_url || '');
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setAgencyInfo((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'logo') {
        setLogoFile(file);
        setLogoUrlPreview(URL.createObjectURL(file));
      } else {
        setFaviconFile(file);
        setFaviconUrlPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    setIsUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from('tour-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    setIsUploadingImage(false);

    if (error) {
      console.error(`Error uploading ${folder}:`, error);
      toast.error(`Error al subir la imagen (${folder}).`);
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

    let finalLogoUrl = agencyInfo.logo_url;
    let finalFaviconUrl = agencyInfo.favicon_url;

    if (logoFile) {
      const uploadedUrl = await uploadImage(logoFile, 'agency-logos');
      if (uploadedUrl) finalLogoUrl = uploadedUrl;
    }

    if (faviconFile) {
      const uploadedUrl = await uploadImage(faviconFile, 'favicons');
      if (uploadedUrl) finalFaviconUrl = uploadedUrl;
    }

    const dataToSave = {
      agency_name: agencyInfo.agency_name,
      agency_phone: agencyInfo.agency_phone,
      agency_email: agencyInfo.agency_email,
      agency_address: agencyInfo.agency_address,
      logo_url: finalLogoUrl,
      favicon_url: finalFaviconUrl,
    };

    if (agencyInfo.id) {
      const { error } = await supabase
        .from('agency_settings')
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', agencyInfo.id);

      if (error) {
        toast.error('Error al actualizar la configuración.');
      } else {
        toast.success('Configuración actualizada con éxito.');
        fetchAgencySettings();
        window.location.reload(); // Reload to apply title/favicon changes globally
      }
    } else {
      const { data, error } = await supabase
        .from('agency_settings')
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        toast.error('Error al guardar la configuración.');
      } else if (data) {
        setAgencyInfo(data);
        toast.success('Configuración guardada con éxito.');
        window.location.reload();
      }
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Identidad y Contacto del Sitio</CardTitle>
        <CardDescription>Gestiona el nombre que aparece en el navegador y los elementos visuales de marca.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agency_name">Nombre del Sitio (Navegador)</Label>
              <Input
                id="agency_name"
                value={agencyInfo.agency_name || ''}
                onChange={handleChange}
                placeholder="Ej: Saura Tours"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon_file">Favicon (Icono de Pestaña)</Label>
              <div className="flex items-center space-x-4">
                <Input
                  id="favicon_file"
                  type="file"
                  accept="image/x-icon,image/png,image/svg+xml"
                  onChange={(e) => handleFileChange(e, 'favicon')}
                  className="file:text-rosa-mexicano text-sm"
                />
                {faviconUrlPreview && (
                  <img src={faviconUrlPreview} alt="Favicon" className="w-8 h-8 object-contain border rounded p-1" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_file">Logo de la Agencia</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="logo_file"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'logo')}
                className="file:text-rosa-mexicano"
              />
              {logoUrlPreview && (
                <img src={logoUrlPreview} alt="Logo" className="w-24 h-auto object-contain border rounded p-2" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agency_phone">Teléfono</Label>
              <Input id="agency_phone" value={agencyInfo.agency_phone || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency_email">Email</Label>
              <Input id="agency_email" type="email" value={agencyInfo.agency_email || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agency_address">Dirección Física</Label>
            <Textarea id="agency_address" value={agencyInfo.agency_address || ''} onChange={handleChange} rows={2} />
          </div>

          <Button type="submit" disabled={isSubmitting || isUploadingImage} className="bg-rosa-mexicano">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgencySettings;