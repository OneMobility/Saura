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

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  useEffect(() => {
    const fetchTours = async () => {
      const { data, error } = await supabase
        .from('tours')
        .select('id, title, selling_price_double_occupancy, selling_price_triple_occupancy, selling_price_quad_occupancy')
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
      }
      setLoadingInitialData(false);
    };

    if (!sessionLoading) { // Only fetch client data once session is loaded
      fetchClientData();
    }
  }, [clientId, sessionLoading]);

  // Effect to update selectedTourPrices when formData.tour_id changes
  useEffect(() => {
    if (formData.tour_id) {
      const tour = availableTours.find(t => t.id === formData.tour_id);
      setSelectedTourPrices(tour || null);
    } else {
      setSelectedTourPrices(null);
    }
  }, [formData.tour_id, availableTours]);

  // NEW: Function to calculate room allocation
  const calculateRoomAllocation = useCallback((contractorAge: number | null, companions: Companion[]): RoomDetails => {
    let double = 0;
    let triple = 0;
    let quad = 0;
    
    const allAges = [contractorAge, ...companions.map(c => c.age)].filter((age): age is number => age !== null);
    const adults = allAges.filter(age => age >= 12).length;
    const minors = allAges.filter(age => age < 12).length;
    const totalPeople = adults + minors;

    // Special rule: 2 adults + 2 minors < 12 = 1 double room
    if (adults === 2 && minors === 2 && totalPeople === 4) {
      return { double_rooms: 1, triple_rooms: 0, quad_rooms: 0 };
    }

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
      calculatedTotalAmount += calculatedRoomDetails.double_rooms * selectedTourPrices.selling_price_double_occupancy * 2;
      calculatedTotalAmount += calculatedRoomDetails.triple_rooms * selectedTourPrices.selling_price_triple_occupancy * 3;
      calculatedTotalAmount += calculatedRoomDetails.quad_rooms * selectedTourPrices.selling_price_quad_occupancy * 4;
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

    if (clientId) {
      // Update existing client
      const { error } = await supabase
        .from('clients')
        .update({ ...clientDataToSave, updated_at: new Date().toISOString() })
        .eq('id', clientId);

      if (error) {
        console.error('Error updating client:', error);
        toast.error('Error al actualizar el cliente.');
      } else {
        toast.success('Cliente actualizado con éxito.');
        navigate('/admin/clients'); // Redirect back to clients list
      }
    } else {
      // Insert new client
      const { error } = await supabase
        .from('clients')
        .insert(clientDataToSave);

      if (error) {
        console.error('Error creating client:', error);
        toast.error('Error al crear el cliente.');
      } else {
        toast.success('Cliente creado con éxito.');
        navigate('/admin/clients'); // Redirect back to clients list
      }
    }
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