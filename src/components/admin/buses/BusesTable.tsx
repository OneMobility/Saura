"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2 } from 'lucide-react';

interface Bus {
  id: string;
  name: string;
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  advance_payment: number; // NEW
  total_paid: number; // NEW
  remaining_payment: number; // Calculated field
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
      .select('id, name, license_plate, rental_cost, total_capacity, advance_payment, total_paid, created_at') // Seleccionar los campos relevantes, incluyendo los nuevos
      .order('name', { ascending: true });

    if (error) {
      console.error('Error al cargar autobuses:', error);
      toast.error('Error al cargar la lista de autobuses.');
    } else {
      const busesWithCalculatedFields = (data || []).map(bus => ({
        ...bus,
        advance_payment: bus.advance_payment || 0,
        total_paid: bus.total_paid || 0,
        remaining_payment: (bus.rental_cost || 0) - (bus.total_paid || 0),
      }));
      setBuses(busesWithCalculatedFields);
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
                <TableHead>Anticipo</TableHead> {/* NEW */}
                <TableHead>Total Pagado</TableHead> {/* NEW */}
                <TableHead>Pendiente</TableHead> {/* NEW */}
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
                  <TableCell>${bus.advance_payment.toFixed(2)}</TableCell> {/* NEW */}
                  <TableCell>${bus.total_paid.toFixed(2)}</TableCell> {/* NEW */}
                  <TableCell>${bus.remaining_payment.toFixed(2)}</TableCell> {/* NEW */}
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