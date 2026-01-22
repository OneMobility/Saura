"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MessageSquare, Hotel, CalendarDays, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import TourSeatMap from '@/components/TourSeatMap';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ClientBookingForm from '@/components/ClientBookingForm';
import { TourProviderService, SeatLayout } from '@/types/shared';
import { stripHtmlTags } from '@/utils/html';

interface Bus {
  id: string;
  name: string;
  license_plate: string;
  total_capacity: number;
  seat_layout_json: SeatLayout | null;
}

// Interface for the structure stored in the tour's hotel_details JSONB field
interface TourHotelDetail {
  id: string;
  hotel_quote_id: string; // This is the ID of the hotel quote in the 'hotels' table
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
  courtesies: number;
  provider_details: TourProviderService[];
  hotel_details: TourHotelDetail[]; // Use the simplified structure
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
}

interface AgencySettings {
  mp_public_key: string | null;
  stripe_public_key: string | null;
  bank_name: string | null;
  bank_clabe: string | null;
  bank_holder: string | null;
  advance_payment_amount: number;
}

const TourDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busLayout, setBusLayout] = useState<SeatLayout | null>(null);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [hotelNames, setHotelNames] = useState<string>('');
  const [agencySettings, setAgencySettings] = useState<AgencySettings | null>(null);
  const [advancePaymentPerPerson, setAdvancePaymentPerPerson] = useState(0);

  const handleSeatsSelected = useCallback((seats: number[]) => {
    setSelectedSeats(seats);
  }, []);

  useEffect(() => {
    const fetchTourDetails = async () => {
      setLoading(true);
      setError(null);

      // 1. Fetch Agency Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('agency_settings')
        .select('mp_public_key, stripe_public_key, bank_name, bank_clabe, bank_holder, advance_payment_amount')
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching agency settings:', settingsError);
      }
      const settings = settingsData || { advance_payment_amount: 500 }; // Default to 500 if not found
      setAgencySettings(settings);

      // 2. Fetch all buses to get their layouts
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('id, seat_layout_json');

      if (busesError) {
        console.error('Error fetching buses:', busesError);
      }
      const busesMap = new Map<string, Bus>();
      busesData?.forEach(bus => busesMap.set(bus.id, bus as Bus));

      // 3. Fetch tour details
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
          provider_details,
          hotel_details,
          departure_date,
          return_date,
          departure_time,
          return_time
        `)
        .eq('slug', id)
        .single();

      if (tourError) {
        console.error('Error fetching tour details:', tourError);
        setError('No se pudo cargar los detalles del tour. Asegúrate de que el slug sea correcto.');
        setTour(null);
        setLoading(false);
        return;
      } 
      
      if (tourData) {
        const tourDetails = {
          ...tourData,
          includes: tourData.includes || [],
          itinerary: tourData.itinerary || [],
          selling_price_double_occupancy: tourData.selling_price_double_occupancy || 0,
          selling_price_triple_occupancy: tourData.selling_price_triple_occupancy || 0,
          selling_price_quad_occupancy: tourData.selling_price_quad_occupancy || 0,
          selling_price_child: tourData.selling_price_child || 0,
          provider_details: tourData.provider_details || [],
          hotel_details: tourData.hotel_details || [],
          departure_date: tourData.departure_date || null,
          return_date: tourData.return_date || null,
          departure_time: tourData.departure_time || null,
          return_time: tourData.return_time || null,
        } as Tour;

        // 4. Calculate Advance Payment Per Person
        const minPricePerPerson = Math.min(
          tourDetails.selling_price_double_occupancy,
          tourDetails.selling_price_triple_occupancy,
          tourDetails.selling_price_quad_occupancy,
          tourDetails.selling_price_child
        );
        
        const fixedAdvance = settings.advance_payment_amount || 500;
        const percentageAdvance = minPricePerPerson * 0.10;
        
        setAdvancePaymentPerPerson(Math.max(fixedAdvance, percentageAdvance));

        // 5. Fetch hotel names
        const hotelQuoteIds = tourDetails.hotel_details.map(d => d.hotel_quote_id).filter(Boolean);
        
        if (hotelQuoteIds.length > 0) {
          const { data: hotelsData } = await supabase
            .from('hotels')
            .select('id, name')
            .in('id', hotelQuoteIds);
          const names = (hotelsData || []).map(h => h.name).join(', ');
          setHotelNames(names);
        } else {
          setHotelNames('N/A');
        }

        // 6. Set bus layout
        if (tourDetails.bus_id) {
          const bus = busesMap.get(tourDetails.bus_id);
          const layout = bus?.seat_layout_json || null;
          setBusLayout(layout);
        } else {
          setBusLayout(null);
        }
        
        setTour(tourDetails);
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

  const handleWhatsAppContact = () => {
    if (!tour) return;
    const phoneNumber = '528444041469';
    const message = encodeURIComponent(`¡Hola! Me interesa el tour: ${tour.title}. ¿Podrían darme más información?`);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
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

  const cleanDescription = stripHtmlTags(tour.description);
  const departureDateDisplay = tour.departure_date ? format(parseISO(tour.departure_date), 'EEEE, dd MMMM yyyy', { locale: es }) : 'N/A';
  const returnDateDisplay = tour.return_date ? format(parseISO(tour.return_date), 'EEEE, dd MMMM yyyy', { locale: es }) : 'N/A';

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
                {cleanDescription}
              </p>

              {tour.full_content && (
                <div className="prose prose-lg max-w-none mb-6" dangerouslySetInnerHTML={{ __html: tour.full_content }} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Detalles Clave</h3>
                  <ul className="space-y-2 text-gray-700">
                    {hotelNames && hotelNames !== 'N/A' && (
                      <li>
                        <Hotel className="inline h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Hospedaje en:</span> {hotelNames}
                      </li>
                    )}
                    <li>
                      <CalendarDays className="inline h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">Salida:</span> {departureDateDisplay} {tour.departure_time}
                    </li>
                    <li>
                      <CalendarDays className="inline h-4 w-4 mr-2 text-gray-500" />
                      <span className="font-medium">Regreso:</span> {returnDateDisplay} {tour.return_time}
                    </li>
                    <li><span className="font-medium">Duración:</span> {tour.duration}</li>
                    <li><span className="font-medium">Coordinadores:</span> {tour.courtesies}</li>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Precios por Persona</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li><span className="font-medium">Doble:</span> ${tour.selling_price_double_occupancy.toFixed(2)}</li>
                    <li><span className="font-medium">Triple:</span> ${tour.selling_price_triple_occupancy.toFixed(2)}</li>
                    <li><span className="font-medium">Cuádruple:</span> ${tour.selling_price_quad_occupancy.toFixed(2)}</li>
                    <li><span className="font-medium">Menor (-12 años):</span> ${tour.selling_price_child.toFixed(2)}</li>
                  </ul>
                </div>
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
                Anticipo requerido por persona: <span className="font-bold text-rosa-mexicano">${advancePaymentPerPerson.toFixed(2)} MXN</span>
              </p>
              {tour.bus_capacity > 0 && (
                <div className="mb-6">
                  <TourSeatMap
                    tourId={tour.id}
                    busCapacity={tour.bus_capacity}
                    courtesies={tour.courtesies}
                    seatLayoutJson={busLayout}
                    onSeatsSelected={handleSeatsSelected}
                    readOnly={false}
                    adminMode={false}
                    initialSelectedSeats={selectedSeats}
                  />
                  {selectedSeats.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Asientos seleccionados: {selectedSeats.join(', ')}
                    </p>
                  )}
                </div>
              )}
              <Dialog open={isBookingFormOpen} onOpenChange={setIsBookingFormOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-3 text-lg"
                    disabled={selectedSeats.length === 0}
                  >
                    Reservar Tour ({selectedSeats.length} personas)
                  </Button>
                </DialogTrigger>
                {tour && agencySettings && (
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
                    advancePaymentPerPerson={advancePaymentPerPerson}
                    agencySettings={agencySettings}
                  />
                )}
              </Dialog>
              <Button 
                variant="outline" 
                className="w-full mt-4 bg-white text-rosa-mexicano hover:bg-gray-100 border-rosa-mexicano hover:border-rosa-mexicano/90"
                onClick={handleWhatsAppContact}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Contactar Asesor
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