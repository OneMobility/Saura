"use client";

import React, { useEffect, useState } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar'; // NEW: Import BusTicketsNavbar
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Bus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import BusTicketBookingForm from '@/components/BusTicketBookingForm';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider'; // NEW: Import BusTicketsThemeProvider

interface Tour {
  id: string;
  image_url: string;
  title: string;
  description: string;
  slug: string;
  bus_capacity: number;
  courtesies: number;
  selling_price_double_occupancy: number; // Using this as base adult price for bus tickets
  selling_price_child: number;
  bus_id: string | null;
}

const BusTicketsPage = () => {
  const [busTours, setBusTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  useEffect(() => {
    const fetchBusTours = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tours')
        .select('id, image_url, title, description, slug, bus_capacity, courtesies, selling_price_double_occupancy, selling_price_child, bus_id')
        .not('bus_id', 'is', null) // Only fetch tours that have a bus assigned
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bus tours:', error);
        setError('Error al cargar los tours de autobús.');
        setBusTours([]);
      } else {
        setBusTours(data || []);
      }
      setLoading(false);
    };

    fetchBusTours();
  }, []);

  const handleOpenBooking = (tour: Tour) => {
    setSelectedTour(tour);
    setIsBookingFormOpen(true);
  };

  if (loading) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow py-12 px-4 md:px-8 lg:px-16 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
            <p className="ml-4 text-xl">Cargando tours de autobús...</p>
          </main>
          <Footer />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (error) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow py-12 px-4 md:px-8 lg:px-16 text-center text-destructive">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Error</h1>
            <p className="text-xl">{error}</p>
          </main>
          <Footer />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Boletos de Autobús
          </h1>
          <p className="text-lg text-center mb-10">
            Encuentra y reserva tus boletos de autobús para nuestros tours.
          </p>

          {busTours.length === 0 ? (
            <p className="text-center text-lg">No hay tours de autobús disponibles en este momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {busTours.map((tour) => (
                <div key={tour.id} className="bg-card text-card-foreground rounded-lg shadow-lg overflow-hidden flex flex-col">
                  <img src={tour.image_url} alt={tour.title} className="w-full h-48 object-cover" />
                  <div className="p-4 flex-grow">
                    <h2 className="text-xl font-semibold mb-2">{tour.title}</h2>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{tour.description}</p>
                    <div className="flex items-center text-muted-foreground text-sm mb-2">
                      <Bus className="h-4 w-4 mr-2" />
                      <span>Capacidad: {tour.bus_capacity} asientos</span>
                    </div>
                    <p className="text-lg font-bold text-bus-primary">
                      Desde ${tour.selling_price_double_occupancy.toFixed(2)} por persona
                    </p>
                  </div>
                  <div className="p-4 border-t border-border">
                    <Button
                      onClick={() => handleOpenBooking(tour)}
                      className="w-full bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground"
                    >
                      Reservar Boleto
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
              </Link>
            </Button>
          </div>
        </main>
        <Footer />

        {selectedTour && (
          <BusTicketBookingForm
            isOpen={isBookingFormOpen}
            onClose={() => setIsBookingFormOpen(false)}
            tourId={selectedTour.id}
            tourTitle={selectedTour.title}
            tourImage={selectedTour.image_url}
            tourDescription={selectedTour.description}
            tourSellingPrices={{
              adult: selectedTour.selling_price_double_occupancy, // Using double occupancy as adult price
              child: selectedTour.selling_price_child,
            }}
            busDetails={{
              bus_id: selectedTour.bus_id,
              bus_capacity: selectedTour.bus_capacity,
              courtesies: selectedTour.courtesies,
              seat_layout_json: null, // Will be fetched inside the component
            }}
          />
        )}
      </div>
    </BusTicketsThemeProvider>
  );
};

export default BusTicketsPage;