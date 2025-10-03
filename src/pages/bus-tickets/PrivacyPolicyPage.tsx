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

const PrivacyPolicyPage = () => {
  const [policyContent, setPolicyContent] = useState<PolicyTermContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicyContent = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('policy_terms_settings')
        .select('title, content')
        .eq('page_type', 'privacy_policy')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Privacy Policy content:', error);
        setError('Error al cargar la Política de Privacidad.');
      } else if (data) {
        setPolicyContent(data);
      } else {
        setError('No hay Política de Privacidad disponible en este momento.');
      }
      setLoading(false);
    };
    fetchPolicyContent();
  }, []);

  if (loading) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
            <p className="ml-4 text-xl">Cargando política de privacidad...</p>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (error || !policyContent) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 text-center text-red-600">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Error</h1>
            <p className="text-xl">{error || 'No se pudo cargar la Política de Privacidad.'}</p>
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
            {policyContent.title}
          </h1>
          <div className="bg-card p-8 rounded-lg shadow-lg prose max-w-none mx-auto">
            <div dangerouslySetInnerHTML={{ __html: policyContent.content }} />
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default PrivacyPolicyPage;