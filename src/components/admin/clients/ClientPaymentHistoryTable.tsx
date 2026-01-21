"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Trash2, CreditCard, Hand, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
}

const ClientPaymentHistoryTable = ({ clientId, onPaymentsUpdated }: { clientId: string, onPaymentsUpdated: () => void }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) fetchPayments();
  }, [clientId, onPaymentsUpdated]); // Se añade trigger para refrescar tras abono

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_payments')
      .select('*')
      .eq('client_id', clientId)
      .order('payment_date', { ascending: false });
    if (data) setPayments(data);
    setLoading(false);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'mercadopago':
        return (
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 gap-1">
            <CreditCard className="h-3 w-3" /> Mercado Pago
          </Badge>
        );
      case 'stripe':
        return (
          <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700 gap-1">
            <ShieldCheck className="h-3 w-3" /> Stripe
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Hand className="h-3 w-3" /> Manual
          </Badge>
        );
    }
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Historial de Abonos</h3>
      {payments.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No se han registrado abonos para este contrato.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>ID de Referencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{format(parseISO(p.payment_date), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-bold text-green-600">${p.amount.toFixed(2)}</TableCell>
                <TableCell>{getMethodBadge(p.payment_method)}</TableCell>
                <TableCell className="text-[10px] font-mono text-gray-400">{p.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ClientPaymentHistoryTable;