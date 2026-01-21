"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, DollarSign, FileText, FileSignature } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';

interface BusPassenger {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  identification_number: string | null;
  is_contractor: boolean;
  seat_number: number;
  email: string | null;
  phone: string | null;
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
  identification_number: string | null;
  tour_id: string | null;
  bus_route_id: string | null;
  number_of_people: number;
  companions: BusPassenger[]; // Changed to BusPassenger[] for bus tickets
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
  bus_route_name?: string;
}

interface ClientsTableProps {
  refreshKey: number;
  onRegisterPayment: (client: Client) => void;
  onEditClient: (client: Client) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({ refreshKey, onRegisterPayment, onEditClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingContractNumber, setExportingContractNumber] = useState<string | null>(null);
  const [generatingContractNumber, setGeneratingContractNumber] = useState<string | null>(null);
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
        ),
        bus_routes (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar la lista de clientes.');
    } else {
      const clientsWithTitles = await Promise.all((data || []).map(async client => {
        let companionsList: BusPassenger[] = [];
        if (client.bus_route_id) {
          const { data: busPassengers, error: passengersError } = await supabase
            .from('bus_passengers')
            .select('*')
            .eq('client_id', client.id);
          if (passengersError) {
            console.error('Error fetching bus passengers for client:', passengersError);
          } else {
            companionsList = busPassengers || [];
          }
        } else {
          companionsList = (client.companions || []).map((c: any) => ({ ...c, is_contractor: false, seat_number: 0 }));
        }

        return {
          ...client,
          tour_title: client.tours?.title || 'N/A',
          bus_route_name: client.bus_routes?.name || 'N/A',
          companions: companionsList, // Use the fetched or mapped companions
          room_details: client.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
          remaining_payment: client.total_amount - client.total_paid,
        };
      }));
      setClients(clientsWithTitles);
    }
    setLoading(false);
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cliente y su contrato? Esto también liberará los asientos asignados y los pasajeros asociados.')) {
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
      toast.success('Cliente eliminado con éxito. Los asientos asignados y pasajeros han sido liberados.');
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

  const handleDownloadBookingSheet = async (contractNumber: string, clientName: string) => {
    setExportingContractNumber(contractNumber);
    toast.info(`Generando hoja de reserva para ${clientName}...`);

    if (!session?.access_token) {
      toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
      setExportingContractNumber(null);
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
        body: JSON.stringify({ contractNumber }), // Pass contractNumber
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
      setExportingContractNumber(null);
    }
  };

  const handleDownloadServiceContract = async (contractNumber: string, clientName: string) => {
    setGeneratingContractNumber(contractNumber);
    toast.info(`Generando contrato de servicio para ${clientName}...`);

    if (!session?.access_token) {
      toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
      setGeneratingContractNumber(null);
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
        body: JSON.stringify({ contractNumber }), // Pass contractNumber
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
      setGeneratingContractNumber(null);
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
                <TableHead>Identificación</TableHead>
                <TableHead>Viaje</TableHead> {/* Changed from Tour/Ruta to Viaje */}
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
                  <TableCell>{client.identification_number || 'N/A'}</TableCell>
                  <TableCell>{client.tour_id ? client.tour_title : client.bus_route_name}</TableCell>
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
                      onClick={() => handleDownloadBookingSheet(client.contract_number, `${client.first_name} ${client.last_name}`)}
                      disabled={exportingContractNumber === client.contract_number}
                      className="text-purple-600 hover:bg-purple-50"
                    >
                      {exportingContractNumber === client.contract_number ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="sr-only">Descargar Hoja de Reserva</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownloadServiceContract(client.contract_number, `${client.first_name} ${client.last_name}`)}
                      disabled={generatingContractNumber === client.contract_number}
                      className="text-orange-600 hover:bg-orange-50"
                    >
                      {generatingContractNumber === client.contract_number ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSignature className="h-4 w-4" />
                      )}
                      <span className="sr-only">Descargar Contrato</span>
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
  );
};

export default ClientsTable;