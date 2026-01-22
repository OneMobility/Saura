"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare, CreditCard, FileText, FileSignature, Calendar, User, MapPin, Armchair, Info, CheckCircle2, DollarSign, XCircle, AlertCircle, Printer, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TourInquirySection = () => {
  const [searchParams] = useSearchParams();
  const [contractNumber, setContractNumber] = useState('');
  const [contractDetails, setContractDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleInquiry = useCallback(async (customNumber?: string) => {
    const numberToQuery = (customNumber || contractNumber).trim();
    if (!numberToQuery) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-public-contract-details', {
        body: { contractNumber: numberToQuery.toUpperCase() },
      });
      if (error) throw error;
      setContractDetails(data.contractDetails);
      const remaining = data.contractDetails.total_amount - data.contractDetails.total_paid;
      setPaymentAmount(remaining.toString());
    } catch (err) {
      toast.error('Contrato no encontrado.');
      setContractDetails(null);
    } finally {
      setLoading(false);
    }
  }, [contractNumber]);

  useEffect(() => {
    const folio = searchParams.get('contract');
    if (folio) { setContractNumber(folio); handleInquiry(folio); }
  }, [searchParams, handleInquiry]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('agency_settings').select('*').single();
      setAgencySettings(data);
    };
    fetchSettings();
  }, []);

  const handleDownloadDoc = async (functionName: string, label: string) => {
    if (!contractDetails) return;
    setIsDownloading(functionName);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { contractNumber: contractDetails.contract_number }
      });
      if (error) throw error;
      
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(data);
        newWindow.document.close();
        // Esperar un momento a que carguen las fuentes/estilos antes de imprimir
        setTimeout(() => newWindow.print(), 500);
      }
    } catch (err) {
      toast.error(`Error al generar ${label}`);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleOnlinePayment = async (method: 'mercadopago' | 'stripe') => {
    if (!contractDetails) return;
    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) return toast.error('Monto inválido.');
    
    setIsPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke(`${method}-checkout`, {
        body: { clientId: contractDetails.id, amount: amountToPay, description: `Abono: ${contractDetails.contract_number}`, contractNumber: contractDetails.contract_number }
      });
      if (error) throw error;
      window.location.href = method === 'mercadopago' ? data.init_point : data.url;
    } catch (error) { toast.error('Error al iniciar pago.'); } finally { setIsPaying(false); }
  };

  if (loading) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-12 w-12 text-white" /></div>;

  return (
    <section id="consultar" ref={sectionRef} className="py-16 px-4 md:px-8 lg:px-16 bg-rosa-mexicano text-white scroll-mt-20">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-black mb-10 uppercase tracking-tight">Oficina Virtual: Consulta tu Contrato</h2>
        <div className="flex gap-2 max-w-md mx-auto mb-12 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20">
          <Input className="bg-white text-black h-12 text-lg rounded-xl border-none" placeholder="Folio (Ej: ABC1234)" value={contractNumber} onChange={e => setContractNumber(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleInquiry()} />
          <Button onClick={() => handleInquiry()} className="bg-white text-rosa-mexicano hover:bg-gray-100 h-12 px-8 font-bold rounded-xl">Consultar</Button>
        </div>

        {contractDetails && (
          <div className="bg-white text-black rounded-3xl shadow-2xl overflow-hidden text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header del contrato */}
            <div className={cn("p-8 flex flex-wrap justify-between items-center text-white gap-6", contractDetails.status === 'cancelled' ? "bg-red-600" : "bg-gray-900")}>
              <div className="space-y-1">
                <Badge className={cn("mb-2 border-none font-black uppercase", contractDetails.status === 'cancelled' ? "bg-white text-red-600" : "bg-rosa-mexicano text-white")}>
                  {contractDetails.status === 'cancelled' ? 'Reserva Cancelada' : 'Reserva Activa'}
                </Badge>
                <h3 className="text-3xl md:text-4xl font-black tracking-tighter">{contractDetails.tour_title}</h3>
                <p className="text-gray-400 flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" /> Registro: {format(parseISO(contractDetails.created_at), 'PPP', { locale: es })}</p>
              </div>
              <div className="text-center bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm min-w-[180px]">
                <p className="text-[10px] uppercase font-black tracking-widest text-rosa-mexicano">Folio Oficial</p>
                <p className="text-3xl font-black">{contractDetails.contract_number}</p>
              </div>
            </div>

            {/* Alerta de cancelación si aplica */}
            {contractDetails.status === 'cancelled' && (
              <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-full"><XCircle className="text-red-600 h-6 w-6" /></div>
                <div>
                  <h4 className="font-black text-red-900 uppercase text-xs tracking-widest">Estado de la reserva:</h4>
                  <p className="text-red-700 font-bold">{contractDetails.cancel_reason || 'Esta reserva ha sido dada de baja.'}</p>
                </div>
              </div>
            )}

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Columna Izquierda: Datos y Documentos */}
              <div className="lg:col-span-2 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                       <User className="h-3 w-3 text-rosa-mexicano" /> Información del Titular
                    </Label>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{contractDetails.first_name} {contractDetails.last_name}</p>
                      <p className="text-sm text-gray-500 font-medium">{contractDetails.email}</p>
                      <p className="text-sm text-gray-500 font-medium">{contractDetails.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                       <Armchair className="h-3 w-3 text-rosa-mexicano" /> Asignación Logística
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {contractDetails.assigned_seat_numbers.map((s: number) => (
                        <div key={s} className="bg-gray-100 px-3 py-1 rounded-lg border flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400">SILLA</span>
                          <span className="font-black text-rosa-mexicano">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sección de Documentos */}
                <div className="pt-8 border-t border-gray-100">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block">Documentación Oficial</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-16 justify-between px-6 rounded-2xl border-gray-200 hover:border-rosa-mexicano hover:bg-rosa-mexicano/5 transition-all group"
                      onClick={() => handleDownloadDoc('generate-service-contract', 'Contrato')}
                      disabled={!!isDownloading}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-rosa-mexicano/10 p-2 rounded-xl text-rosa-mexicano group-hover:scale-110 transition-transform">
                          <FileSignature className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-sm">Contrato de Servicio</p>
                          <p className="text-[10px] text-gray-400 font-bold">VALIDEZ LEGAL</p>
                        </div>
                      </div>
                      {isDownloading === 'generate-service-contract' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-gray-300" />}
                    </Button>

                    <Button 
                      variant="outline" 
                      className="h-16 justify-between px-6 rounded-2xl border-gray-200 hover:border-rosa-mexicano hover:bg-rosa-mexicano/5 transition-all group"
                      onClick={() => handleDownloadDoc('generate-booking-sheet', 'Hoja de Reserva')}
                      disabled={!!isDownloading}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-2 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-sm">Hoja de Confirmación</p>
                          <p className="text-[10px] text-gray-400 font-bold">LOGÍSTICA / PAGOS</p>
                        </div>
                      </div>
                      {isDownloading === 'generate-booking-sheet' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-gray-300" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Estado Financiero */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="h-12 w-12" /></div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b pb-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inversión Total</span>
                      <span className="font-bold text-gray-600">${contractDetails.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end border-b pb-4">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Abonado</span>
                      <span className="font-bold text-green-600">${contractDetails.total_paid.toLocaleString()}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Saldo Pendiente:</span>
                      <span className={cn(
                        "text-4xl font-black tracking-tighter", 
                        contractDetails.status === 'cancelled' ? "text-gray-300" : "text-red-600"
                      )}>
                        ${(contractDetails.total_amount - contractDetails.total_paid).toLocaleString()}
                      </span>
                    </div>

                    {contractDetails.status !== 'cancelled' && contractDetails.total_paid < contractDetails.total_amount && (
                      <div className="space-y-4 pt-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase">Monto a abonar hoy:</Label>
                          <Input 
                            type="number" 
                            value={paymentAmount} 
                            onChange={e => setPaymentAmount(e.target.value)} 
                            className="h-12 text-lg font-black rounded-xl border-2 focus:border-rosa-mexicano" 
                            placeholder="Monto" 
                          />
                        </div>
                        <Button 
                          onClick={() => handleOnlinePayment('mercadopago')} 
                          className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black rounded-2xl shadow-lg shadow-blue-200 text-lg gap-3"
                          disabled={isPaying}
                        >
                          {isPaying ? <Loader2 className="animate-spin" /> : <CreditCard />}
                          Abonar con Tarjeta
                        </Button>
                        <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-tighter">PAGO SEGURO VÍA MERCADO PAGO</p>
                      </div>
                    )}

                    {contractDetails.total_paid >= contractDetails.total_amount && (
                      <div className="p-4 bg-green-100 text-green-700 rounded-2xl text-center font-black flex items-center justify-center gap-3 border-2 border-green-200 animate-pulse">
                        <CheckCircle2 className="h-6 w-6" /> TOUR LIQUIDADO
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  className="w-full text-rosa-mexicano font-black hover:bg-rosa-mexicano/5 h-12 rounded-xl"
                  onClick={() => window.open(`https://wa.me/528444041469?text=Hola, tengo dudas sobre mi folio ${contractDetails.contract_number}`, '_blank')}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Hablar con un asesor
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TourInquirySection;