"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Calendar, User, MapPin, Printer, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const contractNumber = searchParams.get('contract');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!contractNumber) {
        setLoading(false);
        return;
      }
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
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Validando tu pago y cargando detalles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">¡Pago Confirmado Exitosamente!</h1>
          <p className="text-xl text-gray-600">Tu lugar está asegurado. ¡Prepárate para la aventura!</p>
        </div>

        {details ? (
          <Card className="shadow-2xl border-none overflow-hidden rounded-3xl animate-in zoom-in-95 duration-500">
            <CardHeader className="bg-gray-900 text-white p-8">
              <div className="flex flex-wrap justify-between items-center gap-6">
                <div>
                  <Badge className="bg-rosa-mexicano text-white mb-2 border-none">Contrato Confirmado</Badge>
                  <CardTitle className="text-3xl font-black">{details.tour_title}</CardTitle>
                  <CardDescription className="text-gray-400 mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {details.tour_description}
                  </CardDescription>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 text-center min-w-[150px]">
                  <p className="text-[10px] uppercase font-black tracking-widest text-rosa-mexicano">Número de Reserva</p>
                  <p className="text-2xl font-black">{details.contract_number}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
                <div className="space-y-4">
                  <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest mb-4">Titular de la Reserva</h3>
                  <div className="flex items-center gap-4">
                    <div className="bg-rosa-mexicano/10 p-3 rounded-full">
                      <User className="h-6 w-6 text-rosa-mexicano" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{details.first_name} {details.last_name}</p>
                      <p className="text-gray-500">{details.email}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest mb-4">Resumen del Viaje</h3>
                  <div className="flex items-center gap-4">
                    <div className="bg-rosa-mexicano/10 p-3 rounded-full">
                      <Calendar className="h-6 w-6 text-rosa-mexicano" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">Asientos: {details.assigned_seat_numbers.join(', ')}</p>
                      <p className="text-gray-500">{details.number_of_people} Personas</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Monto Pagado</p>
                  <p className="text-4xl font-black text-green-600">${details.total_paid.toLocaleString()} <span className="text-sm font-normal text-gray-400">MXN</span></p>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="h-12 border-gray-200 rounded-xl" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
                  </Button>
                  <Button asChild className="h-12 bg-rosa-mexicano hover:bg-rosa-mexicano/90 rounded-xl">
                    <Link to="/">
                      Ir al Inicio <Home className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center p-12 bg-white rounded-3xl shadow-xl">
            <p className="text-gray-500 mb-6">No pudimos cargar los detalles del contrato en este momento, pero tu pago ha sido procesado.</p>
            <Button asChild className="bg-rosa-mexicano">
              <Link to="/">Volver al Inicio</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;