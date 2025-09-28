"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ParallaxCard from './ParallaxCard';
import { allTours, Tour } from '@/data/tours'; // Import allTours from the new data file

const LatestToursSection = () => {
  const isMobile = useIsMobile();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });

  // Display only the first 3 tours as "latest"
  const latestToursSubset = allTours.slice(0, 3);

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
                {latestToursSubset.map((tour, index) => (
                  <div key={tour.id} className="embla__slide flex-none w-full pl-4">
                    <ParallaxCard
                      imageUrl={tour.imageUrl}
                      title={tour.title}
                      description={tour.description}
                      rotationClass={rotationClasses[index % rotationClasses.length]}
                      isMobile={true}
                      tourId={tour.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestToursSubset.map((tour, index) => (
              <ParallaxCard
                key={tour.id}
                imageUrl={tour.imageUrl}
                title={tour.title}
                description={tour.description}
                rotationClass={rotationClasses[index % rotationClasses.length]}
                isMobile={false}
                tourId={tour.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestToursSection;