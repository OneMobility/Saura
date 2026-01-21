"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import { stripHtmlTags } from '@/utils/html'; // Import stripHtmlTags

interface ParallaxCardProps {
  imageUrl: string;
  title: string;
  description: string;
  rotationClass?: string;
  isMobile?: boolean; // Para saber si estamos en modo carrusel
  tourId: string; // Add tourId prop
}

const ParallaxCard: React.FC<ParallaxCardProps> = ({
  imageUrl,
  title,
  description,
  rotationClass,
  isMobile = false,
  tourId, // Destructure tourId
}) => {
  const cleanDescription = stripHtmlTags(description);

  return (
    <Card
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
          className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-110" // Apply zoom effect on hover
        />
      </div>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="text-gray-600 text-base">
          {cleanDescription}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to={`/tours/${tourId}`}> {/* Link to the new TourDetailsPage */}
            Ver Detalles
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ParallaxCard;