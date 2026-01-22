"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, Users, AlertCircle, CheckCircle2, Calendar, Handshake, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Tour {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  duration: string;
  selling_price_per_person: number;
  total_base_cost: number | null;
  created_at: string;
  other_income: number;
  bus_id: string | null;
  hotel_details: any[];
  departure_date: string | null;
  return_date: string | null;
  clients: Array<{ total_amount: number; total_paid: number; status: string }> | null;
}

const ToursTable: React.FC<{ onEditTour: (tour: any) => void; onTourDeleted: () => void }> = ({ onEditTour, onTourDeleted }) => {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    setLoading(true);
    const [toursRes, busesRes, hotelsRes] = await Promise.all([
      supabase.from('tours').select(`*, clients ( total_amount, total_paid, status )`).order('created_at', { ascending: false }),
      supabase.from('buses').select('id, total_paid'),
      supabase.from('hotels').select('id, total_paid')
    ]);

    if (toursRes.error) {
      toast.error('Error al cargar los tours.');
    } else {
      const busesMap = new Map((busesRes.data || []).map(b => [b.id, b.total_paid || 0]));
      const hotelsMap = new Map((hotelsRes.data || []).map(h => [h.id, h.total_paid || 0]));

      const processed = (toursRes.data || []).map(tour => {
        const activeClients = (tour.clients || []).filter((c: any) => c.status !== 'cancelled');
        const clientsRevenue = activeClients.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
        const clientsPaid = activeClients.reduce((sum: number, c: any) => sum + (c.total_paid || 0), 0);
        
        // Métrica C-V (Costo vs Venta Total proyectada)
        const totalVenta = clientsRevenue + (tour.other_income || 0);
        const balanceCV = (tour.total_base_cost || 0) - totalVenta;
        
        // Métrica C-Abono (Costo del Tour - Abono real en caja de clientes)
        const balanceAbonoCliente = (tour.total_base_cost || 0) - clientsPaid;

        const busPaid = busesMap.get(tour.bus_id) || 0;
        const hotelsPaid = (tour.hotel_details || []).reduce((sum: number, h: any) => sum + (hotelsMap.get(h.hotel_quote_id) || 0), 0);
        const totalProvPaid = busPaid + hotelsPaid;

        const nightsMatch = tour.duration?.match(/(\d+)\s*noche/i);
        return {
          ...tour,
          nights: nightsMatch ? nightsMatch[1] : '0',
          total_collected: clientsPaid,
          balance_cv: balanceCV,
          balance_abono: balanceAbonoCliente,
          total_prov_paid: totalProvPaid
        };
      });
      setTours(processed);
    }
    setLoading(false);
  };

  const handleDeleteTour = async (id: string) => {
    if (!window.confirm('¿Eliminar este tour?')) return;
    setLoading(true);
    const { error } = await supabase.from('tours').delete().eq('id', id);
    if (!error) { toast.success('Tour eliminado.'); onTourDeleted(); fetchTours(); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-none overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="font-bold">Nombre</TableHead>
            <TableHead className="font-bold">Salida / Regreso</TableHead>
            <TableHead className="font-bold text-center">Noches</TableHead>
            <TableHead className="font-bold">Costo</TableHead>
            <TableHead className="font-bold">C-V</TableHead>
            <TableHead className="font-bold">Pagado Prov</TableHead>
            <TableHead className="font-bold">Abonos Clientes</TableHead>
            <TableHead className="font-bold">C-Abono</TableHead>
            <TableHead className="text-right font-bold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tours.map((tour) => (
            <TableRow key={tour.id} className="hover:bg-gray-50/50">
              <TableCell className="font-bold text-gray-900">{tour.title}</TableCell>
              <TableCell>
                <div className="text-[10px] space-y-0.5">
                   <div className="flex items-center gap-1 font-bold text-green-600"><Calendar className="h-3 w-3" /> {tour.departure_date ? format(parseISO(tour.departure_date), 'dd/MM/yy') : 'N/A'}</div>
                   <div className="flex items-center gap-1 font-bold text-blue-600"><CornerDownLeft className="h-3 w-3" /> {tour.return_date ? format(parseISO(tour.return_date), 'dd/MM/yy') : 'N/A'}</div>
                </div>
              </TableCell>
              <TableCell className="text-center"><Badge variant="outline" className="font-black border-gray-300">{tour.nights}</Badge></TableCell>
              <TableCell className="font-bold text-gray-600 text-xs">${tour.total_base_cost?.toLocaleString()}</TableCell>
              <TableCell>
                <div className={cn("font-black text-xs", tour.balance_cv > 0 ? "text-red-500" : "text-green-600")}>
                  ${Math.abs(tour.balance_cv).toLocaleString()}
                </div>
              </TableCell>
              <TableCell className="font-black text-xs text-blue-600">${tour.total_prov_paid.toLocaleString()}</TableCell>
              <TableCell className="font-black text-xs text-rosa-mexicano">${tour.total_collected?.toLocaleString()}</TableCell>
              <TableCell>
                <div className={cn("font-black text-xs", tour.balance_abono > 0 ? "text-red-500" : "text-green-600")}>
                  ${Math.abs(tour.balance_abono).toLocaleString()}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/tours/${tour.id}/passengers`)} className="text-rosa-mexicano border-rosa-mexicano h-8 text-[10px] font-black uppercase">Pax</Button>
                  <Button variant="ghost" size="icon" onClick={() => onEditTour(tour)} className="text-blue-600"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteTour(tour.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ToursTable;