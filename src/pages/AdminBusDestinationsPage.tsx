"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, PlusCircle, ChevronUp, ChevronDown } from 'lucide-react';
import BusDestinationFormDialog from '@/components/admin/bus-tickets/BusDestinationFormDialog';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';

interface BusDestination {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  order_index: number;
  created_at: string;
}

const AdminBusDestinationsPage = () => {
  const [destinations, setDestinations] = useState<BusDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<BusDestination | null>(null);
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchDestinations();
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const fetchDestinations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bus_destinations')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching bus destinations:', error);
      toast.error('Error al cargar los destinos de autobús.');
    } else {
      setDestinations(data || []);
    }
    setLoading(false);
  };

  const handleAddDestination = () => {
    setSelectedDestination(null);
    setIsFormDialogOpen(true);
  };

  const handleEditDestination = (destination: BusDestination) => {
    setSelectedDestination(destination);
    setIsFormDialogOpen(true);
  };

  const handleDeleteDestination = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este destino?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('bus_destinations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bus destination:', error);
      toast.error('Error al eliminar el destino de autobús.');
    } else {
      toast.success('Destino de autobús eliminado con éxito.');
      fetchDestinations(); // Refresh the list
    }
    setLoading(false);
  };

  const moveDestination = async (id: string, direction: 'up' | 'down') => {
    setIsSubmitting(true);
    const currentDestinationIndex = destinations.findIndex(dest => dest.id === id);
    if (currentDestinationIndex === -1) {
      setIsSubmitting(false);
      return;
    }

    const newDestinations = [...destinations];
    const [movedDestination] = newDestinations.splice(currentDestinationIndex, 1);
    const newIndex = direction === 'up' ? currentDestinationIndex - 1 : currentDestinationIndex + 1;

    if (newIndex < 0 || newIndex >= newDestinations.length + 1) {
      setIsSubmitting(false);
      return; // Cannot move further
    }

    newDestinations.splice(newIndex, 0, movedDestination);

    // Update order_index for all affected destinations
    const updates = newDestinations.map((dest, index) => ({
      id: dest.id,
      order_index: index,
    }));

    const { error } = await supabase
      .from('bus_destinations')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error reordering destinations:', error);
      toast.error('Error al reordenar los destinos.');
    } else {
      toast.success('Orden de destinos actualizado.');
      setDestinations(newDestinations); // Update local state immediately for better UX
    }
    setIsSubmitting(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false); // Local state for reordering

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando destinos de autobús...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Destinos de Autobús">
          <Button onClick={handleAddDestination} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Destino
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Destinos de Autobús Existentes</h2>
            {destinations.length === 0 ? (
              <p className="text-gray-600">No hay destinos de autobús configurados.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Orden</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinations.map((destination, index) => (
                      <TableRow key={destination.id}>
                        <TableCell className="flex flex-col space-y-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveDestination(destination.id, 'up')}
                            disabled={isSubmitting || index === 0}
                            className="h-8 w-8"
                          >
                            <ChevronUp className="h-4 w-4" />
                            <span className="sr-only">Mover arriba</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveDestination(destination.id, 'down')}
                            disabled={isSubmitting || index === destinations.length - 1}
                            className="h-8 w-8"
                          >
                            <ChevronDown className="h-4 w-4" />
                            <span className="sr-only">Mover abajo</span>
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{destination.name}</TableCell>
                        <TableCell className="line-clamp-2 max-w-[200px]">{destination.description}</TableCell>
                        <TableCell>
                          {destination.image_url && (
                            <img src={destination.image_url} alt={destination.name} className="w-20 h-12 object-cover rounded-md" />
                          )}
                        </TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditDestination(destination)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteDestination(destination.id)}
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
      <BusDestinationFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSave={fetchDestinations}
        initialData={selectedDestination}
      />
    </div>
  );
};

export default AdminBusDestinationsPage;