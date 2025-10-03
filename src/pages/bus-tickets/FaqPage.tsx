"use client";

import React from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import Footer from '@/components/Footer';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FaqPage = () => {
  const faqs = [
    {
      question: "¿Cómo puedo reservar un boleto de autobús?",
      answer: "Puedes reservar tus boletos directamente en nuestra página de 'Boletos de Autobús'. Selecciona tu tour, elige tus asientos y completa el formulario de reserva con tus datos personales y de pago."
    },
    {
      question: "¿Qué métodos de pago aceptan?",
      answer: "Actualmente aceptamos pagos con tarjeta de crédito/débito a través de nuestra plataforma segura. Estamos trabajando para añadir más opciones de pago en el futuro."
    },
    {
      question: "¿Puedo cambiar o cancelar mi boleto?",
      answer: "Las políticas de cambio y cancelación varían según la compañía de autobús y la tarifa. Te recomendamos revisar los términos específicos de tu boleto al momento de la compra. En general, los boletos de autobús no son reembolsables o están sujetos a cargos por cambio."
    },
    {
      question: "¿Qué debo llevar el día del viaje?",
      answer: "Es indispensable que lleves una identificación oficial válida (INE, pasaporte, etc.) y tu confirmación de reserva (impresa o digital) para poder abordar el autobús."
    },
    {
      question: "¿Hay límite de equipaje?",
      answer: "Sí, cada compañía de autobús tiene sus propias políticas de equipaje en cuanto a peso, tamaño y número de piezas. Te sugerimos consultar directamente con la compañía de autobús para evitar inconvenientes."
    },
    {
      question: "¿Qué pasa si el autobús se retrasa o se cancela?",
      answer: "En caso de retrasos o cancelaciones, la responsabilidad recae directamente en la compañía de autobús. Te recomendamos contactar a la línea de autobús correspondiente para obtener información y posibles soluciones. Nosotros actuamos como intermediarios de la reserva."
    },
    {
      question: "¿Puedo viajar con niños o menores de edad?",
      answer: "Sí, los menores de edad pueden viajar, pero las políticas varían. Algunos requieren ir acompañados de un adulto, otros necesitan una autorización notarial si viajan solos o con un adulto que no es su padre/tutor. Por favor, verifica los requisitos específicos de la compañía de autobús."
    },
    {
      question: "¿Cómo puedo contactar al servicio al cliente?",
      answer: "Puedes contactarnos a través de la sección de 'Contacto' en nuestro sitio web, o directamente a los números de teléfono y correos electrónicos proporcionados por Saura Tours."
    }
  ];

  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Preguntas Frecuentes (FAQ)
          </h1>
          <p className="text-lg text-center mb-10">
            Encuentra respuestas a las preguntas más comunes sobre la reserva de boletos de autobús.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-lg font-semibold text-bus-primary hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-bus-foreground text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </main>
        <Footer />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default FaqPage;