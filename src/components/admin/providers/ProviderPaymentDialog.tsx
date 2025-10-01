"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Provider {
  id: string;
  name: string;
  cost_per_unit: number; // Assuming this is the base cost for calculation
  total_paid: number;
  // For providers, total_cost might be dynamic based on services linked to tours.
  // For simplicity here, we'll assume a 'total_contracted_cost' or similar if available,
  // but for now, we'll just show current total_paid vs. amount being paid.
  // A more complex solution would involve summing costs from linked tour_provider_services.
  // For this dialog, we'll just show the payment being made.
}

interface ProviderPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onPaymentRegistered: () => void; // Callback to refresh provider data
}

const ProviderPaymentDialog: React.FC<ProviderPaymentDialogProps> = ({ isOpen, onClose, provider, onPaymentRegistered }) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && provider) {
      setAmount(0); // Reset amount when dialog opens
      setPaymentDate(new Date()); // Default to today
    }
  }, [isOpen, provider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!provider) {
      toast.error('No se ha seleccionado ningún proveedor.');
      setIsSubmitting(false);
      return;
    }

    if (amount <= 0) {
      toast.error('El monto del abono debe ser mayor que cero.');
      setIsSubmitting(false);
      return;
    }

    if (!paymentDate) {
      toast.error('Por favor, selecciona la fecha del abono.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Insert the new payment record
      const { error: paymentError } = await supabase
        .from('provider_payments')
        .insert({
          provider_id: provider.id,
          amount: amount,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
        });

      if (paymentError) {
        console.error('Error inserting provider payment:', paymentError);
        toast.error('Error al registrar el abono al proveedor.');
        setIsSubmitting(false);
        return;
      }

      // 2. Update the provider's total_paid amount
      const newTotalPaid = provider.total_paid + amount;
      const { error: providerUpdateError } = await supabase
        .from('providers')
        .update({ total_paid: newTotalPaid, updated_at: new Date().toISOString() })
        .eq('id', provider.id);

      if (providerUpdateError) {
        console.error('Error updating provider total_paid:', providerUpdateError);
        toast.error('Error al actualizar el total pagado del proveedor.');
        // Consider rolling back payment insertion if this fails, or handle with a trigger
      } else {
        toast.success('Abono registrado y total pagado del proveedor actualizado con éxito.');
        onPaymentRegistered(); // Notify parent to refresh provider data
        onClose();
      }
    } catch (error) {
      console.error('Unexpected error during provider payment registration:', error);
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // For providers, we don't have a simple 'total_contracted_cost' in the provider table itself.
  // We'll just show the current total paid and the amount being added.
  // The 'remaining_payment' would need to be calculated from all tours linked to this provider.
  // For this dialog, we'll keep it simple and focus on the payment transaction.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Abono a Proveedor</DialogTitle>
          <DialogDescription>
            Registra un nuevo abono para el proveedor: {provider?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Monto
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="col-span-3"
              min={0.01}
              step="0.01"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentDate" className="text-right">
              Fecha del Abono
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {provider && (
            <div className="col-span-4 mt-4 p-3 bg-gray-50 rounded-md text-sm">
              <p><span className="font-semibold">Proveedor:</span> {provider.name}</p>
              <p><span className="font-semibold">Total Pagado Actualmente:</span> ${provider.total_paid.toFixed(2)}</p>
              <p className="mt-2 font-bold">
                <span className="font-semibold">Nuevo Total Pagado:</span> ${(provider.total_paid + amount).toFixed(2)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Registrar Abono
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderPaymentDialog;