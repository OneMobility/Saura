"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare, CreditCard, FileText, FileSignature, Calendar, User, MapPin, Armchair, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AgencySettings {
  mp_public_key: string | null;
  stripe_public_key: string | null;
}

const TourInquirySection = () => {
  const [contractNumber, setContractNumber] = useState('');
  const [contractDetails, setContractDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [agencySettings, setAgencySettings] = useState<AgencySettings | null>(null); // NEW: Agency settings state

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('agency_settings')
        .select('mp_public_key, stripe_public_key')
        .single();
      setAgencySettings(data);
    };
    fetchSettings();
  }, []);

  const handleInquiry = async () => {
    if (!contractNumber.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-public-contract-details', {
        body: { contractNumber: contractNumber.trim() },
      });
      if (error) throw error;
      setContractDetails(data.contractDetails);
    } catch (err) {
      toast.error('Contrato no encontrado o error en la consulta.');
      setContractDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (type: 'contract' | 'sheet') => {
    if (!contractDetails) return;
    setIsDownloading(type);
    try {
      const functionName = type === 'contract' ? 'generate-service-contract' : 'generate-booking-sheet';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { contractNumber: contractDetails.contract_number },
      });
      if (error) throw error;
      
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(data);
        newWindow.document.close();
        newWindow.focus();
      }
    } catch (err) {
      toast.error('No se pudo generar el documento.');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleOnlinePayment = async (method: 'mercadopago' | 'stripe') => {
    if (!contractDetails) return;
    const remaining = contractDetails.total_amount - contractDetails.total_paid;
    if (remaining <= 0) return toast.success('Este contrato ya está liquidado.');

    setIsPaying(true);
    try {
      const functionName = method === 'mercadopago' ? 'mercadopago-checkout' : 'stripe-checkout';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          clientId: contractDetails.id, 
          amount: remaining, 
          description: `Abono Contrato: ${contractDetails.contract_number}` 
        }
      });
      if (error) throw error;
      window.location.href = method === 'mercadopago' ? data.init_point : data.url;
    } catch (error) {
      toast.error('Error al iniciar el pago.');
    } finally {
      setIsPaying(false);
    }
  };

  const remainingPayment = contractDetails ? contractDetails.total_amount - contractDetails.total_paid : 0;
  const hasMercadoPago = !!agencySettings?.mp_public_key;
  const hasStripe = !!agencySettings?.stripe_public_key;

  return (
    <section className="py-16 px-4 md:px-8 lg:px-16 bg-rosa-mexicano text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-6 uppercase tracking-tight">Consulta tu Contrato</h2>
        <p className="mb-8 opacity-90 text-lg">Ingresa tu número de reserva para ver detalles, descargar tus documentos o realizar pagos.</p>
        
        <div className="flex gap-2 max-w-md mx-auto mb-12 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20">
          <Input 
            className="bg-white text-black h-12 text-lg rounded-xl border-none focus-visible:ring-offset-0" 
            placeholder="Número de contrato (Ej: ABC1234)" 
            value={contractNumber}
            onChange={e => setContractNumber(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleInquiry()}
          />
          <Button onClick={handleInquiry} disabled={loading} className="bg-white text-rosa-mexicano hover:bg-gray-100 h-12 px-8 rounded-xl font-bold">
            {loading ? <Loader2 className="animate-spin" /> : 'Consultar'}
          </Button>
        </div>

        {contractDetails && (
          <div className="bg-white text-black p-0 rounded-3xl text-left shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900 text-white p-8">
              <div className="flex flex-wrap justify-between items-center gap-6">
                <div>
                  <Badge className="bg-rosa-mexicano text-white mb-2 border-none">Reserva Confirmada</Badge>
                  <h3 className="text-3xl font-black">{contractDetails.tour_title}</h3>
                  <p className="opacity-70 mt-1 flex items-center gap-2"><MapPin className="h-4 w-4" /> {contractDetails.tour_description}</p>
                </div>
                <div className="text-right bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 min-w-[180px]">
                  <p className="text-[10px] uppercase font-black tracking-widest text-rosa-mexicano">Contrato No.</p>
                  <p className="text-2xl font-black">{contractDetails.contract_number}</p>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User className="h-4 w-4" /> Datos del Titular
                  </h4>
                  <p className="text-xl font-bold">{contractDetails.first_name} {contractDetails.last_name}</p>
                  <p className="text-gray-500">{contractDetails.email}</p>
                  <p className="text-gray-500">{contractDetails.phone || 'Sin teléfono registrado'}</p>
                </div>

                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Armchair className="h-4 w-4" /> Asignación de Viaje
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {contractDetails.assigned_seat_numbers.map((seat: number) => (
                      <Badge key={seat} variant="outline" className="h-10 w-10 justify-center text-lg font-black border-2 border-rosa-mexicano text-rosa-mexicano">
                        {seat}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">* Asientos seleccionados para {contractDetails.number_of_people} personas.</p>
                </div>

                <div className="pt-4 space-y-3">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Documentación</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => downloadDocument('contract')}
                      disabled={!!isDownloading}
                      className="border-rosa-mexicano text-rosa-mexicano hover:bg-rosa-mexicano/5 h-12"
                    >
                      {isDownloading === 'contract' ? <Loader2 className="animate-spin mr-2" /> : <FileSignature className="mr-2 h-4 w-4" />}
                      Ver Contrato
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => downloadDocument('sheet')}
                      disabled={!!isDownloading}
                      className="border-rosa-mexicano text-rosa-mexicano hover:bg-rosa-mexicano/5 h-12"
                    >
                      {isDownloading === 'sheet' ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
                      Hoja Reserva
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-8 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <div>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Estado de Cuenta</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Monto Total:</span>
                      <span className="font-bold">${contractDetails.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Abonado:</span>
                      <span className="font-bold text-green-600">${contractDetails.total_paid.toLocaleString()}</span>
                    </div>
                    <div className="pt-4 border-t border-dashed border-gray-300 flex justify-between items-center">
                      <span className="font-bold">ADEUDO PENDIENTE:</span>
                      <span className="text-3xl font-black text-red-600">
                        ${remainingPayment.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Opciones de Pago Online</p>
                  
                  {remainingPayment > 0 ? (
                    <>
                      {hasMercadoPago && (
                        <Button onClick={() => handleOnlinePayment('mercadopago')} disabled={isPaying} className="bg-blue-600 hover:bg-blue-700 w-full h-14 text-lg font-bold">
                          {isPaying ? <Loader2 className="animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                          Pagar con Mercado Pago
                        </Button>
                      )}
                      {hasStripe && (
                        <Button onClick={() => handleOnlinePayment('stripe')} disabled={isPaying} className="bg-indigo-600 hover:bg-indigo-700 w-full h-14 text-lg font-bold">
                          {isPaying ? <Loader2 className="animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                          Pagar con Stripe
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => window.open(`https://wa.me/528444041469`, '_blank')} className="w-full border-green-600 text-green-600 hover:bg-green-50 h-12">
                        <MessageSquare className="mr-2 h-4 w-4" /> Ayuda por WhatsApp
                      </Button>
                    </>
                  ) : (
                    <div className="text-center p-4 bg-green-100 rounded-xl text-green-800 font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5" /> Contrato Liquidado
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-white">
              <h4 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rosa-mexicano" /> Historial de Abonos Registrados
              </h4>
              {contractDetails.payments_history && contractDetails.payments_history.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-black text-gray-700">Fecha</TableHead>
                        <TableHead className="font-black text-gray-700">Monto</TableHead>
                        <TableHead className="font-black text-gray-700">Método</TableHead>
                        <TableHead className="text-right font-black text-gray-700">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractDetails.payments_history.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{format(parseISO(p.payment_date), 'PPP', { locale: es })}</TableCell>
                          <TableCell className="font-bold text-green-600">${p.amount.toLocaleString()}</TableCell>
                          <TableCell className="capitalize text-xs text-gray-500 font-bold tracking-wider">{p.payment_method}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Aplicado</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 italic">No se han registrado abonos todavía.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TourInquirySection;