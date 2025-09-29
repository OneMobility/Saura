"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, Edit, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ClientFormDialog from '@/components/admin/clients/ClientFormDialog'; // Import the new dialog

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  contract_number: string | null;
  tour_id: string | null;
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  created_at: string;
  tour_title?: string; // To display tour title in table
  remaining_payment: number; // Calculated field
}

const AdminClientsPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of clients

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchClients();
    }
  }, [user, isAdmin, sessionLoading, navigate, refreshKey]);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        tours (title)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar la lista de clientes.');
    } else {
      const clientsWithCalculatedFields = (data || []).map(client => ({
        ...client,
        tour_title: client.tours?.title || 'N/A',
        remaining_payment: client.total_amount - client.total_paid,
      }));
      setClients(clientsWithCalculatedFields);
    }
    setLoading(false);
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormDialogOpen(true);
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
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
      setRefreshKey(prev => prev + 1); // Trigger re-fetch
    }
    setLoading(false);
  };

  const handleGenerateContract = (client: Client) => {
    toast.info(`Generando contrato para ${client.first_name} ${client.last_name}... (Funcionalidad en desarrollo)`);
    // Placeholder for PDF generation logic
    console.log('Generate contract for client:', client);
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Clientes">
          <Button onClick={handleAddClient} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Clientes Registrados</h2>
            {clients.length === 0 ? (
              <p className="text-gray-600">No hay clientes registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Tour</TableHead>
                      <TableHead>Contrato #</TableHead>
                      <TableHead>Monto Total</TableHead>
                      <TableHead>Anticipo</TableHead>
                      <TableHead>Total Pagado</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.first_name} {client.last_name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.phone || 'N/A'}</TableCell>
                        <TableCell>{client.tour_title}</TableCell>
                        <TableCell>{client.contract_number || 'N/A'}</TableCell>
                        <TableCell>${client.total_amount.toFixed(2)}</TableCell>
                        <TableCell>${client.advance_payment.toFixed(2)}</TableCell>
                        <TableCell>${client.total_paid.toFixed(2)}</TableCell>
                        <TableCell>${client.remaining_payment.toFixed(2)}</TableCell>
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
                            variant="outline"
                            size="icon"
                            onClick={() => handleGenerateContract(client)}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="sr-only">Generar Contrato</span>
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
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
      <ClientFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSave={() => setRefreshKey(prev => prev + 1)} // Refresh clients list on save
        initialData={selectedClient}
      />
    </div>
  );
};

export default AdminClientsPage;