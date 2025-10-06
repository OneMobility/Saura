"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, Edit, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { BusPassenger, BusRoute, BusSchedule, AvailableBus } from '@/types/shared'; // Import shared types
import BusPassengerEditDialog from '@/components/admin/bus-passengers/BusPassengerEditDialog'; // NEW: Import BusPassengerEditDialog

interface BusPassengerWithDetails extends BusPassenger {
  client_contract_number?: string;
  route_name?: string;
  departure_time?: string;
  schedule_date?: string;
  origin_name?: string; // Added for display
  destination_name?: string; // Added for display
}

interface BusDestinationOption {
  id: string;
  name: string;
}

const AdminBusPassengersPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [passengers, setPassengers] = useState<BusPassengerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableRoutes, setAvailableRoutes] = useState<BusRoute[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<BusSchedule[]>([]);
  const [availableBuses, setAvailableBuses] = useState<AvailableBus[]>([]); // NEW: For passing to edit dialog
  const [availableDestinations, setAvailableDestinations] = useState<BusDestinationOption[]>([]); // NEW: For passing to edit dialog

  // Filter states
  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [filterSchedule, setFilterSchedule] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');

  // Edit dialog states
  const [isEditPassengerDialogOpen, setIsEditPassengerDialogOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<BusPassenger | null>(null);

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchDependencies();
      fetchBusPassengers();
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const fetchDependencies = async () => {
    const [routesRes, schedulesRes, busesRes, destinationsRes] = await Promise.all([
      supabase.from('bus_routes').select('id, name, all_stops, bus_id').order('name', { ascending: true }),
      supabase.from('bus_schedules').select('id, route_id, departure_time, day_of_week, effective_date_start, effective_date_end').order('effective_date_start', { ascending: false }, 'departure_time', { ascending: true }),
      supabase.from('buses').select('id, name, total_capacity, rental_cost, seat_layout_json').order('name', { ascending: true }),
      supabase.from('bus_destinations').select('id, name').order('name', { ascending: true }),
    ]);

    if (routesRes.error) {
      console.error('Error fetching routes:', routesRes.error);
      toast.error('Error al cargar las rutas.');
    } else {
      setAvailableRoutes(routesRes.data || []);
    }

    if (schedulesRes.error) {
      console.error('Error fetching schedules:', schedulesRes.error);
      toast.error('Error al cargar los horarios.');
    } else {
      setAvailableSchedules(schedulesRes.data || []);
    }

    if (busesRes.error) {
      console.error('Error fetching buses:', busesRes.error);
      toast.error('Error al cargar los autobuses.');
    } else {
      setAvailableBuses(busesRes.data || []);
    }

    if (destinationsRes.error) {
      console.error('Error fetching destinations:', destinationsRes.error);
      toast.error('Error al cargar los destinos.');
    } else {
      setAvailableDestinations(destinationsRes.data || []);
    }
  };

  const fetchBusPassengers = async () => {
    setLoading(true);
    let query = supabase
      .from('bus_passengers')
      .select(`
        *,
        clients ( contract_number, first_name, last_name, email, phone ),
        bus_schedules ( route_id, departure_time, effective_date_start, bus_routes ( name, all_stops ) )
      `)
      .order('created_at', { ascending: false });

    if (filterRoute !== 'all') {
      query = query.eq('bus_schedules.route_id', filterRoute);
    }
    if (filterSchedule !== 'all') {
      query = query.eq('schedule_id', filterSchedule);
    }
    if (filterDate) {
      query = query.eq('bus_schedules.effective_date_start', filterDate);
    }
    if (filterName) {
      query = query.ilike('first_name', `%${filterName}%`); // Simple name filter
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bus passengers:', error.message); // Improved error logging
      toast.error('Error al cargar la lista de pasajeros de autobús.');
    } else {
      const passengersWithDetails = (data || []).map(p => {
        const routeStops = p.bus_schedules?.bus_routes?.all_stops || [];
        const originName = availableDestinations.find(d => d.id === routeStops[0])?.name || 'N/A';
        const destinationName = availableDestinations.find(d => d.id === routeStops[routeStops.length - 1])?.name || 'N/A';

        return {
          ...p,
          client_contract_number: p.clients?.contract_number || 'N/A',
          route_name: p.bus_schedules?.bus_routes?.name || 'N/A',
          departure_time: p.bus_schedules?.departure_time || 'N/A',
          schedule_date: p.bus_schedules?.effective_date_start || 'N/A',
          origin_name: originName,
          destination_name: destinationName,
        };
      });
      setPassengers(passengersWithDetails);
    }
    setLoading(false);
  };

  const handleClearFilters = () => {
    setFilterRoute('all');
    setFilterSchedule('all');
    setFilterDate('');
    setFilterName('');
    fetchBusPassengers(); // Re-fetch all passengers
  };

  const handleEditPassenger = (passenger: BusPassenger) => {
    setSelectedPassenger(passenger);
    setIsEditPassengerDialogOpen(true);
  };

  const handleDeletePassenger = async (id: string, scheduleId: string, seatNumber: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este pasajero? Esto liberará su asiento y podría afectar el contrato del cliente.')) {
      return;
    }
    setLoading(true);
    try {
      // 1. Delete the passenger record
      const { error: deletePassengerError } = await supabase
        .from('bus_passengers')
        .delete()
        .eq('id', id);

      if (deletePassengerError) throw deletePassengerError;

      // 2. Release the seat assignment
      const { error: releaseSeatError } = await supabase
        .from('bus_seat_assignments')
        .update({ status: 'available', client_id: null, updated_at: new Date().toISOString() })
        .eq('schedule_id', scheduleId)
        .eq('seat_number', seatNumber);

      if (releaseSeatError) throw releaseSeatError;

      toast.success('Pasajero eliminado y asiento liberado con éxito.');
      fetchBusPassengers(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting passenger or releasing seat:', error);
      toast.error(`Error al eliminar el pasajero: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando pasajeros de autobús...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const filteredSchedules = availableSchedules.filter(s => filterRoute !== 'all' ? s.route_id === filterRoute : true);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Pasajeros de Autobús" />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Filtros de Pasajeros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={filterRoute} onValueChange={setFilterRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Ruta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Rutas</SelectItem>
                  {availableRoutes.map(route => (
                    <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSchedule} onValueChange={setFilterSchedule} disabled={filterRoute === 'all'}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Horario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Horarios</SelectItem>
                  {filteredSchedules.map(schedule => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.departure_time} ({format(parseISO(schedule.effective_date_start), 'dd/MM/yy', { locale: es })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Filtrar por Fecha"
              />
              <Input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Filtrar por Nombre"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={fetchBusPassengers} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
                <Filter className="mr-2 h-4 w-4" /> Aplicar Filtros
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Pasajeros Registrados</h2>
            {passengers.length === 0 ? (
              <p className="text-gray-600">No hay pasajeros de autobús registrados con los filtros actuales.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Asiento</TableHead>
                      <TableHead>Ruta</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Fecha Viaje</TableHead>
                      <TableHead>Contratante</TableHead>
                      <TableHead>Estado Abordaje</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passengers.map((passenger) => (
                      <TableRow key={passenger.id}>
                        <TableCell className="font-medium">{passenger.client_contract_number}</TableCell>
                        <TableCell>{passenger.first_name} {passenger.last_name}</TableCell>
                        <TableCell>{passenger.seat_number}</TableCell>
                        <TableCell>{passenger.route_name}</TableCell>
                        <TableCell>{passenger.origin_name}</TableCell>
                        <TableCell>{passenger.destination_name}</TableCell>
                        <TableCell>{passenger.departure_time}</TableCell>
                        <TableCell>{passenger.schedule_date ? format(parseISO(passenger.schedule_date), 'dd/MM/yy', { locale: es }) : 'N/A'}</TableCell>
                        <TableCell>{passenger.is_contractor ? 'Sí' : 'No'}</TableCell>
                        <TableCell>{passenger.boarding_status}</TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditPassenger(passenger)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeletePassenger(passenger.id, passenger.schedule_id, passenger.seat_number)}
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
      {selectedPassenger && (
        <BusPassengerEditDialog
          isOpen={isEditPassengerDialogOpen}
          onClose={() => setIsEditPassengerDialogOpen(false)}
          onSave={fetchBusPassengers}
          passenger={selectedPassenger}
          availableRoutes={availableRoutes}
          availableSchedules={availableSchedules}
          availableBuses={availableBuses}
          availableDestinations={availableDestinations}
        />
      )}
    </div>
  );
};

export default AdminBusPassengersPage;