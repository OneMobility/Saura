"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, Bus as BusIcon } from 'lucide-react'; // Renamed Bus to BusIcon to avoid conflict

interface Bus {
  id: string;
  name: string;
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  seat_map_image_url: string | null;
  created_at: string;
}

interface BusesTableProps {
  onEditBus: (bus: Bus) => void;
  onBusDeleted: () => void;
}

const BusesTable: React.FC<BusesTableProps> = ({ onEditBus, onBusDeleted }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al cargar autobuses:', error);
      toast.error('Error al cargar la lista de autobuses.');
    } else {
      setBuses(data || []);
    }
    setLoading(false);
  };

  const handleDeleteBus = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este autobús?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('buses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar autobús:', error);
      toast.error('Error al eliminar el autobús.');
    } else {
      toast.success('Autobús eliminado con éxito.');
      onBusDeleted(); // Notify parent to refresh
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando autobuses...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Autobuses Registrados</h2>
      {buses.length === 0 ? (
        <p className="text-gray-600">No hay autobuses registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre/Identificación</TableHead>
                <TableHead>Placas/Código</TableHead>
                <TableHead>Costo Renta</TableHead>
                <TableHead>Capacidad</TableHead>
                <TableHead>Mapa Asientos</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buses.map((bus) => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.name}</TableCell>
                  <TableCell>{bus.license_plate}</TableCell>
                  <TableCell>${bus.rental_cost.toFixed(2)}</TableCell>
                  <TableCell>{bus.total_capacity}</TableCell>
                  <TableCell>
                    {bus.seat_map_image_url ? (
                      <a href={bus.seat_map_image_url} target="_blank" rel="noopener noreferrer" className="text-rosa-mexicano hover:underline">
                        Ver Mapa
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditBus(bus)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteBus(bus.id)}
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

export default BusesTable;