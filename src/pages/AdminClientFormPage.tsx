"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { TourProviderService, AvailableProvider } from '@/types/shared';
import ClientPaymentHistoryTable from '@/components/admin/clients/ClientPaymentHistoryTable';
import BusSeatMap from '@/components/bus-tickets/BusSeatMap'; // NEW: Import BusSeatMap

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry';
  number?: number;
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

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
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  contract_number: string;
  identification_number: string | null;
  tour_id: string | null;
  bus_route_id: string | null; // NEW: Add bus_route_id
  number_of_people: number;
  companions: Companion[];
  extra_services: TourProviderService[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  contractor_age: number | null;
  room_details: RoomDetails;
  remaining_payment?: number;
}

interface Tour {
  id: string;
  title: string;
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number;
  bus_id: string | null;
  courtesies: number;
}

interface BusRoute { // NEW: Interface for BusRoute
  id: string;
  name: string;
  bus_id: string | null;
}

interface BusDetails {
  bus_id: string | null;
  bus_capacity: number;
  courtesies: number;
  seat_layout_json: SeatLayout | null;
}

interface BusSchedule { // NEW: Interface for BusSchedule
  id: string;
  route_id: string;
  departure_time: string;
  day_of_week: number[];
  effective_date_start: string | null;
  effective_date_end: string | null;
}

const allocateRoomsForPeople = (totalPeople: number): RoomDetails => {
  let double = 0;
  let triple = 0;
  let quad = 0;
  let remaining = totalPeople;

  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

  quad = Math.floor(remaining / 4);
  remaining %= 4;

  if (remaining === 3) {
    triple++;
  } else if (remaining === 2) {
    double++;
  } else if (remaining === 1) {
    if (quad > 0) {
      quad--;
      triple++;
      double++;
    } else {
      double++;
    }
  }

  return { double_rooms: double, triple_rooms: triple, quad_rooms: quad };
};

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading, session } = useSession();

  const [formData, setFormData] = useState<Client>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    contract_number: uuidv4().substring(0, 8).toUpperCase(),
    identification_number: null,
    tour_id: null,
    bus_route_id: null, // NEW: Initialize bus_route_id
    number_of_people: 1,
    companions: [],
    extra_services: [],
    total_amount: 0,
    advance_payment: 0,
    total_paid: 0,
    status: 'pending',
    contractor_age: null,
    room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [availableBusRoutes, setAvailableBusRoutes] = useState<BusRoute[]>([]); // NEW: State for available bus routes
  const [availableBusSchedules, setAvailableBusSchedules] = useState<BusSchedule[]>([]); // NEW: State for available bus schedules
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]);
  const [selectedTourPrices, setSelectedTourPrices] = useState<Tour | null>(null);
  const [selectedBusRoute, setSelectedBusRoute] = useState<BusRoute | null>(null); // NEW: State for selected bus route
  const [selectedBusSchedule, setSelectedBusSchedule] = useState<BusSchedule | null>(null); // NEW: State for selected bus schedule
  const [busDetails, setBusDetails] = useState<BusDetails | null>(null);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [initialClientStatus, setInitialClientStatus] = useState<string>('pending');
  const [roomDetails, setRoomDetails] = useState<RoomDetails>({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
  const [refreshPaymentsKey, setRefreshPaymentsKey] = useState(0);

  const [numAdults, setNumAdults] = useState(0);
  const [numChildren, setNumChildren] = useState(0);
  const [extraServicesTotal, setExtraServicesTotal] = useState(0);

  const roomDetailsDisplay = `${roomDetails.quad_rooms > 0 ? `${roomDetails.quad_rooms} Cuádruple(s), ` : ''}` +
                             `${roomDetails.triple_rooms > 0 ? `${roomDetails.triple_rooms} Triple(s), ` : ''}` +
                             `${roomDetails.double_rooms > 0 ? `${roomDetails.double_rooms} Doble(s)` : ''}`;

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  useEffect(() => {
    const fetchToursAndRoutes = async () => {
      const [toursRes, routesRes, schedulesRes] = await Promise.all([ // NEW: Fetch schedules too
        supabase
          .from('tours')
          .select('id, title, selling_price_double_occupancy, selling_price_triple_occupancy, selling_price_quad_occupancy, selling_price_child, bus_id, courtesies')
          .order('title', { ascending: true }),
        supabase
          .from('bus_routes')
          .select('id, name, bus_id')
          .order('name', { ascending: true }),
        supabase
          .from('bus_schedules')
          .select('id, route_id, departure_time, day_of_week, effective_date_start, effective_date_end')
          .order('departure_time', { ascending: true }),
      ]);

      if (toursRes.error) {
        console.error('Error fetching tours:', toursRes.error);
        toast.error('Error al cargar la lista de tours.');
      } else {
        setAvailableTours(toursRes.data || []);
      }

      if (routesRes.error) {
        console.error('Error fetching bus routes:', routesRes.error);
        toast.error('Error al cargar la lista de rutas de autobús.');
      } else {
        setAvailableBusRoutes(routesRes.data || []);
      }

      if (schedulesRes.error) {
        console.error('Error fetching bus schedules:', schedulesRes.error);
        toast.error('Error al cargar la lista de horarios de autobús.');
      } else {
        setAvailableBusSchedules(schedulesRes.data || []);
      }
    };
    fetchToursAndRoutes();
  }, []);

  useEffect(() => {
    const fetchAvailableProviders = async () => {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error al cargar proveedores disponibles:', error);
        toast.error('Error al cargar la lista de proveedores disponibles.');
      } else {
        setAvailableProviders(data || []);
      }
    };
    fetchAvailableProviders();
  }, []);

  const refreshClientData = useCallback(async () => {
    if (clientIdFromParams) {
      setLoadingInitialData(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientIdFromParams)
        .single();

      if (error) {
        console.error('Error fetching client for editing:', error);
        toast.error('Error al cargar los datos del cliente para editar.');
        setLoadingInitialData(false);
        return;
      }

      if (data) {
        setFormData({
          ...data,
          companions: data.companions || [],
          extra_services: data.extra_services || [],
          contract_number: data.contract_number || uuidv4().substring(0, 8).toUpperCase(),
          identification_number: data.identification_number || null,
          contractor_age: data.contractor_age || null,
          room_details: data.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
        });
        setInitialClientStatus(data.status);
        setRoomDetails(data.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });

        // Fetch seat assignments based on whether it's a tour or bus ticket
        if (data.tour_id) {
          const { data: seatAssignments, error: seatsError } = await supabase
            .from('tour_seat_assignments')
            .select('seat_number')
            .eq('client_id', data.id)
            .eq('tour_id', data.tour_id);

          if (seatsError) {
            console.error('Error fetching client tour seat assignments:', seatsError);
          } else {
            setClientSelectedSeats(seatAssignments?.map(s => s.seat_number) || []);
          }
        } else if (data.bus_route_id) { // NEW: Fetch bus seat assignments
          // For bus tickets, we need the schedule_id to fetch seats.
          // Assuming a client booking a bus ticket will have an associated bus_seat_assignment
          // from which we can derive the schedule_id.
          const { data: busSeatAssignments, error: busSeatsError } = await supabase
            .from('bus_seat_assignments')
            .select('schedule_id, seat_number')
            .eq('client_id', data.id);

          if (busSeatsError) {
            console.error('Error fetching client bus seat assignments:', busSeatsError);
          } else {
            setClientSelectedSeats(busSeatAssignments?.map(s => s.seat_number) || []);
            if (busSeatAssignments && busSeatAssignments.length > 0) {
              const schedule = availableBusSchedules.find(s => s.id === busSeatAssignments[0].schedule_id);
              setSelectedBusSchedule(schedule || null);
            }
          }
        }
      }
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        contract_number: uuidv4().substring(0, 8).toUpperCase(),
        identification_number: null,
        tour_id: null,
        bus_route_id: null, // NEW: Reset bus_route_id
        number_of_people: 1,
        companions: [],
        extra_services: [],
        total_amount: 0,
        advance_payment: 0,
        total_paid: 0,
        status: 'pending',
        contractor_age: null,
        room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
      });
      setClientSelectedSeats([]);
      setInitialClientStatus('pending');
      setRoomDetails({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
      setSelectedTourPrices(null);
      setSelectedBusRoute(null); // NEW: Reset selected bus route
      setSelectedBusSchedule(null); // NEW: Reset selected bus schedule
      setBusDetails(null);
    }
    setLoadingInitialData(false);
  }, [clientIdFromParams, availableBusSchedules]); // Added availableBusSchedules to dependencies

  useEffect(() => {
    if (!sessionLoading) {
      refreshClientData();
    }
  }, [sessionLoading, refreshClientData]);

  useEffect(() => {
    if (formData.tour_id) {
      const tour = availableTours.find(t => t.id === formData.tour_id);
      setSelectedTourPrices(tour || null);
      setSelectedBusRoute(null); // Clear bus route selection
      setSelectedBusSchedule(null); // Clear bus schedule selection

      const fetchBusForTour = async () => {
        if (tour?.bus_id) {
          const { data: busData, error: busError } = await supabase
            .from('buses')
            .select('id, total_capacity, seat_layout_json')
            .eq('id', tour.bus_id)
            .single();

          if (busError) {
            console.error('Error fetching bus details for tour:', busError);
            setBusDetails(null);
          } else if (busData) {
            setBusDetails({
              bus_id: busData.id,
              bus_capacity: busData.total_capacity,
              courtesies: tour.courtesies,
              seat_layout_json: busData.seat_layout_json,
            });
          }
        } else {
          setBusDetails(null);
        }
      };
      fetchBusForTour();
    } else if (formData.bus_route_id) { // NEW: Handle bus route selection
      const route = availableBusRoutes.find(r => r.id === formData.bus_route_id);
      setSelectedBusRoute(route || null);
      setSelectedTourPrices(null); // Clear tour selection

      const schedule = availableBusSchedules.find(s => s.route_id === formData.bus_route_id); // Assuming one schedule per route for simplicity here
      setSelectedBusSchedule(schedule || null);

      const fetchBusForRoute = async () => {
        if (route?.bus_id) {
          const { data: busData, error: busError } = await supabase
            .from('buses')
            .select('id, total_capacity, seat_layout_json')
            .eq('id', route.bus_id)
            .single();

          if (busError) {
            console.error('Error fetching bus details for route:', busError);
            setBusDetails(null);
          } else if (busData) {
            setBusDetails({
              bus_id: busData.id,
              bus_capacity: busData.total_capacity,
              courtesies: 0, // Bus tickets don't have 'courtesies' in this context
              seat_layout_json: busData.seat_layout_json,
            });
          }
        } else {
          setBusDetails(null);
        }
      };
      fetchBusForRoute();
    } else {
      setSelectedTourPrices(null);
      setSelectedBusRoute(null);
      setSelectedBusSchedule(null);
      setBusDetails(null);
    }
  }, [formData.tour_id, formData.bus_route_id, availableTours, availableBusRoutes, availableBusSchedules]);

  useEffect(() => {
    let currentNumAdults = 0;
    let currentNumChildren = 0;

    if (formData.contractor_age !== null) {
      if (formData.contractor_age >= 12) {
        currentNumAdults++;
      } else {
        currentNumChildren++;
      }
    } else {
      currentNumAdults++;
    }

    formData.companions.forEach(c => {
      if (c.age !== null) {
        if (c.age >= 12) {
          currentNumAdults++;
        } else {
          currentNumChildren++;
        }
      } else {
        currentNumAdults++;
      }
    });

    setNumAdults(currentNumAdults);
    setNumChildren(currentNumChildren);

    const totalPeople = currentNumAdults + currentNumChildren;

    let calculatedTotalAmount = 0;
    let calculatedRoomDetails: RoomDetails = { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

    if (formData.tour_id && selectedTourPrices) {
      calculatedRoomDetails = allocateRoomsForPeople(currentNumAdults);
      
      calculatedTotalAmount += calculatedRoomDetails.double_rooms * ((selectedTourPrices.selling_price_double_occupancy || 0) * 2);
      calculatedTotalAmount += calculatedRoomDetails.triple_rooms * ((selectedTourPrices.selling_price_triple_occupancy || 0) * 3);
      calculatedTotalAmount += calculatedRoomDetails.quad_rooms * ((selectedTourPrices.selling_price_quad_occupancy || 0) * 4);
      
      calculatedTotalAmount += currentNumChildren * (selectedTourPrices.selling_price_child || 0);
    } else if (formData.bus_route_id && selectedBusRoute) { // NEW: Calculate for bus tickets
      calculatedTotalAmount += currentNumAdults * (selectedBusRoute as any).adult_price; // Assuming adult_price is available on route or segment
      calculatedTotalAmount += currentNumChildren * (selectedBusRoute as any).child_price; // Assuming child_price is available on route or segment
      // Room details are not applicable for bus tickets, so it remains default
    }

    const currentExtraServicesTotal = formData.extra_services.reduce((sum, service) => {
      return sum + (service.selling_price_per_unit_snapshot * service.quantity);
    }, 0);
    setExtraServicesTotal(currentExtraServicesTotal);
    calculatedTotalAmount += currentExtraServicesTotal;

    setFormData(prev => ({
      ...prev,
      number_of_people: totalPeople,
      room_details: calculatedRoomDetails,
      total_amount: calculatedTotalAmount,
      remaining_payment: calculatedTotalAmount - prev.total_paid,
    }));
    setRoomDetails(calculatedRoomDetails); // Update local roomDetails state
  }, [formData.companions.length, formData.total_paid, selectedTourPrices, formData.contractor_age, formData.companions, formData.extra_services, formData.tour_id, formData.bus_route_id, selectedBusRoute]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (id: keyof Client, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: parseFloat(value) || null,
    }));
  };

  const handleSelectChange = (id: keyof Client, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (id === 'tour_id') {
      setFormData(prev => ({ ...prev, bus_route_id: null })); // Clear bus route if tour is selected
    } else if (id === 'bus_route_id') {
      setFormData(prev => ({ ...prev, tour_id: null })); // Clear tour if bus route is selected
    }
  };

  const handleCompanionChange = (id: string, field: 'name' | 'age', value: string) => {
    setFormData((prev) => ({
      ...prev,
      companions: prev.companions.map(c => c.id === id ? { ...c, [field]: field === 'age' ? (parseFloat(value) || null) : value } : c),
    }));
  };

  const addCompanion = () => {
    setFormData((prev) => ({
      ...prev,
      companions: [...prev.companions, { id: uuidv4(), name: '', age: null }],
    }));
  };

  const removeCompanion = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      companions: prev.companions.filter(c => c.id !== id),
    }));
  };

  const handleClientExtraServiceChange = (id: string, field: 'provider_id' | 'quantity', value: string | number) => {
    setFormData((prev) => {
      const newExtraServices = [...prev.extra_services];
      const index = newExtraServices.findIndex(es => es.id === id);

      if (index !== -1) {
        if (field === 'provider_id') {
          const selectedProvider = availableProviders.find(p => p.id === value);
          if (selectedProvider) {
            newExtraServices[index] = {
              ...newExtraServices[index],
              provider_id: value as string,
              selling_price_per_unit_snapshot: selectedProvider.selling_price_per_unit,
              name_snapshot: selectedProvider.name,
              service_type_snapshot: selectedProvider.service_type,
              unit_type_snapshot: selectedProvider.unit_type,
            };
          }
        } else if (field === 'quantity') {
          newExtraServices[index] = { ...newExtraServices[index], quantity: parseFloat(value as string) || 0 };
        }
      }
      return { ...prev, extra_services: newExtraServices };
    });
  };

  const addClientExtraService = () => {
    setFormData((prev) => ({
      ...prev,
      extra_services: [...prev.extra_services, {
        id: uuidv4(),
        provider_id: '',
        quantity: 1,
        selling_price_per_unit_snapshot: 0,
        name_snapshot: '',
        service_type_snapshot: '',
        unit_type_snapshot: 'person',
        cost_per_unit_snapshot: 0,
      }],
    }));
  };

  const removeClientExtraService = (idToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      extra_services: prev.extra_services.filter((service) => service.id !== idToRemove),
    }));
  };

  const handleSeatsSelected = useCallback((seats: number[]) => {
    setClientSelectedSeats(seats);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Por favor, rellena los campos obligatorios (Nombre, Apellido, Email).');
      setIsSubmitting(false);
      return;
    }

    if (!formData.tour_id && !formData.bus_route_id) {
      toast.error('Por favor, selecciona un Tour o una Ruta de Autobús.');
      setIsSubmitting(false);
      return;
    }

    if (formData.total_paid < formData.advance_payment) {
      toast.error('El total pagado no puede ser menor que el anticipo.');
      setIsSubmitting(false);
      return;
    }

    if (formData.contractor_age !== null && (formData.contractor_age < 0 || formData.contractor_age > 120)) {
      toast.error('La edad del contratante debe ser un valor razonable.');
      setIsSubmitting(false);
      return;
    }

    for (const companion of formData.companions) {
      if (companion.age !== null && (companion.age < 0 || companion.age > 120)) {
        toast.error(`La edad del acompañante ${companion.name || 'sin nombre'} debe ser un valor razonable.`);
        setIsSubmitting(false);
        return;
      }
    }

    const totalPeople = 1 + formData.companions.length;
    if (busDetails && clientSelectedSeats.length !== totalPeople) {
      toast.error(`Debes seleccionar ${totalPeople} asientos para este contrato.`);
      setIsSubmitting(false);
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      toast.error('Debes iniciar sesión para gestionar clientes.');
      setIsSubmitting(false);
      return;
    }

    const clientDataToSave = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone || null,
      address: formData.address || null,
      contract_number: formData.contract_number,
      identification_number: formData.identification_number || null,
      tour_id: formData.tour_id,
      bus_route_id: formData.bus_route_id, // NEW: Save bus_route_id
      number_of_people: totalPeople,
      companions: formData.companions,
      extra_services: formData.extra_services,
      total_amount: formData.total_amount,
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
      status: formData.status,
      contractor_age: formData.contractor_age,
      room_details: roomDetails,
      user_id: authUser.id,
    };

    let currentClientIdToUse = clientIdFromParams;

    if (clientIdFromParams) {
      const { error } = await supabase
        .from('clients')
        .update({ ...clientDataToSave, updated_at: new Date().toISOString() })
        .eq('id', clientIdFromParams);

      if (error) {
        console.error('Error updating client:', error);
        toast.error('Error al actualizar el cliente.');
        setIsSubmitting(false);
        return;
      }
      toast.success('Cliente actualizado con éxito.');
    } else {
      const { data: newClientData, error } = await supabase
        .from('clients')
        .insert(clientDataToSave)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating client:', error);
        toast.error('Error al crear el cliente.');
        setIsSubmitting(false);
        return;
      }
      toast.success('Cliente creado con éxito.');
      currentClientIdToUse = newClientData.id;
    }

    if (currentClientIdToUse) {
      // Handle seat assignments based on tour_id or bus_route_id
      if (formData.tour_id) {
        const { error: deleteError } = await supabase
          .from('tour_seat_assignments')
          .delete()
          .eq('client_id', currentClientIdToUse)
          .eq('tour_id', formData.tour_id);

        if (deleteError) {
          console.error('Error deleting old tour seat assignments:', deleteError);
          toast.error('Error al actualizar la asignación de asientos del tour.');
          setIsSubmitting(false);
          return;
        }

        if (formData.status !== 'cancelled') {
          const newSeatAssignments = clientSelectedSeats.map(seatNumber => ({
            tour_id: formData.tour_id,
            seat_number: seatNumber,
            status: 'booked',
            client_id: currentClientIdToUse,
          }));

          if (newSeatAssignments.length > 0) {
            const { error: insertError } = await supabase
              .from('tour_seat_assignments')
              .insert(newSeatAssignments);

            if (insertError) {
              console.error('Error inserting new tour seat assignments:', insertError);
              toast.error('Error al guardar la asignación de asientos del tour.');
              setIsSubmitting(false);
              return;
            }
          }
          toast.success('Asientos de tour asignados con éxito.');
        } else {
          toast.info('Cliente cancelado. Los asientos del tour han sido liberados.');
        }
      } else if (formData.bus_route_id && selectedBusSchedule) { // NEW: Handle bus seat assignments
        const { error: deleteError } = await supabase
          .from('bus_seat_assignments')
          .delete()
          .eq('client_id', currentClientIdToUse)
          .eq('schedule_id', selectedBusSchedule.id); // Delete by schedule_id

        if (deleteError) {
          console.error('Error deleting old bus seat assignments:', deleteError);
          toast.error('Error al actualizar la asignación de asientos del autobús.');
          setIsSubmitting(false);
          return;
        }

        if (formData.status !== 'cancelled') {
          const newBusSeatAssignments = clientSelectedSeats.map(seatNumber => ({
            schedule_id: selectedBusSchedule.id,
            seat_number: seatNumber,
            status: 'booked',
            client_id: currentClientIdToUse,
          }));

          if (newBusSeatAssignments.length > 0) {
            const { error: insertError } = await supabase
              .from('bus_seat_assignments')
              .insert(newBusSeatAssignments);

            if (insertError) {
              console.error('Error inserting new bus seat assignments:', insertError);
              toast.error('Error al guardar la asignación de asientos del autobús.');
              setIsSubmitting(false);
              return;
            }
          }
          toast.success('Asientos de autobús asignados con éxito.');
        } else {
          toast.info('Cliente cancelado. Los asientos del autobús han sido liberados.');
        }
      }
    }

    navigate('/admin/clients');
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientIdFromParams ? 'Editar Cliente' : 'Añadir Nuevo Cliente'} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {clientIdFromParams ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-6 py-4">
              {/* Client Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input id="first_name" value={formData.first_name} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input id="last_name" value={formData.last_name} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={formData.phone} onChange={handleChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Textarea id="address" value={formData.address} onChange={handleChange} rows={2} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractor_age">Edad del Contratante</Label>
                  <Input 
                    id="contractor_age" 
                    type="text" // Changed to text
                    pattern="[0-9]*" // Pattern for integers
                    value={formData.contractor_age || ''} 
                    onChange={(e) => handleNumberChange('contractor_age', e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="identification_number">Número de Identificación</Label>
                  <Input id="identification_number" value={formData.identification_number || ''} onChange={handleChange} placeholder="Ej: INE, Pasaporte, etc." />
                </div>
              </div>

              {/* Contract and Tour/Route Info */}
              <h3 className="text-lg font-semibold mt-4">Detalles del Contrato y Viaje</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract_number">Número de Contrato</Label>
                  <Input id="contract_number" value={formData.contract_number} readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <Label htmlFor="tour_id">Tour Asociado</Label>
                  <Select value={formData.tour_id || ''} onValueChange={(value) => handleSelectChange('tour_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Tour" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTours.map((tour) => (
                        <SelectItem key={tour.id} value={tour.id}>
                          {tour.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bus_route_id">Ruta de Autobús Asociada</Label> {/* NEW: Bus Route Select */}
                  <Select value={formData.bus_route_id || ''} onValueChange={(value) => handleSelectChange('bus_route_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Ruta de Autobús" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBusRoutes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Occupancy and Companions */}
              <h3 className="text-lg font-semibold mt-4">Ocupación y Acompañantes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number_of_people">Número Total de Personas</Label>
                  <Input id="number_of_people" type="text" pattern="[0-9]*" value={formData.number_of_people} readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <Label>Distribución de Habitaciones</Label>
                  <Input value={roomDetailsDisplay.replace(/,\s*$/, '') || 'N/A'} readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label className="font-semibold">Acompañantes</Label>
                {formData.companions.map((companion) => (
                  <div key={companion.id} className="flex flex-col md:flex-row items-center gap-2">
                    <Input
                      value={companion.name}
                      onChange={(e) => handleCompanionChange(companion.id, 'name', e.target.value)}
                      placeholder="Nombre del acompañante"
                      className="w-full md:w-2/3"
                    />
                    <Input
                      type="text" // Changed to text
                      pattern="[0-9]*" // Pattern for integers
                      value={companion.age || ''}
                      onChange={(e) => handleCompanionChange(companion.id, 'age', e.target.value)}
                      placeholder="Edad"
                      className="w-full md:w-1/3"
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeCompanion(companion.id)}>
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addCompanion}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Acompañante
                </Button>
              </div>

              {/* Extra Services for Client */}
              <div className="space-y-2 col-span-full mt-6">
                <Label className="text-lg font-semibold">Servicios Adicionales para el Cliente</Label>
                {availableProviders.length === 0 ? (
                  <p className="text-gray-600">No hay servicios adicionales disponibles.</p>
                ) : (
                  <>
                    {formData.extra_services.map((clientService) => {
                      const selectedProvider = availableProviders.find(p => p.id === clientService.provider_id);
                      const providerDisplay = selectedProvider
                        ? `${selectedProvider.name} (${selectedProvider.service_type} - ${clientService.unit_type_snapshot})`
                        : 'Seleccionar Servicio';
                      const totalSellingPrice = clientService.selling_price_per_unit_snapshot * clientService.quantity;

                      return (
                        <div key={clientService.id} className="flex flex-col md:flex-row items-center gap-2 border p-2 rounded-md">
                          <Select
                            value={clientService.provider_id}
                            onValueChange={(value) => handleClientExtraServiceChange(clientService.id, 'provider_id', value)}
                          >
                            <SelectTrigger className="w-full md:w-1/2">
                              <SelectValue placeholder={providerDisplay} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableProviders.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  {`${provider.name} (${provider.service_type} - ${provider.unit_type})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="text" // Changed to text
                            pattern="[0-9]*" // Pattern for integers
                            value={clientService.quantity}
                            onChange={(e) => handleClientExtraServiceChange(clientService.id, 'quantity', e.target.value)}
                            placeholder="Cantidad"
                            className="w-full md:w-1/6"
                            required
                          />
                          <span className="text-sm text-gray-600 md:w-1/4 text-center md:text-left">
                            Precio Venta Total: ${totalSellingPrice.toFixed(2)}
                          </span>
                          <Button type="button" variant="destructive" size="icon" onClick={() => removeClientExtraService(clientService.id)}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button type="button" variant="outline" onClick={addClientExtraService}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Servicio Adicional
                    </Button>
                  </>
                )}
              </div>

              {/* Seat Selection */}
              {busDetails && busDetails.bus_capacity > 0 && (
                <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold mb-4">Selección de Asientos</h3>
                  {formData.tour_id && (
                    <TourSeatMap
                      tourId={formData.tour_id}
                      busCapacity={busDetails.bus_capacity}
                      courtesies={busDetails.courtesies}
                      seatLayoutJson={busDetails.seat_layout_json}
                      onSeatsSelected={handleSeatsSelected}
                      readOnly={false}
                      adminMode={false}
                      currentClientId={formData.id || undefined}
                      initialSelectedSeats={clientSelectedSeats}
                    />
                  )}
                  {formData.bus_route_id && selectedBusSchedule && ( // NEW: Render BusSeatMap for bus tickets
                    <BusSeatMap
                      busId={busDetails.bus_id || ''}
                      busCapacity={busDetails.bus_capacity}
                      scheduleId={selectedBusSchedule.id}
                      seatLayoutJson={busDetails.seat_layout_json}
                      onSeatsSelected={handleSeatsSelected}
                      readOnly={false}
                    />
                  )}
                  {clientSelectedSeats.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Asientos seleccionados: {clientSelectedSeats.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="col-span-full mt-6 p-4 bg-gray-100 rounded-md">
                <h4 className="font-semibold text-lg mb-2">Desglose del Cálculo:</h4>
                <p className="text-sm text-gray-700">Adultos: <span className="font-medium">{numAdults}</span></p>
                <p className="text-sm text-gray-700">Niños (-12 años): <span className="font-medium">{numChildren}</span></p>
                {formData.tour_id && selectedTourPrices && (
                  <>
                    {roomDetails.double_rooms > 0 && (
                      <p className="text-sm text-gray-700">
                        Habitaciones Dobles: <span className="font-medium">{roomDetails.double_rooms}</span> x ${selectedTourPrices.selling_price_double_occupancy.toFixed(2) || '0.00'}/persona x 2 = <span className="font-medium">${(roomDetails.double_rooms * (selectedTourPrices.selling_price_double_occupancy || 0) * 2).toFixed(2)}</span>
                      </p>
                    )}
                    {roomDetails.triple_rooms > 0 && (
                      <p className="text-sm text-gray-700">
                        Habitaciones Triples: <span className="font-medium">{roomDetails.triple_rooms}</span> x ${selectedTourPrices.selling_price_triple_occupancy.toFixed(2) || '0.00'}/persona x 3 = <span className="font-medium">${(roomDetails.triple_rooms * (selectedTourPrices.selling_price_triple_occupancy || 0) * 3).toFixed(2)}</span>
                      </p>
                    )}
                    {roomDetails.quad_rooms > 0 && (
                      <p className="text-sm text-gray-700">
                        Habitaciones Cuádruples: <span className="font-medium">{roomDetails.quad_rooms}</span> x ${selectedTourPrices.selling_price_quad_occupancy.toFixed(2) || '0.00'}/persona x 4 = <span className="font-medium">${(roomDetails.quad_rooms * (selectedTourPrices.selling_price_quad_occupancy || 0) * 4).toFixed(2)}</span>
                      </p>
                    )}
                    {numChildren > 0 && (
                      <p className="text-sm text-gray-700">
                        Costo Niños: <span className="font-medium">{numChildren}</span> x ${selectedTourPrices.selling_price_child.toFixed(2) || '0.00'}/niño = <span className="font-medium">${(numChildren * (selectedTourPrices.selling_price_child || 0)).toFixed(2)}</span>
                      </p>
                    )}
                  </>
                )}
                {formData.bus_route_id && selectedBusRoute && ( // NEW: Price breakdown for bus tickets
                  <>
                    <p className="text-sm text-gray-700">
                      Boletos Adulto: <span className="font-medium">{numAdults}</span> x ${(selectedBusRoute as any).adult_price.toFixed(2)} = <span className="font-medium">${(numAdults * (selectedBusRoute as any).adult_price).toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Boletos Niño: <span className="font-medium">{numChildren}</span> x ${(selectedBusRoute as any).child_price.toFixed(2)} = <span className="font-medium">${(numChildren * (selectedBusRoute as any).child_price).toFixed(2)}</span>
                    </p>
                  </>
                )}
                {extraServicesTotal > 0 && (
                  <p className="text-sm text-gray-700">
                    Servicios Adicionales: <span className="font-medium">${extraServicesTotal.toFixed(2)}</span>
                  </p>
                )}
                <p className="font-bold mt-2 text-gray-800">Total Calculado: <span className="text-xl">${formData.total_amount.toFixed(2)}</span></p>
              </div>

              {/* Payment Details */}
              <h3 className="text-lg font-semibold mt-4">Detalles de Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_amount">Monto Total del Contrato</Label>
                  <Input id="total_amount" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.total_amount.toFixed(2)} readOnly className="bg-gray-100 cursor-not-allowed font-bold" />
                </div>
                <div>
                  <Label htmlFor="advance_payment">Anticipo</Label>
                  <Input 
                    id="advance_payment" 
                    type="text" // Changed to text
                    pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
                    value={formData.advance_payment} 
                    onChange={(e) => handleNumberChange('advance_payment', e.target.value)} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_paid">Total Pagado</Label>
                  <Input 
                    id="total_paid" 
                    type="text" // Changed to text
                    pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
                    value={formData.total_paid} 
                    onChange={(e) => handleNumberChange('total_paid', e.target.value)} 
                  />
                </div>
                <div>
                  <Label htmlFor="remaining_payment">Falta por Pagar</Label>
                  <Input id="remaining_payment" type="text" pattern="[0-9]*\.?[0-9]*" value={(formData.total_amount - formData.total_paid).toFixed(2)} readOnly className="bg-gray-100 cursor-not-allowed font-bold text-red-600" />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Estado del Contrato</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end mt-6 space-x-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {clientIdFromParams ? 'Guardar Cambios' : 'Añadir Cliente'}
                </Button>
              </div>
            </form>
          </div>

          {formData.id && (
            <div className="mt-8">
              <ClientPaymentHistoryTable clientId={formData.id} key={refreshPaymentsKey} onPaymentsUpdated={refreshClientData} />
            </div>
          )}
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminClientFormPage;