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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

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
      .select('*')
      .order('quoted_date', { ascending: false });

    if (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Error al cargar las cotizaciones de hoteles.');
    } else {
      const hotelsWithCalculatedFields = (data || []).map(hotel => {
        const totalCostDoubleRooms = (hotel.num_double_rooms || 0) * hotel.cost_per_night_double * hotel.num_nights_quoted;
        const totalCostTripleRooms = (hotel.num_triple_rooms || 0) * hotel.cost_per_night_triple * hotel.num_nights_quoted;
        const totalCostQuadRooms = (hotel.num_quad_rooms || 0) * hotel.cost_per_night_quad * hotel.num_nights_quoted;
        const totalContractedRoomsCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;
        const costOfCourtesyRooms = (hotel.num_courtesy_rooms || 0) * hotel.cost_per_night_quad * hotel.num_nights_quoted;
        const totalQuoteCost = totalContractedRoomsCost - costOfCourtesyRooms;

        return {
          ...hotel,
          num_double_rooms: hotel.num_double_rooms || 0,
          num_triple_rooms: hotel.num_triple_rooms || 0,
          num_quad_rooms: hotel.num_quad_rooms || 0,
          num_courtesy_rooms: hotel.num_courtesy_rooms || 0,
          total_quote_cost: totalQuoteCost,
          remaining_payment: totalQuoteCost - (hotel.total_paid || 0),
        };
      });
      setHotels(hotelsWithCalculatedFields);
    }
    setLoading(false);
  };

  const handleAddHotel = () => {
    navigate('/admin/hotels/new');
  };

  const handleEditHotel = (hotel: Hotel) => {
    navigate(`/admin/hotels/edit/${hotel.id}`);
  };

  const handleCloneHotel = (hotel: Hotel) => {
    // Almacenamos los datos para clonar en el estado local o vía URL (aquí simulamos navegación)
    // Para simplificar, pasamos los datos básicos por navegación si el componente form los aceptara, 
    // pero lo ideal es ir a /new y que el form sepa que es un clon.
    toast.info(`Clonando configuración de ${hotel.name}...`);
    navigate(`/admin/hotels/new?cloneFrom=${hotel.id}`);
  };

  const handleDeleteHotel = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cotización?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting hotel quote:', error);
      toast.error('Error al eliminar la cotización.');
    } else {
      toast.success('Cotización eliminada con éxito.');
      setRefreshKey(prev => prev + 1);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd/MM/yy');
    } catch (e) {
      return 'Inválida';
    }
  };

  const toggleGroup = (name: string) => {
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Agrupar hoteles por nombre
  const groupedHotels = hotels.reduce((acc, hotel) => {
    if (!acc[hotel.name]) acc[hotel.name] = [];
    acc[hotel.name].push(hotel);
    return acc;
  }, {} as Record<string, Hotel[]>);

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando hoteles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Cotizaciones de Hoteles">
          <Button onClick={handleAddHotel} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cotización
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          {Object.keys(groupedHotels).length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-600">
              No hay cotizaciones de hoteles registradas.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedHotels).map(([name, quotes]) => (
                <div key={name} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                  <div 
                    className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleGroup(name)}
                  >
                    <div className="flex items-center space-x-3">
                      {openGroups[name] ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-500" />}
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{name}</h3>
                        <p className="text-sm text-gray-500">{quotes[0].location}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary" className="bg-rosa-mexicano/10 text-rosa-mexicano border-rosa-mexicano/20">
                        {quotes.length} {quotes.length === 1 ? 'cotización' : 'cotizaciones'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600"
                        onClick={(e) => { e.stopPropagation(); handleCloneHotel(quotes[0]); }}
                      >
                        <Copy className="h-4 w-4 mr-1" /> Clonar Base
                      </Button>
                    </div>
                  </div>
                  
                  {openGroups[name] && (
                    <div className="p-0 border-t border-gray-100 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Inicio</TableHead>
                            <TableHead>Fin</TableHead>
                            <TableHead>Noches</TableHead>
                            <TableHead>Costo Total</TableHead>
                            <TableHead>Habitaciones</TableHead>
                            <TableHead>Estado Pago</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quotes.map((quote) => (
                            <TableRow key={quote.id}>
                              <TableCell className="font-medium">{formatDate(quote.quoted_date)}</TableCell>
                              <TableCell>{formatDate(quote.quote_end_date)}</TableCell>
                              <TableCell>{quote.num_nights_quoted}</TableCell>
                              <TableCell className="font-bold text-gray-900">${quote.total_quote_cost.toFixed(2)}</TableCell>
                              <TableCell className="text-xs">
                                D:{quote.num_double_rooms} T:{quote.num_triple_rooms} C:{quote.num_quad_rooms}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-500">Pendiente:</span>
                                  <span className={cn("text-xs font-bold", quote.remaining_payment > 0 ? "text-red-600" : "text-green-600")}>
                                    ${quote.remaining_payment.toFixed(2)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditHotel(quote)}
                                  className="h-8 w-8 text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleCloneHotel(quote)}
                                  className="h-8 w-8 text-green-600"
                                  title="Clonar esta fecha"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeleteHotel(quote.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
          )}
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminHotelsPage;