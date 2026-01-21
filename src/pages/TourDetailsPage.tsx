"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import TourSeatMap from '@/components/TourSeatMap';
import { Dialog, DialogTrigger } from '@/components/ui/dialog'; // Import Dialog and DialogTrigger
import ClientBookingForm from '@/components/ClientBookingForm'; // Import the new ClientBookingForm
import { TourProviderService, SeatLayout } from '@/types/shared'; // NEW: Import shared type and SeatLayout

interface Bus {
  id: string;
  name: string;
  license_plate: string;
  total_capacity: number;
  seat_layout_json: SeatLayout | null; // Incluir el layout de asientos
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
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
  selling_price_child: number;
  bus_id: string | null;
  bus_capacity: number;
  courtesies: number; // Renamed to Coordinadores
  provider_details: TourProviderService[]; // NEW: Add provider_details
}

const TourDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busLayout, setBusLayout] = useState<SeatLayout | null>(null);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false); // State to control booking form dialog
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]); // NEW: State for selected seats

  const handleSeatsSelected = useCallback((seats: number[]) => {
    setSelectedSeats(seats);
  }, []);

  useEffect(() => {
    const fetchTourDetails = async () => {
      setLoading(true);
      setError(null);

      // Fetch all buses to get their layouts
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('id, seat_layout_json');

      if (busesError) {
        console.error('Error fetching buses:', busesError);
        setError('Error al cargar la información de autobuses.');
        setLoading(false);
        return;
      }
      const busesMap = new Map<string, Bus>();
      busesData?.forEach(bus => busesMap.set(bus.id, bus as Bus)); // Cast to Bus interface

      // Then fetch tour details
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select(`
          id,
          image_url,
          title,
          description,
          full_content,
          duration,
          includes,
          itinerary,
          selling_price_double_occupancy,
          selling_price_triple_occupancy,
          selling_price_quad_occupancy,
          selling_price_child,
          bus_id,
          bus_capacity,
          courtesies,
          provider_details
        `) // Select only public-facing fields
        .eq('slug', id)
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
          selling_price_double_occupancy: tourData.selling_price_double_occupancy || 0,
          selling_price_triple_occupancy: tourData.selling_price_triple_occupancy || 0,
          selling_price_quad_occupancy: tourData.selling_price_quad_occupancy || 0,
          selling_price_child: tourData.selling_price_child || 0,
          provider_details: tourData.provider_details || [], // Ensure provider_details is an array
        });

        // Set the bus layout from the fetched data
        if (tourData.bus_id) {
          const bus = busesMap.get(tourData.bus_id);
          const layout = bus?.seat_layout_json || null;
          setBusLayout(layout);
          console.log(`[TourDetailsPage] Bus ID: ${tourData.bus_id}, Layout Loaded: ${layout ? 'Sí' : 'No'}, Layout Data:`, layout);
        } else {
          setBusLayout(null);
          console.log(`[TourDetailsPage] No Bus ID assigned to tour.`);
        }
      } else {
        setError('Tour no encontrado.');
        setTour(null);
      }
      setLoading(false);
    };

    if (id) {
      fetchTourDetails();
    }
  }, [id]);

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
                    <li><span className="font-medium">Coordinadores (Asientos Bus):</span> {tour.courtesies}</li>
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

              {/* NEW: Display Tour Provider Services */}
              {tour.provider_details && tour.provider_details.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Servicios Adicionales Disponibles</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {tour.provider_details.map((service) => (
                      <li key={service.id}>
                        <span className="font-medium">{service.name_snapshot} ({service.service_type_snapshot}):</span>{' '}
                        ${service.selling_price_per_unit_snapshot.toFixed(2)} por {service.unit_type_snapshot}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="lg:col-span-1 bg-gray-50 p-6 rounded-lg shadow-inner">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">¡Reserva Ahora!</h3>
              <p className="text-gray-700 mb-6">
                ¿Listo para tu próxima aventura? Selecciona tus asientos y reserva.
              </p>
              {tour.bus_capacity > 0 && (
                <div className="mb-6">
                  <TourSeatMap
                    tourId={tour.id}
                    busCapacity={tour.bus_capacity}
                    courtesies={tour.courtesies}
                    seatLayoutJson={busLayout}
                    onSeatsSelected={handleSeatsSelected} // Pass callback to capture selection
                    readOnly={false}
                    adminMode={false}
                    initialSelectedSeats={selectedSeats} // Pass current selection
                  />
                  {selectedSeats.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Asientos seleccionados: {selectedSeats.join(', ')}
                    </p>
                  )}
                  {/* Debugging indicator */}
                  {tour.bus_id && (
                    <p className="text-xs text-gray-500 mt-2">
                      Bus ID: {tour.bus_id} | Layout Cargado: {busLayout ? 'Sí' : 'No'}
                    </p>
                  )}
                </div>
              )}
              <Dialog open={isBookingFormOpen} onOpenChange={setIsBookingFormOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-3 text-lg"
                    disabled={selectedSeats.length === 0} // Disable if no seats selected
                  >
                    Reservar Tour ({selectedSeats.length} personas)
                  </Button>
                </DialogTrigger>
                {tour && (
                  <ClientBookingForm
                    isOpen={isBookingFormOpen}
                    onClose={() => setIsBookingFormOpen(false)}
                    tourId={tour.id}
                    tourTitle={tour.title}
                    tourImage={tour.image_url}
                    tourDescription={tour.description}
                    tourSellingPrices={{
                      double: tour.selling_price_double_occupancy,
                      triple: tour.selling_price_triple_occupancy,
                      quad: tour.selling_price_quad_occupancy,
                      child: tour.selling_price_child,
                    }}
                    busDetails={{
                      bus_id: tour.bus_id,
                      bus_capacity: tour.bus_capacity,
                      courtesies: tour.courtesies,
                      seat_layout_json: busLayout,
                    }}
                    tourAvailableExtraServices={tour.provider_details}
                    initialSelectedSeats={selectedSeats} // Pass selected seats to the form
                  />
                )}
              </Dialog>
              <Button variant="outline" className="w-full mt-4 bg-white text-rosa-mexicano hover:bg-gray-100 border-rosa-mexicano hover:border-rosa-mexicano/90">
                Contactar Asesor
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TourDetailsPage;