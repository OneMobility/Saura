"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, Download } from 'lucide-react'; // Added Download icon

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
  other_income: number; // NEW: Other income for the tour
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
  clients: Array<{ total_amount: number; status: string }> | null; // NEW: Clients data for revenue calculation
}

interface Companion {
  id: string;
  name: string;
  age: number | null;
}

interface RoomDetails {
  double_rooms: number;
  triple_rooms: number;
  quad_rooms: number;
}

// Nueva interfaz para la exportación de clientes, ahora una fila por persona
interface PersonForExport {
  contract_number: string;
  person_name: string; // Nombre del contratante o acompañante
  contractor_phone: string | null; // Teléfono del contratante
  total_amount: number;
  remaining_payment: number;
  room_details_formatted: string;
  assigned_seat_numbers: string; // Todos los asientos del contrato
}

interface ToursTableProps {
  onEditTour: (tour: Tour) => void;
  onTourDeleted: () => void;
}

const ToursTable: React.FC<ToursTableProps> = ({ onEditTour, onTourDeleted }) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingTourId, setExportingTourId] = useState<string | null>(null);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tours')
      .select(`
        *,
        clients (
          total_amount,
          status
        )
      `) // Select all columns for editing, and clients' total_amount and status
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tours:', error);
      toast.error('Error al cargar los tours.');
    } else {
      const toursWithCalculatedRevenue = (data || []).map(tour => {
        const clientsRevenue = (tour.clients || [])
          .filter(client => client.status !== 'cancelled') // Only active clients
          .reduce((sum, client) => sum + client.total_amount, 0);
        
        const totalSold = clientsRevenue + (tour.other_income || 0); // Sum clients revenue and other_income

        return {
          ...tour,
          total_sold_revenue: totalSold, // Add calculated total sold revenue
        };
      });
      setTours(toursWithCalculatedRevenue as Tour[]); // Cast back to Tour[]
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

  const formatRoomDetails = (details: RoomDetails) => {
    const parts = [];
    if (details.quad_rooms > 0) parts.push(`${details.quad_rooms} Cuádruple(s)`);
    if (details.triple_rooms > 0) parts.push(`${details.triple_rooms} Triple(s)`);
    if (details.double_rooms > 0) parts.push(`${details.double_rooms} Doble(s)`);
    return parts.join(', ') || 'N/A';
  };

  const handleExportClients = async (tourId: string, tourTitle: string) => {
    setExportingTourId(tourId);
    toast.info(`Exportando clientes para el tour: ${tourTitle}...`);

    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          contract_number,
          first_name,
          last_name,
          email,
          phone,
          total_amount,
          total_paid,
          companions,
          room_details,
          tour_seat_assignments (
            seat_number
          )
        `)
        .eq('tour_id', tourId);

      if (clientsError) {
        console.error('Error fetching clients for export:', clientsError);
        toast.error('Error al obtener los datos de los clientes para exportar.');
        return;
      }

      const peopleForExport: PersonForExport[] = [];

      clientsData?.forEach(client => {
        const remainingPayment = client.total_amount - client.total_paid;
        const contractorFullName = `${client.first_name} ${client.last_name}`;
        const roomDetailsFormatted = formatRoomDetails(client.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
        const assignedSeatNumbers = (client.tour_seat_assignments || [])
          .map((seat: { seat_number: number }) => seat.seat_number)
          .sort((a: number, b: number) => a - b)
          .join(', ');

        // Add row for the contractor
        peopleForExport.push({
          contract_number: client.contract_number,
          person_name: contractorFullName,
          contractor_phone: client.phone || 'N/A',
          total_amount: client.total_amount,
          remaining_payment: remainingPayment,
          room_details_formatted: roomDetailsFormatted,
          assigned_seat_numbers: assignedSeatNumbers,
        });

        // Add rows for each companion
        (client.companions || []).forEach((companion: Companion) => {
          peopleForExport.push({
            contract_number: client.contract_number,
            person_name: companion.name || 'Acompañante sin nombre',
            contractor_phone: client.phone || 'N/A', // Repetir el teléfono del contratante
            total_amount: client.total_amount, // Repetir el monto total
            remaining_payment: remainingPayment, // Repetir el adeudo
            room_details_formatted: roomDetailsFormatted, // Repetir los detalles de habitación
            assigned_seat_numbers: assignedSeatNumbers, // Repetir los asientos asignados
          });
        });
      });

      if (peopleForExport.length === 0) {
        toast.info('No hay clientes registrados para este tour.');
        return;
      }

      // Generate CSV
      const headers = [
        'Número de Contrato',
        'Nombre (Contratante/Acompañante)',
        'Teléfono del Contratante',
        'Monto Total del Contrato',
        'Adeudo',
        'Detalles de Habitaciones',
        'Números de Asiento Asignados (Contrato)'
      ];
      
      const csvRows = peopleForExport.map(person => [
        person.contract_number,
        person.person_name,
        person.contractor_phone,
        person.total_amount.toFixed(2),
        person.remaining_payment.toFixed(2),
        person.room_details_formatted,
        person.assigned_seat_numbers || 'N/A',
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `clientes_${tourTitle.replace(/\s/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Lista de clientes exportada con éxito.');

    } catch (error) {
      console.error('Error during client export:', error);
      toast.error('Ocurrió un error al exportar la lista de clientes.');
    } finally {
      setExportingTourId(null);
    }
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
                <TableHead>Total Vendido</TableHead> {/* NEW COLUMN */}
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
                  <TableCell>${(tour as any).total_sold_revenue?.toFixed(2) || '0.00'}</TableCell> {/* Display total sold revenue */}
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleExportClients(tour.id, tour.title)}
                      disabled={exportingTourId === tour.id}
                      className="text-green-600 hover:bg-green-50"
                    >
                      {exportingTourId === tour.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span className="sr-only">Exportar Clientes</span>
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