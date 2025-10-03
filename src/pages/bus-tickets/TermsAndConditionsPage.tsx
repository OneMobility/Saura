"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import Footer from '@/components/Footer';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const TermsAndConditionsPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Términos y Condiciones
          </h1>
          <p className="text-lg text-center mb-10">
            Lee atentamente nuestros términos antes de reservar tus boletos.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg prose max-w-none">
            <h2>1. Aceptación de los Términos</h2>
            <p>
              Al reservar boletos de autobús a través de nuestro sitio web (parte de Saura Tours),
              aceptas los siguientes términos y condiciones. Si no estás de acuerdo con ellos,
              te pedimos que no utilices nuestros servicios.
            </p>

            <h2>2. Naturaleza del Servicio</h2>
            <p>
              Actuamos como intermediarios entre tú y las compañías de autobuses.
              No somos responsables de los servicios de transporte directamente.
              Cualquier problema relacionado con el viaje (retrasos, cancelaciones,
              pérdida de equipaje) debe ser tratado directamente con la compañía de autobús.
            </p>

            <h2>3. Reservas y Pagos</h2>
            <ul>
              <li>Todas las reservas están sujetas a disponibilidad.</li>
              <li>Los precios mostrados son finales e incluyen impuestos, a menos que se indique lo contrario.</li>
              <li>El pago debe realizarse en su totalidad al momento de la reserva.</li>
              <li>No almacenamos información sensible de tarjetas de crédito.</li>
            </ul>

            <h2>4. Cancelaciones y Cambios</h2>
            <ul>
              <li>Las políticas de cancelación y cambio varían según la compañía de autobús y la tarifa seleccionada.
                Por favor, revisa las condiciones específicas de tu boleto antes de confirmar la compra.</li>
              <li>Generalmente, los boletos no son reembolsables o están sujetos a cargos por cambio.</li>
            </ul>

            <h2>5. Documentación y Requisitos de Viaje</h2>
            <p>
              Es tu responsabilidad asegurarte de tener toda la documentación necesaria para viajar
              (identificación oficial, visas, permisos, etc.). No somos responsables si se te niega
              el embarque debido a la falta de documentos.
            </p>

            <h2>6. Equipaje</h2>
            <p>
              Las políticas de equipaje (peso, tamaño, número de piezas) son establecidas por cada
              compañía de autobús. Te recomendamos consultarlas directamente.
            </p>

            <h2>7. Conducta del Pasajero</h2>
            <p>
              Debes cumplir con las normas de conducta establecidas por la compañía de autobús
              y las leyes locales. Nos reservamos el derecho de cancelar tu reserva si tu conducta
              es inapropiada o pone en riesgo a otros pasajeros.
            </p>

            <h2>8. Limitación de Responsabilidad</h2>
            <p>
              No seremos responsables por daños, pérdidas, lesiones o inconvenientes que surjan
              durante tu viaje, salvo que sean resultado directo de nuestra negligencia comprobada
              en la gestión de la reserva.
            </p>

            <h2>9. Ley Aplicable y Jurisdicción</h2>
            <p>
              Estos términos se rigen por las leyes de México. Cualquier disputa se someterá
              a la jurisdicción de los tribunales de Saltillo, Coahuila.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default TermsAndConditionsPage;