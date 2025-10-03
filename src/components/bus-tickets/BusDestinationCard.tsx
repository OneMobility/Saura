"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BusDestinationCardProps {
  imageUrl: string;
  title: string;
  subtitle: string;
  link: string;
  gradientFromClass: string; // e.g., 'from-bus-primary/50'
  gradientToClass: string;   // e.g., 'to-bus-primary'
}

const BusDestinationCard: React.FC<BusDestinationCardProps> = ({
  imageUrl,
  title,
  subtitle,
  link,
  gradientFromClass,
  gradientToClass,
}) => {
  const isYellowGradient = gradientToClass.includes('to-bus-secondary');
  const textColorClass = isYellowGradient ? 'text-bus-primary' : 'text-white';

  return (
    <div className="relative h-64 rounded-lg overflow-hidden shadow-lg group">
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-105"
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t flex flex-col justify-end p-6 transition-all duration-300",
          gradientFromClass,
          gradientToClass
        )}
      >
        <h3 className={cn("text-2xl font-bold mb-2", textColorClass)}>{title}</h3>
        <p className={cn("text-sm mb-4 line-clamp-2", textColorClass)}>{subtitle}</p>
        <Button asChild className="w-1/2 self-start bg-white text-bus-primary hover:bg-gray-100">
          <Link to={link}>Más Información</Link>
        </Button>
      </div>
    </div>
  );
};

export default BusDestinationCard;