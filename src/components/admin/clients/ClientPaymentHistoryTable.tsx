"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Trash2 } from 'lucide-react'; // Import Trash2 icon
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox'; // Renamed to avoid conflict

interface Payment {
  id: string;
  client_id: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

interface ClientPaymentHistoryTableProps {
  clientId: string;
  onPaymentsUpdated: () => void; // Callback to refresh parent client data
}

const ClientPaymentHistoryTable: React.FC<ClientPaymentHistoryTableProps> = ({ clientId, onPaymentsUpdated }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false); // New state for delete loading

  useEffect(() => {
    if (clientId && clientId.trim() !== '') { 
      console.log('ClientPaymentHistoryTable: Attempting to fetch payments for clientId:', clientId);
      fetchPayments();
    } else {
      console.log('ClientPaymentHistoryTable: clientId is invalid or empty, skipping fetchPayments.');
      setLoading(false);
      setPayments([]);
    }
  }, [clientId]);

  const fetchPayments = async () => {
    setLoading(true);
    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      console.error('ClientPaymentHistoryTable: clientId is invalid or empty immediately before fetch. Aborting fetch.');
      setLoading(false);
      setPayments([]);
      toast.error('Error: ID de cliente no válido para cargar pagos.');
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
      const functionName = 'list-client-payments';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      console.log('ClientPaymentHistoryTable: Calling Edge Function via fetch with clientId:', clientId);
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Edge Function:', errorData);
        toast.error(`Error al cargar el historial de pagos: ${errorData.error || 'Error desconocido.'}`);
      } else {
        const data = await response.json();
        if (data && data.payments) {
          setPayments(data.payments);
        } else {
          toast.error('Respuesta inesperada al cargar pagos.');
        }
      }
    } catch (error: any) {
      console.error('Unexpected error fetching payments:', error);
      toast.error(`Error inesperado al cargar pagos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPaymentIds(prev =>
      prev.includes(paymentId) ? prev.filter(id => id !== paymentId) : [...prev, paymentId]
    );
  };

  const handleSelectAllPayments = () => {
    if (selectedPaymentIds.length === payments.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(payments.map(p => p.id));
    }
  };

  const handleGenerateReceipt = async () => {
    if (selectedPaymentIds.length === 0) {
      toast.error('Por favor, selecciona al menos un pago para generar el recibo.');
      return;
    }

    setIsGeneratingReceipt(true);
    toast.info('Generando recibo de pago...');

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
      setIsGeneratingReceipt(false);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionName = 'generate-payment-receipt';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ clientId, paymentIds: selectedPaymentIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Edge Function:', errorData);
        toast.error(`Error al generar el recibo: ${errorData.error || 'Error desconocido.'}`);
        return;
      }

      const htmlContent = await response.text();

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.focus();
        toast.success('Recibo generado. Puedes imprimirlo desde la nueva pestaña.');
      } else {
        toast.error('No se pudo abrir una nueva ventana. Por favor, permite pop-ups.');
      }
    } catch (err: any) {
      console.error('Unexpected error during receipt generation:', err);
      toast.error(`Error inesperado: ${err.message}`);
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este pago? Esto afectará el total pagado del cliente.')) {
      return;
    }

    setIsDeletingPayment(true);
    try {
      // First, get the payment amount to subtract it from the client's total_paid
      const { data: paymentToDelete, error: fetchError } = await supabase
        .from('client_payments')
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
        .from('client_payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) {
        console.error('Error deleting payment:', deleteError);
        toast.error('Error al eliminar el pago.');
      } else {
        // Update the client's total_paid amount
        const { data: clientData, error: clientFetchError } = await supabase
          .from('clients')
          .select('total_paid')
          .eq('id', clientId)
          .single();

        if (clientFetchError || !clientData) {
          console.error('Error fetching client total_paid after payment deletion:', clientFetchError);
          toast.error('Error al actualizar el total pagado del cliente.');
        } else {
          const newTotalPaid = clientData.total_paid - paymentAmount;
          const { error: clientUpdateError } = await supabase
            .from('clients')
            .update({ total_paid: newTotalPaid, updated_at: new Date().toISOString() })
            .eq('id', clientId);

          if (clientUpdateError) {
            console.error('Error updating client total_paid after payment deletion:', clientUpdateError);
            toast.error('Error al actualizar el total pagado del cliente.');
          } else {
            toast.success('Pago eliminado y total pagado del cliente actualizado con éxito.');
            fetchPayments(); // Refresh the local payment list
            onPaymentsUpdated(); // Notify parent to refresh client data
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
        <p className="ml-4 text-gray-700">Cargando historial de pagos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Historial de Pagos</h3>
      {payments.length === 0 ? (
        <p className="text-gray-600">No hay pagos registrados para este cliente.</p>
      ) : (
        <>
          <div className="overflow-x-auto mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <ShadcnCheckbox
                      checked={selectedPaymentIds.length === payments.length && payments.length > 0}
                      onCheckedChange={handleSelectAllPayments}
                      aria-label="Seleccionar todos los pagos"
                    />
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>ID de Pago</TableHead>
                  <TableHead>Acciones</TableHead> {/* New column for actions */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <ShadcnCheckbox
                        checked={selectedPaymentIds.includes(payment.id)}
                        onCheckedChange={() => handleSelectPayment(payment.id)}
                        aria-label={`Seleccionar pago ${payment.id}`}
                      />
                    </TableCell>
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
          <Button
            onClick={handleGenerateReceipt}
            disabled={selectedPaymentIds.length === 0 || isGeneratingReceipt}
            className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white"
          >
            {isGeneratingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Generar Recibo ({selectedPaymentIds.length})
          </Button>
        </>
      )}
    </div>
  );
};

export default ClientPaymentHistoryTable;