"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, MessageSquare, CheckCircle2, Landmark, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ClientBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  initialSelectedSeats?: number[];
}

const ClientBookingForm: React.FC<ClientBookingFormProps> = ({
  isOpen, onClose, tourId, tourTitle, initialSelectedSeats = [],
}) => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', age: null as number | null
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [generatedContract, setGeneratedContract] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('agency_settings').select('*').single();
      if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  const handleWhatsAppRedirect = (contract: string, name: string, method: string) => {
    const phone = '528444041469';
    const isTransfer = method === 'transferencia';
    const message = encodeURIComponent(`¡Hola Saura Tours! 👋\n\nAcabo de realizar una reserva.\n\n📝 *Detalles de mi Reserva:*\n• *Contrato:* ${contract}\n• *Cliente:* ${name}\n• *Tour:* ${tourTitle}\n• *Método:* ${isTransfer ? 'Transferencia Bancaria' : 'Pago Manual/Pendiente'}\n\n${isTransfer ? '✅ *Ya realicé mi transferencia. Adjunto mi comprobante en este mensaje.*' : 'Quedo a la espera de instrucciones para realizar mi pago. ¡Muchas gracias!'}`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent, paymentMethod: 'mercadopago' | 'stripe' | 'transferencia' | 'manual') => {
    if (e) e.preventDefault();
    
    if (!formData.first_name || !formData.email) {
      toast.error('Nombre y Email son obligatorios.');
      return;
    }

    if (paymentMethod === 'transferencia' && !showTransferInfo) {
      setShowTransferInfo(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const contractNumber = uuidv4().substring(0, 8).toUpperCase();
      const { data: newClient, error: clientError } = await supabase.from('clients').insert({
        first_name: formData.first_name, last_name: formData.last_name,
        email: formData.email, phone: formData.phone,
        contract_number: contractNumber, tour_id: tourId,
        status: 'pending', contractor_age: formData.age,
      }).select('id').single();

      if (clientError) throw clientError;

      setGeneratedContract(contractNumber);

      if (paymentMethod === 'mercadopago' && (settings?.advance_payment_amount || 0) > 0) {
        const { data: mpData, error: mpError } = await supabase.functions.invoke('mercadopago-checkout', {
          body: { clientId: newClient.id, amount: settings.advance_payment_amount, description: `Anticipo Tour: ${tourTitle}` }
        });
        if (mpError) throw mpError;
        window.location.href = mpData.init_point;
      } else if (paymentMethod === 'stripe' && (settings?.advance_payment_amount || 0) > 0) {
        const { data: sData, error: sError } = await supabase.functions.invoke('stripe-checkout', {
          body: { clientId: newClient.id, amount: settings.advance_payment_amount, description: `Anticipo Tour: ${tourTitle}` }
        });
        if (sError) throw sError;
        window.location.href = sData.url;
      } else {
        setShowSuccess(true);
        handleWhatsAppRedirect(contractNumber, `${formData.first_name} ${formData.last_name}`, paymentMethod);
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Error al procesar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px] text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">¡Reserva Registrada!</DialogTitle>
            <DialogDescription className="text-lg">
              Contrato: <span className="block text-3xl font-black text-rosa-mexicano my-2">{generatedContract}</span>
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">Se ha abierto WhatsApp para que envíes tus datos y el comprobante de pago.</p>
          <Button onClick={onClose} className="w-full mt-4 bg-rosa-mexicano">Cerrar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Finalizar Reserva</DialogTitle>
          <DialogDescription>Completa tus datos y selecciona tu método de pago.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          {showTransferInfo && settings?.bank_name && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
              <h4 className="font-bold text-blue-800 flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Datos de Transferencia
              </h4>
              <div className="text-sm text-blue-900 space-y-1">
                <p><strong>Banco:</strong> {settings.bank_name}</p>
                <p><strong>CLABE:</strong> {settings.bank_clabe}</p>
                <p><strong>Titular:</strong> {settings.bank_holder}</p>
                <p className="font-bold text-rosa-mexicano mt-2">Monto a depositar: ${settings.advance_payment_amount || 0} por persona</p>
              </div>
              <p className="text-xs text-blue-700 italic flex gap-1 items-start">
                <Info className="h-3 w-3 mt-0.5 shrink-0" /> Al realizar una transferencia debes enviar tu comprobante por mensaje.
              </p>
              <Button onClick={(e) => handleSubmit(e, 'transferencia')} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Confirmar y enviar comprobante por WhatsApp
              </Button>
            </div>
          )}

          {!showTransferInfo && (
            <div className="grid grid-cols-1 gap-3 mt-4">
              <Button type="button" onClick={() => handleSubmit(null as any, 'mercadopago')} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 py-6 text-base">
                <CreditCard className="mr-2 h-4 w-4" /> Mercado Pago
              </Button>
              <Button type="button" onClick={() => handleSubmit(null as any, 'stripe')} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 py-6 text-base">
                <CreditCard className="mr-2 h-4 w-4" /> Stripe
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowTransferInfo(true)} disabled={isSubmitting} className="py-6 border-green-600 text-green-700 hover:bg-green-50">
                <Landmark className="mr-2 h-4 w-4" /> Transferencia Bancaria
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleSubmit(null as any, 'manual')} disabled={isSubmitting} className="py-6 text-rosa-mexicano hover:text-rosa-mexicano hover:bg-rosa-mexicano/10">
                Otro / Pagar después por WhatsApp
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;