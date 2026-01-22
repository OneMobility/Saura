"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Trash2, Loader2, DollarSign, FileText, FileSignature, ChevronDown, ChevronRight, Package, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contract_number: string;
  tour_id: string | null;
  bus_route_id: string | null;
  total_amount: number;
  total_paid: number;
  status: string;
  cancel_reason?: string;
  tour_title?: string;
  remaining_payment: number;
}

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confirmado', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  { value: 'completed', label: 'Completado', color: 'bg-blue-100 text-blue-700' },
];

const ClientsTable: React.FC<{ refreshKey: number; onRegisterPayment: (client: Client) => void; onEditClient: (client: Client) => void }> = ({ refreshKey, onRegisterPayment, onEditClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; clientId: string; reason: string }>({ isOpen: false, clientId: '', reason: '' });

  useEffect(() => { fetchClients(); }, [refreshKey]);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*, tours(title), bus_routes(name)').order('created_at', { ascending: false });
    if (data) {
      const processed = data.map((c: any) => ({
        ...c,
        tour_title: c.tours?.title || c.bus_routes?.name || 'Sin Viaje',
        remaining_payment: c.total_amount - c.total_paid
      }));
      setClients(processed);
      processed.forEach(c => { if(openGroups[c.tour_title!] === undefined) setOpenGroups(p => ({...p, [c.tour_title!]: true})); });
    }
    setLoading(false);
  };

  const handleDownloadDoc = async (client: Client, functionName: string, label: string) => {
    setIsDownloading(`${client.id}-${functionName}`);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { contractNumber: client.contract_number }
      });
      if (error) throw error;
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(data);
        newWindow.document.close();
        setTimeout(() => newWindow.print(), 500);
      }
    } catch (err) {
      toast.error(`Error al generar ${label}`);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro? Se borrarán abonos y asientos.')) return;
    setLoading(true);
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) { toast.success('Cliente eliminado.'); fetchClients(); }
    setLoading(false);
  };

  const handleStatusChange = async (client: Client, newStatus: string) => {
    if (newStatus === 'cancelled') {
      setCancelDialog({ isOpen: true, clientId: client.id, reason: '' });
      return;
    }
    const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', client.id);
    if (!error) { toast.success('Estado actualizado.'); fetchClients(); }
  };

  const confirmCancellation = async () => {
    if (!cancelDialog.reason.trim()) return toast.error("Ingresa un motivo.");
    const { error } = await supabase.from('clients').update({ status: 'cancelled', cancel_reason: cancelDialog.reason }).eq('id', cancelDialog.clientId);
    if (!error) {
      toast.success('Cancelado.');
      setCancelDialog({ isOpen: false, clientId: '', reason: '' });
      fetchClients();
    }
  };

  const groupedClients = useMemo(() => {
    return clients.reduce((acc, client) => {
      const key = client.tour_title || 'Sin Viaje';
      if (!acc[key]) acc[key] = [];
      acc[key].push(client);
      return acc;
    }, {} as Record<string, Client[]>);
  }, [clients]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-6">
      {Object.entries(groupedClients).map(([tourTitle, group]) => (
        <div key={tourTitle} className="bg-white rounded-xl shadow-md border overflow-hidden">
          <div className="bg-gray-900 text-white p-4 flex items-center justify-between cursor-pointer" onClick={() => setOpenGroups(p => ({ ...p, [tourTitle]: !p[tourTitle] }))}>
            <div className="flex items-center gap-3">
              {openGroups[tourTitle] ? <ChevronDown className="text-rosa-mexicano" /> : <ChevronRight className="text-rosa-mexicano" />}
              <h3 className="text-lg font-bold flex items-center gap-2"><Package className="h-5 w-5 text-rosa-mexicano" /> {tourTitle} ({group.length})</h3>
            </div>
          </div>

          {openGroups[tourTitle] && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Titular</TableHead>
                    <TableHead>Saldo Pendiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.map((client) => (
                    <TableRow key={client.id} className={cn(client.status === 'cancelled' && "opacity-60 bg-gray-50")}>
                      <TableCell className="font-mono text-xs font-bold text-rosa-mexicano">{client.contract_number}</TableCell>
                      <TableCell>
                        <div className="font-bold">{client.first_name} {client.last_name}</div>
                        {client.status === 'cancelled' && <p className="text-[10px] text-red-500 font-bold italic line-clamp-1">{client.cancel_reason}</p>}
                      </TableCell>
                      <TableCell className="font-bold text-red-600">${client.remaining_payment.toLocaleString()}</TableCell>
                      <TableCell>
                        <Select value={client.status} onValueChange={(val) => handleStatusChange(client, val)}>
                          <SelectTrigger className={cn("h-8 w-[130px] text-xs font-bold border-none", statusOptions.find(o => o.value === client.status)?.color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>{statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Ver Detalles" onClick={() => onEditClient(client)} className="text-blue-600"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Abonar" onClick={() => onRegisterPayment(client)} className="text-green-600"><DollarSign className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadDoc(client, 'generate-service-contract', 'Contrato')} className="text-rosa-mexicano" disabled={!!isDownloading}><FileSignature className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadDoc(client, 'generate-booking-sheet', 'Hoja')} className="text-blue-400" disabled={!!isDownloading}><FileText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}

      <Dialog open={cancelDialog.isOpen} onOpenChange={(o) => !o && setCancelDialog(p => ({...p, isOpen: false}))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar Contrato</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo..." value={cancelDialog.reason} onChange={e => setCancelDialog(p => ({...p, reason: e.target.value}))} />
          <DialogFooter><Button variant="outline" onClick={() => setCancelDialog(p => ({...p, isOpen: false}))}>Cerrar</Button><Button variant="destructive" onClick={confirmCancellation}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsTable;