"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter'; // NEW: Import BusTicketsFooter
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const DestinationsPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Nuestros Destinos de Saura Bus
          </h1>
          <p className="text-lg text-center mb-10">
            Descubre los increíbles lugares a los que puedes viajar con nuestros boletos de autobús.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Explora México en Autobús</h2>
            <p className="mb-4">
              Ofrecemos rutas a las ciudades más vibrantes, playas paradisíacas y pueblos mágicos de México.
              Ya sea que busques aventura, relajación o cultura, tenemos un destino para ti.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Playas del Caribe: Cancún, Playa del Carmen, Tulum</li>
              <li>Ciudades Coloniales: San Miguel de Allende, Guanajuato, Oaxaca</li>
              <li>Aventuras Naturales: Chiapas, Huasteca Potosina</li>
              <li>Grandes Metrópolis: Ciudad de México, Guadalajara, Monterrey</li>
            </ul>
            <p className="mt-6">
              ¡Prepárate para una experiencia de viaje cómoda y segura con Saura Bus!
            </p>
          </div>
        </main>
        <BusTicketsFooter /> {/* NEW: Use BusTicketsFooter */}
      </div>
    </BusTicketsThemeProvider>
  );
};

export default DestinationsPage;