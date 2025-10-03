"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const HelpCenterPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Centro de Ayuda de Saura Bus
          </h1>
          <p className="text-lg text-center mb-10">
            Encuentra soporte y recursos para tus preguntas y necesidades.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">¿Cómo podemos ayudarte?</h2>
            <p className="mb-4">
              Nuestro equipo de soporte está aquí para asistirte con cualquier duda o problema que puedas tener.
              Explora nuestras opciones de ayuda:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><a href="/bus-tickets/faq" className="text-bus-primary hover:underline">Preguntas Frecuentes (FAQ)</a>: Encuentra respuestas rápidas a las dudas más comunes.</li>
              <li><a href="/bus-tickets/contact" className="text-bus-primary hover:underline">Contacto</a>: Envíanos un mensaje o llámanos directamente.</li>
              <li>Guías de Reserva: Tutoriales paso a paso para reservar tus boletos.</li>
              <li>Estado de tu Viaje: Consulta información actualizada sobre tu tour.</li>
            </ul>
            <p className="mt-6">
              Estamos comprometidos a brindarte la mejor experiencia de viaje.
            </p>
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default HelpCenterPage;