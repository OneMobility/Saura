"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, MessageSquare, CheckCircle2 } from 'lucide-react';
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
  const [generatedContract, setGeneratedContract] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);

  useEffect(() => {
    const fetchAdvance = async () => {
      const { data } = await supabase.from('agency_settings').select('advance_payment_amount').single();
      if (data) setAdvanceAmount(data.advance_payment_amount || 0);
    };
    fetchAdvance();
  }, []);

  const handleWhatsAppRedirect = (contract: string, name: string) => {
    const phone = '528444041469';
    const message = encodeURIComponent(`¡Hola Saura Tours! 👋\n\nAcabo de realizar una reserva.\n\n📝 *Detalles de mi Reserva:*\n• *Contrato:* ${contract}\n• *Cliente:* ${name}\n• *Tour:* ${tourTitle}\n\nQuedo a la espera de instrucciones para realizar mi pago manual. ¡Muchas gracias!`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent, paymentMethod: 'mercadopago' | 'stripe' | 'manual') => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    if (!formData.first_name || !formData.email) {
      toast.error('Nombre y Email son obligatorios.');
      setIsSubmitting(false);
      return;
    }

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

      if (paymentMethod === 'mercadopago' && advanceAmount > 0) {
        const { data: mpData, error: mpError } = await supabase.functions.invoke('mercadopago-checkout', {
          body: { clientId: newClient.id, amount: advanceAmount, description: `Anticipo Tour: ${tourTitle}` }
        });
        if (mpError) throw mpError;
        window.location.href = mpData.init_point;
      } else if (paymentMethod === 'stripe' && advanceAmount > 0) {
        const { data: sData, error: sError } = await supabase.functions.invoke('stripe-checkout', {
          body: { clientId: newClient.id, amount: advanceAmount, description: `Anticipo Tour: ${tourTitle}` }
        });
        if (sError) throw sError;
        window.location.href = sData.url;
      } else {
        setShowSuccess(true);
        handleWhatsAppRedirect(contractNumber, `${formData.first_name} ${formData.last_name}`);
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
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">¡Reserva Registrada!</DialogTitle>
            <DialogDescription className="text-lg">
              Contrato: <span className="block text-3xl font-black text-rosa-mexicano my-2">{generatedContract}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg text-sm">
            <p>Se ha abierto WhatsApp para dar seguimiento.</p>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={onClose} className="w-full bg-rosa-mexicano">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Finalizar Reserva</DialogTitle>
          <DialogDescription>Elige tu método de pago preferido para el anticipo.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4 py-4">
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

          <div className="grid grid-cols-1 gap-3 mt-6">
            <Button type="button" onClick={() => handleSubmit(null as any, 'mercadopago')} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 py-6 text-base">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Pagar Anticipo (Mercado Pago)
            </Button>
            <Button type="button" onClick={() => handleSubmit(null as any, 'stripe')} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 py-6 text-base">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Pagar Anticipo (Stripe)
            </Button>
            <Button type="button" variant="outline" onClick={() => handleSubmit(null as any, 'manual')} disabled={isSubmitting} className="py-6 border-rosa-mexicano text-rosa-mexicano">
              <MessageSquare className="mr-2 h-4 w-4" />
              Reservar y Pagar por WhatsApp
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;