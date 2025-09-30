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
  const [selectedTourPrices, setSelectedTourPrices] = useState<Tour | null>(null);
  const [busDetails, setBusDetails] = useState<BusDetails | null>(null); // State for bus details
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]); // Seats selected for *this* client

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
            contract_number: data.contract_number || uuidv4().substring(0, 8).toUpperCase(),
            contractor_age: data.contractor_age || null,
            room_details: data.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }, // Set room_details
          });

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
          total_amount: 0,
          advance_payment: 0,
          total_paid: 0,
          status: 'pending',
          contractor_age: null,
          room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
        });
        setClientSelectedSeats([]); // Clear selected seats for new client
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

  // NEW: Function to calculate room allocation
  const calculateRoomAllocation = useCallback((contractorAge: number | null, companions: Companion[]): RoomDetails => {
    let double = 0;
    let triple = 0;
    let quad = 0;
    
    const allAges = [contractorAge, ...companions.map(c => c.age)].filter((age): age is number => age !== null);
    const totalPeople = allAges.length;

    if (totalPeople === 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

    let remaining = totalPeople;

    // Prioritize quad rooms
    quad = Math.floor(remaining / 4);
    remaining %= 4;

    // Handle remaining people
    if (remaining === 1) {
      if (quad > 0) {
        quad--; // Convert one quad to a triple and a double
        triple++;
        double++;
      } else {
        // If no quad rooms, for 1 person, assign a double (paying for 2)
        double++;
      }
    } else if (remaining === 2) {
      double++;
    } else if (remaining === 3) {
      triple++;
    }

    return { double_rooms: double, triple_rooms: triple, quad_rooms: quad };
  }, []);

  // Effect to calculate total_amount, number_of_people, and room_details
  useEffect(() => {
    const numPeople = 1 + formData.companions.length;
    const calculatedRoomDetails = calculateRoomAllocation(formData.contractor_age, formData.companions);

    let calculatedTotalAmount = 0;
    if (selectedTourPrices) {
      const allAges = [formData.contractor_age, ...formData.companions.map(c => c.age)].filter((age): age is number => age !== null);
      const adultsCount = allAges.filter(age => age >= 12).length;
      const childrenCount = allAges.filter(age => age < 12).length;

      // Calculate cost for adults based on room distribution
      calculatedTotalAmount += calculatedRoomDetails.double_rooms * selectedTourPrices.selling_price_double_occupancy * 2;
      calculatedTotalAmount += calculatedRoomDetails.triple_rooms * selectedTourPrices.selling_price_triple_occupancy * 3;
      calculatedTotalAmount += calculatedRoomDetails.quad_rooms * selectedTourPrices.selling_price_quad_occupancy * 4;
      
      // Add cost for children (if any, and if they are not already covered by room occupancy)
      // This logic assumes children are added on top of adult room occupancy, or fill empty spots.
      // For simplicity, we'll add child price for each child, assuming they don't reduce adult room price.
      // A more complex logic might involve assigning children to rooms first.
      // For now, we'll just add the child price for each child.
      calculatedTotalAmount += childrenCount * selectedTourPrices.selling_price_child;
    }

    setFormData(prev => ({
      ...prev,
      number_of_people: numPeople,
      room_details: calculatedRoomDetails,
      total_amount: calculatedTotalAmount,
      remaining_payment: calculatedTotalAmount - prev.total_paid,
    }));
  }, [formData.companions.length, formData.total_paid, selectedTourPrices, formData.contractor_age, formData.companions, calculateRoomAllocation]);


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

    if (clientSelectedSeats.length !== formData.number_of_people) {
      toast.error(`Debes seleccionar ${formData.number_of_people} asientos para este contrato.`);
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
      total_amount: formData.total_amount,
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
      status: formData.status,
      contractor_age: formData.contractor_age,
      room_details: formData.room_details, // Save room_details
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

    // Update seat assignments
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

      // 2. Insert new assignments
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
    }

    navigate('/admin/clients'); // Redirect back to clients list
    setIsSubmitting(false);
  };

  if (sessionLoading || loadingInitialData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario de cliente...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // Should be redirected by ProtectedRoute
  }

  const roomDetailsDisplay = `${formData.room_details.quad_rooms > 0 ? `${formData.room_details.quad_rooms} Cuádruple(s), ` : ''}` +
                             `${formData.room_details.triple_rooms > 0 ? `${formData.room_details.triple_rooms} Triple(s), ` : ''}` +
                             `${formData.room_details.double_rooms > 0 ? `${formData.room_details.double_rooms} Doble(s)` : ''}`;

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

              {/* Seat Selection */}
              {formData.tour_id && busDetails && busDetails.bus_capacity > 0 && (
                <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold mb-4">Selección de Asientos</h3>
                  <TourSeatMap
                    tourId={formData.tour_id}
                    busCapacity={busDetails.bus_capacity}
                    courtesies={busDetails.courtesies}
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