"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, DollarSign, FileText, FileSignature } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';

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

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  contract_number: string;
  identification_number: string | null; // NEW: Added identification_number
  tour_id: string | null;
  number_of_people: number;
  companions: Companion[];
  extra_services: any[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  created_at: string;
  contractor_age: number | null;
  room_details: RoomDetails;
  remaining_payment?: number;
  tour_title?: string;
}

interface ClientsTableProps {
  refreshKey: number;
  onRegisterPayment: (client: Client) => void;
  onEditClient: (client: Client) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({ refreshKey, onRegisterPayment, onEditClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingClientId, setExportingClientId] = useState<string | null>(null);
  const [generatingContractId, setGeneratingContractId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    fetchClients();
  }, [refreshKey]);

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
        companions: client.companions || [],
        room_details: client.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
        remaining_payment: client.total_amount - client.total_paid,
      }));
      setClients(clientsWithTourTitles);
    }
    setLoading(false);
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente y su contrato? Esto también liberará los asientos asignados.')) {
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
      toast.success('Cliente eliminado con éxito. Los asientos asignados han sido liberados.');
      fetchClients();
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

  const handleDownloadBookingSheet = async (clientId: string, clientName: string) => {
    setExportingClientId(clientId);
    toast.info(`Generando hoja de reserva para ${clientName}...`);

    if (!session?.access_token) {
      toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
      setExportingClientId(null);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionName = 'generate-booking-sheet';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Edge Function:', errorData);
        toast.error(`Error al generar la hoja de reserva: ${errorData.error || 'Error desconocido.'}`);
        return;
      }

      const htmlContent = await response.text();

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.focus();
        toast.success('Hoja de reserva generada. Puedes imprimirla desde la nueva pestaña.');
      } else {
        toast.error('No se pudo abrir una nueva ventana. Por favor, permite pop-ups.');
      }
    } catch (err: any) {
      console.error('Unexpected error during booking sheet generation:', err);
      toast.error(`Error inesperado: ${err.message}`);
    } finally {
      setExportingClientId(null);
    }
  };

  const handleDownloadServiceContract = async (clientId: string, clientName: string) => {
    setGeneratingContractId(clientId);
    toast.info(`Generando contrato de servicio para ${clientName}...`);

    if (!session?.access_token) {
      toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
      setGeneratingContractId(null);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionName = 'generate-service-contract';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Edge Function (contract):', errorData);
        toast.error(`Error al generar el contrato de servicio: ${errorData.error || 'Error desconocido.'}`);
        return;
      }

      const htmlContent = await response.text();

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        newWindow.focus();
        toast.success('Contrato de servicio generado. Puedes imprimirlo desde la nueva pestaña.');
      } else {
        toast.error('No se pudo abrir una nueva ventana. Por favor, permite pop-ups.');
      }
    } catch (err: any) {
      console.error('Unexpected error during contract generation:', err);
      toast.error(`Error inesperado: ${err.message}`);
    } finally {
      setGeneratingContractId(null);
    }
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
                <TableHead>Identificación</TableHead> {/* NEW: Column for identification_number */}
                <TableHead>Tour</TableHead>
                <TableHead>Personas</TableHead>
                <TableHead>Habitaciones</TableHead>
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
                  <TableCell>{client.identification_number || 'N/A'}</TableCell> {/* NEW: Display identification_number */}
                  <TableCell>{client.tour_title}</TableCell>
                  <TableCell>{client.number_of_people}</TableCell>
                  <TableCell>{formatRoomDetails(client.room_details)}</TableCell>
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
                      onClick={() => onRegisterPayment(client)}
                      className="text-green-600 hover:bg-green-50"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span className="sr-only">Registrar Abono</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownloadBookingSheet(client.id, `${client.first_name} ${client.last_name}`)}
                      disabled={exportingClientId === client.id}
                      className="text-purple-600 hover:bg-purple-50"
                    >
                      {exportingClientId === client.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="sr-only">Descargar Hoja de Reserva</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownloadServiceContract(client.id, `${client.first_name} ${client.last_name}`)}
                      disabled={generatingContractId === client.id}
                      className="text-orange-600 hover:bg-orange-50"
                    >
                      {generatingContractId === client.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSignature className="h-4 w-4" />
                      )}
                      <span className="sr-only">Descargar Contrato</span>
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