"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Payment {
  id: string;
  bus_id: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

interface BusPaymentHistoryTableProps {
  busId: string;
  onPaymentsUpdated: () => void; // Callback to refresh parent bus data
}

const BusPaymentHistoryTable: React.FC<BusPaymentHistoryTableProps> = ({ busId, onPaymentsUpdated }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  useEffect(() => {
    if (busId && busId.trim() !== '') { 
      fetchPayments();
    } else {
      setLoading(false);
      setPayments([]);
    }
  }, [busId]);

  const fetchPayments = async () => {
    setLoading(true);
    if (!busId || typeof busId !== 'string' || busId.trim() === '') {
      setLoading(false);
      setPayments([]);
      toast.error('Error: ID de autobús no válido para cargar pagos.');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
        setLoading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionName = 'list-bus-payments';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ busId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Edge Function:', errorData);
        toast.error(`Error al cargar el historial de pagos del autobús: ${errorData.error || 'Error desconocido.'}`);
      } else {
        const data = await response.json();
        if (data && data.payments) {
          setPayments(data.payments);
        } else {
          toast.error('Respuesta inesperada al cargar pagos del autobús.');
        }
      }
    } catch (error: any) {
      console.error('Unexpected error fetching bus payments:', error);
      toast.error(`Error inesperado al cargar pagos del autobús: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este pago? Esto afectará el total pagado del autobús.')) {
      return;
    }

    setIsDeletingPayment(true);
    try {
      // First, get the payment amount to subtract it from the bus's total_paid
      const { data: paymentToDelete, error: fetchError } = await supabase
        .from('bus_payments')
        .select('amount')
        .eq('id', paymentId)
        .single();

      if (fetchError || !paymentToDelete) {
        console.error('Error fetching payment to delete:', fetchError);
        toast.error('Error al obtener el detalle del pago para eliminar.');
        setIsDeletingPayment(false);
        return;
      }

      const paymentAmount = paymentToDelete.amount;

      // Delete the payment record
      const { error: deleteError } = await supabase
        .from('bus_payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) {
        console.error('Error deleting payment:', deleteError);
        toast.error('Error al eliminar el pago.');
      } else {
        // Update the bus's total_paid amount
        const { data: busData, error: busFetchError } = await supabase
          .from('buses')
          .select('total_paid')
          .eq('id', busId)
          .single();

        if (busFetchError || !busData) {
          console.error('Error fetching bus total_paid after payment deletion:', busFetchError);
          toast.error('Error al actualizar el total pagado del autobús.');
        } else {
          const newTotalPaid = busData.total_paid - paymentAmount;
          const { error: busUpdateError } = await supabase
            .from('buses')
            .update({ total_paid: newTotalPaid, updated_at: new Date().toISOString() })
            .eq('id', busId);

          if (busUpdateError) {
            console.error('Error updating bus total_paid after payment deletion:', busUpdateError);
            toast.error('Error al actualizar el total pagado del autobús.');
          } else {
            toast.success('Pago eliminado y total pagado del autobús actualizado con éxito.');
            fetchPayments(); // Refresh the local payment list
            onPaymentsUpdated(); // Notify parent to refresh bus data
          }
        }
      }
    } catch (error: any) {
      console.error('Unexpected error during payment deletion:', error);
      toast.error(`Error inesperado: ${error.message}`);
    } finally {
      setIsDeletingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando historial de pagos del autobús...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Historial de Pagos a Autobús</h3>
      {payments.length === 0 ? (
        <p className="text-gray-600">No hay pagos registrados para este autobús.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>ID de Pago</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(parseISO(payment.payment_date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-gray-500">{payment.id}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeletePayment(payment.id)}
                      disabled={isDeletingPayment}
                    >
                      {isDeletingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span className="sr-only">Eliminar Pago</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default BusPaymentHistoryTable;