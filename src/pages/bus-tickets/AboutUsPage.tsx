"use client";

import React, { useEffect, useState } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AboutUsContent {
  title: string;
  content: string;
  image_url: string | null;
}

const AboutUsPage = () => {
  const [aboutUsContent, setAboutUsContent] = useState<AboutUsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAboutUsContent = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('about_us_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
        console.error('Error fetching About Us content:', error);
        setError('Error al cargar la información de "Sobre Nosotros".');
      } else if (data) {
        setAboutUsContent(data);
      } else {
        setError('No hay contenido de "Sobre Nosotros" disponible en este momento.');
      }
      setLoading(false);
    };
    fetchAboutUsContent();
  }, []);

  if (loading) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
            <p className="ml-4 text-xl">Cargando información...</p>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (error || !aboutUsContent) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 text-center text-red-600">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Error</h1>
            <p className="text-xl">{error || 'No se pudo cargar la información de "Sobre Nosotros".'}</p>
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
            {aboutUsContent.title}
          </h1>
          <div className="bg-card p-8 rounded-lg shadow-lg prose max-w-none mx-auto">
            {aboutUsContent.image_url && (
              <img
                src={aboutUsContent.image_url}
                alt={aboutUsContent.title}
                className="w-full h-64 object-cover rounded-lg mb-8"
              />
            )}
            <div dangerouslySetInnerHTML={{ __html: aboutUsContent.content }} />
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default AboutUsPage;