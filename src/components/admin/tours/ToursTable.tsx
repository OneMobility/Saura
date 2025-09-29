"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2 } from 'lucide-react';

interface Tour {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  duration: string;
  selling_price_per_person: number;
  cost_per_paying_person: number | null;
  created_at: string;
  // Include all other fields for editing purposes
  full_content: string | null;
  includes: string[] | null;
  itinerary: any[] | null; // JSONB type
  bus_capacity: number;
  bus_cost: number;
  courtesies: number;
  hotel_details: any[] | null; // JSONB type
  provider_details: any[] | null; // JSONB type
  total_base_cost: number | null;
  paying_clients_count: number | null;
}

interface ToursTableProps {
  onEditTour: (tour: Tour) => void;
  onTourDeleted: () => void;
}

const ToursTable: React.FC<ToursTableProps> = ({ onEditTour, onTourDeleted }) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tours')
      .select('*') // Select all columns for editing
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tours:', error);
      toast.error('Error al cargar los tours.');
    } else {
      setTours(data || []);
    }
    setLoading(false);
  };

  const handleDeleteTour = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este tour?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('tours')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tour:', error);
      toast.error('Error al eliminar el tour.');
    } else {
      toast.success('Tour eliminado con éxito.');
      onTourDeleted(); // Notify parent to refresh
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando tours...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Tours Existentes</h2>
      {tours.length === 0 ? (
        <p className="text-gray-600">No hay tours configurados.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Costo por Persona</TableHead>
                <TableHead>Capacidad Bus</TableHead>
                <TableHead>Cortesías</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.map((tour) => (
                <TableRow key={tour.id}>
                  <TableCell className="font-medium">{tour.title}</TableCell>
                  <TableCell>{tour.duration}</TableCell>
                  <TableCell>${tour.selling_price_per_person.toFixed(2)}</TableCell>
                  <TableCell>${tour.cost_per_paying_person?.toFixed(2) || 'N/A'}</TableCell>
                  <TableCell>{tour.bus_capacity}</TableCell>
                  <TableCell>{tour.courtesies}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditTour(tour)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteTour(tour.id)}
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

export default ToursTable;