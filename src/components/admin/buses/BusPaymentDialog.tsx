"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react'; // Removed CalendarIcon
import { format, parse, isValid } from 'date-fns'; // Added parse and isValid
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Bus {
  id: string;
  name: string;
  rental_cost: number;
  total_paid: number;
  remaining_payment: number;
}

interface BusPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bus: Bus | null;
  onPaymentRegistered: () => void; // Callback to refresh bus data
}

const BusPaymentDialog: React.FC<BusPaymentDialogProps> = ({ isOpen, onClose, bus, onPaymentRegistered }) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentDateInput, setPaymentDateInput] = useState<string>(format(new Date(), 'dd/MM/yy', { locale: es })); // State for input string
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date()); // Internal Date object
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && bus) {
      setAmount(0); // Reset amount when dialog opens
      const today = new Date();
      setPaymentDate(today); // Default to today
      setPaymentDateInput(format(today, 'dd/MM/yy', { locale: es })); // Set input string
    }
  }, [isOpen, bus]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPaymentDateInput(value);

    const parsedDate = parse(value, 'dd/MM/yy', new Date(), { locale: es });
    if (isValid(parsedDate)) {
      setPaymentDate(parsedDate);
    } else {
      setPaymentDate(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!bus) {
      toast.error('No se ha seleccionado ningún autobús.');
      setIsSubmitting(false);
      return;
    }

    if (amount <= 0) {
      toast.error('El monto del abono debe ser mayor que cero.');
      setIsSubmitting(false);
      return;
    }

    if (!paymentDate || !isValid(paymentDate)) {
      toast.error('Por favor, introduce una fecha de abono válida (DD/MM/AA).');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Insert the new payment record
      const { error: paymentError } = await supabase
        .from('bus_payments')
        .insert({
          bus_id: bus.id,
          amount: amount,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
        });

      if (paymentError) {
        console.error('Error inserting bus payment:', paymentError);
        toast.error('Error al registrar el abono al autobús.');
        setIsSubmitting(false);
        return;
      }

      // 2. Update the bus's total_paid amount
      const newTotalPaid = bus.total_paid + amount;
      const { error: busUpdateError } = await supabase
        .from('buses')
        .update({ total_paid: newTotalPaid, updated_at: new Date().toISOString() })
        .eq('id', bus.id);

      if (busUpdateError) {
        console.error('Error updating bus total_paid:', busUpdateError);
        toast.error('Error al actualizar el total pagado del autobús.');
        // Consider rolling back payment insertion if this fails, or handle with a trigger
      } else {
        toast.success('Abono registrado y total pagado del autobús actualizado con éxito.');
        onPaymentRegistered(); // Notify parent to refresh bus data
        onClose();
      }
    } catch (error) {
      console.error('Unexpected error during bus payment registration:', error);
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAfterPayment = bus ? bus.remaining_payment - amount : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Abono a Autobús</DialogTitle>
          <DialogDescription>
            Registra un nuevo abono para el autobús: {bus?.name}.
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
            <Label htmlFor="paymentDateInput" className="text-right">
              Fecha del Abono
            </Label>
            <Input
              id="paymentDateInput"
              type="text"
              value={paymentDateInput}
              onChange={handleDateInputChange}
              placeholder="DD/MM/AA"
              className="col-span-3"
              required
            />
          </div>

          {bus && (
            <div className="col-span-4 mt-4 p-3 bg-gray-50 rounded-md text-sm">
              <p><span className="font-semibold">Costo Total de Renta:</span> ${bus.rental_cost.toFixed(2)}</p>
              <p><span className="font-semibold">Total Pagado Actualmente:</span> ${bus.total_paid.toFixed(2)}</p>
              <p><span className="font-semibold">Deuda Actual:</span> ${bus.remaining_payment.toFixed(2)}</p>
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

export default BusPaymentDialog;