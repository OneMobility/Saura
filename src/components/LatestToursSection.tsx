"use client";

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ParallaxCard from './ParallaxCard';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

interface Tour {
  id: string;
  image_url: string;
  title: string;
  description: string;
  slug: string; // Use slug for linking
}

const LatestToursSection = () => {
  const isMobile = useIsMobile();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [latestTours, setLatestTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestTours = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('tours')
      .select('id, image_url, title, description, slug')
      .order('created_at', { ascending: false }) // Get newest tours
      .limit(3); // Limit to 3 latest tours for the home section

    if (error) {
      console.error('Error fetching latest tours:', error);
      setError('Error al cargar los últimos tours.');
      setLatestTours([]);
    } else {
      setLatestTours(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLatestTours();
  }, [fetchLatestTours]);

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

  if (loading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-white flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700 text-xl">Cargando últimos tours...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-white text-center text-red-600">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-10">
          Nuestros Últimos Tours
        </h2>
        <p className="text-xl">{error}</p>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-10">
          Nuestros Últimos Tours
        </h2>

        {latestTours.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No hay tours disponibles en este momento.</p>
        ) : isMobile ? (
          <div className="relative">
            <div className="embla" ref={emblaRef}>
              <div className="embla__container flex -ml-4">
                {latestTours.map((tour, index) => (
                  <div key={tour.id} className="embla__slide flex-none w-full pl-4">
                    <ParallaxCard
                      imageUrl={tour.image_url}
                      title={tour.title}
                      description={tour.description}
                      rotationClass={rotationClasses[index % rotationClasses.length]}
                      isMobile={true}
                      tourId={tour.slug} // Use slug for the link
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
                imageUrl={tour.image_url}
                title={tour.title}
                description={tour.description}
                rotationClass={rotationClasses[index % rotationClasses.length]}
                isMobile={false}
                tourId={tour.slug} // Use slug for the link
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestToursSection;