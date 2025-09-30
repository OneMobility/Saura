"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // For generating contract numbers
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap'; // Import TourSeatMap
import { TourProviderService, AvailableProvider } from '@/types/shared'; // NEW: Import shared types

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry';
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

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
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  contract_number: string;
  tour_id: string | null;
  number_of_people: number;
  companions: Companion[];
  extra_services: TourProviderService[]; // NEW: Array of selected provider services
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  contractor_age: number | null; // Added contractor_age
  room_details: RoomDetails; // NEW: Stores calculated room breakdown
  remaining_payment?: number; // Calculated field
}

interface Tour {
  id: string;
  title: string;
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number; // NEW: Price for children under 12
  bus_id: string | null;
  courtesies: number; // Tour's courtesies
}

interface BusDetails {
  bus_id: string | null;
  bus_capacity: number;
  courtesies: number; // Tour's courtesies, not bus's
  seat_layout_json: SeatLayout | null;
}

// NEW: Helper function to calculate room allocation for a given number of people
const allocateRoomsForPeople = (totalPeople: number): RoomDetails => {
  let double = 0;
  let triple = 0;
  let quad = 0;
  let remaining = totalPeople;

  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

  // Prioritize quad rooms
  quad = Math.floor(remaining / 4);
  remaining %= 4;

  // Handle remaining people
  if (remaining === 3) {
    triple++;
  } else if (remaining === 2) {
    double++;
  } else if (remaining === 1) {
    // If 1 person remains, try to convert a quad to a triple + double if possible
    // Otherwise, assign a double room (paying for 2)
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
  const { id: clientId } = useParams<{ id: string }>(); // Get client ID from URL for editing
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<Client>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    contract_number: uuidv4().substring(0, 8).toUpperCase(), // Generate a short UUID for contract
    tour_id: null,
    number_of_people: 1,
    companions: [],
    extra_services: [], // Initialize new field
    total_amount: 0,
    advance_payment: 0,
    total_paid: 0,
    status: 'pending',
    contractor_age: null, // Initialize contractor_age
    room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }, // Initialize room_details
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [availableProviders, setAvailableProviders] = useState<AvailableProvider[]>([]); // NEW: State for available providers
  const [selectedTourPrices, setSelectedTourPrices] = useState<Tour | null>(null);
  const [busDetails, setBusDetails] = useState<BusDetails | null>(null); // State for bus details
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]); // Seats selected for *this* client
  const [initialClientStatus, setInitialClientStatus] = useState<string>('pending'); // To track status change
  const [roomDetails, setRoomDetails] = useState<RoomDetails>({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }); // Define roomDetails state

  // NEW: States for breakdown display
  const [numAdults, setNumAdults] = useState(0);
  const [numChildren, setNumChildren] = useState(0);
  const [extraServicesTotal, setExtraServicesTotal] = useState(0);

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  useEffect(() => {
    const fetchTours = async () => {
      const { data, error } = await supabase
        .from('tours')
        .select('id, title, selling_price_double_occupancy, selling_price_triple_occupancy, selling_price_quad_occupancy, selling_price_child, bus_id, courtesies')
        .order('title', { ascending: true });

      if (error) {
        console.error('Error fetching tours:', error);
        toast.error('Error al cargar la lista de tours.');
      } else {
        setAvailableTours(data || []);
      }
    };
    fetchTours();
  }, []);

  // NEW: Fetch available providers
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

  useEffect(() => {
    const fetchClientData = async () => {
      if (clientId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
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
            extra_services: data.extra_services || [], // Set extra_services
            contract_number: data.contract_number || uuidv4().substring(0, 8).toUpperCase(),
            contractor_age: data.contractor_age || null,
            room_details: data.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }, // Set room_details
          });
          setInitialClientStatus(data.status); // Store initial status
          setRoomDetails(data.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }); // Initialize roomDetails state

          // Fetch existing seat assignments for this client and tour
          if (data.tour_id) {
            const { data: seatAssignments, error: seatsError } = await supabase
              .from('tour_seat_assignments')
              .select('seat_number')
              .eq('client_id', data.id)
              .eq('tour_id', data.tour_id);

            if (seatsError) {
              console.error('Error fetching client seat assignments:', seatsError);
            } else {
              setClientSelectedSeats(seatAssignments?.map(s => s.seat_number) || []);
            }
          }
        }
      } else {
        // Reset form for new client
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          address: '',
          contract_number: uuidv4().substring(0, 8).toUpperCase(),
          tour_id: null,
          number_of_people: 1,
          companions: [],
          extra_services: [], // Reset new field
          total_amount: 0,
          advance_payment: 0,
          total_paid: 0,
          status: 'pending',
          contractor_age: null,
          room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
        });
        setClientSelectedSeats([]); // Clear selected seats for new client
        setInitialClientStatus('pending');
        setRoomDetails({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }); // Reset roomDetails state
      }
      setLoadingInitialData(false);
    };

    if (!sessionLoading) { // Only fetch client data once session is loaded
      fetchClientData();
    }
  }, [clientId, sessionLoading]);

  // Effect to update selectedTourPrices and busDetails when formData.tour_id changes
  useEffect(() => {
    if (formData.tour_id) {
      const tour = availableTours.find(t => t.id === formData.tour_id);
      setSelectedTourPrices(tour || null);

      // Fetch bus details for the selected tour
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
              courtesies: tour.courtesies, // Use tour's courtesies, not bus's
              seat_layout_json: busData.seat_layout_json,
            });
          }
        } else {
          setBusDetails(null);
        }
      };
      fetchBusForTour();
    } else {
      setSelectedTourPrices(null);
      setBusDetails(null);
    }
  }, [formData.tour_id, availableTours]);

  // Effect to calculate total_amount, number_of_people, and room_details
  useEffect(() => {
    let currentNumAdults = 0;
    let currentNumChildren = 0;

    // Contractor
    if (formData.contractor_age !== null) {
      if (formData.contractor_age >= 12) {
        currentNumAdults++;
      } else {
        currentNumChildren++;
      }
    } else {
      currentNumAdults++; // Default to adult if age not specified for contractor
    }

    // Companions
    formData.companions.forEach(c => {
      if (c.age !== null) {
        if (c.age >= 12) {
          currentNumAdults++;
        } else {
          currentNumChildren++;
        }
      } else {
        currentNumAdults++; // Default to adult if age not specified for companion
      }
    });

    setNumAdults(currentNumAdults);
    setNumChildren(currentNumChildren);

    const totalPeople = currentNumAdults + currentNumChildren;

    // Allocate rooms based on total people (adults + children)
    const calculatedRoomDetails = allocateRoomsForPeople(currentNumAdults);
    setRoomDetails(calculatedRoomDetails); // Update roomDetails state

    let calculatedTotalAmount = 0;
    
    // Cost for rooms based on their occupancy type
    calculatedTotalAmount += calculatedRoomDetails.double_rooms * ((selectedTourPrices?.selling_price_double_occupancy || 0) * 2);
    calculatedTotalAmount += calculatedRoomDetails.triple_rooms * ((selectedTourPrices?.selling_price_triple_occupancy || 0) * 3);
    calculatedTotalAmount += calculatedRoomDetails.quad_rooms * ((selectedTourPrices?.selling_price_quad_occupancy || 0) * 4);
    
    // Add cost for children
    calculatedTotalAmount += currentNumChildren * (selectedTourPrices?.selling_price_child || 0);

    // Add cost of extra services
    const currentExtraServicesTotal = formData.extra_services.reduce((sum, service) => {
      return sum + (service.selling_price_per_unit_snapshot * service.quantity);
    }, 0);
    setExtraServicesTotal(currentExtraServicesTotal);
    calculatedTotalAmount += currentExtraServicesTotal;

    setFormData(prev => ({
      ...prev,
      number_of_people: totalPeople, // Total people including children
      room_details: calculatedRoomDetails, // Room details based on adults
      total_amount: calculatedTotalAmount,
      remaining_payment: calculatedTotalAmount - prev.total_paid,
    }));
  }, [formData.companions.length, formData.total_paid, selectedTourPrices, formData.contractor_age, formData.companions, formData.extra_services, setRoomDetails]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (id: keyof Client, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: parseFloat(value) || null, // Allow null for empty number inputs
    }));
  };

  const handleSelectChange = (id: keyof Client, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
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

  // NEW: Handle client extra service changes
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
          newExtraServices[index] = { ...newExtraServices[index], quantity: value as number };
        }
      }
      return { ...prev, extra_services: newExtraServices };
    });
  };

  // NEW: Add client extra service
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
      }],
    }));
  };

  // NEW: Remove client extra service
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

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.tour_id) {
      toast.error('Por favor, rellena los campos obligatorios (Nombre, Apellido, Email, Tour).');
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
    if (clientSelectedSeats.length !== totalPeople) {
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
      tour_id: formData.tour_id,
      number_of_people: formData.number_of_people,
      companions: formData.companions,
      extra_services: formData.extra_services, // Save extra_services
      total_amount: formData.total_amount,
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
      status: formData.status,
      contractor_age: formData.contractor_age,
      room_details: roomDetails, // Save room_details from state
      user_id: authUser.id, // Link to the admin user who created/updated it
    };

    let currentClientIdToUse = clientId;

    if (clientId) {
      // Update existing client
      const { error } = await supabase
        .from('clients')
        .update({ ...clientDataToSave, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      if (error) {
        console.error('Error updating client:', error);
        toast.error('Error al actualizar el cliente.');
        setIsSubmitting(false);
        return;
      }
      toast.success('Cliente actualizado con éxito.');
    } else {
      // Insert new client
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
      currentClientIdToUse = newClientData.id; // Get the ID of the newly created client
    }

    // Handle seat assignments based on status and selected seats
    if (currentClientIdToUse && formData.tour_id) {
      // 1. Delete existing assignments for this client on this tour
      const { error: deleteError } = await supabase
        .from('tour_seat_assignments')
        .delete()
        .eq('client_id', currentClientIdToUse)
        .eq('tour_id', formData.tour_id);

      if (deleteError) {
        console.error('Error deleting old seat assignments:', deleteError);
        toast.error('Error al actualizar la asignación de asientos.');
        setIsSubmitting(false);
        return;
      }

      // 2. Insert new assignments ONLY if status is NOT 'cancelled'
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
            console.error('Error inserting new seat assignments:', insertError);
            toast.error('Error al guardar la asignación de asientos.');
            setIsSubmitting(false);
            return;
          }
        }
        toast.success('Asientos asignados con éxito.');
      } else {
        toast.info('Cliente cancelado. Los asientos han sido liberados.');
      }
    }

    navigate('/admin/clients'); // Redirect back to clients list
    setIsSubmitting(false);
  };

  const roomDetailsDisplay = `${roomDetails.quad_rooms > 0 ? `${roomDetails.quad_rooms} Cuádruple(s), ` : ''}` +
                             `${roomDetails.triple_rooms > 0 ? `${roomDetails.triple_rooms} Triple(s), ` : ''}` +
                             `${roomDetails.double_rooms > 0 ? `${roomDetails.double_rooms} Doble(s)` : ''}`;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientId ? 'Editar Cliente' : 'Añadir Nuevo Cliente'} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {clientId ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}
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
              <div>
                <Label htmlFor="contractor_age">Edad del Contratante</Label>
                <Input id="contractor_age" type="number" value={formData.contractor_age || ''} onChange={(e) => handleNumberChange('contractor_age', e.target.value)} min={0} max={120} />
              </div>

              {/* Contract and Tour Info */}
              <h3 className="text-lg font-semibold mt-4">Detalles del Contrato y Tour</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract_number">Número de Contrato</Label>
                  <Input id="contract_number" value={formData.contract_number} readOnly className="bg-gray-100 cursor-not-allowed" />
                </div>
                <div>
                  <Label htmlFor="tour_id">Tour Asociado</Label>
                  <Select value={formData.tour_id || ''} onValueChange={(value) => handleSelectChange('tour_id', value)} required>
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
              </div>

              {/* Occupancy and Companions */}
              <h3 className="text-lg font-semibold mt-4">Ocupación y Acompañantes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number_of_people">Número Total de Personas</Label>
                  <Input id="number_of_people" type="number" value={formData.number_of_people} readOnly className="bg-gray-100 cursor-not-allowed" />
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
                      type="number"
                      value={companion.age || ''}
                      onChange={(e) => handleCompanionChange(companion.id, 'age', e.target.value)}
                      placeholder="Edad"
                      className="w-full md:w-1/3"
                      min={0} max={120}
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

              {/* NEW: Extra Services for Client */}
              <div className="space-y-2 col-span-full mt-6">
                <Label className="text-lg font-semibold">Servicios Adicionales para el Cliente</Label>
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
                        type="number"
                        value={clientService.quantity}
                        onChange={(e) => handleClientExtraServiceChange(clientService.id, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Cantidad"
                        className="w-full md:w-1/6"
                        min={1}
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
              </div>

              {/* Seat Selection */}
              {formData.tour_id && busDetails && busDetails.bus_capacity > 0 && (
                <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold mb-4">Selección de Asientos</h3>
                  <TourSeatMap
                    tourId={formData.tour_id}
                    busCapacity={busDetails.bus_capacity}
                    courtesies={busDetails.courtesies} // Use 'courtesies' here
                    seatLayoutJson={busDetails.seat_layout_json}
                    onSeatsSelected={handleSeatsSelected}
                    readOnly={false}
                    adminMode={false} // Client mode, not admin blocking mode
                    currentClientId={clientId || undefined} // Pass client ID if editing, or undefined for new
                    initialSelectedSeats={clientSelectedSeats}
                  />
                  {clientSelectedSeats.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Asientos seleccionados: {clientSelectedSeats.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* NEW: Price Breakdown */}
              <div className="col-span-full mt-6 p-4 bg-gray-100 rounded-md">
                <h4 className="font-semibold text-lg mb-2">Desglose del Cálculo:</h4>
                <p className="text-sm text-gray-700">Adultos: <span className="font-medium">{numAdults}</span></p>
                <p className="text-sm text-gray-700">Niños (-12 años): <span className="font-medium">{numChildren}</span></p>
                {roomDetails.double_rooms > 0 && (
                  <p className="text-sm text-gray-700">
                    Habitaciones Dobles: <span className="font-medium">{roomDetails.double_rooms}</span> x ${selectedTourPrices?.selling_price_double_occupancy.toFixed(2) || '0.00'}/persona x 2 = <span className="font-medium">${(roomDetails.double_rooms * (selectedTourPrices?.selling_price_double_occupancy || 0) * 2).toFixed(2)}</span>
                  </p>
                )}
                {roomDetails.triple_rooms > 0 && (
                  <p className="text-sm text-gray-700">
                    Habitaciones Triples: <span className="font-medium">{roomDetails.triple_rooms}</span> x ${selectedTourPrices?.selling_price_triple_occupancy.toFixed(2) || '0.00'}/persona x 3 = <span className="font-medium">${(roomDetails.triple_rooms * (selectedTourPrices?.selling_price_triple_occupancy || 0) * 3).toFixed(2)}</span>
                  </p>
                )}
                {roomDetails.quad_rooms > 0 && (
                  <p className="text-sm text-gray-700">
                    Habitaciones Cuádruples: <span className="font-medium">{roomDetails.quad_rooms}</span> x ${selectedTourPrices?.selling_price_quad_occupancy.toFixed(2) || '0.00'}/persona x 4 = <span className="font-medium">${(roomDetails.quad_rooms * (selectedTourPrices?.selling_price_quad_occupancy || 0) * 4).toFixed(2)}</span>
                  </p>
                )}
                {numChildren > 0 && (
                  <p className="text-sm text-gray-700">
                    Costo Niños: <span className="font-medium">{numChildren}</span> x ${selectedTourPrices?.selling_price_child.toFixed(2) || '0.00'}/niño = <span className="font-medium">${(numChildren * (selectedTourPrices?.selling_price_child || 0)).toFixed(2)}</span>
                  </p>
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
                  <Input id="total_amount" type="number" value={formData.total_amount.toFixed(2)} readOnly className="bg-gray-100 cursor-not-allowed font-bold" />
                </div>
                <div>
                  <Label htmlFor="advance_payment">Anticipo</Label>
                  <Input id="advance_payment" type="number" value={formData.advance_payment} onChange={(e) => handleNumberChange('advance_payment', e.target.value)} min={0} step="0.01" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_paid">Total Pagado</Label>
                  <Input id="total_paid" type="number" value={formData.total_paid} onChange={(e) => handleNumberChange('total_paid', e.target.value)} min={0} step="0.01" />
                </div>
                <div>
                  <Label htmlFor="remaining_payment">Falta por Pagar</Label>
                  <Input id="remaining_payment" type="number" value={(formData.total_amount - formData.total_paid).toFixed(2)} readOnly className="bg-gray-100 cursor-not-allowed font-bold text-red-600" />
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

              <div className="flex justify-end mt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {clientId ? 'Guardar Cambios' : 'Añadir Cliente'}
                </Button>
              </div>
            </form>
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminClientFormPage;