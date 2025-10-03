"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const AdditionalServicesPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Servicios Adicionales de Saura Bus
          </h1>
          <p className="text-lg text-center mb-10">
            Mejora tu experiencia de viaje con nuestros servicios extra.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Nuestros Servicios Complementarios</h2>
            <p className="mb-4">
              En Saura Bus, queremos que tu viaje sea lo más cómodo y completo posible.
              Por eso, te ofrecemos una variedad de servicios adicionales para que personalices tu experiencia:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Seguro de Viaje: Protege tu viaje contra imprevistos.</li>
              <li>Selección de Asientos Premium: Elige los mejores asientos con espacio extra.</li>
              <li>Paquetes de Snacks y Bebidas: Disfruta de un refrigerio durante tu trayecto.</li>
              <li>Transporte al Aeropuerto/Terminal: Facilita tus conexiones con traslados cómodos.</li>
              <li>Guías Turísticos Locales: Descubre los destinos con expertos.</li>
            </ul>
            <p className="mt-6">
              Consulta la disponibilidad y precios de estos servicios al momento de reservar tu boleto.
            </p>
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default AdditionalServicesPage;