"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Trash2, CreditCard, Hand } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string; // NEW
}

const ClientPaymentHistoryTable = ({ clientId, onPaymentsUpdated }: { clientId: string, onPaymentsUpdated: () => void }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) fetchPayments();
  }, [clientId]);

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

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Historial de Pagos</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{format(parseISO(p.payment_date), 'dd/MM/yyyy')}</TableCell>
              <TableCell className="font-bold">${p.amount.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={p.payment_method === 'mercadopago' ? 'default' : 'secondary'} className="gap-1">
                  {p.payment_method === 'mercadopago' ? <CreditCard className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
                  {p.payment_method === 'mercadopago' ? 'Mercado Pago' : 'Manual'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-gray-400">{p.id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientPaymentHistoryTable;