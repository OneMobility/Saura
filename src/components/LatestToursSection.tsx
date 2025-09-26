"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile'; // Importamos el hook para detectar si es móvil

interface Tour {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
}

// Placeholder data for the latest tours
const latestTours: Tour[] = [
  {
    id: 'tour-1',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Aventura en la Riviera Maya',
    description: 'Explora las ruinas mayas y relájate en las playas de arena blanca.',
  },
  {
    id: 'tour-2',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Senderismo en la Sierra Madre',
    description: 'Descubre paisajes montañosos impresionantes y cascadas ocultas.',
  },
  {
    id: 'tour-3',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Cultura y Sabor en Oaxaca',
    description: 'Sumérgete en la rica gastronomía y tradiciones de Oaxaca.',
  },
];

const LatestToursSection = () => {
  const isMobile = useIsMobile();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  // No necesitamos canScrollPrev/Next ni scrollPrev/Next si no hay botones de navegación
  // const [canScrollPrev, setCanScrollPrev] = useState(false);
  // const [canScrollNext, setCanScrollNext] = useState(false);

  // const scrollPrev = useCallback(() => {
  //   if (emblaApi) emblaApi.scrollPrev();
  // }, [emblaApi]);

  // const scrollNext = useCallback(() => {
  //   if (emblaApi) emblaApi.scrollNext();
  // }, [emblaApi]);

  // const onSelect = useCallback(() => {
  //   if (!emblaApi) return;
  //   setCanScrollPrev(emblaApi.canScrollPrev());
  //   setCanScrollNext(emblaApi.canScrollNext());
  // }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // emblaApi.on('select', onSelect); // Ya no es necesario si no hay botones
    // emblaApi.on('reInit', onSelect); // Ya no es necesario si no hay botones
    // onSelect(); // Initial check
    return () => {
      // emblaApi.off('select', onSelect); // Limpiar listeners si se usaran
    };
  }, [emblaApi]); // onSelect ya no es una dependencia

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">
          Nuestros Últimos Tours
        </h2>

        {isMobile ? (
          <div className="relative">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex -ml-4"> {/* Negative margin to offset slide padding */}
                {latestTours.map((tour, index) => (
                  <div key={tour.id} className="embla__slide flex-none w-full pl-4"> {/* Padding for spacing */}
                    <Card className={cn(
                      "overflow-hidden shadow-lg hover:shadow-xl hover:ring-2 hover:ring-rosa-mexicano hover:ring-offset-2 transition-all duration-300 h-full flex flex-col bg-white", // Added bg-white
                      index === 0 && "transform rotate-1", // Example rotation
                      index === 1 && "transform -rotate-1", // Example rotation
                      index === 2 && "transform rotate-2" // Example rotation
                    )}>
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={tour.imageUrl}
                          alt={tour.title}
                          className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-900">{tour.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <CardDescription className="text-gray-600 text-base">
                          {tour.description}
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="flex justify-end">
                        <Button className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
                          Ver Detalles
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
            {/* Se eliminan los botones de navegación para permitir el arrastre */}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestTours.map((tour, index) => (
              <Card key={tour.id} className={cn(
                "overflow-hidden shadow-lg hover:shadow-xl hover:ring-2 hover:ring-rosa-mexicano hover:ring-offset-2 transition-all duration-300 group bg-white", // Added bg-white
                index === 0 && "transform rotate-1", // Example rotation
                index === 1 && "transform -rotate-1", // Example rotation
                index === 2 && "transform rotate-2" // Example rotation
              )}>
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={tour.imageUrl}
                    alt={tour.title}
                    className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-900">{tour.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base">
                    {tour.description}
                  </CardDescription>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
                    Ver Detalles
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestToursSection;