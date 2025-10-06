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

interface Hotel {
  id: string;
  name: string;
  total_quote_cost: number; // Total cost for all contracted rooms in this quote
  total_paid: number; // Total paid to the hotel for this quote
  remaining_payment: number; // Remaining payment for this quote
}

interface HotelPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: Hotel | null;
  onPaymentRegistered: () => void; // Callback to refresh hotel data
}

const HotelPaymentDialog: React.FC<HotelPaymentDialogProps> = ({ isOpen, onClose, hotel, onPaymentRegistered }) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentDateInput, setPaymentDateInput] = useState<string>(format(new Date(), 'dd/MM/yy', { locale: es })); // State for input string
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date()); // Internal Date object
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && hotel) {
      setAmount(0); // Reset amount when dialog opens
      const today = new Date();
      setPaymentDate(today); // Default to today
      setPaymentDateInput(format(today, 'dd/MM/yy', { locale: es })); // Set input string
    }
  }, [isOpen, hotel]);

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

    if (!hotel) {
      toast.error('No se ha seleccionado ninguna cotización de hotel.');
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
        .from('hotel_payments')
        .insert({
          hotel_id: hotel.id,
          amount: amount,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
        });

      if (paymentError) {
        console.error('Error inserting hotel payment:', paymentError);
        toast.error('Error al registrar el abono al hotel.');
        setIsSubmitting(false);
        return;
      }

      // 2. Update the hotel's total_paid amount
      const newTotalPaid = hotel.total_paid + amount;
      const { error: hotelUpdateError } = await supabase
        .from('hotels')
        .update({ total_paid: newTotalPaid, updated_at: new Date().toISOString() })
        .eq('id', hotel.id);

      if (hotelUpdateError) {
        console.error('Error updating hotel total_paid:', hotelUpdateError);
        toast.error('Error al actualizar el total pagado del hotel.');
        // Consider rolling back payment insertion if this fails, or handle with a trigger
      } else {
        toast.success('Abono registrado y total pagado del hotel actualizado con éxito.');
        onPaymentRegistered(); // Notify parent to refresh hotel data
        onClose();
      }
    } catch (error) {
      console.error('Unexpected error during hotel payment registration:', error);
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAfterPayment = hotel ? hotel.remaining_payment - amount : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Abono a Hotel</DialogTitle>
          <DialogDescription>
            Registra un nuevo abono para la cotización de hotel: {hotel?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Monto
            </Label>
            <Input
              id="amount"
              type="text" // Changed to text
              pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="col-span-3"
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

          {hotel && (
            <div className="col-span-4 mt-4 p-3 bg-gray-50 rounded-md text-sm">
              <p><span className="font-semibold">Costo Total Cotización:</span> ${hotel.total_quote_cost.toFixed(2)}</p>
              <p><span className="font-semibold">Total Pagado Actualmente:</span> ${hotel.total_paid.toFixed(2)}</p>
              <p><span className="font-semibold">Deuda Actual:</span> ${hotel.remaining_payment.toFixed(2)}</p>
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

export default HotelPaymentDialog;