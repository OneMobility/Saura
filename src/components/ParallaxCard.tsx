"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ParallaxCardProps {
  imageUrl: string;
  title: string;
  description: string;
  rotationClass?: string;
  isMobile?: boolean; // Para saber si estamos en modo carrusel
}

const ParallaxCard: React.FC<ParallaxCardProps> = ({
  imageUrl,
  title,
  description,
  rotationClass,
  isMobile = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);

  const handleScroll = useCallback(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate how much the card is in the viewport
      const cardCenterY = rect.top + rect.height / 2;
      const viewportCenterY = viewportHeight / 2;

      // Adjust parallax strength as needed
      const parallaxStrength = 0.15; // Controls how much the image moves

      // Calculate translateY based on the card's position relative to the viewport center
      // Image moves less than the scroll, creating the parallax effect
      const newTranslateY = (cardCenterY - viewportCenterY) * parallaxStrength;
      setTranslateY(newTranslateY);
    }
  }, []);

  useEffect(() => {
    if (!isMobile) { // Apply parallax only for desktop view (not in carousel)
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Set initial position
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
        rotationClass, // Apply rotation for photocard effect
        "flex flex-col" // Ensure card takes full height in flex container
      )}
    >
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
          style={{ transform: `translateY(${translateY}px) scale(1.1)` }} // Apply parallax translateY and slightly scale up
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
        <Button className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          Ver Detalles
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ParallaxCard;