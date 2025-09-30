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
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  total_amount: number;
  total_paid: number;
  remaining_payment: number;
}

interface ClientPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onPaymentRegistered: () => void; // Callback to refresh client data
}

const ClientPaymentDialog: React.FC<ClientPaymentDialogProps> = ({ isOpen, onClose, client, onPaymentRegistered }) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && client) {
      setAmount(0); // Reset amount when dialog opens
      setPaymentDate(new Date()); // Default to today
    }
  }, [isOpen, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!client) {
      toast.error('No se ha seleccionado ningún cliente.');
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
        .from('client_payments')
        .insert({
          client_id: client.id,
          amount: amount,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
        });

      if (paymentError) {
        console.error('Error inserting payment:', paymentError);
        toast.error('Error al registrar el abono.');
        setIsSubmitting(false);
        return;
      }

      // 2. Update the client's total_paid amount
      const newTotalPaid = client.total_paid + amount;
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({ total_paid: newTotalPaid, updated_at: new Date().toISOString() })
        .eq('id', client.id);

      if (clientUpdateError) {
        console.error('Error updating client total_paid:', clientUpdateError);
        toast.error('Error al actualizar el total pagado del cliente.');
        // Consider rolling back payment insertion if this fails, or handle with a trigger
      } else {
        toast.success('Abono registrado y total pagado actualizado con éxito.');
        onPaymentRegistered(); // Notify parent to refresh client list
        onClose();
      }
    } catch (error) {
      console.error('Unexpected error during payment registration:', error);
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAfterPayment = client ? client.remaining_payment - amount : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Abono</DialogTitle>
          <DialogDescription>
            Registra un nuevo abono para {client?.first_name} {client?.last_name}.
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

          {client && (
            <div className="col-span-4 mt-4 p-3 bg-gray-50 rounded-md text-sm">
              <p><span className="font-semibold">Monto Total del Contrato:</span> ${client.total_amount.toFixed(2)}</p>
              <p><span className="font-semibold">Total Pagado Actualmente:</span> ${client.total_paid.toFixed(2)}</p>
              <p><span className="font-semibold">Deuda Actual:</span> ${client.remaining_payment.toFixed(2)}</p>
              <p className="mt-2 font-bold">
                <span className="font-semibold">Deuda Después del Abono:</span> ${remainingAfterPayment.toFixed(2)}
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

export default ClientPaymentDialog;