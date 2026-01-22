"use client";

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Search, ArrowRight, Info, Landmark, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TourConfirmationPage = () => {
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgencyData = async () => {
      const { data } = await supabase.from('agency_settings').select('*').single();
      if (data) setAgency(data);
      setLoading(false);
    };
    fetchAgencyData();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

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
      <main className="flex-grow container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">¡Reserva Registrada!</h1>
          <p className="text-xl text-gray-600">Tu lugar ha sido apartado temporalmente.</p>
        </div>

        {/* ALERTA ANIMADA DE 24 HORAS */}
        <div className="mb-8 animate-bounce transition-all">
          <div className="bg-red-600 text-white p-6 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 border-4 border-white">
            <AlertTriangle className="h-14 w-14 shrink-0" />
            <div className="text-center md:text-left">
              <p className="text-xl font-black uppercase tracking-tighter leading-tight">
                ¡RECUERDA QUE DEBES ENVIAR TU COMPROBANTE!
              </p>
              <p className="text-sm font-bold opacity-90">
                TIENES SOLO <span className="underline decoration-2">24 HORAS</span> O TUS LUGARES QUEDARÁN DISPONIBLES NUEVAMENTE.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-2xl border-none overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-900 text-white p-8 text-center">
              <p className="text-[10px] uppercase font-black tracking-widest text-rosa-mexicano mb-2">Folio de Reserva</p>
              <CardTitle className="text-5xl font-black tracking-tighter">{contractNumber}</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-blue-900 text-sm">
                  <p className="font-bold mb-1">Pagos Posteriores:</p>
                  <p>Puedes abonar de forma semanal o quincenal para liquidar el 100% antes de viajar.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 h-14 text-lg font-bold rounded-2xl">
                  <Link to={`/?contract=${contractNumber}#consultar`}>
                    <Search className="mr-2 h-5 w-5" /> Consultar mi Estado
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-12 rounded-xl border-gray-200">
                  <Link to="/">Volver al Inicio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* DATOS BANCARIOS */}
          <Card className="shadow-2xl border-none rounded-3xl overflow-hidden">
            <CardHeader className="bg-gray-100 border-b p-6">
              <CardTitle className="text-lg flex items-center gap-2 font-black uppercase">
                <Landmark className="text-rosa-mexicano" /> Datos Bancarios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {agency?.bank_accounts && agency.bank_accounts.length > 0 ? (
                agency.bank_accounts.map((bank: any) => (
                  <div key={bank.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 relative group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{bank.bank_name}</p>
                        <p className="font-black text-gray-900">{bank.bank_holder}</p>
                      </div>
                      <Badge className="bg-rosa-mexicano">CLABE</Badge>
                    </div>
                    <div 
                      className="bg-white border rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-rosa-mexicano transition-colors"
                      onClick={() => copyToClipboard(bank.bank_clabe, 'CLABE')}
                    >
                      <span className="font-mono font-bold tracking-tighter text-lg">{bank.bank_clabe}</span>
                      <Copy className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Landmark className="mx-auto mb-2 opacity-20 h-12 w-12" />
                  <p>No hay cuentas registradas. Contacta a un asesor.</p>
                </div>
              )}
              
              <div className="pt-2 text-center">
                <p className="text-xs text-gray-500 italic">Al finalizar tu transferencia, envía el comprobante por WhatsApp indicando tu número de folio.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TourConfirmationPage;