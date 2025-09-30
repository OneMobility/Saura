"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import TourSeatMap from '@/components/TourSeatMap';

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
  age: number | null;
}

interface RoomDetails {
  double_rooms: number;
  triple_rooms: number;
  quad_rooms: number;
}

interface TourSellingPrices {
  double: number;
  triple: number;
  quad: number;
  child: number;
}

interface BusDetails {
  bus_id: string | null;
  bus_capacity: number;
  courtesies: number;
  seat_layout_json: SeatLayout | null;
}

interface ClientBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourImage: string;
  tourDescription: string;
  tourSellingPrices: TourSellingPrices;
  busDetails: BusDetails;
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
};

const ClientBookingForm: React.FC<ClientBookingFormProps> = ({
  isOpen,
  onClose,
  tourId,
  tourTitle,
  tourImage,
  tourDescription,
  tourSellingPrices,
  busDetails,
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    contractor_age: null as number | null,
    companions: [] as Companion[],
  });
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roomDetails, setRoomDetails] = useState<RoomDetails>({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effect to calculate total_amount and room_details
  useEffect(() => {
    const allPeopleAges = [formData.contractor_age, ...formData.companions.map(c => c.age)].filter((age): age is number => age !== null);
    const numAdults = allPeopleAges.filter(age => age >= 12).length;
    const numChildren = allPeopleAges.filter(age => age < 12).length;
    const totalPeople = numAdults + numChildren;

    const calculatedRoomDetails = allocateRoomsForPeople(numAdults); // Allocate rooms based on adults
    setRoomDetails(calculatedRoomDetails); // Update roomDetails state

    let calculatedTotalAmount = 0;
    // Cost for adults based on room distribution
    calculatedTotalAmount += calculatedRoomDetails.double_rooms * tourSellingPrices.double * 2;
    calculatedTotalAmount += calculatedRoomDetails.triple_rooms * tourSellingPrices.triple * 3;
    calculatedTotalAmount += calculatedRoomDetails.quad_rooms * tourSellingPrices.quad * 4;
    
    // Add cost for children
    calculatedTotalAmount += numChildren * tourSellingPrices.child;

    setTotalAmount(calculatedTotalAmount);
  }, [formData.contractor_age, formData.companions, tourSellingPrices]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (id: 'contractor_age', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: parseFloat(value) || null,
    }));
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
    setSelectedSeats(seats);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const totalPeople = 1 + formData.companions.length; // Contractor + companions

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Por favor, rellena los campos obligatorios (Nombre, Apellido, Email).');
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

    if (selectedSeats.length !== totalPeople) {
      toast.error(`Debes seleccionar ${totalPeople} asientos para este contrato.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const contract_number = uuidv4().substring(0, 8).toUpperCase(); // Generate unique contract number

      const clientDataToSave = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        contract_number: contract_number,
        tour_id: tourId,
        number_of_people: totalPeople,
        companions: formData.companions,
        total_amount: totalAmount,
        advance_payment: 0, // Initial booking has 0 advance payment
        total_paid: 0, // Initial booking has 0 paid
        status: 'pending', // Initial status
        contractor_age: formData.contractor_age,
        room_details: roomDetails,
        // user_id is null for public bookings unless user is logged in
      };

      const { data: newClientData, error: clientError } = await supabase
        .from('clients')
        .insert(clientDataToSave)
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        toast.error('Error al registrar tu reserva. Intenta de nuevo.');
        setIsSubmitting(false);
        return;
      }

      // Insert seat assignments
      const newSeatAssignments = selectedSeats.map(seatNumber => ({
        tour_id: tourId,
        seat_number: seatNumber,
        status: 'booked',
        client_id: newClientData.id,
      }));

      if (newSeatAssignments.length > 0) {
        const { error: seatsError } = await supabase
          .from('tour_seat_assignments')
          .insert(newSeatAssignments);

        if (seatsError) {
          console.error('Error inserting new seat assignments:', seatsError);
          toast.error('Error al asignar los asientos. Contacta a soporte.');
          // Consider rolling back client creation here if seats fail
          setIsSubmitting(false);
          return;
        }
      }

      toast.success(`¡Reserva exitosa! Tu número de contrato es: ${contract_number}.`);
      onClose(); // Close the dialog
      // Optionally, redirect to a confirmation page or show more details
    } catch (error) {
      console.error('Unexpected error during booking:', error);
      toast.error('Ocurrió un error inesperado al procesar tu reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roomDetailsDisplay = `${roomDetails.quad_rooms > 0 ? `${roomDetails.quad_rooms} Cuádruple(s), ` : ''}` +
                             `${roomDetails.triple_rooms > 0 ? `${roomDetails.triple_rooms} Triple(s), ` : ''}` +
                             `${roomDetails.double_rooms > 0 ? `${roomDetails.double_rooms} Doble(s)` : ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reservar Tour: {tourTitle}</DialogTitle>
          <DialogDescription>
            Rellena tus datos y selecciona tus asientos para completar la reserva.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {/* Tour Summary */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
            <img src={tourImage} alt={tourTitle} className="w-24 h-16 object-cover rounded-md" />
            <div>
              <h4 className="font-semibold text-lg">{tourTitle}</h4>
              <p className="text-sm text-gray-600 line-clamp-2">{tourDescription}</p>
            </div>
          </div>

          {/* Client Basic Info */}
          <h3 className="text-lg font-semibold mt-4">Tus Datos</h3>
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

          {/* Occupancy and Companions */}
          <h3 className="text-lg font-semibold mt-4">Acompañantes y Ocupación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Número Total de Personas</Label>
              <Input value={1 + formData.companions.length} readOnly className="bg-gray-100 cursor-not-allowed" />
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
          {busDetails.bus_capacity > 0 && (
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold mb-4">Selección de Asientos</h3>
              <TourSeatMap
                tourId={tourId}
                busCapacity={busDetails.bus_capacity}
                courtesies={busDetails.courtesies}
                seatLayoutJson={busDetails.seat_layout_json}
                onSeatsSelected={handleSeatsSelected}
                readOnly={false}
                adminMode={false}
              />
              {selectedSeats.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Asientos seleccionados: {selectedSeats.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Total Amount */}
          <div className="col-span-full mt-6 p-4 bg-rosa-mexicano text-white rounded-md flex justify-between items-center">
            <h3 className="text-xl font-bold">Monto Total a Pagar:</h3>
            <span className="text-2xl font-bold">${totalAmount.toFixed(2)}</span>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Confirmar Reserva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;