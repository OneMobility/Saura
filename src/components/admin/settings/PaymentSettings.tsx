"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, CreditCard } from 'lucide-react';

interface PaymentSetting {
  id?: string;
  mp_public_key: string | null;
  advance_payment_amount: number;
  mp_commission_percentage: number;
  mp_fixed_fee: number;
  stripe_public_key: string | null;
  stripe_commission_percentage: number;
  stripe_fixed_fee: number;
}

const PaymentSettings = () => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentSetting>({
    mp_public_key: '',
    advance_payment_amount: 0,
    mp_commission_percentage: 3.99,
    mp_fixed_fee: 4.0,
    stripe_public_key: '',
    stripe_commission_percentage: 4.0,
    stripe_fixed_fee: 5.0,
  });
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setPaymentInfo({
        ...data,
        stripe_commission_percentage: data.stripe_commission_percentage || 4.0,
        stripe_fixed_fee: data.stripe_fixed_fee || 5.0,
      });
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPaymentInfo((prev) => ({ 
      ...prev, 
      [id]: ['advance_payment_amount', 'mp_commission_percentage', 'mp_fixed_fee', 'stripe_commission_percentage', 'stripe_fixed_fee'].includes(id) 
        ? parseFloat(value) || 0 
        : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('agency_settings')
      .update({
        mp_public_key: paymentInfo.mp_public_key,
        advance_payment_amount: paymentInfo.advance_payment_amount,
        mp_commission_percentage: paymentInfo.mp_commission_percentage,
        mp_fixed_fee: paymentInfo.mp_fixed_fee,
        stripe_public_key: paymentInfo.stripe_public_key,
        stripe_commission_percentage: paymentInfo.stripe_commission_percentage,
        stripe_fixed_fee: paymentInfo.stripe_fixed_fee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentInfo.id);

    if (error) toast.error('Error al guardar la configuración de pagos.');
    else toast.success('Configuración de pagos actualizada.');
    
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" /></div>;

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración de Pasarelas de Pago</CardTitle>
        <CardDescription>Gestiona las llaves públicas y comisiones de Mercado Pago y Stripe.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="p-4 bg-muted rounded-lg mb-6">
            <Label htmlFor="advance_payment_amount" className="text-lg font-bold">Monto del Anticipo por Persona ($)</Label>
            <Input id="advance_payment_amount" type="number" value={paymentInfo.advance_payment_amount} onChange={handleChange} className="mt-2 bg-white" />
            <p className="text-xs text-muted-foreground mt-1">Este es el monto neto que el cliente deberá pagar al reservar en línea.</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-blue-600">
              <CreditCard className="h-5 w-5" /> Mercado Pago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mp_public_key">Public Key (Producción/Pruebas)</Label>
                <Input id="mp_public_key" value={paymentInfo.mp_public_key || ''} onChange={handleChange} placeholder="APP_USR-..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mp_commission_percentage">Comisión (%)</Label>
                  <Input id="mp_commission_percentage" type="number" step="0.01" value={paymentInfo.mp_commission_percentage} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp_fixed_fee">Cargo Fijo ($)</Label>
                  <Input id="mp_fixed_fee" type="number" step="0.01" value={paymentInfo.mp_fixed_fee} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-indigo-600">
              <CreditCard className="h-5 w-5" /> Stripe
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="stripe_public_key">Public Key (pk_...)</Label>
                <Input id="stripe_public_key" value={paymentInfo.stripe_public_key || ''} onChange={handleChange} placeholder="pk_live_..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stripe_commission_percentage">Comisión (%)</Label>
                  <Input id="stripe_commission_percentage" type="number" step="0.01" value={paymentInfo.stripe_commission_percentage} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe_fixed_fee">Cargo Fijo ($)</Label>
                  <Input id="stripe_fixed_fee" type="number" step="0.01" value={paymentInfo.stripe_fixed_fee} onChange={handleChange} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground italic">Nota: La "Secret Key" debe configurarse directamente en los secretos de Supabase.</p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Configuración de Pagos
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentSettings;