"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, Users, AlertCircle, CheckCircle2, Calendar, Handshake, CornerDownLeft, Hotel, ChevronDown, ChevronRight } from 'lucide-react';
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
  hotel_details: { id: string; hotel_quote_id: string }[];
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
  clients: Array<{ total_amount: number; total_paid: number; status: string }> | null;
  
  // Calculated fields
  total_collected: number;
  balance_cv: number;
  balance_abono: number;
  total_prov_paid: number;
  total_hotel_cost: number;
  total_nights: number;
  hotel_names: string;
  primary_hotel_name: string; // Kept for calculation consistency, but not used for grouping
}

interface HotelQuoteSummary {
  id: string;
  name: string;
  estimated_total_cost: number;
  total_paid: number;
  num_nights_quoted: number;
  quoted_date: string | null;
}

const ToursTable: React.FC<{ onEditTour: (tour: any) => void; onTourDeleted: () => void }> = ({ onEditTour, onTourDeleted }) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelQuotesMap, setHotelQuotesMap] = useState<Map<string, HotelQuoteSummary>>(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchHotelsAndBuses = async () => {
    const [busesRes, hotelsRes] = await Promise.all([
      supabase.from('buses').select('id, total_paid'),
      supabase.from('hotels').select('id, name, total_paid, num_nights_quoted, quoted_date, cost_per_night_double, cost_per_night_triple, cost_per_night_quad, num_double_rooms, num_triple_rooms, num_quad_rooms, num_courtesy_rooms, num_nights_quoted'),
    ]);

    const busesMap = new Map((busesRes.data || []).map(b => [b.id, b.total_paid || 0]));
    
    const quotesMap = new Map<string, HotelQuoteSummary>();
    (hotelsRes.data || []).forEach(h => {
      const total = (((h.num_double_rooms || 0) * h.cost_per_night_double) +
                    ((h.num_triple_rooms || 0) * h.cost_per_night_triple) +
                    ((h.num_quad_rooms || 0) * h.cost_per_night_quad) -
                    ((h.num_courtesy_rooms || 0) * (h.cost_per_night_quad || 0))) * (h.num_nights_quoted || 1);
      quotesMap.set(h.id, {
        id: h.id,
        name: h.name,
        estimated_total_cost: total,
        total_paid: h.total_paid || 0,
        num_nights_quoted: h.num_nights_quoted || 0,
        quoted_date: h.quoted_date || null,
      });
    });
    setHotelQuotesMap(quotesMap);
    return { busesMap, quotesMap };
  };

  const fetchTours = async () => {
    setLoading(true);
    const { busesMap, quotesMap } = await fetchHotelsAndBuses();

    const { data: toursResData, error: toursResError } = await supabase.from('tours').select(`*, clients ( total_amount, total_paid, status )`).order('created_at', { ascending: false });

    if (toursResError) {
      toast.error('Error al cargar los tours.');
      setLoading(false);
      return;
    }

    const processed: Tour[] = (toursResData || []).map(tour => {
      const activeClients = (tour.clients || []).filter((c: any) => c.status !== 'cancelled');
      const clientsRevenue = activeClients.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
      const clientsPaid = activeClients.reduce((sum: number, c: any) => sum + (c.total_paid || 0), 0);
      
      let totalHotelCost = 0;
      let totalNights = 0;
      let hotelNames: string[] = [];
      let totalHotelPaid = 0;
      
      (tour.hotel_details || []).forEach((d: any) => {
        const quote = quotesMap.get(d.hotel_quote_id);
        if (quote) {
          totalHotelCost += quote.estimated_total_cost;
          totalNights = Math.max(totalNights, quote.num_nights_quoted);
          hotelNames.push(quote.name);
          totalHotelPaid += quote.total_paid;
        }
      });

      const busPaid = busesMap.get(tour.bus_id) || 0;
      const totalProvPaid = busPaid + totalHotelPaid;

      const totalVenta = clientsRevenue + (tour.other_income || 0);
      const balanceCV = (tour.total_base_cost || 0) - totalVenta;
      const balanceAbonoCliente = (tour.total_base_cost || 0) - clientsPaid;

      return {
        ...tour,
        total_collected: clientsPaid,
        balance_cv: balanceCV,
        balance_abono: balanceAbonoCliente,
        total_prov_paid: totalProvPaid,
        total_hotel_cost: totalHotelCost,
        total_nights: totalNights,
        hotel_names: hotelNames.join(', '),
        primary_hotel_name: hotelNames[0] || 'Sin Hotel Vinculado',
      } as Tour;
    });
    
    setTours(processed);
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
      <h2 className="text-xl font-semibold mb-4">Tours Existentes</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="font-bold">Nombre del Tour</TableHead>
              <TableHead className="font-bold">Salida / Regreso</TableHead>
              <TableHead className="font-bold">Hotelería (Costo/Noches)</TableHead>
              <TableHead className="font-bold">Costo Total</TableHead>
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
                <TableCell>
                  <div className="text-[10px] space-y-0.5">
                    <div className="flex items-center gap-1 font-bold text-gray-600"><Hotel className="h-3 w-3" /> {tour.hotel_names || 'N/A'}</div>
                    <div className="flex items-center gap-1 text-gray-500">({tour.total_nights} Noches)</div>
                    <div className="font-bold text-xs text-gray-600">${tour.total_hotel_cost.toLocaleString()}</div>
                  </div>
                </TableCell>
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
    </div>
  );
};

export default ToursTable;