"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Hotel {
  id: string;
  name: string;
  location: string;
  quoted_date: string | null;
  num_nights_quoted: number;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  num_double_rooms: number;
  num_triple_rooms: number;
  num_quad_rooms: number;
  num_courtesy_rooms: number;
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
  quote_end_date: string | null;
  created_at: string;
  total_quote_cost: number;
  remaining_payment: number;
}

const AdminHotelsPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchHotels();
    }
  }, [user, isAdmin, sessionLoading, navigate, refreshKey]);

  const fetchHotels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hotels')
      .select('*');

    if (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Error al cargar las cotizaciones.');
    } else {
      const hotelsWithCalculatedFields = (data || []).map(hotel => {
        const total = (((hotel.num_double_rooms || 0) * hotel.cost_per_night_double) +
                      ((hotel.num_triple_rooms || 0) * hotel.cost_per_night_triple) +
                      ((hotel.num_quad_rooms || 0) * hotel.cost_per_night_quad) -
                      ((hotel.num_courtesy_rooms || 0) * hotel.cost_per_night_quad)) * (hotel.num_nights_quoted || 1);

        return {
          ...hotel,
          total_quote_cost: total,
          remaining_payment: total - (hotel.total_paid || 0),
        };
      });
      setHotels(hotelsWithCalculatedFields);
    }
    setLoading(false);
  };

  const groupedHotels = hotels.reduce((acc, hotel) => {
    if (!acc[hotel.name]) acc[hotel.name] = [];
    acc[hotel.name].push(hotel);
    return acc;
  }, {} as Record<string, Hotel[]>);

  // Ordenar los grupos por el precio de su cotización más barata
  const sortedGroupEntries = Object.entries(groupedHotels).sort((a, b) => {
    const minA = Math.min(...a[1].map(h => h.total_quote_cost));
    const minB = Math.min(...b[1].map(h => h.total_quote_cost));
    return minA - minB;
  });

  const handleDeleteHotel = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;
    const { error } = await supabase.from('hotels').delete().eq('id', id);
    if (!error) { toast.success('Eliminada.'); setRefreshKey(k => k + 1); }
  };

  if (sessionLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Hoteles">
          <Button onClick={() => navigate('/admin/hotels/new')} className="bg-rosa-mexicano">
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Cotización
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="space-y-6">
            {sortedGroupEntries.map(([name, quotes]) => (
              <div key={name} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div 
                  className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                  onClick={() => setOpenGroups(p => ({ ...p, [name]: !p[name] }))}
                >
                  <div className="flex items-center gap-3">
                    {openGroups[name] ? <ChevronDown /> : <ChevronRight />}
                    <div>
                      <h3 className="text-xl font-bold">{name}</h3>
                      <p className="text-xs text-gray-500">Desde ${Math.min(...quotes.map(q => q.total_quote_cost)).toFixed(2)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{quotes.length} fechas</Badge>
                </div>
                
                {openGroups[name] && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Noches</TableHead>
                          <TableHead>Costo Total</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotes.sort((a, b) => a.total_quote_cost - b.total_quote_cost).map((q) => (
                          <TableRow key={q.id}>
                            <TableCell>{q.quoted_date ? format(parseISO(q.quoted_date), 'dd/MM/yy') : 'N/A'}</TableCell>
                            <TableCell>{q.num_nights_quoted}</TableCell>
                            <TableCell className="font-bold">${q.total_quote_cost.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge className={q.remaining_payment <= 0 ? "bg-green-500" : "bg-red-500"}>
                                {q.remaining_payment <= 0 ? "Pagado" : `Pendiente: $${q.remaining_payment.toFixed(0)}`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/hotels/edit/${q.id}`)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteHotel(q.id)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminHotelsPage;