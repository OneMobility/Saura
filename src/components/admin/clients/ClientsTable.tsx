"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, DollarSign } from 'lucide-react'; // Import DollarSign icon
import { useNavigate } from 'react-router-dom'; // Import useNavigate

interface Companion {
  id: string;
  name: string;
  age: number | null; // Added age for companions
}

interface RoomDetails {
  double_rooms: number;
  triple_rooms: number;
  quad_rooms: number;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contract_number: string;
  tour_id: string | null;
  number_of_people: number;
  companions: Companion[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  created_at: string;
  contractor_age: number | null; // Added contractor_age
  room_details: RoomDetails; // NEW: Stores calculated room breakdown
  tour_title?: string; // To display tour title in table
  remaining_payment?: number; // Calculated field
}

interface ClientsTableProps {
  refreshKey: number; // Prop to trigger re-fetch
  onRegisterPayment: (client: Client) => void; // NEW: Callback for registering payment
}

const ClientsTable: React.FC<ClientsTableProps> = ({ refreshKey, onRegisterPayment }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    fetchClients();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        tours (
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar la lista de clientes.');
    } else {
      const clientsWithTourTitles = (data || []).map(client => ({
        ...client,
        tour_title: client.tours?.title || 'N/A',
        companions: client.companions || [], // Ensure companions is an array
        room_details: client.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }, // Ensure room_details
        remaining_payment: client.total_amount - client.total_paid,
      }));
      setClients(clientsWithTourTitles);
    }
    setLoading(false);
  };

  const handleEditClient = (client: Client) => {
    navigate(`/admin/clients/edit/${client.id}`); // Navigate to the new form page for editing
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente y su contrato?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar el cliente.');
    } else {
      toast.success('Cliente eliminado con éxito.');
      fetchClients(); // Refresh the list
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Clientes Registrados</h2>
      {clients.length === 0 ? (
        <p className="text-gray-600">No hay clientes registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Personas</TableHead>
                <TableHead>Habitaciones</TableHead> {/* Changed from Ocupación */}
                <TableHead>Total</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Pendiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.contract_number}</TableCell>
                  <TableCell>{client.first_name} {client.last_name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.tour_title}</TableCell>
                  <TableCell>{client.number_of_people}</TableCell>
                  <TableCell>{formatRoomDetails(client.room_details)}</TableCell> {/* Display room details */}
                  <TableCell>${client.total_amount.toFixed(2)}</TableCell>
                  <TableCell>${client.total_paid.toFixed(2)}</TableCell>
                  <TableCell>${(client.remaining_payment || 0).toFixed(2)}</TableCell>
                  <TableCell>{client.status}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onEditClient(client)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteClient(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onRegisterPayment(client)} // NEW: Register Payment button
                      className="text-green-600 hover:bg-green-50"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="sr-only">Registrar Abono</span>
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

export default ClientsTable;