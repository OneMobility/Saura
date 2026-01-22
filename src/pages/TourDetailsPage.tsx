"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MessageSquare, Hotel, CalendarDays, Clock, BusFront } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

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
  transport_only_price: number;
  bus_id: string | null;
  bus_capacity: number;
  courtesies: number;
  provider_details: TourProviderService[];
  hotel_details: any[];
  departure_date: string | null;
  return_date: string | null;
  departure_time: string | null;
  return_time: string | null;
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
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [advancePaymentPerPerson, setAdvancePaymentPerPerson] = useState(0);

  const handleSeatsSelected = useCallback((seats: number[]) => {
    setSelectedSeats(seats);
  }, []);

  useEffect(() => {
    const fetchTourDetails = async () => {
      setLoading(true);
      const { data: settingsData } = await supabase.from('agency_settings').select('*').single();
      setAgencySettings(settingsData);
      
      const { data: tourData, error: tourError } = await supabase.from('tours').select('*').eq('slug', id).single();
      if (tourError) { setError('No se pudo cargar los detalles.'); setLoading(false); return; } 
      
      if (tourData) {
        const t = { ...tourData, includes: tourData.includes || [], itinerary: tourData.itinerary || [] } as Tour;
        setTour(t);
        const minPrice = Math.min(t.selling_price_double_occupancy || 99999, t.selling_price_child || 99999);
        setAdvancePaymentPerPerson(Math.max(settingsData?.advance_payment_amount || 500, minPrice * 0.10));
        
        if (t.bus_id) {
          const { data: busData } = await supabase.from('buses').select('seat_layout_json').eq('id', t.bus_id).single();
          if (busData) setBusLayout(busData.seat_layout_json);
        }
        
        const hotelIds = t.hotel_details?.map((d: any) => d.hotel_quote_id).filter(Boolean) || [];
        if (hotelIds.length > 0) {
          const { data: hotelsData } = await supabase.from('hotels').select('name').in('id', hotelIds);
          setHotelNames((hotelsData || []).map(h => h.name).join(', '));
        }
      }
      setLoading(false);
    };
    if (id) fetchTourDetails();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;
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
                <div className="space-y-3"><h3 className="font-bold border-b pb-2">Información</h3><p><Hotel className="inline h-4 w-4 mr-2" /> <strong>Hotel:</strong> {hotelNames}</p><p><CalendarDays className="inline h-4 w-4 mr-2" /> <strong>Salida:</strong> {tour.departure_date ? format(parseISO(tour.departure_date), 'dd/MM/yy') : 'N/A'}</p><p><Clock className="inline h-4 w-4 mr-2" /> <strong>Horario:</strong> {tour.departure_time}</p></div>
                <div className="space-y-3"><h3 className="font-bold border-b pb-2">Tarifas</h3><p>Doble: <strong>${tour.selling_price_double_occupancy}</strong></p><p>Triple: <strong>${tour.selling_price_triple_occupancy}</strong></p><p>Cuádruple: <strong>${tour.selling_price_quad_occupancy}</strong></p><p>Menor: <strong>${tour.selling_price_child}</strong></p>
                  {tour.transport_only_price > 0 && (
                    <div className="mt-4 p-3 bg-rosa-mexicano/10 rounded-lg border border-rosa-mexicano/20">
                      <p className="text-rosa-mexicano font-black flex items-center gap-2"><BusFront className="h-4 w-4" /> Solo Traslado: <strong>${tour.transport_only_price}</strong></p>
                      <p className="text-[10px] text-gray-500">(Sin hospedaje incluido)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="lg:col-span-1 bg-gray-50 p-6 rounded-2xl shadow-inner">
              <h3 className="text-2xl font-bold mb-4">¡Reserva Ahora!</h3>
              <p className="text-sm text-gray-500 mb-6">Anticipo por persona: <span className="font-bold text-rosa-mexicano">${advancePaymentPerPerson.toFixed(2)}</span></p>
              {tour.bus_capacity > 0 && (<div className="mb-6"><TourSeatMap tourId={tour.id} busCapacity={tour.bus_capacity} courtesies={tour.courtesies} seatLayoutJson={busLayout} onSeatsSelected={handleSeatsSelected} initialSelectedSeats={selectedSeats} /></div>)}
              <Dialog open={isBookingFormOpen} onOpenChange={setIsBookingFormOpen}>
                <DialogTrigger asChild><Button className="w-full bg-rosa-mexicano h-14 text-lg font-bold" disabled={selectedSeats.length === 0}>Reservar para {selectedSeats.length} pax</Button></DialogTrigger>
                {tour && agencySettings && (<ClientBookingForm isOpen={isBookingFormOpen} onClose={() => setIsBookingFormOpen(false)} tourId={tour.id} tourTitle={tour.title} tourSellingPrices={{ double: tour.selling_price_double_occupancy, triple: tour.selling_price_triple_occupancy, quad: tour.selling_price_quad_occupancy, child: tour.selling_price_child }} transportOnlyPrice={tour.transport_only_price} advancePaymentPerPerson={advancePaymentPerPerson} agencySettings={agencySettings} initialSelectedSeats={selectedSeats} />)}
              </Dialog>
              <Button variant="outline" className="w-full mt-4 h-12 border-rosa-mexicano text-rosa-mexicano" onClick={() => window.open(`https://wa.me/528444041469`, '_blank')}><MessageSquare className="mr-2 h-4 w-4" /> Contactar Asesor</Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TourDetailsPage;