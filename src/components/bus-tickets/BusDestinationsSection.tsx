"use client";

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Bus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import BusDestinationCard from './BusDestinationCard';
import { supabase } from '@/integrations/supabase/client'; // Import supabase

interface BusDestination {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  order_index: number;
}

const BusDestinationsSection = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<BusDestination[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('bus_destinations')
      .select('*')
      .order('order_index', { ascending: true })
      .limit(6); // Limit to a reasonable number for the home section

    if (error) {
      console.error('Error fetching bus destinations:', error);
      setError('Error al cargar los destinos de autobús.');
      setDestinations([]);
    } else {
      setDestinations(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (loading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
        <div className="max-w-6xl mx-auto bg-muted p-8 rounded-lg shadow-xl flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
          <p className="ml-4 text-bus-foreground text-xl">Cargando destinos...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
        <div className="max-w-6xl mx-auto bg-muted p-8 rounded-lg shadow-xl text-center text-red-600">
          <h2 className="text-3xl md:text-4xl font-bold text-bus-primary mb-10">
            Nuestros Destinos Populares
          </h2>
          <p className="text-xl">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
      <div className="max-w-6xl mx-auto bg-muted p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-bus-primary mb-10">
          Nuestros <span className="text-bus-secondary">Destinos</span> Populares
        </h2>
        <p className="text-lg text-center mb-12 max-w-2xl mx-auto">
          Descubre los lugares más increíbles a los que puedes viajar con Saura Bus.
          Desde playas soleadas hasta ciudades históricas, tu próxima aventura te espera.
        </p>

        {destinations.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg">No hay destinos disponibles en este momento.</p>
        ) : (
          <div className="relative overflow-hidden">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex -ml-4">
                {destinations.map((dest, index) => (
                  <div key={dest.id} className="embla__slide flex-none w-full sm:w-1/2 lg:w-1/3 pl-4">
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
            </div>

            <Button
              onClick={scrollPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white text-bus-primary hover:text-bus-primary rounded-full p-2"
              size="icon"
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="sr-only">Anterior</span>
            </Button>
            <Button
              onClick={scrollNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/70 hover:bg-white text-bus-primary hover:text-bus-primary rounded-full p-2"
              size="icon"
            >
              <ChevronRight className="h-6 w-6" />
              <span className="sr-only">Siguiente</span>
            </Button>
          </div>
        )}

        <div className="text-center mt-12">
          <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
            <Link to="/bus-tickets/destinations">
              <Bus className="mr-2 h-4 w-4" /> Ver Todos los Destinos
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BusDestinationsSection;