import React, { useCallback, useRef, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SocialMediaBox from './SocialMediaBox'; // Importa el nuevo componente

interface Slide {
  id: number;
  imageUrl: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Descubre Paraísos Escondidos',
    description: 'Aventuras inolvidables te esperan en cada rincón del mundo.',
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Experiencias Únicas',
    description: 'Sumérgete en culturas vibrantes y paisajes impresionantes.',
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Tu Próxima Gran Aventura',
    description: 'Planifica el viaje de tus sueños con nosotros.',
  },
];

const Slideshow = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // Cambia de slide cada 5 segundos

    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      clearInterval(autoplay); // Limpia el intervalo al desmontar el componente
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {slides.map((slide, index) => (
            <div className="embla__slide relative flex-none w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden" key={slide.id}>
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className={cn(
                  "text-center text-white transition-opacity duration-1000 ease-in-out",
                  selectedIndex === index ? "opacity-100" : "opacity-0"
                )}>
                  <h2 className="text-3xl md:text-5xl font-bold mb-4 animate-fade-in-up">
                    {slide.title}
                  </h2>
                  <p className="text-lg md:text-2xl animate-fade-in-up delay-200">
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SocialMediaBox posicionado al centro y por encima */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <SocialMediaBox />
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