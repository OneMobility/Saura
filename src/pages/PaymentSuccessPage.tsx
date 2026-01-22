"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Calendar, User, MapPin, Printer, Home, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contractNumber = searchParams.get('contract');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(true);

  useEffect(() => {
    const processSuccess = async () => {
      if (!contractNumber) {
        setLoading(false);
        setConfirmingPayment(false);
        return;
      }

      try {
        // 1. Confirmar y abonar el pago en la BD
        await supabase.functions.invoke('confirm-payment', {
          body: { contractNumber: contractNumber.trim(), method: 'online' },
        });
        setConfirmingPayment(false);

        // 2. Obtener detalles actualizados
        const { data, error } = await supabase.functions.invoke('get-public-contract-details', {
          body: { contractNumber: contractNumber.trim() },
        });
        if (!error) setDetails(data.contractDetails);
      } catch (err) {
        console.error(err);
        toast.error("Hubo un problema al actualizar tu saldo, pero tu pago fue recibido.");
      } finally {
        setLoading(false);
        setConfirmingPayment(false);
      }
    };
    processSuccess();
  }, [contractNumber]);

  const handleGoToInquiry = () => {
    // Redirigir a la home con el parámetro de contrato y el ancla a la sección
    navigate(`/?contract=${contractNumber}#consultar`);
  };

  if (loading || confirmingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Acreditando tu pago y generando contrato...</p>
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
          <h1 className="text-4xl font-black text-gray-900 mb-2">¡Pago Confirmado!</h1>
          <p className="text-xl text-gray-600">Tu lugar está asegurado. Le daremos seguimiento personalizado a tu viaje.</p>
        </div>

        {details && (
          <div className="space-y-6">
            <Card className="shadow-2xl border-none overflow-hidden rounded-3xl">
              <CardHeader className="bg-gray-900 text-white p-8">
                <div className="flex flex-wrap justify-between items-center gap-6">
                  <div>
                    <Badge className="bg-rosa-mexicano text-white mb-2 border-none uppercase font-bold">Contrato Confirmado</Badge>
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
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8 flex gap-4 items-start">
                  <Info className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                  <div className="text-blue-900">
                    <p className="font-bold text-lg mb-1 text-blue-950">Información Importante sobre tus Pagos:</p>
                    <p className="text-base opacity-90">
                      Recuerda que puedes realizar tus abonos de forma <span className="font-bold">semanal o quincenal</span>. El viaje debe estar <span className="font-bold uppercase underline">totalmente cubierto antes de abordar</span>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
                  <div className="space-y-4">
                    <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" /> Titular
                    </h3>
                    <p className="text-xl font-bold">{details.first_name} {details.last_name}</p>
                    <p className="text-gray-500">{details.email}</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Reserva
                    </h3>
                    <p className="text-lg font-bold">Asientos: {details.assigned_seat_numbers.join(', ')}</p>
                    <p className="text-gray-500">{details.number_of_people} Personas</p>
                  </div>
                </div>

                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Abonado</p>
                    <p className="text-4xl font-black text-green-600">${details.total_paid.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button variant="outline" className="h-12 border-gray-200 rounded-xl" onClick={() => window.print()}>
                      <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                    <Button asChild className="h-12 bg-rosa-mexicano hover:bg-rosa-mexicano/90 rounded-xl">
                      <button onClick={() => navigate('/')}>
                        Ir al Inicio
                      </button>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center gap-6 border-2 border-dashed border-gray-200">
              <div className="bg-rosa-mexicano/10 p-4 rounded-2xl">
                <Search className="h-10 w-10 text-rosa-mexicano" />
              </div>
              <div className="text-center md:text-left flex-grow">
                <h4 className="text-xl font-black text-gray-900">¿Quieres revisar tu avance?</h4>
                <p className="text-gray-600">Haz clic en el botón para ver tu contrato completo y realizar nuevos abonos para tu viaje <strong>#{details.contract_number}</strong>.</p>
              </div>
              <Button onClick={handleGoToInquiry} variant="secondary" className="bg-gray-900 hover:bg-black text-white h-14 font-bold px-8 rounded-2xl shadow-lg">
                Consultar Mi Reserva <Search className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;