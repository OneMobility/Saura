"use client";

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Bus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import BusDestinationCard from './BusDestinationCard'; // Import the new component

const BusDestinationsSection = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [loading, setLoading] = useState(true); // Simulate loading for initial data
  const [destinations, setDestinations] = useState<any[]>([]); // State to hold destinations

  // Placeholder data for destinations
  const placeholderDestinations = [
    {
      name: 'Cancún',
      description: 'Playas paradisíacas y vida nocturna vibrante en el Caribe Mexicano.',
      imageUrl: 'https://images.unsplash.com/photo-1589394815691-e56519717ebf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/bus-tickets/destinations#cancun',
    },
    {
      name: 'Ciudad de México',
      description: 'Capital cultural con historia milenaria, museos y gastronomía de clase mundial.',
      imageUrl: 'https://images.unsplash.com/photo-1521050211434-f8599796594e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/bus-tickets/destinations#ciudad-de-mexico',
    },
    {
      name: 'San Miguel de Allende',
      description: 'Encanto colonial, calles empedradas y arte en cada esquina, Patrimonio de la Humanidad.',
      imageUrl: 'https://images.unsplash.com/photo-1589394815691-e56519717ebf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/bus-tickets/destinations#san-miguel-de-allende',
    },
    {
      name: 'Oaxaca',
      description: 'Tradición, gastronomía exquisita y artesanías únicas en el corazón de México.',
      imageUrl: 'https://images.unsplash.com/photo-1521050211434-f8599796594e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/bus-tickets/destinations#oaxaca',
    },
    {
      name: 'Guadalajara',
      description: 'Cuna del mariachi y el tequila, con una rica cultura y arquitectura colonial.',
      imageUrl: 'https://images.unsplash.com/photo-1589394815691-e56519717ebf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/bus-tickets/destinations#guadalajara',
    },
    {
      name: 'Monterrey',
      description: 'Ciudad industrial rodeada de imponentes montañas, ideal para la aventura y los negocios.',
      imageUrl: 'https://images.unsplash.com/photo-1521050211434-f8599796594e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/bus-tickets/destinations#monterrey',
    },
  ];

  useEffect(() => {
    // Simulate fetching data
    setLoading(true);
    setTimeout(() => {
      setDestinations(placeholderDestinations);
      setLoading(false);
    }, 1000);
  }, []);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (loading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
        <div className="mx-auto bg-muted p-8 rounded-lg shadow-xl flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
          <p className="ml-4 text-bus-foreground text-xl">Cargando destinos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
      <div className="mx-auto bg-muted p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-bus-primary mb-10">
          Nuestros <span className="text-bus-secondary">Destinos</span> Populares
        </h2>
        <p className="text-lg text-center mb-12 max-w-2xl mx-auto">
          Descubre los lugares más increíbles a los que puedes viajar con Saura Bus.
          Desde playas soleadas hasta ciudades históricas, tu próxima aventura te espera.
        </p>

        <div className="relative overflow-hidden"> {/* Añadido overflow-hidden aquí */}
          <div className="embla" ref={emblaRef}>
            <div className="embla__container flex -ml-4">
              {destinations.map((dest, index) => (
                <div key={index} className="embla__slide flex-none w-full sm:w-1/2 lg:w-1/3 pl-4">
                  <BusDestinationCard
                    imageUrl={dest.imageUrl}
                    title={dest.name}
                    subtitle={dest.description}
                    link={dest.link}
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