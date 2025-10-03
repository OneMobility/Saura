"use client";

import React, { useEffect, useState } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading state

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order_index: number;
}

const FaqPage = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('faq_settings')
        .select('id, question, answer, order_index')
        .order('order_index', { ascending: true }); // Order by order_index

      if (error) {
        console.error('Error fetching FAQs for public page:', error);
        setError('Error al cargar las preguntas frecuentes.');
        setFaqs([]);
      } else {
        setFaqs(data || []);
      }
      setLoading(false);
    };

    fetchFaqs();
  }, []);

  if (loading) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
            <p className="ml-4 text-xl">Cargando preguntas frecuentes...</p>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (error) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 text-center text-red-600">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Error</h1>
            <p className="text-xl">{error}</p>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            Preguntas Frecuentes (FAQ) de Saura Bus
          </h1>
          <p className="text-lg text-center mb-10">
            Encuentra respuestas a las preguntas más comunes sobre la reserva de boletos de autobús.
          </p>
          <div className="bg-card p-8 rounded-lg shadow-lg">
            {faqs.length === 0 ? (
              <p className="text-center text-muted-foreground text-lg">No hay preguntas frecuentes disponibles en este momento.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.id} value={`item-${index}`}>
                    <AccordionTrigger className="text-lg font-semibold text-bus-primary hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-bus-foreground text-base">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default FaqPage;