"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Printer, Checkbox } from 'lucide-react';
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

  useEffect(() => {
    // Aseguramos que clientId sea una cadena no vacía antes de intentar cargar los pagos
    if (clientId && clientId.trim() !== '') { 
      console.log('ClientPaymentHistoryTable: Attempting to fetch payments for clientId:', clientId); // NEW LOG
      fetchPayments();
    } else {
      console.log('ClientPaymentHistoryTable: clientId is invalid or empty, skipping fetchPayments.'); // NEW LOG
      setLoading(false); // Si no hay clientId válido, no hay pagos que cargar
      setPayments([]);
    }
  }, [clientId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-client-payments', {
        body: JSON.stringify({ clientId }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) {
        console.error('Error invoking list-client-payments function:', error);
        toast.error(`Error al cargar el historial de pagos: ${data?.error || error.message || 'Error desconocido.'}`);
      } else if (data && data.payments) {
        setPayments(data.payments);
      } else {
        toast.error('Respuesta inesperada al cargar pagos.');
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