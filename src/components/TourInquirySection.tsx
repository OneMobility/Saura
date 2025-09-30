"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Using sonner for toasts
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Companion {
  id: string;
  name: string;
  age: number | null; // Added age for companions
}

interface ClientContract {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  contract_number: string;
  number_of_people: number;
  occupancy_type: 'double' | 'triple' | 'quad';
  companions: Companion[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  contractor_age: number | null; // Added contractor_age
  tour_title: string;
  tour_description: string;
  tour_image_url: string;
}

const TourInquirySection = () => {
  const [contractNumber, setContractNumber] = useState('');
  const [contractDetails, setContractDetails] = useState<ClientContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInquiry = async () => {
    if (contractNumber.trim() === '') {
      toast.error('Por favor, introduce un número de contrato.');
      return;
    }
    setLoading(true);
    setError(null);
    setContractDetails(null);

    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          first_name,
          last_name,
          email,
          phone,
          address,
          contract_number,
          number_of_people,
          occupancy_type,
          companions,
          total_amount,
          advance_payment,
          total_paid,
          status,
          contractor_age,
          tours (
            title,
            description,
            image_url
          )
        `)
        .eq('contract_number', contractNumber.trim())
        .single();

      if (error) {
        console.error('Error fetching contract:', error);
        if (error.code === 'PGRST116') { // No rows found
          setError('Número de contrato no encontrado. Por favor, verifica e intenta de nuevo.');
        } else {
          setError('Error al consultar el contrato. Intenta de nuevo más tarde.');
        }
        toast.error(error.code === 'PGRST116' ? 'Número de contrato no encontrado.' : 'Error al consultar el contrato.');
      } else if (data) {
        setContractDetails({
          ...data,
          tour_title: data.tours?.title || 'N/A',
          tour_description: data.tours?.description || 'N/A',
          tour_image_url: data.tours?.image_url || 'https://via.placeholder.com/400x200?text=Tour+Image',
          companions: data.companions || [],
          contractor_age: data.contractor_age || null,
        });
        toast.success('¡Contrato encontrado!');
      } else {
        setError('Número de contrato no encontrado. Por favor, verifica e intenta de nuevo.');
        toast.error('Número de contrato no encontrado.');
      }
    } catch (err) {
      console.error('Unexpected error during inquiry:', err);
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
      toast.error('Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-rosa-mexicano text-white">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Consulta tu Tour
        </h2>
        <p className="text-lg mb-8">
          Introduce tu número de contrato para ver los detalles de tu reserva.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="contract-number" className="sr-only">Número de Contrato</Label>
            <Input
              type="text"
              id="contract-number"
              placeholder="Número de Contrato"
              className="bg-white text-gray-800 placeholder:text-gray-500 border-none focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-white"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleInquiry}
            className="bg-white text-rosa-mexicano hover:bg-gray-100 font-semibold px-6 py-3"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Consultar'}
          </Button>
        </div>

        {error && (
          <p className="text-red-200 mt-6 text-lg">{error}</p>
        )}

        {contractDetails && (
          <div className="mt-10 bg-white text-gray-800 p-6 rounded-lg shadow-xl text-left">
            <h3 className="text-2xl font-bold mb-4 text-rosa-mexicano">Detalles de tu Contrato</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p><span className="font-semibold">Contrato:</span> {contractDetails.contract_number}</p>
                <p><span className="font-semibold">Cliente:</span> {contractDetails.first_name} {contractDetails.last_name}</p>
                {contractDetails.contractor_age !== null && <p><span className="font-semibold">Edad Contratante:</span> {contractDetails.contractor_age}</p>}
                <p><span className="font-semibold">Email:</span> {contractDetails.email}</p>
                {contractDetails.phone && <p><span className="font-semibold">Teléfono:</span> {contractDetails.phone}</p>}
                {contractDetails.address && <p><span className="font-semibold">Dirección:</span> {contractDetails.address}</p>}
              </div>
              <div>
                <p><span className="font-semibold">Tour:</span> {contractDetails.tour_title}</p>
                <p><span className="font-semibold">Personas:</span> {contractDetails.number_of_people}</p>
                <p><span className="font-semibold">Ocupación:</span> {contractDetails.occupancy_type}</p>
                <p><span className="font-semibold">Estado:</span> {contractDetails.status}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-semibold mb-2">Acompañantes:</h4>
              {contractDetails.companions.length > 0 ? (
                <ul className="list-disc list-inside">
                  {contractDetails.companions.map((c, index) => (
                    <li key={c.id || index}>{c.name} {c.age !== null && `(${c.age} años)`}</li>
                  ))}
                </ul>
              ) : (
                <p>No se registraron acompañantes.</p>
              )}
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-semibold mb-2">Resumen de Pagos:</h4>
              <p><span className="font-semibold">Monto Total:</span> ${contractDetails.total_amount.toFixed(2)}</p>
              <p><span className="font-semibold">Anticipo:</span> ${contractDetails.advance_payment.toFixed(2)}</p>
              <p><span className="font-semibold">Total Pagado:</span> ${contractDetails.total_paid.toFixed(2)}</p>
              <p className="text-lg font-bold text-red-600">
                <span className="font-semibold">Falta por Pagar:</span> ${(contractDetails.total_amount - contractDetails.total_paid).toFixed(2)}
              </p>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-semibold mb-2">Descripción del Tour:</h4>
              <img src={contractDetails.tour_image_url} alt={contractDetails.tour_title} className="w-full h-48 object-cover rounded-md mb-4" />
              <p>{contractDetails.tour_description}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TourInquirySection;