"use client";

import React, { useEffect, useState } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { supabase } from '@/integrations/supabase/client'; // Import supabase
import { Loader2 } from 'lucide-react';
import BusDestinationCard from '@/components/bus-tickets/BusDestinationCard'; // Import BusDestinationCard
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BusDestination {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  order_index: number;
}

const DestinationsPage = () => {
  const [destinations, setDestinations] = useState<BusDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDestinations = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('bus_destinations')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching all bus destinations:', error);
        setError('Error al cargar los destinos de autobús.');
        setDestinations([]);
      } else {
        setDestinations(data || []);
      }
      setLoading(false);
    };

    fetchDestinations();
  }, []);

  if (loading) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
            <p className="ml-4 text-xl">Cargando destinos...</p>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (error) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 text-center text-red-600">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Error</h1>
            <p className="text-xl">{error}</p>
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
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Nuestros Destinos de Saura Bus
          </h1>
          <p className="text-lg text-center mb-10">
            Descubre los increíbles lugares a los que puedes viajar con nuestros boletos de autobús.
          </p>

          {destinations.length === 0 ? (
            <p className="text-center text-muted-foreground text-lg">No hay destinos disponibles en este momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {destinations.map((dest, index) => (
                <div key={dest.id} id={dest.name.toLowerCase().replace(/\s/g, '-')}> {/* Add ID for anchor links */}
                  <BusDestinationCard
                    imageUrl={dest.image_url || 'https://via.placeholder.com/400x200?text=Destino+Saura+Bus'}
                    title={dest.name}
                    subtitle={dest.description || 'Descubre este increíble destino con Saura Bus.'}
                    link={`/bus-tickets/destinations#${dest.name.toLowerCase().replace(/\s/g, '-')}`}
                    gradientFromClass={index % 2 === 0 ? 'from-bus-primary/50' : 'from-bus-secondary/50'}
                    gradientToClass={index % 2 === 0 ? 'to-bus-primary' : 'to-bus-secondary'}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
              <Link to="/bus-tickets">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Inicio de Boletos
              </Link>
            </Button>
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default DestinationsPage;