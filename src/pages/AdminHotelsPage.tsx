"use client";

import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Star, Calendar, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
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
  num_double_rooms: number;
  num_triple_rooms: number;
  num_quad_rooms: number;
  num_courtesy_rooms: number;
  is_active: boolean;
  total_paid: number;
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
    const { data, error } = await supabase.from('hotels').select('*');

    if (error) {
      toast.error('Error al cargar las cotizaciones.');
    } else {
      const processed = (data || []).map(h => {
        const total = (((h.num_double_rooms || 0) * h.cost_per_night_double) +
                      ((h.num_triple_rooms || 0) * h.cost_per_night_triple) +
                      ((h.num_quad_rooms || 0) * h.cost_per_night_quad) -
                      ((h.num_courtesy_rooms || 0) * h.cost_per_night_quad)) * (h.num_nights_quoted || 1);
        return { ...h, total_quote_cost: total, remaining_payment: total - (h.total_paid || 0) };
      });
      setHotels(processed);
    }
    setLoading(false);
  };

  // Lógica de recomendación: Mejor opción por Mes Y por Noches
  const cheapestStats = useMemo(() => {
    const minsByMonthAndNights: Record<string, number> = {};

    hotels.forEach(h => {
      if (!h.quoted_date) return;
      const monthKey = format(parseISO(h.quoted_date), 'yyyy-MM');
      const nights = h.num_nights_quoted || 1;
      const key = `${monthKey}-${nights}`;
      
      if (!minsByMonthAndNights[key] || h.total_quote_cost < minsByMonthAndNights[key]) {
        minsByMonthAndNights[key] = h.total_quote_cost;
      }
    });

    return { minsByMonthAndNights };
  }, [hotels]);

  const groupedHotels = useMemo(() => {
    return hotels.reduce((acc, h) => {
      if (!acc[h.name]) acc[h.name] = [];
      acc[h.name].push(h);
      return acc;
    }, {} as Record<string, Hotel[]>);
  }, [hotels]);

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

  const handleDeleteGroup = async (hotelName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar TODAS las cotizaciones del hotel "${hotelName}"? Esta acción no se puede deshacer.`)) return;
    
    setLoading(true);
    const { error } = await supabase.from('hotels').delete().eq('name', hotelName);
    
    if (error) {
      toast.error('Error al eliminar el grupo de cotizaciones.');
    } else {
      toast.success(`Se eliminaron todas las cotizaciones de ${hotelName}.`);
      setRefreshKey(k => k + 1);
    }
    setLoading(false);
  };

  const handleCloneHotel = (id: string) => {
    navigate(`/admin/hotels/new?cloneFrom=${id}`);
  };

  if (sessionLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Hoteles">
          <Button onClick={() => navigate('/admin/hotels/new')} className="bg-rosa-mexicano shadow-lg">
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Cotización
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="space-y-6">
            {sortedGroupEntries.map(([name, quotes]) => (
              <div key={name} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div 
                  className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setOpenGroups(p => ({ ...p, [name]: !p[name] }))}
                >
                  <div className="flex items-center gap-3">
                    {openGroups[name] ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{name}</h3>
                      <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                        {quotes[0].location} • {quotes.length} Fechas cotizadas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="bg-white border text-gray-600">
                      Desde ${Math.min(...quotes.map(q => q.total_quote_cost)).toLocaleString()}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(name);
                      }}
                      title="Eliminar todo el grupo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {openGroups[name] && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow>
                          <TableHead>Fecha Inicio</TableHead>
                          <TableHead>Noches</TableHead>
                          <TableHead>Costo Total</TableHead>
                          <TableHead>Estado Pago</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotes.sort((a, b) => (a.quoted_date || '').localeCompare(b.quoted_date || '')).map((q) => {
                          const monthKey = q.quoted_date ? format(parseISO(q.quoted_date), 'yyyy-MM') : '';
                          const nights = q.num_nights_quoted || 1;
                          const key = `${monthKey}-${nights}`;
                          const isBestForDuration = cheapestStats.minsByMonthAndNights[key] === q.total_quote_cost;

                          return (
                            <TableRow key={q.id} className={cn(isBestForDuration && "bg-green-50/50")}>
                              <TableCell className="font-medium flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {q.quoted_date ? format(parseISO(q.quoted_date), 'dd/MMM/yy', { locale: es }) : 'N/A'}
                              </TableCell>
                              <TableCell>{nights} noches</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={cn("font-bold text-lg", isBestForDuration ? "text-green-600" : "text-gray-900")}>
                                    ${q.total_quote_cost.toLocaleString()}
                                  </span>
                                  {isBestForDuration && (
                                    <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 border-none flex gap-1 text-[10px]">
                                      <Star className="h-3 w-3 fill-yellow-900" /> MEJOR OPCIÓN ({nights} N)
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(q.remaining_payment <= 0 ? "bg-green-500" : "bg-red-500")}>
                                  {q.remaining_payment <= 0 ? "Pagado" : `Pendiente: $${q.remaining_payment.toLocaleString()}`}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleCloneHotel(q.id)} 
                                  className="text-gray-500 hover:text-rosa-mexicano"
                                  title="Duplicar cotización"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/hotels/edit/${q.id}`)} className="hover:text-blue-600" title="Editar"><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteHotel(q.id)} title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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