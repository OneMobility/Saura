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
import HotelFormDialog from '@/components/admin/hotels/HotelFormDialog'; // Import the new dialog

interface Hotel {
  id: string;
  name: string;
  location: string;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  is_active: boolean;
  created_at: string;
}

const AdminHotelsPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchHotels();
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const fetchHotels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Error al cargar los hoteles.');
    } else {
      setHotels(data || []);
    }
    setLoading(false);
  };

  const handleAddHotel = () => {
    setSelectedHotel(null);
    setIsFormDialogOpen(true);
  };

  const handleEditHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setIsFormDialogOpen(true);
  };

  const handleDeleteHotel = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este hotel?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting hotel:', error);
      toast.error('Error al eliminar el hotel.');
    } else {
      toast.success('Hotel eliminado con éxito.');
      fetchHotels(); // Refresh the list
    }
    setLoading(false);
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Hoteles">
          <Button onClick={handleAddHotel} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Hotel
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Hoteles Registrados</h2>
            {hotels.length === 0 ? (
              <p className="text-gray-600">No hay hoteles registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Costo Doble</TableHead>
                      <TableHead>Costo Triple</TableHead>
                      <TableHead>Costo Cuádruple</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hotels.map((hotel) => (
                      <TableRow key={hotel.id}>
                        <TableCell className="font-medium">{hotel.name}</TableCell>
                        <TableCell>{hotel.location}</TableCell>
                        <TableCell>${hotel.cost_per_night_double.toFixed(2)}</TableCell>
                        <TableCell>${hotel.cost_per_night_triple.toFixed(2)}</TableCell>
                        <TableCell>${hotel.cost_per_night_quad.toFixed(2)}</TableCell>
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
      <HotelFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSave={fetchHotels}
        initialData={selectedHotel}
      />
    </div>
  );
};

export default AdminHotelsPage;