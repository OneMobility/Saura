"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ParallaxCard from './ParallaxCard';

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

  useEffect(() => {
    if (!emblaApi) return;
    return () => {
      // Cleanup if needed
    };
  }, [emblaApi]);

  const rotationClasses = [
    "transform rotate-1",
    "transform -rotate-1",
    "transform rotate-2",
  ];

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">
          Nuestros Últimos Tours
        </h2>

        {isMobile ? (
          <div className="relative">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex -ml-4">
                {latestTours.map((tour, index) => (
                  <div key={tour.id} className="embla__slide flex-none w-full pl-4">
                    <ParallaxCard
                      imageUrl={tour.imageUrl}
                      title={tour.title}
                      description={tour.description}
                      rotationClass={rotationClasses[index % rotationClasses.length]}
                      isMobile={true}
                      tourId={tour.id} // Pasar el ID del tour
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestTours.map((tour, index) => (
              <ParallaxCard
                key={tour.id}
                imageUrl={tour.imageUrl}
                title={tour.title}
                description={tour.description}
                rotationClass={rotationClasses[index % rotationClasses.length]}
                isMobile={false}
                tourId={tour.id} // Pasar el ID del tour
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestToursSection;