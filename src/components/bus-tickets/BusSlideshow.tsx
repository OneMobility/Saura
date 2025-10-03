"use client";

import React, { useCallback, useRef, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Slide {
  id: string;
  image_url: string;
  title: string;
  description: string;
  order_index: number;
}

const animationClasses = [
  'animate-fade-in-up',
  'animate-fade-in-left',
  'animate-fade-in-right',
];

const BusSlideshow = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTitleAnimation, setCurrentTitleAnimation] = useState('');
  const [currentDescriptionAnimation, setCurrentDescriptionAnimation] = useState('');
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  const getRandomAnimation = () => animationClasses[Math.floor(Math.random() * animationClasses.length)];

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching slides for bus slideshow:', error);
      setSlides([]);
    } else {
      setSlides(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const newIndex = emblaApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    setCurrentTitleAnimation(getRandomAnimation());
    setCurrentDescriptionAnimation(getRandomAnimation());
  }, [emblaApi, setSelectedIndex]);

  const startAutoplay = useCallback(() => {
    if (emblaApi) {
      autoplayRef.current = setInterval(() => {
        emblaApi.scrollNext();
      }, 10000);
    }
  }, [emblaApi]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    startAutoplay();

    return () => {
      stopAutoplay();
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect, startAutoplay, stopAutoplay]);

  const handleMouseEnter = () => {
    stopAutoplay();
  };

  const handleMouseLeave = () => {
    startAutoplay();
  };

  if (loading) {
    return (
      <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-bus-background text-bus-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
        <p className="ml-4">Cargando diapositivas...</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-bus-background text-bus-foreground">
        <p>No hay diapositivas disponibles. Por favor, añádelas desde el panel de administración.</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {slides.map((slide, index) => (
            <div className="embla__slide relative flex-none w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden" key={slide.id}>
              <img
                src={slide.image_url}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className={cn(
                  "text-center text-white",
                  selectedIndex === index ? "opacity-100" : "opacity-0"
                )}>
                  <h2 className={cn(
                    "text-3xl md:text-5xl font-bold mb-4",
                    selectedIndex === index && currentTitleAnimation
                  )}>
                    {slide.title}
                  </h2>
                  <p className={cn(
                    "text-lg md:text-2xl",
                    selectedIndex === index && currentDescriptionAnimation,
                    selectedIndex === index && "delay-200"
                  )}>
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={scrollPrev}
          className="bg-white/70 hover:bg-white text-bus-primary hover:text-bus-primary rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={scrollNext}
          className="bg-white/70 hover:bg-white text-bus-primary hover:text-bus-primary rounded-full"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default BusSlideshow;