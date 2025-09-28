import React, { useCallback, useRef, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'; // Added Loader2 icon
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

interface Slide {
  id: string; // Changed to string to match Supabase UUID
  image_url: string; // Changed to image_url to match Supabase column name
  title: string;
  description: string;
  order_index: number; // Added order_index for sorting
}

const animationClasses = [
  'animate-fade-in-up',
  'animate-fade-in-left',
  'animate-fade-in-right',
];

const Slideshow = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentTitleAnimation, setCurrentTitleAnimation] = useState('');
  const [currentDescriptionAnimation, setCurrentDescriptionAnimation] = useState('');
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]); // State to hold fetched slides
  const [loading, setLoading] = useState(true); // Loading state

  const getRandomAnimation = () => animationClasses[Math.floor(Math.random() * animationClasses.length)];

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('slides')
      .select('*')
      .order('order_index', { ascending: true }); // Order by order_index

    if (error) {
      console.error('Error fetching slides for slideshow:', error);
      // Fallback to a default slide or show an error message
      setSlides([]);
    } else {
      setSlides(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlides(); // Fetch slides on component mount
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

  if (loading) {
    return (
      <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-gray-200">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando diapositivas...</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center bg-gray-200 text-gray-700">
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
                src={slide.image_url} // Use image_url from Supabase
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
          className="bg-white/70 hover:bg-white text-gray-800 hover:text-gray-900 rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={scrollNext}
          className="bg-white/70 hover:bg-white text-gray-800 hover:text-gray-900 rounded-full"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Slideshow;