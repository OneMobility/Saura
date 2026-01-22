"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, Users, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
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
  departure_date: string | null;
  return_date: string | null;
  clients: Array<{ total_amount: number; total_paid: number; status: string }> | null;
}

interface ToursTableProps {
  onEditTour: (tour: Tour) => void;
  onTourDeleted: () => void;
}

const ToursTable: React.FC<ToursTableProps> = ({ onEditTour, onTourDeleted }) => {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tours')
      .select(`
        *,
        clients (
          total_amount,
          total_paid,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar los tours.');
    } else {
      const processed = (data || []).map(tour => {
        const activeClients = (tour.clients || []).filter(c => c.status !== 'cancelled');
        
        const clientsRevenue = activeClients.reduce((sum, c) => sum + (c.total_amount || 0), 0);
        const clientsPaid = activeClients.reduce((sum, c) => sum + (c.total_paid || 0), 0);
        
        const totalVenta = clientsRevenue + (tour.other_income || 0);
        const totalCosto = tour.total_base_cost || 0;
        const balanceCV = totalCosto - totalVenta;

        // Intentar extraer el número de noches del string de duración (ej: "3 días, 2 noches")
        const nightsMatch = tour.duration?.match(/(\d+)\s*noche/i);
        const nights = nightsMatch ? nightsMatch[1] : '0';

        return {
          ...tour,
          nights,
          total_sold_revenue: totalVenta,
          total_collected: clientsPaid,
          balance_cv: balanceCV
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
    if (error) toast.error('Error al eliminar.');
    else { toast.success('Tour eliminado.'); onTourDeleted(); fetchTours(); }
    setLoading(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return format(parseISO(dateStr), 'dd/MM/yy', { locale: es });
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-none">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              <TableHead className="font-bold">Nombre</TableHead>
              <TableHead className="font-bold">Salida</TableHead>
              <TableHead className="font-bold">Regreso</TableHead>
              <TableHead className="font-bold">Noches</TableHead>
              <TableHead className="font-bold">Costo</TableHead>
              <TableHead className="font-bold">C-V</TableHead>
              <TableHead className="font-bold">Abonos</TableHead>
              <TableHead className="text-right font-bold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tours.map((tour) => (
              <TableRow key={tour.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="font-bold text-gray-900">{tour.title}</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">{formatDate(tour.departure_date)}</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">{formatDate(tour.return_date)}</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="font-black border-gray-300">{tour.nights}</Badge></TableCell>
                <TableCell className="font-bold text-gray-600">${tour.total_base_cost?.toLocaleString()}</TableCell>
                <TableCell>
                  <div className={cn(
                    "flex items-center gap-1 font-black",
                    tour.balance_cv > 0 ? "text-red-500" : "text-green-600"
                  )}>
                    ${Math.abs(tour.balance_cv).toLocaleString()}
                    {tour.balance_cv <= 0 && <span className="text-[8px] uppercase">Utilidad</span>}
                  </div>
                </TableCell>
                <TableCell className="font-black text-rosa-mexicano">
                   ${tour.total_collected?.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/admin/tours/${tour.id}/passengers`)}
                      className="text-rosa-mexicano border-rosa-mexicano hover:bg-rosa-mexicano hover:text-white h-8 text-[10px] font-black uppercase tracking-tighter"
                    >
                      <Users className="h-3 w-3 mr-1" /> Pax
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEditTour(tour)} className="text-blue-600 hover:bg-blue-50 h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTour(tour.id)} className="text-red-500 hover:bg-red-50 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
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