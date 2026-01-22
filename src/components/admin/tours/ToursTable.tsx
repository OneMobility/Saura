"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tour {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  duration: string;
  selling_price_per_person: number;
  cost_per_paying_person: number | null;
  created_at: string;
  other_income: number;
  full_content: string | null;
  includes: string[] | null;
  itinerary: any[] | null;
  bus_capacity: number;
  bus_cost: number;
  courtesies: number;
  hotel_details: any[] | null;
  provider_details: any[] | null;
  total_base_cost: number | null;
  paying_clients_count: number | null;
  clients: Array<{ total_amount: number; status: string }> | null;
}

interface ToursTableProps {
  onEditTour: (tour: Tour) => void;
  onTourDeleted: () => void;
}

const ToursTable: React.FC<ToursTableProps> = ({ onEditTour, onTourDeleted }) => {
  const [tours, setTours] = useState<Tour[]>([]);
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
        return {
          ...tour,
          total_sold_revenue: clientsRevenue + (tour.other_income || 0),
        };
      });
      setTours(processed as any);
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
              <TableHead>Duración</TableHead>
              <TableHead>Venta (Doble)</TableHead>
              <TableHead>Capacidad</TableHead>
              <TableHead>Total Vendido</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tours.map((tour) => (
              <TableRow key={tour.id}>
                <TableCell className="font-medium">{tour.title}</TableCell>
                <TableCell>{tour.duration}</TableCell>
                <TableCell>${tour.selling_price_per_person.toFixed(2)}</TableCell>
                <TableCell>{tour.bus_capacity} pax</TableCell>
                <TableCell className="font-bold text-rosa-mexicano">${(tour as any).total_sold_revenue?.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(`/admin/tours/${tour.id}/passengers`, '_blank')}
                      className="text-rosa-mexicano border-rosa-mexicano hover:bg-rosa-mexicano hover:text-white"
                    >
                      <Users className="h-4 w-4 mr-2" /> Pasajeros
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