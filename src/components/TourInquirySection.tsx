"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare, CreditCard, FileText, FileSignature, Calendar, User, MapPin, Armchair, Info, CheckCircle2, DollarSign, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-black mb-10 uppercase tracking-tight">Consulta tu Contrato</h2>
        <div className="flex gap-2 max-w-md mx-auto mb-12 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20">
          <Input className="bg-white text-black h-12 text-lg rounded-xl border-none" placeholder="Folio (Ej: ABC1234)" value={contractNumber} onChange={e => setContractNumber(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleInquiry()} />
          <Button onClick={() => handleInquiry()} className="bg-white text-rosa-mexicano hover:bg-gray-100 h-12 px-8 font-bold rounded-xl">Consultar</Button>
        </div>

        {contractDetails && (
          <div className="bg-white text-black rounded-3xl shadow-2xl overflow-hidden text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={cn("p-8 flex justify-between items-center text-white", contractDetails.status === 'cancelled' ? "bg-red-600" : "bg-gray-900")}>
              <div>
                <Badge className={cn("mb-2 border-none", contractDetails.status === 'cancelled' ? "bg-white text-red-600" : "bg-rosa-mexicano text-white")}>
                  {contractDetails.status === 'cancelled' ? 'Reserva Cancelada' : 'Reserva Activa'}
                </Badge>
                <h3 className="text-3xl font-black">{contractDetails.tour_title}</h3>
              </div>
              <div className="text-right bg-white/10 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] uppercase font-black">Contrato</p>
                <p className="text-2xl font-black">{contractDetails.contract_number}</p>
              </div>
            </div>

            {contractDetails.status === 'cancelled' && (
              <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-full"><XCircle className="text-red-600 h-6 w-6" /></div>
                <div>
                  <h4 className="font-black text-red-900 uppercase text-xs tracking-widest">Motivo de Cancelación:</h4>
                  <p className="text-red-700 font-medium">{contractDetails.cancel_reason || 'Sin motivo especificado.'}</p>
                </div>
              </div>
            )}

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div><Label className="text-[10px] font-black uppercase text-gray-400">Titular</Label><p className="text-lg font-bold">{contractDetails.first_name} {contractDetails.last_name}</p></div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-gray-400">Asientos</Label>
                  <div className="flex gap-2 mt-2">{contractDetails.assigned_seat_numbers.map((s: number) => <Badge key={s} className="h-8 w-8 justify-center bg-gray-100 text-gray-800 border-none font-bold">{s}</Badge>)}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl border">
                <div className="flex justify-between items-end mb-4">
                  <span className="font-bold text-gray-500 uppercase text-xs">Adeudo Actual:</span>
                  <span className={cn("text-3xl font-black", contractDetails.status === 'cancelled' ? "text-gray-400" : "text-red-600")}>
                    ${(contractDetails.total_amount - contractDetails.total_paid).toLocaleString()}
                  </span>
                </div>
                
                {contractDetails.status !== 'cancelled' && contractDetails.total_paid < contractDetails.total_amount && (
                  <div className="space-y-4 pt-4 border-t border-dashed">
                    <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="h-12 text-lg font-bold" placeholder="Monto a abonar" />
                    <Button onClick={() => handleOnlinePayment('mercadopago')} className="w-full h-12 bg-blue-600 font-bold rounded-xl"><CreditCard className="mr-2" /> Abonar Pago</Button>
                  </div>
                )}
                
                {contractDetails.total_paid >= contractDetails.total_amount && (
                  <div className="p-3 bg-green-100 text-green-700 rounded-xl text-center font-bold flex items-center justify-center gap-2"><CheckCircle2 /> Contrato Liquidado</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TourInquirySection;