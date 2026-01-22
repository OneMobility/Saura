"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Trash2, CreditCard, Hand, ShieldCheck, Landmark } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Payment {
  id: string;
  client_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  created_at: string;
}

interface ClientPaymentHistoryTableProps {
  clientId: string;
  onPaymentsUpdated: () => void;
}

const ClientPaymentHistoryTable: React.FC<ClientPaymentHistoryTableProps> = ({ clientId, onPaymentsUpdated }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (clientId) fetchPayments();
  }, [clientId, onPaymentsUpdated]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_payments')
      .select('*')
      .eq('client_id', clientId)
      .order('payment_date', { ascending: false });

    if (!error) setPayments(data || []);
    setLoading(false);
  };

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm('¿Eliminar este abono? El saldo del cliente se ajustará automáticamente.')) return;
    setIsDeleting(true);
    try {
      const { error: delError } = await supabase.from('client_payments').delete().eq('id', payment.id);
      if (delError) throw delError;

      const { data: client } = await supabase.from('clients').select('total_paid').eq('id', clientId).single();
      await supabase.from('clients').update({ total_paid: (client?.total_paid || 0) - payment.amount }).eq('id', clientId);
      
      toast.success('Abono eliminado.');
      onPaymentsUpdated();
      fetchPayments();
    } catch (err) {
      toast.error('Error al eliminar abono.');
    } finally {
      setIsDeleting(false);
    }
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
      case 'transferencia':
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
            <Landmark className="h-3 w-3" /> Transferencia
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Hand className="h-3 w-3" /> Manual / Efectivo
          </Badge>
        );
    }
  };

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Historial de Abonos</h3>
      {payments.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No se han registrado abonos para este cliente.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{format(parseISO(p.payment_date), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-bold text-green-600">${p.amount.toLocaleString()}</TableCell>
                <TableCell>{getMethodBadge(p.payment_method)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(p)} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ClientPaymentHistoryTable;