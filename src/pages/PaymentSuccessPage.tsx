"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Calendar, User, MapPin, Printer, Search, Info } from 'lucide-react';
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
  const paidAmount = searchParams.get('amount'); 
  const paymentMethod = searchParams.get('method'); // Capturar método (stripe/mercadopago)
  
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
        // 1. Confirmar y abonar el monto exacto con el método detectado
        await supabase.functions.invoke('confirm-payment', {
          body: { 
            contractNumber: contractNumber.trim(), 
            method: paymentMethod || 'online',
            amount: paidAmount 
          },
        });
        
        // 2. Obtener detalles actualizados
        const { data, error } = await supabase.functions.invoke('get-public-contract-details', {
          body: { contractNumber: contractNumber.trim() },
        });
        
        if (!error) setDetails(data.contractDetails);
      } catch (err) {
        console.error(err);
        toast.error("Hubo un problema al reflejar tu abono, por favor contacta a soporte.");
      } finally {
        setLoading(false);
        setConfirmingPayment(false);
      }
    };
    processSuccess();
  }, [contractNumber, paidAmount, paymentMethod]);

  const handleGoToInquiry = () => {
    if (contractNumber) {
      navigate(`/?contract=${contractNumber.trim()}#consultar`);
    } else {
      navigate('/');
    }
  };

  if (loading || confirmingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Validando tu abono...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">¡Abono Registrado!</h1>
          <p className="text-xl text-gray-600">Tu pago ha sido procesado y aplicado a tu reserva correctamente.</p>
        </div>

        {details && (
          <div className="space-y-6">
            <Card className="shadow-2xl border-none overflow-hidden rounded-3xl">
              <CardHeader className="bg-gray-900 text-white p-8">
                <div className="flex flex-wrap justify-between items-center gap-6">
                  <div>
                    <Badge className="bg-rosa-mexicano text-white mb-2 border-none uppercase font-bold">Estado Actualizado</Badge>
                    <CardTitle className="text-3xl font-black">{details.tour_title}</CardTitle>
                    <CardDescription className="text-gray-400 mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {details.tour_description}
                    </CardDescription>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 text-center min-w-[150px]">
                    <p className="text-[10px] uppercase font-black tracking-widest text-rosa-mexicano">Contrato No.</p>
                    <p className="text-2xl font-black">{details.contract_number}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
                  <div className="space-y-2">
                    <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <User className="h-3 w-3" /> Titular
                    </h3>
                    <p className="text-xl font-bold">{details.first_name} {details.last_name}</p>
                    <p className="text-sm text-gray-500">{details.email}</p>
                  </div>
                  <div className="space-y-2 text-right md:text-left">
                    <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Saldo Abonado
                    </h3>
                    <p className="text-3xl font-black text-green-600">${details.total_paid.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Monto acumulado a la fecha</p>
                  </div>
                </div>

                <div className="pt-8 flex flex-wrap justify-center gap-4">
                  <Button variant="outline" className="h-12 border-gray-200 rounded-xl px-8" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Recibo
                  </Button>
                  <Button onClick={handleGoToInquiry} className="h-12 bg-rosa-mexicano hover:bg-rosa-mexicano/90 rounded-xl px-8 font-bold shadow-lg shadow-rosa-mexicano/20">
                    <Search className="mr-2 h-4 w-4" /> Consultar Estado Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;