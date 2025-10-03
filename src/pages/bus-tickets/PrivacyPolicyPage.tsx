"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import Footer from '@/components/Footer';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';

const PrivacyPolicyPage = () => {
  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Política de Privacidad
          </h1>
          <p className="text-lg text-center mb-10">
            Tu privacidad es importante para nosotros. Conoce cómo manejamos tus datos.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg prose max-w-none">
            <h2>Introducción</h2>
            <p>
              En Boletos de Autobús (parte de Saura Tours), nos comprometemos a proteger tu privacidad.
              Esta Política de Privacidad describe cómo recopilamos, usamos y compartimos tu información
              personal cuando utilizas nuestros servicios de reserva de boletos de autobús.
            </p>

            <h2>Información que Recopilamos</h2>
            <p>Podemos recopilar la siguiente información personal:</p>
            <ul>
              <li><strong>Información de Contacto:</strong> Nombre, dirección de correo electrónico, número de teléfono, dirección postal.</li>
              <li><strong>Información de Reserva:</strong> Detalles del tour, asientos seleccionados, información de acompañantes (nombres, edades).</li>
              <li><strong>Información de Pago:</strong> Detalles de transacciones (no almacenamos información completa de tarjetas de crédito).</li>
              <li><strong>Información de Identificación:</strong> Número de identificación (INE, pasaporte, etc.) si es requerido para la reserva.</li>
            </ul>

            <h2>Cómo Usamos tu Información</h2>
            <p>Utilizamos tu información para:</p>
            <ul>
              <li>Procesar y confirmar tus reservas de boletos de autobús.</li>
              <li>Comunicarnos contigo sobre tu viaje, cambios o actualizaciones.</li>
              <li>Mejorar nuestros servicios y personalizar tu experiencia.</li>
              <li>Cumplir con nuestras obligaciones legales y reglamentarias.</li>
            </ul>

            <h2>Compartir tu Información</h2>
            <p>Podemos compartir tu información con:</p>
            <ul>
              <li>Proveedores de servicios de transporte (líneas de autobús) para la gestión de tu viaje.</li>
              <li>Proveedores de servicios de pago para procesar transacciones.</li>
              <li>Autoridades legales si es requerido por ley.</li>
            </ul>

            <h2>Seguridad de Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información
              personal contra el acceso no autorizado, la divulgación, la alteración o la destrucción.
            </p>

            <h2>Tus Derechos</h2>
            <p>Tienes derecho a acceder, corregir o eliminar tu información personal.
              Para ejercer estos derechos, por favor contáctanos a través de los canales de soporte.
            </p>

            <h2>Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre
              cualquier cambio significativo publicando la nueva política en nuestro sitio web.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default PrivacyPolicyPage;