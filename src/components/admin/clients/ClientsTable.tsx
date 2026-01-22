"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2, DollarSign, FileText, FileSignature, ChevronDown, ChevronRight, Package, UserGroup, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  contract_number: string;
  tour_id: string | null;
  bus_route_id: string | null;
  number_of_people: number;
  total_amount: number;
  total_paid: number;
  status: string;
  tour_title?: string;
  bus_route_name?: string;
  remaining_payment: number;
}

interface ClientsTableProps {
  refreshKey: number;
  onRegisterPayment: (client: Client) => void;
  onEditClient: (client: Client) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({ refreshKey, onRegisterPayment, onEditClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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
        tours ( title ),
        bus_routes ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar la lista de clientes.');
    } else {
      const processed = (data || []).map(c => ({
        ...c,
        tour_title: c.tours?.title || c.bus_routes?.name || 'Sin Viaje Asignado',
        remaining_payment: c.total_amount - c.total_paid
      }));
      setClients(processed);
      
      // Expandir grupos por defecto
      const initialOpen: Record<string, boolean> = {};
      processed.forEach(c => { initialOpen[c.tour_title!] = true; });
      setOpenGroups(initialOpen);
    }
    setLoading(false);
  };

  const groupedClients = useMemo(() => {
    return clients.reduce((acc, client) => {
      const key = client.tour_title || 'Sin Viaje';
      if (!acc[key]) acc[key] = [];
      acc[key].push(client);
      return acc;
    }, {} as Record<string, Client[]>);
  }, [clients]);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Eliminar este contrato? Se liberarán los asientos.')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) toast.error('Error al eliminar.');
    else { toast.success('Contrato eliminado.'); fetchClients(); }
  };

  const handleDeleteGroup = async (tourTitle: string, group: Client[]) => {
    const tourId = group[0].tour_id;
    const busRouteId = group[0].bus_route_id;

    if (!window.confirm(`¿Estás seguro de eliminar TODOS los (${group.length}) clientes del viaje "${tourTitle}"? Esta acción es irreversible.`)) return;

    setLoading(true);
    let query = supabase.from('clients').delete();
    if (tourId) query = query.eq('tour_id', tourId);
    else if (busRouteId) query = query.eq('bus_route_id', busRouteId);
    else query = query.eq('tour_id', null).eq('bus_route_id', null);

    const { error } = await query;
    if (error) toast.error('Error al eliminar el grupo.');
    else { toast.success(`Se eliminaron todos los clientes de ${tourTitle}.`); fetchClients(); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="space-y-6">
      {Object.keys(groupedClients).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No hay clientes registrados.</div>
      ) : (
        Object.entries(groupedClients).map(([tourTitle, group]) => (
          <div key={tourTitle} className="bg-white rounded-xl shadow-md border overflow-hidden">
            <div 
              className="bg-gray-900 text-white p-4 flex items-center justify-between cursor-pointer"
              onClick={() => setOpenGroups(p => ({ ...p, [tourTitle]: !p[openGroups[tourTitle]] }))}
            >
              <div className="flex items-center gap-3">
                {openGroups[tourTitle] ? <ChevronDown className="text-rosa-mexicano" /> : <ChevronRight className="text-rosa-mexicano" />}
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Package className="h-5 w-5 text-rosa-mexicano" /> {tourTitle}
                  </h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                    {group.length} {group.length === 1 ? 'Contrato' : 'Contratos'} en este viaje
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white font-bold">
                  Total Grupo: ${group.reduce((s, c) => s + c.total_amount, 0).toLocaleString()}
                </Badge>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50"
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(tourTitle, group); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar Grupo
                </Button>
              </div>
            </div>

            {openGroups[tourTitle] && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead>Pax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Abonado</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-xs font-bold text-rosa-mexicano">{client.contract_number}</TableCell>
                        <TableCell>
                          <div className="font-bold">{client.first_name} {client.last_name}</div>
                          <div className="text-[10px] text-gray-400">{client.email}</div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="font-bold">{client.number_of_people}</Badge></TableCell>
                        <TableCell className="font-bold">${client.total_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600 font-bold">${client.total_paid.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={cn("font-bold", client.remaining_payment > 0 ? "text-red-500" : "text-green-600")}>
                            ${client.remaining_payment.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            client.status === 'confirmed' ? "bg-green-500" : "bg-yellow-500"
                          )}>
                            {client.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => onEditClient(client)} className="text-blue-600 hover:bg-blue-50" title="Editar"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => onRegisterPayment(client)} className="text-green-600 hover:bg-green-50" title="Registrar Pago"><DollarSign className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id)} className="text-red-400 hover:bg-red-50 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ClientsTable;