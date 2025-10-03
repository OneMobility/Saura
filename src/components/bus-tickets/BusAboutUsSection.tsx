"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

const BusAboutUsSection = () => {
  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-secondary text-bus-secondary-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-bus-primary mb-6">
          Sobre Saura Bus
        </h2>
        <p className="text-lg mb-8">
          Saura Bus, parte de Saura Tours, te ofrece una forma cómoda y segura de viajar por México.
          Nos dedicamos a conectar personas con sus destinos favoritos, garantizando una experiencia
          de reserva sencilla y un servicio de calidad en cada trayecto.
        </p>
        <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
          <Link to="/bus-tickets/about">
            <Info className="mr-2 h-4 w-4" /> Conoce Más
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default BusAboutUsSection;