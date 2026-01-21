"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns'; // Import parseISO

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
  num_double_rooms: number; // NEW
  num_triple_rooms: number; // NEW
  num_quad_rooms: number; // NEW
  num_courtesy_rooms: number; // NEW: Added courtesy rooms
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
  quote_end_date: string | null; // NEW: Quote End Date
  created_at: string;
  // Calculated fields for display
  total_quote_cost: number; // Total cost for all contracted rooms in this quote
  remaining_payment: number; // Remaining payment for all contracted rooms
}

const AdminHotelsPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of hotels

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchHotels();
    }
  }, [user, isAdmin, sessionLoading, navigate, refreshKey]); // Add refreshKey to dependencies

  const fetchHotels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .order('quoted_date', { ascending: false }); // Order by quoted date

    if (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Error al cargar las cotizaciones de hoteles.');
    } else {
      const hotelsWithCalculatedFields = (data || []).map(hotel => {
        const totalCostDoubleRooms = (hotel.num_double_rooms || 0) * hotel.cost_per_night_double * hotel.num_nights_quoted;
        const totalCostTripleRooms = (hotel.num_triple_rooms || 0) * hotel.cost_per_night_triple * hotel.num_nights_quoted;
        const totalCostQuadRooms = (hotel.num_quad_rooms || 0) * hotel.cost_per_night_quad * hotel.num_nights_quoted;
        const totalContractedRoomsCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;

        // Calculate cost of courtesy rooms (always using quad occupancy rate)
        const costOfCourtesyRooms = (hotel.num_courtesy_rooms || 0) * hotel.cost_per_night_quad * hotel.num_nights_quoted;

        const totalQuoteCost = totalContractedRoomsCost - costOfCourtesyRooms;

        return {
          ...hotel,
          num_double_rooms: hotel.num_double_rooms || 0,
          num_triple_rooms: hotel.num_triple_rooms || 0,
          num_quad_rooms: hotel.num_quad_rooms || 0,
          num_courtesy_rooms: hotel.num_courtesy_rooms || 0, // Set new field
          quote_end_date: hotel.quote_end_date || null, // Include new field
          total_quote_cost: totalQuoteCost,
          remaining_payment: totalQuoteCost - (hotel.total_paid || 0),
        };
      });
      setHotels(hotelsWithCalculatedFields);
    }
    setLoading(false);
  };

  const handleAddHotel = () => {
    navigate('/admin/hotels/new'); // Navigate to the new form page for creation
  };

  const handleEditHotel = (hotel: Hotel) => {
    navigate(`/admin/hotels/edit/${hotel.id}`); // Navigate to the new form page for editing
  };

  const handleDeleteHotel = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cotización de hotel?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting hotel quote:', error);
      toast.error('Error al eliminar la cotización del hotel.');
    } else {
      toast.success('Cotización de hotel eliminada con éxito.');
      setRefreshKey(prev => prev + 1); // Trigger re-fetch
    }
    setLoading(false);
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando cotizaciones de hoteles...</p>
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Cotizaciones de Hoteles Registradas</h2>
            {hotels.length === 0 ? (
              <p className="text-gray-600">No hay cotizaciones de hoteles registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Inicio Cotización</TableHead>
                      <TableHead>Fin Cotización</TableHead> {/* NEW COLUMN */}
                      <TableHead>Noches</TableHead>
                      <TableHead>Hab. Dobles</TableHead>
                      <TableHead>Hab. Triples</TableHead>
                      <TableHead>Hab. Cuádruples</TableHead>
                      <TableHead>Hab. Coordinadores</TableHead>
                      <TableHead>Costo Total Cotización</TableHead>
                      <TableHead>Anticipo</TableHead>
                      <TableHead>Total Pagado</TableHead>
                      <TableHead>Pago Restante</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotels.map((hotel) => (
                      <TableRow key={hotel.id}>
                        <TableCell className="font-medium">{hotel.name}</TableCell>
                        <TableCell>{hotel.location}</TableCell>
                        <TableCell>{hotel.quoted_date ? format(parseISO(hotel.quoted_date), 'dd/MM/yy') : 'N/A'}</TableCell>
                        <TableCell>{hotel.quote_end_date ? format(parseISO(hotel.quote_end_date), 'dd/MM/yy') : 'N/A'}</TableCell> {/* Display new field */}
                        <TableCell>{hotel.num_nights_quoted}</TableCell>
                        <TableCell>{hotel.num_double_rooms}</TableCell>
                        <TableCell>{hotel.num_triple_rooms}</TableCell>
                        <TableCell>{hotel.num_quad_rooms}</TableCell>
                        <TableCell>{hotel.num_courtesy_rooms}</TableCell>
                        <TableCell>${hotel.total_quote_cost.toFixed(2)}</TableCell>
                        <TableCell>${hotel.advance_payment.toFixed(2)}</TableCell>
                        <TableCell>${hotel.total_paid.toFixed(2)}</TableCell>
                        <TableCell>${hotel.remaining_payment.toFixed(2)}</TableCell>
                        <TableCell>{hotel.is_active ? 'Sí' : 'No'}</TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditHotel(hotel)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteHotel(hotel.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminHotelsPage;