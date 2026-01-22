"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, CreditCard, Landmark, Plus, Trash2, ShieldAlert, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

interface BankAccount {
  id: string;
  bank_name: string;
  bank_clabe: string;
  bank_holder: string;
}

interface PaymentSetting {
  id?: string;
  payment_mode: 'test' | 'production';
  mp_public_key: string | null;
  mp_test_public_key: string | null;
  stripe_public_key: string | null;
  stripe_test_public_key: string | null;
  advance_payment_amount: number;
  mp_commission_percentage: number;
  mp_fixed_fee: number;
  stripe_commission_percentage: number;
  stripe_fixed_fee: number;
  bank_accounts: BankAccount[];
}

const PaymentSettings = () => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentSetting>({
    payment_mode: 'test',
    mp_public_key: '',
    mp_test_public_key: '',
    stripe_public_key: '',
    stripe_test_public_key: '',
    advance_payment_amount: 0,
    mp_commission_percentage: 3.99,
    mp_fixed_fee: 4.0,
    stripe_commission_percentage: 4.0,
    stripe_fixed_fee: 5.0,
    bank_accounts: [],
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

    if (data) {
      setPaymentInfo({
        ...data,
        payment_mode: data.payment_mode || 'test',
        bank_accounts: Array.isArray(data.bank_accounts) ? data.bank_accounts : [],
      });
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const isNumeric = ['advance_payment_amount', 'mp_commission_percentage', 'mp_fixed_fee', 'stripe_commission_percentage', 'stripe_fixed_fee'].includes(id);
    setPaymentInfo(prev => ({ ...prev, [id]: isNumeric ? parseFloat(value) || 0 : value }));
  };

  const handleAddBank = () => {
    setPaymentInfo(prev => ({
      ...prev,
      bank_accounts: [...prev.bank_accounts, { id: uuidv4(), bank_name: '', bank_clabe: '', bank_holder: '' }]
    }));
  };

  const handleRemoveBank = (id: string) => {
    setPaymentInfo(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter(b => b.id !== id)
    }));
  };

  const handleBankChange = (id: string, field: keyof BankAccount, value: string) => {
    setPaymentInfo(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.map(b => b.id === id ? { ...b, [field]: value } : b)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('agency_settings')
      .update({
        payment_mode: paymentInfo.payment_mode,
        mp_public_key: paymentInfo.mp_public_key,
        mp_test_public_key: paymentInfo.mp_test_public_key,
        stripe_public_key: paymentInfo.stripe_public_key,
        stripe_test_public_key: paymentInfo.stripe_test_public_key,
        advance_payment_amount: paymentInfo.advance_payment_amount,
        mp_commission_percentage: paymentInfo.mp_commission_percentage,
        mp_fixed_fee: paymentInfo.mp_fixed_fee,
        stripe_commission_percentage: paymentInfo.stripe_commission_percentage,
        stripe_fixed_fee: paymentInfo.stripe_fixed_fee,
        bank_accounts: paymentInfo.bank_accounts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentInfo.id);

    if (error) toast.error('Error al guardar.');
    else toast.success('Configuración de pagos actualizada.');
    
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-6">
      {/* Selector de Modo */}
      <Card className={cn(
        "border-2",
        paymentInfo.payment_mode === 'test' ? "border-yellow-400 bg-yellow-50/30" : "border-green-500 bg-green-50/30"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-black flex items-center gap-2">
                {paymentInfo.payment_mode === 'test' ? <Zap className="text-yellow-600" /> : <ShieldAlert className="text-green-600" />}
                Modo de Operación: {paymentInfo.payment_mode === 'test' ? 'SANDBOX (Pruebas)' : 'PRODUCCIÓN (En Vivo)'}
              </h3>
              <p className="text-sm text-muted-foreground">Define si los cobros se realizan con dinero real o en ambiente de prueba.</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-xs uppercase tracking-tighter">Pasar a Producción</span>
              <Switch 
                checked={paymentInfo.payment_mode === 'production'} 
                onCheckedChange={(val) => setPaymentInfo(p => ({...p, payment_mode: val ? 'production' : 'test'}))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bancos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Landmark className="text-rosa-mexicano" /> Cuentas para Transferencia</CardTitle>
            <CardDescription>Agrega las cuentas bancarias que los clientes verán para pagar vía transferencia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentInfo.bank_accounts.map((bank, index) => (
              <div key={bank.id} className="p-4 border rounded-xl bg-gray-50 relative group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveBank(bank.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Banco</Label>
                    <Input value={bank.bank_name} onChange={e => handleBankChange(bank.id, 'bank_name', e.target.value)} placeholder="Ej: BBVA" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">CLABE (18 dígitos)</Label>
                    <Input value={bank.bank_clabe} onChange={e => handleBankChange(bank.id, 'bank_clabe', e.target.value)} placeholder="0123..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">Titular</Label>
                    <Input value={bank.bank_holder} onChange={e => handleBankChange(bank.id, 'bank_holder', e.target.value)} placeholder="Nombre del titular" />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddBank} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" /> Agregar Cuenta Bancaria
            </Button>
          </CardContent>
        </Card>

        {/* Mercado Pago */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><CreditCard className="text-blue-600" /> Mercado Pago</CardTitle>
              <CardDescription>Configuración de credenciales de la pasarela.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input id="mp_commission_percentage" type="number" step="0.01" value={paymentInfo.mp_commission_percentage} onChange={handleChange} className="w-20" />
              <span className="self-center font-bold text-xs">% + $</span>
              <Input id="mp_fixed_fee" type="number" step="0.01" value={paymentInfo.mp_fixed_fee} onChange={handleChange} className="w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">Public Key <Badge variant="secondary">PRODUCCIÓN</Badge></Label>
                <Input id="mp_public_key" value={paymentInfo.mp_public_key || ''} onChange={handleChange} placeholder="APP_USR-..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">Public Key <Badge className="bg-yellow-400 text-black">PRUEBAS (Sandbox)</Badge></Label>
                <Input id="mp_test_public_key" value={paymentInfo.mp_test_public_key || ''} onChange={handleChange} placeholder="TEST-..." />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><CreditCard className="text-indigo-600" /> Stripe</CardTitle>
              <CardDescription>Configuración de credenciales de la pasarela.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input id="stripe_commission_percentage" type="number" step="0.01" value={paymentInfo.stripe_commission_percentage} onChange={handleChange} className="w-20" />
              <span className="self-center font-bold text-xs">% + $</span>
              <Input id="stripe_fixed_fee" type="number" step="0.01" value={paymentInfo.stripe_fixed_fee} onChange={handleChange} className="w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">Public Key <Badge variant="secondary">PRODUCCIÓN</Badge></Label>
                <Input id="stripe_public_key" value={paymentInfo.stripe_public_key || ''} onChange={handleChange} placeholder="pk_live_..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">Public Key <Badge className="bg-yellow-400 text-black">PRUEBAS (Sandbox)</Badge></Label>
                <Input id="stripe_test_public_key" value={paymentInfo.stripe_test_public_key || ''} onChange={handleChange} placeholder="pk_test_..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-6 right-6">
          <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano shadow-2xl h-14 px-10 text-lg font-bold rounded-2xl">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Guardar Configuración Maestra
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSettings;