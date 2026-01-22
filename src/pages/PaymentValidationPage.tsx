"use client";

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Send, MessageSquare, ArrowLeft, Landmark, Copy, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

const PaymentValidationPage = () => {
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const [agency, setAgency] = useState<any>(null);

  useEffect(() => {
    const fetchAgency = async () => {
      const { data } = await supabase.from('agency_settings').select('*').single();
      if (data) setAgency(data);
    };
    fetchAgency();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
            <Send className="h-16 w-16 text-blue-600 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">Pago en Proceso de Validación</h1>
          <p className="text-xl text-gray-600">Hemos recibido tu notificación de abono para el folio <strong>{contractNumber}</strong>.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="shadow-2xl border-none rounded-3xl bg-gray-900 text-white overflow-hidden">
              <CardHeader className="p-8 border-b border-white/10">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="text-rosa-mexicano h-6 w-6" /> Próximos Pasos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="flex gap-4">
                  <div className="bg-rosa-mexicano h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                  <p className="text-sm opacity-90">Realiza tu transferencia por el monto acordado usando los datos bancarios adjuntos.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-rosa-mexicano h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                  <p className="text-sm opacity-90">Toma una captura de pantalla o foto legible de tu comprobante de pago.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-rosa-mexicano h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                  <p className="text-sm opacity-90 font-bold">Envía el comprobante por WhatsApp indicando tu folio: <strong>{contractNumber}</strong>.</p>
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700 h-14 rounded-2xl text-lg font-bold gap-2" onClick={() => window.open(`https://wa.me/528444041469?text=Hola, envío mi comprobante de pago para el folio ${contractNumber}`, '_blank')}>
                  <MessageSquare /> Enviar por WhatsApp
                </Button>
              </CardContent>
            </Card>

            <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-start gap-4">
              <ShieldCheck className="h-10 w-10 text-amber-600 shrink-0" />
              <div>
                <p className="font-black text-amber-900 text-sm uppercase tracking-tighter">Validación de Seguridad</p>
                <p className="text-xs text-amber-800">Un asesor confirmará tu abono en un plazo máximo de 12 horas hábiles. Recibirás un mensaje de confirmación una vez aplicado.</p>
              </div>
            </div>
          </div>

          <Card className="shadow-2xl border-none rounded-3xl overflow-hidden">
            <CardHeader className="bg-gray-100 border-b p-6">
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase">
                <Landmark className="text-rosa-mexicano" /> Datos para Transferencia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {agency?.bank_accounts?.map((bank: any) => (
                <div key={bank.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{bank.bank_name}</p>
                  <p className="font-black text-gray-900 mb-3">{bank.bank_holder}</p>
                  <div 
                    className="bg-white border-2 border-dashed rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-rosa-mexicano"
                    onClick={() => copyToClipboard(bank.bank_clabe, 'CLABE')}
                  >
                    <span className="font-mono font-bold text-lg">{bank.bank_clabe}</span>
                    <Copy className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
              <Button variant="outline" asChild className="w-full h-12 rounded-xl mt-4">
                <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentValidationPage;