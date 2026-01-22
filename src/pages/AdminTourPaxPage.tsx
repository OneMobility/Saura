"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Printer, ArrowLeft, User, Armchair, DollarSign, Package, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import ClientPaymentDialog from '@/components/admin/clients/ClientPaymentDialog';
import { format } from 'date-fns';

interface PaxRecord {
  id: string; // client_id
  contract_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  total_amount: number;
  total_paid: number;
  remaining_payment: number;
  status: string;
  passengers: { name: string; seat: number; is_contractor: boolean }[];
}

const AdminTourPaxPage = () => {
  const { id: tourId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [tourTitle, setTourTitle] = useState('');
  const [contracts, setContracts] = useState<PaxRecord[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const fetchPaxData = async () => {
    if (!tourId) return;
    setLoading(true);
    try {
      const { data: tour } = await supabase.from('tours').select('title').eq('id', tourId).single();
      if (tour) setTourTitle(tour.title);

      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id, contract_number, first_name, last_name, phone, total_amount, total_paid, status, companions,
          tour_seat_assignments ( seat_number )
        `)
        .eq('tour_id', tourId)
        .neq('status', 'cancelled');

      if (error) throw error;

      const processedContracts: PaxRecord[] = (clients || []).map(client => {
        const sortedSeats = (client.tour_seat_assignments || [])
          .map((s: any) => s.seat_number)
          .sort((a: number, b: number) => a - b);
        
        const passengers = [
          { name: `${client.first_name} ${client.last_name}`, seat: sortedSeats[0] || 0, is_contractor: true },
          ...(client.companions || []).map((c: any, idx: number) => ({
            name: c.name || 'Acompañante',
            seat: sortedSeats[idx + 1] || 0,
            is_contractor: false
          }))
        ];

        return {
          id: client.id,
          contract_number: client.contract_number,
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone || 'N/A',
          total_amount: client.total_amount,
          total_paid: client.total_paid,
          remaining_payment: client.total_amount - client.total_paid,
          status: client.status,
          passengers
        };
      });

      setContracts(processedContracts.sort((a, b) => a.contract_number.localeCompare(b.contract_number)));
    } catch (err) {
      toast.error("Error al cargar la lista.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPaxData(); }, [tourId]);

  const handleDownloadCsv = () => {
    const headers = ['Asiento', 'Pasajero', 'Contrato', 'Teléfono', 'Estado Contrato', 'Abonado', 'Adeudo'];
    const rows: any[] = [];
    
    contracts.forEach(c => {
      c.passengers.forEach(p => {
        rows.push([
          p.seat,
          p.name,
          c.contract_number,
          c.phone,
          c.status,
          p.is_contractor ? c.total_paid : '-',
          p.is_contractor ? c.remaining_payment : '-'
        ].map(f => `"${f}"`).join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `lista_pasajeros_${tourTitle.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Package className="text-rosa-mexicano" /> {tourTitle}
            </h1>
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Listado Maestro de Pasajeros</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
            <Button className="bg-rosa-mexicano" onClick={handleDownloadCsv}><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
          </div>
        </div>

        <div className="space-y-6">
          {contracts.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="bg-gray-900 text-white p-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <Badge className="bg-rosa-mexicano h-8 px-4 text-sm">#{c.contract_number}</Badge>
                  <div>
                    <p className="font-bold text-lg leading-tight">{c.first_name} {c.last_name}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Pagado</p>
                    <p className="text-green-400 font-black text-lg">${c.total_paid.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Saldo Pendiente</p>
                    <p className="text-red-400 font-black text-lg">${c.remaining_payment.toLocaleString()}</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-white text-gray-900 hover:bg-gray-100 font-bold"
                    onClick={() => { setSelectedClient(c); setIsPaymentDialogOpen(true); }}
                  >
                    <DollarSign className="h-4 w-4 mr-1" /> Abonar
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[100px] font-black text-[10px] uppercase">Asiento</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Nombre del Pasajero</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.passengers.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-black text-rosa-mexicano">
                        <div className="flex items-center gap-2">
                          <Armchair className="h-4 w-4" /> {p.seat}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.is_contractor && <User className="h-3 w-3 text-rosa-mexicano" />}
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={p.is_contractor ? "border-rosa-mexicano text-rosa-mexicano" : "text-gray-400"}>
                          {p.is_contractor ? "Titular" : "Acompañante"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </div>

      {selectedClient && (
        <ClientPaymentDialog 
          isOpen={isPaymentDialogOpen}
          onClose={() => setIsPaymentDialogOpen(false)}
          client={selectedClient}
          onPaymentRegistered={fetchPaxData}
        />
      )}
    </div>
  );
};

export default AdminTourPaxPage;