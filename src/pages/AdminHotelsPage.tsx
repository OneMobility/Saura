"use client";

import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Star, Calendar, Copy, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  quote_end_date: string | null;
}

// Helper function to calculate total cost
const calculateTotalQuoteCost = (h: any) => {
  return (((h.num_double_rooms || 0) * h.cost_per_night_double) +
          ((h.num_triple_rooms || 0) * h.cost_per_night_triple) +
          ((h.num_quad_rooms || 0) * h.cost_per_night_quad) -
          ((h.num_courtesy_rooms || 0) * (h.cost_per_night_quad || 0))) * (h.num_nights_quoted || 1);
};

const AdminHotelsPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [bestPriceMap, setBestPriceMap] = useState<Map<string, number>>(new Map());

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
        const total = calculateTotalQuoteCost(h);
        return { 
          ...h, 
          total_quote_cost: total, 
          remaining_payment: total - (h.total_paid || 0),
          quote_end_date: h.quote_end_date || null,
        } as Hotel;
      });
      
      // Calculate Best Price Map
      const newBestPriceMap = new Map<string, number>(); // Key: `${location}-${num_nights_quoted}-${monthYear}`
      processed.forEach(h => {
          if (h.quoted_date) {
              const monthYear = format(parseISO(h.quoted_date), 'yyyy-MM');
              const key = `${h.location}-${h.num_nights_quoted}-${monthYear}`;
              const currentMin = newBestPriceMap.get(key) ?? Infinity;
              if (h.total_quote_cost < currentMin) {
                  newBestPriceMap.set(key, h.total_quote_cost);
              }
          }
      });
      setBestPriceMap(newBestPriceMap);
      setHotels(processed);
    }
    setLoading(false);
  };

  const groupedByLocationAndName = useMemo(() => {
    const groups: Record<string, Record<string, Hotel[]>> = {};

    hotels.forEach(h => {
      const locationKey = h.location || 'Sin Ubicación';
      const hotelNameKey = h.name || 'Sin Nombre';

      if (!groups[locationKey]) {
        groups[locationKey] = {};
      }
      if (!groups[locationKey][hotelNameKey]) {
        groups[locationKey][hotelNameKey] = [];
      }
      groups[locationKey][hotelNameKey].push(h);
    });

    // Sort quotes within each hotel group
    Object.keys(groups).forEach(locationKey => {
      Object.keys(groups[locationKey]).forEach(hotelNameKey => {
        groups[locationKey][hotelNameKey].sort((a, b) => {
          // 1. Sort by quoted_date (ascending: older first)
          const dateA = a.quoted_date ? parseISO(a.quoted_date).getTime() : 0;
          const dateB = b.quoted_date ? parseISO(b.quoted_date).getTime() : 0;
          if (dateA !== dateB) return dateA - dateB;

          // 2. Sort by num_nights_quoted (ascending: fewer nights first)
          return (a.num_nights_quoted || 0) - (b.num_nights_quoted || 0);
        });
      });
    });

    return groups;
  }, [hotels]);

  const handleDeleteHotel = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return;
    const { error } = await supabase.from('hotels').delete().eq('id', id);
    if (!error) { toast.success('Eliminada.'); setRefreshKey(k => k + 1); }
  };

  const handleDeleteGroup = async (hotelName: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar TODAS las cotizaciones para el hotel "${hotelName}"? Esta acción no se puede rehacer.`)) return;
    
    setLoading(true);
    // Delete all quotes matching the hotel name
    const { error } = await supabase.from('hotels').delete().eq('name', hotelName);
    
    if (error) {
      toast.error('Error al eliminar el grupo de cotizaciones.');
    } else {
      toast.success(`Se eliminaron todas las cotizaciones para ${hotelName}.`);
      setRefreshKey(k => k + 1);
    }
    setLoading(false);
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
            {Object.entries(groupedByLocationAndName).map(([location, hotelsInLocation]) => (
              <Collapsible 
                key={location} 
                open={openGroups[location]} 
                onOpenChange={(isOpen) => setOpenGroups(p => ({ ...p, [location]: isOpen }))}
              >
                <CollapsibleTrigger asChild>
                  <div className="w-full flex justify-between items-center p-4 bg-gray-900 text-white hover:bg-gray-800 rounded-lg cursor-pointer border">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                      <MapPin className="h-6 w-6 text-rosa-mexicano" /> {location} ({Object.values(hotelsInLocation).flat().length} Cotizaciones)
                    </h3>
                    {openGroups[location] ? <ChevronDown className="h-6 w-6 text-rosa-mexicano" /> : <ChevronRight className="h-6 w-6 text-rosa-mexicano" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <div className="space-y-4 p-4 bg-white border border-t-0 rounded-b-xl">
                    {Object.entries(hotelsInLocation).map(([hotelName, quotes]) => (
                      <div key={hotelName} className="bg-gray-50 rounded-lg shadow-sm border overflow-hidden">
                        <div 
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setOpenGroups(p => ({ ...p, [`${location}-${hotelName}`]: !p[`${location}-${hotelName}`] }))}
                        >
                          <div className="flex items-center gap-3">
                            {openGroups[`${location}-${hotelName}`] ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                            <div>
                              <h4 className="font-bold text-gray-800">{hotelName} ({quotes.length})</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(hotelName);
                              }}
                              title={`Eliminar todas las cotizaciones de ${hotelName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {openGroups[`${location}-${hotelName}`] && (
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
                                {quotes.map((q) => {
                                  const monthYear = q.quoted_date ? format(parseISO(q.quoted_date), 'yyyy-MM') : 'N/A';
                                  const key = `${q.location}-${q.num_nights_quoted}-${monthYear}`;
                                  const isBestPrice = q.total_quote_cost === bestPriceMap.get(key);

                                  return (
                                    <TableRow key={q.id} className={cn(isBestPrice && "bg-green-50/50 hover:bg-green-100/50")}>
                                      <TableCell>
                                        {q.quoted_date ? format(parseISO(q.quoted_date), 'dd/MMM/yy', { locale: es }) : 'N/A'}
                                      </TableCell>
                                      <TableCell>{q.num_nights_quoted} noches</TableCell>
                                      <TableCell className="font-bold">${q.total_quote_cost.toLocaleString()}</TableCell>
                                      <TableCell>
                                        <Badge className={cn(q.remaining_payment <= 0 ? "bg-green-500" : "bg-red-500")}>
                                          {q.remaining_payment <= 0 ? "Pagado" : `Pendiente: $${q.remaining_payment.toLocaleString()}`}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right flex justify-end gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => navigate(`/admin/hotels/new?cloneFrom=${q.id}`)} 
                                          className="hover:text-green-600"
                                          title="Clonar Cotización"
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/hotels/edit/${q.id}`)} className="hover:text-blue-600"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteHotel(q.id)}><Trash2 className="h-4 w-4" /></Button>
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
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminHotelsPage;