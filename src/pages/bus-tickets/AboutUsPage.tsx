"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter'; // NEW: Import BusTicketsFooter
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const AboutUsPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Sobre Saura Bus
          </h1>
          <p className="text-lg text-center mb-10">
            Conoce más sobre nuestra misión y compromiso con tus viajes.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Nuestra Historia</h2>
            <p className="mb-4">
              En Saura Bus, somos parte de Saura Tours, una agencia dedicada a hacer tus sueños de viaje realidad.
              Con años de experiencia en la industria turística, hemos expandido nuestros servicios para ofrecerte
              la mejor experiencia en transporte terrestre, conectándote con los destinos más bellos de México.
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Nuestra Misión</h2>
            <p className="mb-4">
              Facilitar viajes cómodos, seguros y accesibles para todos, garantizando una experiencia de reserva sencilla
              y un servicio al cliente excepcional. Creemos que cada viaje es una oportunidad para crear recuerdos inolvidables.
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Nuestro Compromiso</h2>
            <p>
              Estamos comprometidos con la calidad, la transparencia y la satisfacción del cliente. Trabajamos con
              las mejores líneas de autobús y nos esforzamos por ofrecerte las mejores tarifas y opciones para que
              tu aventura comience desde el momento en que reservas con nosotros.
            </p>
          </div>
        </main>
        <BusTicketsFooter /> {/* NEW: Use BusTicketsFooter */}
      </div>
    </BusTicketsThemeProvider>
  );
};

export default AboutUsPage;