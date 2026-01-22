"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, User, Armchair, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PaxRecord {
  contract_number: string;
  name: string;
  seat: number;
  phone: string;
  total_paid: number;
  debt: number;
  is_contractor: boolean;
}

interface TourPaxListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
}

const TourPaxListDialog: React.FC<TourPaxListDialogProps> = ({ isOpen, onClose, tourId, tourTitle }) => {
  const [loading, setLoading] = useState(true);
  const [paxList, setPaxList] = useState<PaxRecord[]>([]);

  useEffect(() => {
    if (isOpen && tourId) {
      fetchPaxData();
    }
  }, [isOpen, tourId]);

  const fetchPaxData = async () => {
    setLoading(true);
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id, contract_number, first_name, last_name, phone, total_amount, total_paid, companions,
          tour_seat_assignments ( seat_number )
        `)
        .eq('tour_id', tourId)
        .neq('status', 'cancelled');

      if (error) throw error;

      const records: PaxRecord[] = [];

      clients?.forEach(client => {
        const sortedSeats = (client.tour_seat_assignments || [])
          .map((s: any) => s.seat_number)
          .sort((a: number, b: number) => a - b);
        
        const remainingDebt = client.total_amount - client.total_paid;

        // Titular
        records.push({
          contract_number: client.contract_number,
          name: `${client.first_name} ${client.last_name}`,
          seat: sortedSeats[0] || 0,
          phone: client.phone || 'N/A',
          total_paid: client.total_paid,
          debt: remainingDebt,
          is_contractor: true
        });

        // Acompañantes
        (client.companions || []).forEach((comp: any, idx: number) => {
          records.push({
            contract_number: client.contract_number,
            name: comp.name || 'Acompañante sin nombre',
            seat: sortedSeats[idx + 1] || 0,
            phone: client.phone || 'N/A',
            total_paid: 0, // El pago se atribuye al titular en este desglose
            debt: 0,
            is_contractor: false
          });
        });
      });

      setPaxList(records.sort((a, b) => a.seat - b.seat));
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar la lista de pasajeros.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    const headers = ['Asiento', 'Nombre', 'Contrato', 'Teléfono', 'Abonado (Contrato)', 'Adeudo (Contrato)'];
    const csvRows = paxList.map(p => [
      p.seat,
      p.name,
      p.contract_number,
      p.phone,
      p.is_contractor ? p.total_paid : '-',
      p.is_contractor ? p.debt : '-'
    ].map(field => `"${field}"`).join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `lista_pax_${tourTitle.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-rosa-mexicano">Lista de Pasajeros - {tourTitle}</DialogTitle>
          <DialogDescription>Listado detallado de asientos y saldos por persona.</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-auto my-4 border rounded-xl">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-rosa-mexicano" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[80px]">Asiento</TableHead>
                  <TableHead>Pasajero</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Abonado</TableHead>
                  <TableHead>Adeudo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paxList.map((p, idx) => (
                  <TableRow key={idx} className={p.is_contractor ? "bg-rosa-mexicano/5" : ""}>
                    <TableCell className="font-black text-rosa-mexicano">
                      <div className="flex items-center gap-2"><Armchair className="h-3 w-3" /> {p.seat}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold flex items-center gap-2">
                        {p.is_contractor && <User className="h-3 w-3 text-rosa-mexicano" />}
                        {p.name}
                      </div>
                      <div className="text-[10px] text-gray-400">{p.phone}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.contract_number}</TableCell>
                    <TableCell className="text-green-600 font-bold">{p.is_contractor ? `$${p.total_paid.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-red-500 font-bold">{p.is_contractor ? `$${p.debt.toLocaleString()}` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleDownloadCsv} disabled={loading || paxList.length === 0} className="bg-rosa-mexicano">
            <Download className="mr-2 h-4 w-4" /> Descargar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TourPaxListDialog;