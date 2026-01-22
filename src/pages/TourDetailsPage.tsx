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

interface TourHotelDetail {
  id: string;
  hotel_quote_id: string;
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
  hotel_details: TourHotelDetail[];
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  bank_clabe: string;
  bank_holder: string;
}

interface AgencySettings {
  payment_mode: 'test' | 'production';
  mp_public_key: string | null;
  mp_test_public_key: string | null;
  stripe_public_key: string | null;
  stripe_test_public_key: string | null;
  bank_accounts: BankAccount[];
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

      // 1. Fetch ALL Agency Settings needed for the form
      const { data: settingsData, error: settingsError } = await supabase
        .from('agency_settings')
        .select('payment_mode, mp_public_key, mp_test_public_key, stripe_public_key, stripe_test_public_key, bank_accounts, advance_payment_amount')
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching agency settings:', settingsError);
      }
      
      const advanceAmount = settingsData?.advance_payment_amount ? parseFloat(String(settingsData.advance_payment_amount)) : 500;
      
      const settings = {
        ...settingsData,
        advance_payment_amount: advanceAmount,
        bank_accounts: Array.isArray(settingsData?.bank_accounts) ? settingsData.bank_accounts : [],
        payment_mode: settingsData?.payment_mode || 'test'
      } as AgencySettings;
      setAgencySettings(settings);

      // 2. Fetch all buses for layouts
      const { data: busesData } = await supabase.from('buses').select('id, seat_layout_json');
      const busesMap = new Map<string, any>();
      busesData?.forEach(bus => busesMap.set(bus.id, bus));

      // 3. Fetch tour details
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select('*')
        .eq('slug', id)
        .single();

      if (tourError) {
        setError('No se pudo cargar los detalles del tour.');
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
        } as Tour;

        // 4. Calculate Advance
        const minPrice = Math.min(
          tourDetails.selling_price_double_occupancy || 99999,
          tourDetails.selling_price_triple_occupancy || 99999,
          tourDetails.selling_price_quad_occupancy || 99999,
          tourDetails.selling_price_child || 99999
        );
        setAdvancePaymentPerPerson(Math.max(advanceAmount, minPrice * 0.10));

        // 5. Hotel names
        const hotelIds = tourDetails.hotel_details.map(d => d.hotel_quote_id).filter(Boolean);
        if (hotelIds.length > 0) {
          const { data: hotelsData } = await supabase.from('hotels').select('name').in('id', hotelIds);
          setHotelNames((hotelsData || []).map(h => h.name).join(', '));
        }

        // 6. Bus layout
        if (tourDetails.bus_id) {
          setBusLayout(busesMap.get(tourDetails.bus_id)?.seat_layout_json || null);
        }
        
        setTour(tourDetails);
      }
      setLoading(false);
    };

    if (id) fetchTourDetails();
  }, [id]);

  const handleWhatsAppContact = () => {
    if (!tour) return;
    window.open(`https://wa.me/528444041469?text=${encodeURIComponent(`¡Hola! Me interesa el tour: ${tour.title}.`)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;
  if (error || !tour) return <div className="min-h-screen flex flex-col items-center justify-center p-4"><h1>Error</h1><p>{error}</p><Button asChild className="mt-4"><Link to="/tours">Volver</Link></Button></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8"><Button asChild variant="outline"><Link to="/tours"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Tours</Link></Button></div>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="relative h-64 md:h-96 w-full">
            <img src={tour.image_url} alt={tour.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-end p-6"><h1 className="text-4xl md:text-5xl font-bold text-white">{tour.title}</h1></div>
          </div>

          <div className="p-6 md:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-4">Descripción</h2>
              <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: tour.full_content || tour.description }} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-3">
                  <h3 className="font-bold border-b pb-2">Información</h3>
                  <p><Hotel className="inline h-4 w-4 mr-2" /> <strong>Hotel:</strong> {hotelNames}</p>
                  <p><CalendarDays className="inline h-4 w-4 mr-2" /> <strong>Salida:</strong> {tour.departure_date ? format(parseISO(tour.departure_date), 'dd/MM/yy', { locale: es }) : 'N/A'}</p>
                  <p><Clock className="inline h-4 w-4 mr-2" /> <strong>Horario:</strong> {tour.departure_time}</p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold border-b pb-2">Precios</h3>
                  <p>Doble: <strong>${tour.selling_price_double_occupancy}</strong></p>
                  <p>Triple: <strong>${tour.selling_price_triple_occupancy}</strong></p>
                  <p>Quad: <strong>${tour.selling_price_quad_occupancy}</strong></p>
                  <p>Niño: <strong>${tour.selling_price_child}</strong></p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 bg-gray-50 p-6 rounded-2xl shadow-inner">
              <h3 className="text-2xl font-bold mb-4">¡Reserva Ahora!</h3>
              <p className="text-sm text-gray-500 mb-6">Anticipo por persona: <span className="font-bold text-rosa-mexicano">${advancePaymentPerPerson.toFixed(2)}</span></p>
              
              {tour.bus_capacity > 0 && (
                <div className="mb-6">
                  <TourSeatMap
                    tourId={tour.id}
                    busCapacity={tour.bus_capacity}
                    courtesies={tour.courtesies}
                    seatLayoutJson={busLayout}
                    onSeatsSelected={handleSeatsSelected}
                    initialSelectedSeats={selectedSeats}
                  />
                </div>
              )}

              <Dialog open={isBookingFormOpen} onOpenChange={setIsBookingFormOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-rosa-mexicano h-14 text-lg font-bold" disabled={selectedSeats.length === 0}>
                    Reservar para {selectedSeats.length} {selectedSeats.length === 1 ? 'persona' : 'personas'}
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
                    initialSelectedSeats={selectedSeats}
                  />
                )}
              </Dialog>

              <Button variant="outline" className="w-full mt-4 h-12 border-rosa-mexicano text-rosa-mexicano" onClick={handleWhatsAppContact}>
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