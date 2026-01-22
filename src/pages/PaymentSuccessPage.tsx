"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Calendar, User, MapPin, Printer, Search, ShieldCheck, Wallet } from 'lucide-react';
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
  const paymentMethod = searchParams.get('method');
  
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(true);

  useEffect(() => {
    const processVerification = async () => {
      if (!contractNumber) {
        setLoading(false);
        setConfirmingPayment(false);
        return;
      }

      try {
        // 1. Confirmar el abono en el servidor (Edge Function)
        await supabase.functions.invoke('confirm-payment', {
          body: { 
            contractNumber: contractNumber.trim(), 
            method: paymentMethod || 'online',
            amount: paidAmount 
          },
        });
        
        // 2. Obtener detalles actualizados del contrato para mostrar al cliente
        const { data, error } = await supabase.functions.invoke('get-public-contract-details', {
          body: { contractNumber: contractNumber.trim() },
        });
        
        if (!error) {
          setDetails(data.contractDetails);
          toast.success("¡Pago verificado y aplicado correctamente!");
        }
      } catch (err) {
        console.error(err);
        toast.error("Hubo un problema al reflejar tu abono. Tu pago es seguro, contacta a soporte para validación manual.");
      } finally {
        setLoading(false);
        setConfirmingPayment(false);
      }
    };
    processVerification();
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
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Loader2 className="h-16 w-16 animate-spin text-rosa-mexicano mx-auto" />
            <ShieldCheck className="h-6 w-6 text-rosa-mexicano absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xl font-black text-gray-800 animate-pulse uppercase tracking-tighter">Verificando tu Pago...</p>
          <p className="text-gray-500 text-sm">Esto tomará solo unos segundos. No cierres esta pestaña.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">¡Pago Confirmado!</h1>
          <p className="text-lg text-gray-600">Tu abono ha sido validado y aplicado a tu folio de reserva.</p>
        </div>

        {details && (
          <div className="space-y-6">
            <Card className="shadow-2xl border-none overflow-hidden rounded-3xl">
              <CardHeader className="bg-gray-900 text-white p-8">
                <div className="flex flex-wrap justify-between items-center gap-6">
                  <div>
                    <Badge className="bg-rosa-mexicano text-white mb-2 border-none uppercase font-black tracking-widest text-[10px]">Verificación Exitosa</Badge>
                    <CardTitle className="text-3xl font-black">{details.tour_title}</CardTitle>
                    <CardDescription className="text-gray-400 mt-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {details.tour_description}
                    </CardDescription>
                  </div>
                  <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10 text-center min-w-[160px]">
                    <p className="text-[10px] uppercase font-black tracking-widest text-rosa-mexicano">Folio</p>
                    <p className="text-3xl font-black">{details.contract_number}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3 text-rosa-mexicano" /> Titular de Reserva
                      </h3>
                      <p className="text-xl font-bold">{details.first_name} {details.last_name}</p>
                      <p className="text-sm text-gray-500">{details.email}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <Wallet className="h-3 w-3 text-rosa-mexicano" /> Método de Pago
                      </h3>
                      <p className="text-sm font-bold uppercase text-gray-700">{paymentMethod || 'Pago en línea'}</p>
                    </div>
                  </div>

                  <div className="space-y-6 text-right md:text-left md:border-l md:pl-8">
                    <div>
                      <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">Monto Recibido</h3>
                      <p className="text-4xl font-black text-green-600">${parseFloat(paidAmount || '0').toLocaleString()}</p>
                    </div>
                    <div>
                      <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">Saldo Pendiente</h3>
                      <p className="text-2xl font-black text-red-600">${(details.total_amount - details.total_paid).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-14 border-gray-200 rounded-2xl px-8 font-bold" onClick={() => window.print()}>
                    <Printer className="mr-2 h-5 w-5" /> Imprimir Recibo de Pago
                  </Button>
                  <Button onClick={handleGoToInquiry} className="h-14 bg-rosa-mexicano hover:bg-rosa-mexicano/90 rounded-2xl px-8 font-black shadow-lg shadow-rosa-mexicano/20 uppercase tracking-tighter">
                    <Search className="mr-2 h-5 w-5" /> Consultar Estado Completo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-gray-400 text-sm">¿Tienes dudas con tu pago? <button onClick={() => window.open(`https://wa.me/528444041469`, '_blank')} className="text-rosa-mexicano font-bold underline">Contacta a un asesor</button></p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccessPage;