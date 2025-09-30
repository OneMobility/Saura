"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import ClientFormDialog from './ClientFormDialog'; // Import the form dialog

interface Companion {
  id: string;
  name: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contract_number: string;
  tour_id: string | null;
  number_of_people: number;
  occupancy_type: 'double' | 'triple' | 'quad';
  companions: Companion[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  created_at: string;
  tour_title?: string; // To display tour title in table
  remaining_payment?: number; // Calculated field
}

interface ClientsTableProps {
  refreshKey: number; // Prop to trigger re-fetch
}

const ClientsTable: React.FC<ClientsTableProps> = ({ refreshKey }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
        remaining_payment: client.total_amount - client.total_paid,
      }));
      setClients(clientsWithTourTitles);
    }
    setLoading(false);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
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
                <TableHead>Ocupación</TableHead>
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
                  <TableCell>{client.occupancy_type}</TableCell>
                  <TableCell>${client.total_amount.toFixed(2)}</TableCell>
                  <TableCell>${client.total_paid.toFixed(2)}</TableCell>
                  <TableCell>${(client.remaining_payment || 0).toFixed(2)}</TableCell>
                  <TableCell>{client.status}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditClient(client)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {selectedClient && (
        <ClientFormDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={fetchClients}
          initialData={selectedClient}
        />
      )}
    </div>
  );
};

export default ClientsTable;