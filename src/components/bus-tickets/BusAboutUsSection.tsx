"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

const BusAboutUsSection = () => {
  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-white text-bus-foreground">
      <div className="max-w-6xl mx-auto p-8 bg-bus-primary rounded-lg shadow-md">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          {/* Columna del Contenido de Texto (a la izquierda) */}
          <div className="text-center lg:text-left mb-8 lg:mb-0">
            <h2 className="text-3xl md:text-4xl font-bold text-bus-primary-foreground mb-6">
              Sobre <span className="text-bus-secondary">Saura</span> Bus
            </h2>
            <p className="text-lg mb-8 text-bus-primary-foreground">
              Saura Bus, parte de Saura Tours, te ofrece una forma cómoda y segura de viajar por México.
              Nos dedicamos a conectar personas con sus destinos favoritos, garantizando una experiencia
              de reserva sencilla y un servicio de calidad en cada trayecto.
            </p>
            <Button asChild className="bg-bus-secondary hover:bg-bus-secondary/90 text-bus-secondary-foreground">
              <Link to="/bus-tickets/about">
                {/* Envuelve el icono y el texto en un solo span */}
                <span>
                  <Info className="mr-2 h-4 w-4 inline-block align-middle" /> Conoce Más
                </span>
              </Link>
            </Button>
          </div>
          {/* Columna de la Imagen (a la derecha, dentro de la caja azul) */}
          <div className="flex justify-center lg:justify-end">
            <img
              src="https://images.unsplash.com/photo-1544620347-c4fd4a8d462c?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Autobús de Saura Bus"
              className="w-full max-w-sm h-64 md:h-80 object-cover rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusAboutUsSection;