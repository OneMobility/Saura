"use client";

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, Calendar, Search, ArrowRight, MessageSquare, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';

const TourConfirmationPage = () => {
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!contractNumber) return;
      try {
        const { data, error } = await supabase.functions.invoke('get-public-contract-details', {
          body: { contractNumber: contractNumber.trim() },
        });
        if (!error) setDetails(data.contractDetails);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [contractNumber]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-16 max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">¡Reserva Registrada!</h1>
          <p className="text-xl text-gray-600">Tu lugar ha sido apartado con éxito.</p>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden rounded-3xl mb-8">
          <CardHeader className="bg-gray-900 text-white p-8 text-center">
            <p className="text-[10px] uppercase font-black tracking-widest text-rosa-mexicano mb-2">Número de Contrato</p>
            <CardTitle className="text-5xl font-black tracking-tighter">{contractNumber}</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex gap-4 items-start">
              <Info className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-blue-900">
                <p className="font-bold text-lg mb-1">Recordatorio importante:</p>
                <p className="text-base leading-relaxed">
                  Puedes realizar tus abonos de forma <strong>semanal o quincenal</strong>. 
                  Recuerda que el viaje debe estar liquidado al 100% antes del día del abordaje. 
                  ¡Estamos listos para tu próxima aventura!
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-grow bg-rosa-mexicano hover:bg-rosa-mexicano/90 h-14 text-lg font-bold rounded-2xl">
                <Link to={`/?contract=${contractNumber}#consultar`}>
                  <Search className="mr-2 h-5 w-5" /> Consultar mi Estado
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-grow h-14 text-lg font-bold rounded-2xl border-gray-200">
                <Link to="/">
                  Volver al Inicio <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-gray-400 text-sm">
          Se ha enviado un correo con los detalles de tu reserva. Si tienes dudas, contáctanos por WhatsApp.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default TourConfirmationPage;