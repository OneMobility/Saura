"use client";

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react'; // Import Loader2
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { format } from 'date-fns'; // Import format for dates
import TourSeatMap from '@/components/TourSeatMap'; // Import the new TourSeatMap component

// Hotel interface now represents a "hotel quote" from the 'hotels' table
interface HotelQuote {
  id: string;
  name: string; // Hotel name
  location: string;
  quoted_date: string | null;
  num_nights_quoted: number;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  num_double_rooms: number; // NEW
  num_triple_rooms: number; // NEW
  num_quad_rooms: number; // NEW
  num_courtesy_rooms: number; // NEW: Added courtesy rooms
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
}

// TourHotelDetail now references a hotel quote ID
interface TourHotelDetail {
  id: string; // Unique ID for this entry in the tour's hotel_details array
  hotel_quote_id: string; // References an ID from the 'hotels' table (which are now quotes)
}

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty';
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

interface Bus {
  id: string;
  name: string;
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  seat_layout_json: SeatLayout | null; // Incluir el layout de asientos
  advance_payment: number; // NEW
  total_paid: number; // NEW
}

interface Tour {
  id: string;
  image_url: string;
  title: string;
  description: string;
  full_content: string | null;
  duration: string;
  includes: string[] | null;
  itinerary: { day: number; activity: string }[] | null;
  selling_price_double_occupancy: number; // NEW
  selling_price_triple_occupancy: number; // NEW
  selling_price_quad_occupancy: number; // NEW
  selling_price_child: number; // NEW: Price for children under 12
  cost_per_paying_person: number | null;
  bus_id: string | null; // Added bus_id
  bus_capacity: number; // Added bus_capacity
  bus_cost: number; // Added bus_cost
  courtesies: number;
  hotel_details: TourHotelDetail[] | null; // Updated type
  provider_details: { name: string; service: string; cost: number }[] | null;
  total_base_cost: number | null; // Added total_base_cost
  paying_clients_count: number | null; // Added paying_clients_count
}

const TourDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotelQuotesMap, setHotelQuotesMap] = useState<Map<string, HotelQuote>>(new Map());
  const [selectedSeatsForBooking, setSelectedSeatsForBooking] = useState<number[]>([]);
  const [busLayout, setBusLayout] = useState<SeatLayout | null>(null); // NEW: State for bus layout

  // NEW: Financial states
  const [totalSoldSeats, setTotalSoldSeats] = useState(0);
  const [totalRemainingPayments, setTotalRemainingPayments] = useState(0);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null); // To store selected bus details

  useEffect(() => {
    const fetchTourDetailsAndHotelQuotes = async () => {
      setLoading(true);
      setError(null);

      // Fetch all active hotel quotes first
      const { data: hotelQuotesData, error: hotelQuotesError } = await supabase
        .from('hotels')
        .select('*')
        .eq('is_active', true);

      if (hotelQuotesError) {
        console.error('Error fetching hotel quotes:', hotelQuotesError);
        setError('Error al cargar las cotizaciones de hoteles.');
        setLoading(false);
        return;
      }

      const quotesMap = new Map<string, HotelQuote>();
      hotelQuotesData?.forEach(quote => quotesMap.set(quote.id, {
        ...quote,
        num_double_rooms: quote.num_double_rooms || 0,
        num_triple_rooms: quote.num_triple_rooms || 0,
        num_quad_rooms: quote.num_quad_rooms || 0,
        num_courtesy_rooms: quote.num_courtesy_rooms || 0, // Set new field
      }));
      setHotelQuotesMap(quotesMap);

      // Fetch all buses
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('*');

      if (busesError) {
        console.error('Error fetching buses:', busesError);
        setError('Error al cargar la información de autobuses.');
        setLoading(false);
        return;
      }
      const busesMap = new Map<string, Bus>();
      busesData?.forEach(bus => busesMap.set(bus.id, bus));


      // Then fetch tour details and associated bus layout
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select('*') // Select all tour data
        .eq('slug', id) // Fetch by slug
        .single();

      if (tourError) {
        console.error('Error fetching tour details:', tourError);
        setError('No se pudo cargar los detalles del tour.');
        setTour(null);
      } else if (tourData) {
        setTour({
          ...tourData,
          includes: tourData.includes || [],
          itinerary: tourData.itinerary || [],
          hotel_details: tourData.hotel_details || [],
          provider_details: tourData.provider_details || [],
          selling_price_double_occupancy: tourData.selling_price_double_occupancy || 0,
          selling_price_triple_occupancy: tourData.selling_price_triple_occupancy || 0,
          selling_price_quad_occupancy: tourData.selling_price_quad_occupancy || 0,
          selling_price_child: tourData.selling_price_child || 0, // Set new field
        });

        // Set the bus layout from the fetched data
        let currentBusForCalculation: Bus | null = null; // Use a local variable for immediate calculations
        if (tourData.bus_id) {
          const bus = busesMap.get(tourData.bus_id);
          currentBusForCalculation = bus || null;
          setSelectedBus(prevBus => {
            // Only update if the bus ID has actually changed
            if (prevBus?.id === currentBusForCalculation?.id) {
              return prevBus;
            }
            return currentBusForCalculation;
          });
          setBusLayout(currentBusForCalculation?.seat_layout_json || null);
        } else {
          setSelectedBus(null);
          setBusLayout(null);
        }

        // NEW: Fetch total sold seats
        const { count, error: seatsError } = await supabase
          .from('tour_seat_assignments')
          .select('id', { count: 'exact' })
          .eq('tour_id', tourData.id)
          .eq('status', 'booked');

        if (seatsError) {
          console.error('Error fetching sold seats:', seatsError);
          setTotalSoldSeats(0);
        } else {
          setTotalSoldSeats(count || 0);
        }

        // NEW: Calculate total remaining payments
        let currentTotalRemainingPayments = 0;

        // Bus remaining payment
        if (currentBusForCalculation) { // Use the local currentBusForCalculation variable
          currentTotalRemainingPayments += (currentBusForCalculation.rental_cost || 0) - (currentBusForCalculation.total_paid || 0);
        }

        // Hotel remaining payments
        tourData.hotel_details?.forEach((tourHotelDetail: TourHotelDetail) => {
          const hotelQuote = quotesMap.get(tourHotelDetail.hotel_quote_id);
          if (hotelQuote) {
            const totalCostDoubleRooms = (hotelQuote.num_double_rooms || 0) * hotelQuote.cost_per_night_double * hotelQuote.num_nights_quoted;
            const totalCostTripleRooms = (hotelQuote.num_triple_rooms || 0) * hotelQuote.cost_per_night_triple * hotelQuote.num_nights_quoted;
            const totalCostQuadRooms = (hotelQuote.num_quad_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
            const totalContractedRoomsCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;
            
            // Subtract the value of courtesy rooms from the total contracted cost
            // Courtesy rooms are always valued at the quad occupancy rate
            const costOfCourtesyRooms = (hotelQuote.num_courtesy_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;

            currentTotalRemainingPayments += (totalContractedRoomsCost - costOfCourtesyRooms) - (hotelQuote.total_paid || 0);
          }
        });
        setTotalRemainingPayments(currentTotalRemainingPayments);

      } else {
        setError('Tour no encontrado.');
        setTour(null);
      }
      setLoading(false);
    };

    if (id) {
      fetchTourDetailsAndHotelQuotes();
    }
  }, [id]); // Removed selectedBus from dependencies

  const handleSeatsSelection = (seats: number[]) => {
    setSelectedSeatsForBooking(seats);
  };

  const handleBookSeats = () => {
    if (selectedSeatsForBooking.length === 0) {
      toast.error('Por favor, selecciona al menos un asiento para reservar.');
      return;
    }
    // Here you would implement the actual booking logic
    // For now, we'll just show a success message
    toast.success(`Has seleccionado los asientos: ${selectedSeatsForBooking.join(', ')}. ¡Procesando reserva!`);
    console.log('Booking seats:', selectedSeatsForBooking, 'for tour:', tour?.title);
    // In a real application, this would involve:
    // 1. Checking seat availability again on the server
    // 2. Creating a booking record
    // 3. Updating seat statuses in 'tour_seat_assignments'
    // 4. Handling payment
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="mt-4 text-xl">Cargando detalles del tour...</p>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
        <h1 className="text-4xl font-bold mb-4">Tour no encontrado</h1>
        <p className="text-xl mb-6">{error || 'Lo sentimos, el tour que buscas no existe.'}</p>
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to="/tours">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Tours
          </Link>
        </Button>
      </div>
    );
  }

  // Calculate average selling price for potential revenue calculations
  const averageSellingPrice = (tour.selling_price_double_occupancy + tour.selling_price_triple_occupancy + tour.selling_price_quad_occupancy) / 3;
  const totalPotentialRevenue = (tour.paying_clients_count || 0) * averageSellingPrice;
  const totalSoldRevenue = totalSoldSeats * averageSellingPrice;
  const totalToSellRevenue = totalPotentialRevenue - totalSoldRevenue;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <Button asChild variant="outline" className="bg-white text-rosa-mexicano hover:bg-gray-100 border-rosa-mexicano hover:border-rosa-mexicano/90">
            <Link to="/tours">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Tours
            </Link>
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="relative h-64 md:h-96 w-full">
            <img
              src={tour.image_url}
              alt={tour.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-6">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                {tour.title}
              </h1>
            </div>
          </div>

          <div className="p-6 md:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Descripción del Tour</h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                {tour.description}
              </p>

              {tour.full_content && (
                <div className="prose prose-lg max-w-none mb-6" dangerouslySetInnerHTML={{ __html: tour.full_content }} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Detalles Clave</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li><span className="font-medium">Precio por persona (Doble):</span> ${tour.selling_price_double_occupancy.toFixed(2)}</li>
                    <li><span className="font-medium">Precio por persona (Triple):</span> ${tour.selling_price_triple_occupancy.toFixed(2)}</li>
                    <li><span className="font-medium">Precio por persona (Cuádruple):</span> ${tour.selling_price_quad_occupancy.toFixed(2)}</li>
                    <li><span className="font-medium">Precio por Menor (-12 años):</span> ${tour.selling_price_child.toFixed(2)}</li>
                    <li><span className="font-medium">Duración:</span> {tour.duration}</li>
                    <li><span className="font-medium">Capacidad del autobús:</span> {tour.bus_capacity} personas</li>
                    <li><span className="font-medium">Cortesías (Asientos Bus):</span> {tour.courtesies}</li>
                    <li><span className="font-medium">Costo por persona pagante:</span> ${tour.cost_per_paying_person?.toFixed(2) || 'N/A'}</li>
                  </ul>
                </div>
                {tour.includes && tour.includes.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Incluye</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      {tour.includes.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {tour.itinerary && tour.itinerary.length > 0 && (
                <>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Itinerario</h3>
                  <ol className="list-decimal list-inside space-y-3 text-gray-700">
                    {tour.itinerary.map((item) => (
                      <li key={item.day}>
                        <span className="font-medium">Día {item.day}:</span> {item.activity}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {tour.hotel_details && tour.hotel_details.length > 0 && (
                <>
                  <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">Hoteles Asociados</h3>
                  <div className="space-y-4">
                    {tour.hotel_details.map((tourHotelDetail) => {
                      const hotelQuote = hotelQuotesMap.get(tourHotelDetail.hotel_quote_id);
                      if (!hotelQuote) return null; // Skip if quote not found

                      const totalCostDoubleRooms = (hotelQuote.num_double_rooms || 0) * hotelQuote.cost_per_night_double * hotelQuote.num_nights_quoted;
                      const totalCostTripleRooms = (hotelQuote.num_triple_rooms || 0) * hotelQuote.cost_per_night_triple * hotelQuote.num_nights_quoted;
                      const totalCostQuadRooms = (hotelQuote.num_quad_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;
                      const totalContractedRoomsCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;
                      
                      // Subtract the value of courtesy rooms from the total contracted cost
                      // Courtesy rooms are always valued at the quad occupancy rate
                      const costOfCourtesyRooms = (hotelQuote.num_courtesy_rooms || 0) * hotelQuote.cost_per_night_quad * hotelQuote.num_nights_quoted;

                      const totalHotelBookingCostNet = totalContractedRoomsCost - costOfCourtesyRooms;

                      const totalHotelCapacity = 
                        ((hotelQuote.num_double_rooms || 0) * hotelQuote.capacity_double) +
                        ((hotelQuote.num_triple_rooms || 0) * hotelQuote.capacity_triple) +
                        ((hotelQuote.num_quad_rooms || 0) * hotelQuote.capacity_quad);

                      const remainingPayment = totalHotelBookingCostNet - (hotelQuote.total_paid || 0);

                      return (
                        <div key={tourHotelDetail.id} className="border p-4 rounded-md bg-gray-50">
                          <p className="font-semibold text-lg mb-1">
                            {hotelQuote.name} ({hotelQuote.location})
                          </p>
                          <ul className="text-gray-700 text-sm space-y-1">
                            <li><span className="font-medium">Fecha Cotizada:</span> {hotelQuote.quoted_date ? format(new Date(hotelQuote.quoted_date), 'PPP') : 'N/A'}</li>
                            <li><span className="font-medium">Noches Cotizadas:</span> {hotelQuote.num_nights_quoted}</li>
                            <li><span className="font-medium">Habitaciones Dobles Contratadas:</span> {hotelQuote.num_double_rooms}</li>
                            <li><span className="font-medium">Habitaciones Triples Contratadas:</span> {hotelQuote.num_triple_rooms}</li>
                            <li><span className="font-medium">Habitaciones Cuádruples Contratadas:</span> {hotelQuote.num_quad_rooms}</li>
                            <li><span className="font-medium">Habitaciones de Cortesía:</span> {hotelQuote.num_courtesy_rooms}</li>
                            <li><span className="font-medium">Costo total de la cotización (Neto):</span> ${totalHotelBookingCostNet.toFixed(2)}</li>
                            <li><span className="font-medium">Anticipo al hotel:</span> ${hotelQuote.advance_payment.toFixed(2)}</li>
                            <li><span className="font-medium">Total pagado al hotel:</span> ${hotelQuote.total_paid.toFixed(2)}</li>
                            <li><span className="font-medium">Pago restante al hotel:</span> ${remainingPayment.toFixed(2)}</li>
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {tour.provider_details && tour.provider_details.length > 0 && (
                <>
                  <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">Proveedores de Servicios</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {tour.provider_details.map((provider, index) => (
                      <li key={index}>{provider.name} - {provider.service}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="lg:col-span-1 bg-gray-50 p-6 rounded-lg shadow-inner">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">¡Reserva Ahora!</h3>
              <p className="text-gray-700 mb-6">
                ¿Listo para tu próxima aventura? Contáctanos para personalizar tu viaje o reservar este tour.
              </p>
              {tour.bus_capacity > 0 && (
                <div className="mb-6">
                  <TourSeatMap
                    tourId={tour.id}
                    busCapacity={tour.bus_capacity}
                    courtesies={tour.courtesies}
                    seatLayoutJson={busLayout} // Pass the fetched bus layout
                    readOnly={false} // Allow public users to select seats
                    adminMode={false}
                  />
                  {selectedSeatsForBooking.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Asientos seleccionados: {selectedSeatsForBooking.join(', ')}
                    </p>
                  )}
                </div>
              )}
              <Button
                className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-3 text-lg"
                onClick={handleBookSeats}
                disabled={selectedSeatsForBooking.length === 0}
              >
                Reservar Tour {selectedSeatsForBooking.length > 0 ? `(${selectedSeatsForBooking.length} asientos)` : ''}
              </Button>
              <Button variant="outline" className="w-full mt-4 bg-white text-rosa-mexicano hover:bg-gray-100 border-rosa-mexicano hover:border-rosa-mexicano/90">
                Contactar Asesor
              </Button>

              {/* NEW: Financial Summary for Public View */}
              <div className="mt-8 p-4 bg-white rounded-md shadow-sm border border-gray-200">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Resumen Financiero del Tour</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><span className="font-medium">Costo Base Total:</span> ${tour.total_base_cost?.toFixed(2) || '0.00'}</li>
                  <li><span className="font-medium">Clientes Pagantes Potenciales:</span> {tour.paying_clients_count || 0}</li>
                  <li><span className="font-medium">Costo por Persona Pagante:</span> ${tour.cost_per_paying_person?.toFixed(2) || '0.00'}</li>
                  <li><span className="font-medium">Asientos Vendidos:</span> {totalSoldSeats}</li>
                  <li><span className="font-medium">Total Vendido (Ingresos):</span> ${totalSoldRevenue.toFixed(2)}</li>
                  <li><span className="font-medium">Total por Vender (Ingresos Potenciales):</span> ${totalToSellRevenue.toFixed(2)}</li>
                  <li><span className="font-medium">Total por Pagar en Costos (Pendiente):</span> ${totalRemainingPayments.toFixed(2)}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TourDetailsPage;