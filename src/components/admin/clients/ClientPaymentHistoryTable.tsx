"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Trash2, CreditCard, Hand, ShieldCheck, Landmark, Globe, Edit, Save, X } from 'lucide-react';
import { format, parseISO, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  
  // Estados para edición
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editMethod, setEditMethod] = useState<string>('');
  const [editDateInput, setEditDateInput] = useState<string>('');

  useEffect(() => {
    if (clientId) fetchPayments();
  }, [clientId]);

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

  const syncClientTotalPaid = async () => {
    // Obtenemos todos los pagos actuales para recalcular el total exacto
    const { data: allPayments } = await supabase
      .from('client_payments')
      .select('amount')
      .eq('client_id', clientId);
    
    const newTotal = (allPayments || []).reduce((sum, p) => sum + p.amount, 0);
    
    await supabase
      .from('clients')
      .update({ total_paid: newTotal, updated_at: new Date().toISOString() })
      .eq('id', clientId);
    
    onPaymentsUpdated();
  };

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm('¿Eliminar este abono? El saldo del cliente se ajustará automáticamente.')) return;
    setIsActionInProgress(true);
    try {
      const { error: delError } = await supabase.from('client_payments').delete().eq('id', payment.id);
      if (delError) throw delError;

      await syncClientTotalPaid();
      toast.success('Abono eliminado.');
      fetchPayments();
    } catch (err) {
      toast.error('Error al eliminar abono.');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleEditClick = (payment: Payment) => {
    setEditingPayment(payment);
    setEditAmount(payment.amount);
    setEditMethod(payment.payment_method);
    setEditDateInput(format(parseISO(payment.payment_date), 'dd/MM/yy'));
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    
    const parsedDate = parse(editDateInput, 'dd/MM/yy', new Date(), { locale: es });
    if (!isValid(parsedDate)) {
      toast.error('Fecha inválida. Usa el formato DD/MM/AA');
      return;
    }

    if (editAmount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setIsActionInProgress(true);
    try {
      const { error: upError } = await supabase
        .from('client_payments')
        .update({
          amount: editAmount,
          payment_method: editMethod,
          payment_date: format(parsedDate, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPayment.id);

      if (upError) throw upError;

      await syncClientTotalPaid();
      toast.success('Abono actualizado correctamente.');
      setEditingPayment(null);
      fetchPayments();
    } catch (err) {
      toast.error('Error al actualizar abono.');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const getMethodBadge = (method: string) => {
    const m = method?.toLowerCase();
    switch (m) {
      case 'mercadopago':
        return <Badge variant="default" className="bg-blue-600 gap-1"><CreditCard className="h-3 w-3" /> Mercado Pago</Badge>;
      case 'stripe':
        return <Badge variant="default" className="bg-indigo-600 gap-1"><ShieldCheck className="h-3 w-3" /> Stripe</Badge>;
      case 'online':
        return <Badge variant="default" className="bg-pink-600 gap-1"><Globe className="h-3 w-3" /> Pago en Línea</Badge>;
      case 'transferencia':
        return <Badge variant="default" className="bg-emerald-600 gap-1"><Landmark className="h-3 w-3" /> Transferencia</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Hand className="h-3 w-3" /> Manual / Efectivo</Badge>;
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
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600" onClick={() => handleEditClick(p)} disabled={isActionInProgress}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(p)} disabled={isActionInProgress}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Diálogo de Edición */}
      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Abono</DialogTitle>
            <DialogDescription>Corrige los detalles del pago registrado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Monto</Label>
              <Input 
                type="number" 
                value={editAmount} 
                onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)} 
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Fecha</Label>
              <Input 
                value={editDateInput} 
                onChange={(e) => setEditDateInput(e.target.value)} 
                placeholder="DD/MM/AA" 
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Método</Label>
              <Select value={editMethod} onValueChange={setEditMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual / Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="online">Pago en Línea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(null)} disabled={isActionInProgress}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleUpdatePayment} disabled={isActionInProgress} className="bg-rosa-mexicano">
              {isActionInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPaymentHistoryTable;