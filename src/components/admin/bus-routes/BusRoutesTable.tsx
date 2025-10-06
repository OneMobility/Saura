"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { BusRoute, AvailableBus } from '@/types/shared';

interface BusRoutesTableProps {
  onEditRoute: (route: BusRoute) => void;
  onRouteDeleted: () => void;
  refreshKey: number; // To trigger re-fetch from parent
}

const BusRoutesTable: React.FC<BusRoutesTableProps> = ({ onEditRoute, onRouteDeleted, refreshKey }) => {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [availableBuses, setAvailableBuses] = useState<AvailableBus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutesAndBuses();
  }, [refreshKey]);

  const fetchRoutesAndBuses = async () => {
    setLoading(true);
    const [routesRes, busesRes] = await Promise.all([
      supabase.from('bus_routes').select('*').order('name', { ascending: true }),
      supabase.from('buses').select('id, name'),
    ]);

    if (busesRes.error) {
      console.error('Error fetching buses:', busesRes.error);
      toast.error('Error al cargar los autobuses.');
    } else {
      setAvailableBuses(busesRes.data || []);
    }

    if (routesRes.error) {
      console.error('Error fetching bus routes:', routesRes.error);
      toast.error('Error al cargar las rutas de autobús.');
    } else {
      setRoutes(routesRes.data || []);
    }
    setLoading(false);
  };

  const getBusName = (busId: string | null) => {
    return availableBuses.find(bus => bus.id === busId)?.name || 'N/A';
  };

  const handleDeleteRoute = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta ruta de autobús?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('bus_routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bus route:', error);
      toast.error('Error al eliminar la ruta de autobús.');
    } else {
      toast.success('Ruta de autobús eliminada con éxito.');
      onRouteDeleted(); // Notify parent to refresh
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando rutas de autobús...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Rutas de Autobús Existentes</h2>
      {routes.length === 0 ? (
        <p className="text-gray-600">No hay rutas de autobús configuradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Autobús</TableHead>
                <TableHead>Destinos</TableHead>
                <TableHead>Precio/Asiento</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Llegada</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.name}</TableCell>
                  <TableCell>{getBusName(route.bus_id)}</TableCell>
                  <TableCell className="line-clamp-2 max-w-[200px]">
                    {route.destinations.map(d => d.name).join(', ')}
                  </TableCell>
                  <TableCell>${route.price_per_seat.toFixed(2)}</TableCell>
                  <TableCell>{route.departure_time}</TableCell>
                  <TableCell>{route.arrival_time}</TableCell>
                  <TableCell>{route.is_active ? 'Sí' : 'No'}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditRoute(route)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteRoute(route.id as string)}
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
  );
};

export default BusRoutesTable;