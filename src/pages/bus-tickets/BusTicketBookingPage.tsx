"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import BusSeatMap from '@/components/bus-tickets/BusSeatMap';
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

interface Passenger {
  id: string; // Unique ID for React keys
  isContractor: boolean;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  identification_number: string | null;
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
  scheduleId: string;
}

const BusTicketBookingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state as BookingPageProps;

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
    scheduleId,
  } = bookingData || {};

  const [passengersData, setPassengersData] = useState<Passenger[]>([]);
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
    if (!routeId || !routeName || !originName || !destinationName || !departureTime || adultPrice === undefined || childPrice === undefined || busCapacity === undefined || courtesies === undefined || !originId || !destinationId || !searchDate || !scheduleId) {
      console.error('BusTicketBookingPage: Datos de reserva incompletos detectados.');
      setPageError('Datos de reserva incompletos. Por favor, regresa y selecciona un horario.');
    }
  }, [routeId, routeName, originName, destinationName, departureTime, adultPrice, childPrice, busCapacity, courtesies, originId, destinationId, searchDate, scheduleId]);

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

  // Calculate total amount and adult/child counts based on passengersData
  useEffect(() => {
    let currentNumAdults = 0;
    let currentNumChildren = 0;

    passengersData.forEach(p => {
      if (p.age === null || p.age >= 12) {
        currentNumAdults++;
      } else {
        currentNumChildren++;
      }
    });

    setNumAdults(currentNumAdults);
    setNumChildren(currentNumChildren);

    const calculatedTotalAmount = (currentNumAdults * adultPrice) + (currentNumChildren * childPrice);
    setTotalAmount(calculatedTotalAmount);
  }, [passengersData, adultPrice, childPrice]);

  const handlePassengerChange = (passengerId: string, field: keyof Passenger, value: string | number | null) => {
    setPassengersData(prev =>
      prev.map(p => (p.id === passengerId ? { ...p, [field]: value } : p))
    );
  };

  const handleSeatsSelected = useCallback((seats: number[]) => {
    setSelectedSeats(seats);
  }, []);

  const handleContinueToDetails = () => {
    if (selectedSeats.length === 0) {
      toast.error('Por favor, selecciona al menos un asiento.');
      return;
    }

    // Initialize passengersData based on selectedSeats.length
    const newPassengersData: Passenger[] = selectedSeats.map((_, index) => ({
      id: uuidv4(),
      isContractor: index === 0,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      identification_number: null,
      age: null,
    }));
    setPassengersData(newPassengersData);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (passengersData.length === 0) {
      toast.error('No hay pasajeros registrados.');
      setIsSubmitting(false);
      return;
    }

    // Validate all passenger data
    for (const p of passengersData) {
      if (!p.first_name || !p.last_name) {
        toast.error(`Por favor, rellena el nombre y apellido para todos los pasajeros.`);
        setIsSubmitting(false);
        return;
      }
      if (p.isContractor && (!p.email || !p.phone)) {
        toast.error('Por favor, rellena el email y teléfono del contratante.');
        setIsSubmitting(false);
        return;
      }
      if (p.age !== null && (p.age < 0 || p.age > 120)) {
        toast.error(`La edad del pasajero ${p.first_name} ${p.last_name} debe ser un valor razonable.`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const contract_number = uuidv4().substring(0, 8).toUpperCase();

      const contractor = passengersData[0];
      const companions = passengersData.slice(1).map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        age: p.age,
        identification_number: p.identification_number,
      }));

      const clientDataToSave = {
        first_name: contractor.first_name,
        last_name: contractor.last_name,
        email: contractor.email,
        phone: contractor.phone || null,
        address: null, // Not collected in this form
        identification_number: contractor.identification_number || null,
        contract_number: contract_number,
        tour_id: null, // Set tour_id to null for bus tickets
        bus_route_id: routeId, // NEW: Use bus_route_id for bus tickets
        number_of_people: passengersData.length,
        companions: companions,
        extra_services: [], // Not collected in this form
        total_amount: totalAmount,
        advance_payment: 0,
        total_paid: 0,
        status: 'pending',
        contractor_age: contractor.age,
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

      const newBusSeatAssignments = selectedSeats.map(seatNumber => ({
        schedule_id: scheduleId,
        seat_number: seatNumber,
        status: 'booked',
        client_id: newClientData.id,
      }));

      if (newBusSeatAssignments.length > 0) {
        const { error: busSeatsError } = await supabase
          .from('bus_seat_assignments')
          .insert(newBusSeatAssignments);

        if (busSeatsError) {
          console.error('Error inserting new bus seat assignments:', busSeatsError);
          toast.error('Error al asignar los asientos del autobús. Contacta a soporte.');
          setIsSubmitting(false);
          return;
        }
      }

      toast.success(`¡Reserva de boleto exitosa! Tu número de contrato es: ${contract_number}.`);
      navigate(`/bus-tickets/confirmation/${contract_number}`);
    } catch (error) {
      console.error('Unexpected error during booking:', error);
      toast.error('Ocurrió un error inesperado al procesar tu reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageError) {
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
                {busId && busCapacity > 0 && scheduleId ? (
                  <div className="col-span-full mt-6">
                    <h3 className="text-lg font-semibold mb-4">Paso 1: Selección de Asientos</h3>
                    {loadingBusLayout ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-bus-primary" />
                        <p className="ml-4 text-muted-foreground">Cargando mapa de asientos...</p>
                      </div>
                    ) : (
                      <BusSeatMap
                        busId={busId}
                        busCapacity={busCapacity}
                        scheduleId={scheduleId}
                        seatLayoutJson={busLayout}
                        onSeatsSelected={handleSeatsSelected}
                        readOnly={false}
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
                    <p>No hay un autobús asignado o no tiene capacidad para esta ruta/horario.</p>
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
                <h3 className="text-lg font-semibold mt-4">Paso 2: Datos de los Pasajeros</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Por favor, rellena los datos para cada uno de los {selectedSeats.length} asientos seleccionados.
                </p>

                {passengersData.map((passenger, index) => (
                  <div key={passenger.id} className="border p-4 rounded-md bg-gray-50 space-y-4">
                    <h4 className="font-semibold text-lg text-bus-primary">
                      {passenger.isContractor ? 'Datos del Contratante' : `Datos del Pasajero ${index + 1}`}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`first_name-${passenger.id}`}>Nombre</Label>
                        <Input
                          id={`first_name-${passenger.id}`}
                          value={passenger.first_name}
                          onChange={(e) => handlePassengerChange(passenger.id, 'first_name', e.target.value)}
                          required
                          className="focus-visible:ring-bus-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`last_name-${passenger.id}`}>Apellido</Label>
                        <Input
                          id={`last_name-${passenger.id}`}
                          value={passenger.last_name}
                          onChange={(e) => handlePassengerChange(passenger.id, 'last_name', e.target.value)}
                          required
                          className="focus-visible:ring-bus-primary"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`age-${passenger.id}`}>Edad (Opcional)</Label>
                        <Input
                          id={`age-${passenger.id}`}
                          type="text"
                          pattern="[0-9]*"
                          value={passenger.age || ''}
                          onChange={(e) => handlePassengerChange(passenger.id, 'age', parseFloat(e.target.value) || null)}
                          className="focus-visible:ring-bus-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`identification_number-${passenger.id}`}>Número de Identificación (Opcional)</Label>
                        <Input
                          id={`identification_number-${passenger.id}`}
                          value={passenger.identification_number || ''}
                          onChange={(e) => handlePassengerChange(passenger.id, 'identification_number', e.target.value)}
                          placeholder="Ej: INE, Pasaporte, etc."
                          className="focus-visible:ring-bus-primary"
                        />
                      </div>
                    </div>
                    {passenger.isContractor && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`email-${passenger.id}`}>Email</Label>
                          <Input
                            id={`email-${passenger.id}`}
                            type="email"
                            value={passenger.email}
                            onChange={(e) => handlePassengerChange(passenger.id, 'email', e.target.value)}
                            required
                            className="focus-visible:ring-bus-primary"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`phone-${passenger.id}`}>Teléfono</Label>
                          <Input
                            id={`phone-${passenger.id}`}
                            value={passenger.phone}
                            onChange={(e) => handlePassengerChange(passenger.id, 'phone', e.target.value)}
                            required
                            className="focus-visible:ring-bus-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

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