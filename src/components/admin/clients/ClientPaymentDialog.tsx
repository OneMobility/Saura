"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

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
  onPaymentRegistered: () => void;
}

const ClientPaymentDialog: React.FC<ClientPaymentDialogProps> = ({ isOpen, onClose, client, onPaymentRegistered }) => {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('manual');
  const [paymentDateInput, setPaymentDateInput] = useState<string>(format(new Date(), 'dd/MM/yy', { locale: es }));
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && client) {
      setAmount(0);
      setPaymentMethod('manual');
      const today = new Date();
      setPaymentDate(today);
      setPaymentDateInput(format(today, 'dd/MM/yy', { locale: es }));
    }
  }, [isOpen, client]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPaymentDateInput(value);
    const parsedDate = parse(value, 'dd/MM/yy', new Date(), { locale: es });
    if (isValid(parsedDate)) setPaymentDate(parsedDate);
    else setPaymentDate(undefined);
  };

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

    if (!paymentDate || !isValid(paymentDate)) {
      toast.error('Fecha inválida.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: paymentError } = await supabase
        .from('client_payments')
        .insert({
          client_id: client.id,
          amount: amount,
          payment_method: paymentMethod,
          payment_date: format(paymentDate, 'yyyy-MM-dd'),
        });

      if (paymentError) throw paymentError;

      const newTotalPaid = client.total_paid + amount;
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({ total_paid: newTotalPaid, updated_at: new Date().toISOString() })
        .eq('id', client.id);

      if (clientUpdateError) throw clientUpdateError;

      toast.success('Abono registrado con éxito.');
      onPaymentRegistered();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar el abono.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAfterPayment = client ? client.remaining_payment - amount : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Abono Manual</DialogTitle>
          <DialogDescription>Registra un pago recibido fuera de línea para {client?.first_name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Monto</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="col-span-3" required />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Método</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Efectivo / Manual</SelectItem>
                <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Fecha</Label>
            <Input id="date" value={paymentDateInput} onChange={handleDateInputChange} placeholder="DD/MM/AA" className="col-span-3" required />
          </div>

          {client && (
            <div className="col-span-4 mt-4 p-3 bg-gray-50 rounded-md text-xs">
              <p>Deuda Actual: <strong>${client.remaining_payment.toFixed(2)}</strong></p>
              <p>Deuda Final: <strong>${remainingAfterPayment.toFixed(2)}</strong></p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="bg-rosa-mexicano">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientPaymentDialog;