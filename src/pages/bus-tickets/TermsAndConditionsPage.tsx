"use client";

import React, { useEffect, useState } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface PolicyTermContent {
  title: string;
  content: string;
}

const TermsAndConditionsPage = () => {
  const [termsContent, setTermsContent] = useState<PolicyTermContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTermsContent = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('policy_terms_settings')
        .select('title, content')
        .eq('page_type', 'terms_and_conditions')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Terms and Conditions content:', error);
        setError('Error al cargar los Términos y Condiciones.');
      } else if (data) {
        setTermsContent(data);
      } else {
        setError('No hay Términos y Condiciones disponibles en este momento.');
      }
      setLoading(false);
    };
    fetchTermsContent();
  }, []);

  if (loading) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
            <p className="ml-4 text-xl">Cargando términos y condiciones...</p>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (error || !termsContent) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 text-center text-red-600">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Error</h1>
            <p className="text-xl">{error || 'No se pudieron cargar los Términos y Condiciones.'}</p>
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
            {termsContent.title}
          </h1>
          <div className="bg-card p-8 rounded-lg shadow-lg prose max-w-none mx-auto">
            <div dangerouslySetInnerHTML={{ __html: termsContent.content }} />
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default TermsAndConditionsPage;