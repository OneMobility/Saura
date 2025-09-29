"use client";

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react'; // Import Loader2
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { format } from 'date-fns'; // Import format for dates

interface TourHotelDetail {
  id: string;
  hotel_id: string;
  hotel_name: string;
  room_type: 'double' | 'triple' | 'quad';
  num_nights: number;
  cost_per_person_calculated: number;
  check_in_date: string | null;
  check_out_date: string | null;
  total_hotel_cost: number;
  advance_payment_to_hotel: number;
  total_paid_to_hotel: number;
  remaining_payment_to_hotel: number;
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
  selling_price_per_person: number;
  cost_per_paying_person: number | null;
  bus_capacity: number;
  courtesies: number;
  hotel_details: TourHotelDetail[] | null; // Updated type
  provider_details: { name: string; service: string; cost: number }[] | null;
}

const TourDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTourDetails = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tours')
        .select('*') // Select all columns
        .eq('slug', id) // Fetch by slug
        .single();

      if (error) {
        console.error('Error fetching tour details:', error);
        setError('No se pudo cargar los detalles del tour.');
        setTour(null);
      } else if (data) {
        setTour({
          ...data,
          includes: data.includes || [],
          itinerary: data.itinerary || [],
          hotel_details: data.hotel_details || [],
          provider_details: data.provider_details || [],
        });
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
                    <li><span className="font-medium">Precio por persona:</span> ${tour.selling_price_per_person.toFixed(2)}</li>
                    <li><span className="font-medium">Duración:</span> {tour.duration}</li>
                    <li><span className="font-medium">Capacidad del autobús:</span> {tour.bus_capacity} personas</li>
                    <li><span className="font-medium">Cortesías:</span> {tour.courtesies}</li>
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
                    {tour.hotel_details.map((hotel, index) => (
                      <div key={hotel.id} className="border p-4 rounded-md bg-gray-50">
                        <p className="font-semibold text-lg mb-1">{hotel.hotel_name} ({hotel.room_type.charAt(0).toUpperCase() + hotel.room_type.slice(1)})</p>
                        <ul className="text-gray-700 text-sm space-y-1">
                          <li><span className="font-medium">Noches:</span> {hotel.num_nights}</li>
                          {hotel.check_in_date && <li><span className="font-medium">Check-in:</span> {format(new Date(hotel.check_in_date), 'PPP')}</li>}
                          {hotel.check_out_date && <li><span className="font-medium">Check-out:</span> {format(new Date(hotel.check_out_date), 'PPP')}</li>}
                          <li><span className="font-medium">Costo por persona (calculado):</span> ${hotel.cost_per_person_calculated.toFixed(2)}</li>
                          <li><span className="font-medium">Costo total de reserva:</span> ${hotel.total_hotel_cost.toFixed(2)}</li>
                          <li><span className="font-medium">Anticipo al hotel:</span> ${hotel.advance_payment_to_hotel.toFixed(2)}</li>
                          <li><span className="font-medium">Total pagado al hotel:</span> ${hotel.total_paid_to_hotel.toFixed(2)}</li>
                          <li><span className="font-medium">Pago restante al hotel:</span> ${hotel.remaining_payment_to_hotel.toFixed(2)}</li>
                        </ul>
                      </div>
                    ))}
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
              <Button className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-3 text-lg">
                Reservar Tour
              </Button>
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