"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, CreditCard } from 'lucide-react';

interface AgencySetting {
  id?: string;
  agency_name: string;
  agency_phone: string;
  agency_email: string;
  agency_address: string;
  logo_url: string | null;
  favicon_url: string | null;
  contact_image_url: string | null;
  mp_public_key: string | null;
  advance_payment_amount: number;
  mp_commission_percentage: number;
  mp_fixed_fee: number;
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
    mp_public_key: '',
    advance_payment_amount: 0,
    mp_commission_percentage: 3.99,
    mp_fixed_fee: 4.0,
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

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setAgencyInfo(data);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setAgencyInfo((prev) => ({ 
      ...prev, 
      [id]: ['advance_payment_amount', 'mp_commission_percentage', 'mp_fixed_fee'].includes(id) 
        ? parseFloat(value) || 0 
        : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      ...agencyInfo,
      updated_at: new Date().toISOString(),
    };

    const { error } = agencyInfo.id 
      ? await supabase.from('agency_settings').update(dataToSave).eq('id', agencyInfo.id)
      : await supabase.from('agency_settings').insert(dataToSave);

    if (error) toast.error('Error al guardar.');
    else toast.success('Configuración actualizada correctamente.');
    
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" /></div>;

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración de Pagos y Agencia</CardTitle>
        <CardDescription>Gestiona los datos de contacto y la integración con Mercado Pago.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="agency_name">Nombre de la Agencia</Label>
              <Input id="agency_name" value={agencyInfo.agency_name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency_phone">Teléfono de Contacto</Label>
              <Input id="agency_phone" value={agencyInfo.agency_phone} onChange={handleChange} />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-rosa-mexicano">
              <CreditCard className="h-5 w-5" /> Integración Mercado Pago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mp_public_key">Mercado Pago Public Key</Label>
                <Input id="mp_public_key" value={agencyInfo.mp_public_key || ''} onChange={handleChange} placeholder="APP_USR-..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance_payment_amount">Monto del Anticipo por Persona ($)</Label>
                <Input id="advance_payment_amount" type="number" value={agencyInfo.advance_payment_amount} onChange={handleChange} />
                <p className="text-xs text-muted-foreground">Monto que se cobrará al reservar.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp_commission_percentage">Comisión MP (%)</Label>
                <Input id="mp_commission_percentage" type="number" step="0.01" value={agencyInfo.mp_commission_percentage} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp_fixed_fee">Cargo Fijo MP ($)</Label>
                <Input id="mp_fixed_fee" type="number" step="0.01" value={agencyInfo.mp_fixed_fee} onChange={handleChange} />
              </div>
            </div>
            <p className="mt-4 text-sm bg-yellow-50 p-3 rounded-md text-yellow-800 border border-yellow-100">
              Nota: El total a pagar se calculará como: <strong>(Monto + Cargo Fijo) / (1 - Comisión)</strong> + IVA sobre comisión.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano w-full md:w-auto">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Configuración
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgencySettings;