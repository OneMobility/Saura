"use client";

import React from 'react';
import { MapPin, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const BusDestinationsSection = () => {
  const destinations = [
    { name: 'Cancún', description: 'Playas paradisíacas y vida nocturna vibrante.' },
    { name: 'Ciudad de México', description: 'Capital cultural con historia y modernidad.' },
    { name: 'San Miguel de Allende', description: 'Encanto colonial y arte en cada esquina.' },
    { name: 'Oaxaca', description: 'Tradición, gastronomía y artesanías únicas.' },
    { name: 'Guadalajara', description: 'Cuna del mariachi y el tequila.' },
    { name: 'Monterrey', description: 'Ciudad industrial rodeada de montañas.' },
  ];

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
      <div className="mx-auto bg-muted p-8 rounded-lg shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-bus-primary mb-10">
          Nuestros <span className="text-bus-secondary">Destinos</span> Populares
        </h2>
        <p className="text-lg text-center mb-12 max-w-2xl mx-auto">
          Descubre los lugares más increíbles a los que puedes viajar con Saura Bus.
          Desde playas soleadas hasta ciudades históricas, tu próxima aventura te espera.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((dest, index) => (
            <div key={index} className="bg-card p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex items-start space-x-4">
              <MapPin className="h-8 w-8 text-bus-primary shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-bus-foreground mb-2">{dest.name}</h3>
                <p className="text-muted-foreground text-base">{dest.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
            <Link to="/bus-tickets/destinations">
              <Bus className="mr-2 h-4 w-4" /> Ver Todos los Destinos
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BusDestinationsSection;