"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageSquare, CreditCard, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { stripHtmlTags } from '@/utils/html';

const TourInquirySection = () => {
  const [contractNumber, setContractNumber] = useState('');
  const [contractDetails, setContractDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

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
      toast.error('Contrato no encontrado.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!contractDetails) return;
    const remaining = contractDetails.total_amount - contractDetails.total_paid;
    if (remaining <= 0) return toast.success('Este contrato ya está liquidado.');

    setIsPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { 
          clientId: contractDetails.id, 
          amount: remaining, 
          description: `Abono Contrato: ${contractDetails.contract_number}` 
        }
      });
      if (error) throw error;
      window.location.href = data.init_point;
    } catch (error) {
      toast.error('Error al iniciar el pago.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-rosa-mexicano text-white">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Consulta tu Contrato</h2>
        <div className="flex gap-2 max-w-md mx-auto mb-8">
          <Input 
            className="bg-white text-black" 
            placeholder="Número de contrato" 
            value={contractNumber}
            onChange={e => setContractNumber(e.target.value)}
          />
          <Button onClick={handleInquiry} disabled={loading} className="bg-white text-rosa-mexicano hover:bg-gray-100">
            {loading ? <Loader2 className="animate-spin" /> : 'Consultar'}
          </Button>
        </div>

        {contractDetails && (
          <div className="bg-white text-black p-6 rounded-xl text-left shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-rosa-mexicano">Contrato: {contractDetails.contract_number}</h3>
                <p className="text-sm text-gray-500">{contractDetails.first_name} {contractDetails.last_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-gray-400">Adeudo actual</p>
                <p className="text-2xl font-black text-red-600">${(contractDetails.total_amount - contractDetails.total_paid).toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-400">Total del Tour</p>
                <p className="font-bold">${contractDetails.total_amount.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-400">Total Pagado</p>
                <p className="font-bold text-green-600">${contractDetails.total_paid.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleOnlinePayment} disabled={isPaying} className="bg-blue-600 hover:bg-blue-700 w-full py-6 text-lg">
                {isPaying ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
                Liquidar / Abonar en Línea
              </Button>
              <Button variant="outline" onClick={() => window.open(`https://wa.me/528444041469`, '_blank')} className="w-full border-rosa-mexicano text-rosa-mexicano">
                <MessageSquare className="mr-2" /> Consultar por WhatsApp
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TourInquirySection;