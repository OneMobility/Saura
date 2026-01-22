"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  clients: Array<{ total_amount: number; status: string }> | null;
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
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar los tours.');
    } else {
      const processed = (data || []).map(tour => {
        const clientsRevenue = (tour.clients || [])
          .filter(client => client.status !== 'cancelled')
          .reduce((sum, client) => sum + client.total_amount, 0);
        
        const totalVenta = clientsRevenue + (tour.other_income || 0);
        const totalCosto = tour.total_base_cost || 0;
        const restan = totalCosto - totalVenta;

        return {
          ...tour,
          total_sold_revenue: totalVenta,
          restan: restan
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

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Tours Existentes</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Costo Est.</TableHead>
              <TableHead>Venta Real</TableHead>
              <TableHead>Restan (C-V)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tours.map((tour) => (
              <TableRow key={tour.id}>
                <TableCell className="font-medium">
                   <div>{tour.title}</div>
                   <div className="text-[10px] text-gray-400 uppercase font-bold">{tour.duration}</div>
                </TableCell>
                <TableCell className="font-bold text-gray-600">${tour.total_base_cost?.toLocaleString()}</TableCell>
                <TableCell className="font-bold text-rosa-mexicano">${tour.total_sold_revenue?.toLocaleString()}</TableCell>
                <TableCell>
                  <div className={cn(
                    "flex items-center gap-2 font-black",
                    tour.restan > 0 ? "text-red-500" : "text-green-600"
                  )}>
                    {tour.restan > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    ${Math.abs(tour.restan).toLocaleString()}
                    {tour.restan <= 0 && <span className="text-[10px] uppercase ml-1">(Utilidad)</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(`/admin/tours/${tour.id}/passengers`, '_blank')}
                      className="text-rosa-mexicano border-rosa-mexicano hover:bg-rosa-mexicano hover:text-white h-8 text-xs font-bold"
                    >
                      <Users className="h-3 w-3 mr-1" /> Pax
                    </Button>
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