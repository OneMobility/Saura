"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import TourSeatMap from '@/components/TourSeatMap';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { useLocation, useNavigate, Link } from 'react-router-dom';

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

interface BookingPageProps {
  routeId: string;
  routeName: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  adultPrice: number;
  childPrice: number;
  busId: string | null;
  busCapacity: number;
  courtesies: number;
  originId: string;
  destinationId: string;
  searchDate: string;
}

const BusTicketBookingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state as BookingPageProps;

  console.log('BusTicketBookingPage: location.state', location.state);
  console.log('BusTicketBookingPage: bookingData', bookingData);

  const {
    routeId,
    routeName,
    originName,
    destinationName,
    departureTime,
    adultPrice,
    childPrice,
    busId,
    busCapacity,
    courtesies,
    originId,
    destinationId,
    searchDate,
  } = bookingData || {};

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    identification_number: null as string | null,
    contractor_age: null as number | null,
    companions: [] as Companion[],
  });
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busLayout, setBusLayout] = useState<SeatLayout | null>(null);
  const [loadingBusLayout, setLoadingBusLayout] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Seat Selection, 2: Passenger Details

  const [numAdults, setNumAdults] = useState(0);
  const [numChildren, setNumChildren] = useState(0);

  // Validate bookingData on mount
  useEffect(() => {
    if (!routeId || !routeName || !originName || !destinationName || !departureTime || adultPrice === undefined || childPrice === undefined || busCapacity === undefined || courtesies === undefined || !originId || !destinationId || !searchDate) {
      console.error('BusTicketBookingPage: Datos de reserva incompletos detectados.');
      setPageError('Datos de reserva incompletos. Por favor, regresa y selecciona un horario.');
    }
  }, [routeId, routeName, originName, destinationName, departureTime, adultPrice, childPrice, busCapacity, courtesies, originId, destinationId, searchDate]);

  // Fetch bus layout when component mounts or busId changes
  useEffect(() => {
    const fetchBusLayout = async () => {
      if (busId) {
        setLoadingBusLayout(true);
        const { data, error } = await supabase
          .from('buses')
          .select('seat_layout_json')
          .eq('id', busId)
          .single();

        if (error) {
          console.error('Error fetching bus layout:', error);
          toast.error('Error al cargar la disposición de asientos del autobús.');
          setBusLayout(null);
        } else if (data) {
          setBusLayout(data.seat_layout_json);
        }
        setLoadingBusLayout(false);
      } else {
        setBusLayout(null);
        setLoadingBusLayout(false);
      }
    };
    if (busId) {
      fetchBusLayout();
    } else {
      setLoadingBusLayout(false);
    }
  }, [busId]);

  useEffect(() => {
    let currentNumAdults = 0;
    let currentNumChildren = 0;

    // Contractor is an adult by default if age is not provided or >= 12
    if (formData.contractor_age === null || formData.contractor_age >= 12) {
      currentNumAdults++;
    } else {
      currentNumChildren++;
    }

    formData.companions.forEach(c => {
      if (c.age === null || c.age >= 12) {
        currentNumAdults++;
      } else {
        currentNumChildren++;
      }
    });

    setNumAdults(currentNumAdults);
    setNumChildren(currentNumChildren);

    const calculatedTotalAmount = (currentNumAdults * adultPrice) + (currentNumChildren * childPrice);
    setTotalAmount(calculatedTotalAmount);
  }, [formData.contractor_age, formData.companions, adultPrice, childPrice]);

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

  const handleContinueToDetails = () => {
    const totalPeople = 1 + formData.companions.length;
    if (selectedSeats.length !== totalPeople) {
      toast.error(`Debes seleccionar ${totalPeople} asientos para este contrato.`);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const totalPeople = 1 + formData.companions.length;

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

    // Seat validation already done in step 1, but a final check doesn't hurt
    if (selectedSeats.length !== totalPeople) {
      toast.error(`Debes seleccionar ${totalPeople} asientos para este contrato.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const contract_number = uuidv4().substring(0, 8).toUpperCase();

      const clientDataToSave = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        address: null, // Not collected in this form
        identification_number: formData.identification_number || null,
        contract_number: contract_number,
        tour_id: routeId, // Use routeId as tour_id for bus tickets
        number_of_people: totalPeople,
        companions: formData.companions,
        extra_services: [], // Not collected in this form
        total_amount: totalAmount,
        advance_payment: 0,
        total_paid: 0,
        status: 'pending',
        contractor_age: formData.contractor_age,
        room_details: { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 }, // Not applicable for bus tickets
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

      const newSeatAssignments = selectedSeats.map(seatNumber => ({
        tour_id: routeId, // Use routeId as tour_id for bus tickets
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
          setIsSubmitting(false);
          return;
        }
      }

      toast.success(`¡Reserva de boleto exitosa! Tu número de contrato es: ${contract_number}.`);
      navigate(`/bus-tickets/confirmation/${contract_number}`); // Redirect to confirmation page
    } catch (error) {
      console.error('Unexpected error during booking:', error);
      toast.error('Ocurrió un error inesperado al procesar tu reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageError) {
    console.log('BusTicketBookingPage: Rendering pageError block.');
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-red-600">Error de Reserva</h1>
            <p className="text-xl mb-6">{pageError}</p>
            <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
              <Link to="/bus-tickets/search-results" state={{ originId: bookingData?.originId, destinationId: bookingData?.destinationId, searchDate: bookingData?.searchDate }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Resultados
              </Link>
            </Button>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (!bookingData) {
    console.log('BusTicketBookingPage: Rendering !bookingData block.');
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-red-600">Error</h1>
            <p className="text-xl mb-6">No se encontraron datos de reserva. Por favor, inicia una nueva búsqueda.</p>
            <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
              <Link to="/bus-tickets">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ir a la Página Principal de Boletos
              </Link>
            </Button>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  console.log('BusTicketBookingPage: Rendering main form.');
  console.log('BusTicketBookingPage: busId:', busId);
  console.log('BusTicketBookingPage: busCapacity:', busCapacity);
  console.log('BusTicketBookingPage: courtesies:', courtesies);
  console.log('BusTicketBookingPage: busLayout:', busLayout);
  console.log('BusTicketBookingPage: loadingBusLayout:', loadingBusLayout);

  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="mb-8">
            <Button asChild variant="outline" className="bg-white text-bus-primary hover:bg-gray-100 border-bus-primary hover:border-bus-primary/90">
              <Link to="/bus-tickets/search-results" state={{ originId: bookingData?.originId, destinationId: bookingData?.destinationId, searchDate: bookingData?.searchDate }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Resultados
              </Link>
            </Button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-bus-primary">
            Confirmar Reserva de Boletos
          </h1>
          <p className="text-lg text-center mb-10">
            Rellena tus datos y selecciona tus asientos para completar la reserva.
          </p>

          <div className="bg-card p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
            {/* Trip Summary - Always visible */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md mb-6">
              <div>
                <h4 className="font-semibold text-lg">{routeName}</h4>
                <p className="text-muted-foreground text-sm">
                  {originName} a {destinationName} - Salida: {departureTime}
                </p>
              </div>
            </div>

            {step === 1 && (
              <>
                {/* Seat Selection */}
                {busId && busCapacity > 0 ? (
                  <div className="col-span-full mt-6">
                    <h3 className="text-lg font-semibold mb-4">Paso 1: Selección de Asientos</h3>
                    {loadingBusLayout ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-bus-primary" />
                        <p className="ml-4 text-muted-foreground">Cargando mapa de asientos...</p>
                      </div>
                    ) : (
                      <TourSeatMap
                        tourId={routeId} // Use routeId as tourId for seat assignments
                        busCapacity={busCapacity}
                        courtesies={courtesies}
                        seatLayoutJson={busLayout}
                        onSeatsSelected={handleSeatsSelected}
                        readOnly={false}
                        adminMode={false}
                      />
                    )}
                    {selectedSeats.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Asientos seleccionados: {selectedSeats.join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="col-span-full mt-6 p-4 border rounded-lg bg-muted text-center text-muted-foreground">
                    <p>No hay un autobús asignado o no tiene capacidad para esta ruta.</p>
                    <p className="text-sm mt-2">Por favor, verifica la configuración de la ruta y el autobús en el panel de administración.</p>
                  </div>
                )}
                <div className="flex justify-end mt-6">
                  <Button onClick={handleContinueToDetails} disabled={loadingBusLayout || selectedSeats.length === 0} className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
                    Continuar a Datos del Pasajero
                  </Button>
                </div>
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                <h3 className="text-lg font-semibold mt-4">Paso 2: Tus Datos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input id="first_name" value={formData.first_name} onChange={handleChange} required className="focus-visible:ring-bus-primary" />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input id="last_name" value={formData.last_name} onChange={handleChange} required className="focus-visible:ring-bus-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleChange} required className="focus-visible:ring-bus-primary" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono (Opcional)</Label>
                    <Input id="phone" value={formData.phone} onChange={handleChange} className="focus-visible:ring-bus-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contractor_age">Edad del Contratante (Opcional)</Label>
                    <Input 
                      id="contractor_age" 
                      type="text" // Changed to text
                      pattern="[0-9]*" // Pattern for integers
                      value={formData.contractor_age || ''} 
                      onChange={(e) => handleNumberChange('contractor_age', e.target.value)} 
                      className="focus-visible:ring-bus-primary" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="identification_number">Número de Identificación (Opcional)</Label>
                    <Input id="identification_number" value={formData.identification_number || ''} onChange={handleChange} placeholder="Ej: INE, Pasaporte, etc." className="focus-visible:ring-bus-primary" />
                  </div>
                </div>

                {/* Companions */}
                <h3 className="text-lg font-semibold mt-4">Acompañantes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Número Total de Personas</Label>
                    <Input value={1 + formData.companions.length} readOnly className="bg-gray-100 cursor-not-allowed" />
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
                        className="w-full md:w-2/3 focus-visible:ring-bus-primary"
                      />
                      <Input
                        type="text" // Changed to text
                        pattern="[0-9]*" // Pattern for integers
                        value={companion.age || ''}
                        onChange={(e) => handleCompanionChange(companion.id, 'age', e.target.value)}
                        placeholder="Edad"
                        className="w-full md:w-1/3 focus-visible:ring-bus-primary"
                      />
                      <Button type="button" variant="destructive" size="icon" onClick={() => removeCompanion(companion.id)}>
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addCompanion} className="text-bus-primary border-bus-primary hover:bg-bus-primary/10">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Acompañante
                  </Button>
                </div>

                {/* Price Breakdown */}
                <div className="col-span-full mt-6 p-4 bg-gray-100 rounded-md">
                  <h4 className="font-semibold text-lg mb-2">Desglose del Cálculo:</h4>
                  <p className="text-sm text-muted-foreground">Adultos: <span className="font-medium">{numAdults}</span> x ${adultPrice.toFixed(2)} = <span className="font-medium">${(numAdults * adultPrice).toFixed(2)}</span></p>
                  <p className="text-sm text-muted-foreground">Niños (-12 años): <span className="font-medium">{numChildren}</span> x ${childPrice.toFixed(2)} = <span className="font-medium">${(numChildren * childPrice).toFixed(2)}</span></p>
                  <p className="font-bold mt-2 text-bus-foreground">Total Calculado: <span className="text-xl">${totalAmount.toFixed(2)}</span></p>
                </div>

                {/* Total Amount */}
                <div className="col-span-full mt-6 p-4 bg-bus-primary text-bus-primary-foreground rounded-md flex justify-between items-center">
                  <h3 className="text-xl font-bold">Monto Total a Pagar:</h3>
                  <span className="text-2xl font-bold">${totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="bg-white text-bus-primary hover:bg-gray-100 border-bus-primary hover:border-bus-primary/90">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Asientos
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Confirmar Reserva
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default BusTicketBookingPage;