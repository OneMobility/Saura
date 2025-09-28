"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom'; // Importar Link

interface ParallaxCardProps {
  imageUrl: string;
  title: string;
  description: string;
  rotationClass?: string;
  isMobile?: boolean;
  tourId: string; // Nueva prop para el ID del tour
}

const ParallaxCard: React.FC<ParallaxCardProps> = ({
  imageUrl,
  title,
  description,
  rotationClass,
  isMobile = false,
  tourId, // Usar la nueva prop
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);

  const handleScroll = useCallback(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const cardCenterY = rect.top + rect.height / 2;
      const viewportCenterY = viewportHeight / 2;

      const parallaxStrength = 0.15;
      const newTranslateY = (cardCenterY - viewportCenterY) * parallaxStrength;
      setTranslateY(newTranslateY);
    }
  }, []);

  useEffect(() => {
    if (!isMobile) {
      window.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll, isMobile]);

  return (
    <Card
      ref={cardRef}
      className={cn(
        "overflow-hidden shadow-lg hover:shadow-xl hover:ring-2 hover:ring-rosa-mexicano hover:ring-offset-2 transition-all duration-300 group bg-white",
        rotationClass,
        "flex flex-col"
      )}
    >
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
          style={{ transform: `translateY(${translateY}px) scale(1.1)` }}
        />
      </div>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="text-gray-600 text-base">
          {description}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to={`/tours/${tourId}`}>Ver Detalles</Link> {/* Enlace a la página de detalles del tour */}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ParallaxCard;