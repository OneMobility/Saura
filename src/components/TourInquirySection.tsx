"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { SeatLayout } from '@/types/shared'; // Import SeatLayout

interface BusPassenger {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  identification_number: string | null;
  is_contractor: boolean;
  seat_number: number;
  email: string | null;
  phone: string | null;
}

interface RoomDetails {
  double_rooms: number;
  triple_rooms: number;
  quad_rooms: number;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

interface ClientContract {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  contract_number: string;
  identification_number: string | null;
  number_of_people: number;
  companions: BusPassenger[]; // Changed to BusPassenger for bus tickets
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  contractor_age: number | null;
  room_details: RoomDetails;
  tour_title: string;
  tour_description: string;
  tour_image_url: string;
  assigned_seat_numbers: number[];
  payments_history: Payment[];
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
      const { data, error: functionError } = await supabase.functions.invoke('get-public-contract-details', {
        body: { contractNumber: contractNumber.trim() },
      });

      if (functionError) {
        throw functionError;
      }

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
      } else {
        setContractDetails(data.contractDetails);
        toast.success('¡Contrato encontrado!');
      }
    } catch (err: any) {
      console.error('Unexpected error during inquiry:', err);
      const errorMessage = err.message || 'Ocurrió un error inesperado. Intenta de nuevo.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatRoomDetails = (details: RoomDetails) => {
    const parts = [];
    if (details.quad_rooms > 0) parts.push(`${details.quad_rooms} Cuádruple(s)`);
    if (details.triple_rooms > 0) parts.push(`${details.triple_rooms} Triple(s)`);
    if (details.double_rooms > 0) parts.push(`${details.double_rooms} Doble(s)`);
    return parts.join(', ') || 'N/A';
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
              placeholder="Introduce tu número de contrato"
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
                {contractDetails.identification_number && <p><span className="font-semibold">Identificación:</span> {contractDetails.identification_number}</p>}
                <p><span className="font-semibold">Email:</span> {contractDetails.email}</p>
                {contractDetails.phone && <p><span className="font-semibold">Teléfono:</span> {contractDetails.phone}</p>}
                {contractDetails.address && <p><span className="font-semibold">Dirección:</span> {contractDetails.address}</p>}
              </div>
              <div>
                <p><span className="font-semibold">Viaje:</span> {contractDetails.tour_title}</p>
                <p><span className="font-semibold">Personas:</span> {contractDetails.number_of_people}</p>
                <p><span className="font-semibold">Habitaciones:</span> {formatRoomDetails(contractDetails.room_details)}</p>
                <p><span className="font-semibold">Asientos Asignados:</span> {contractDetails.assigned_seat_numbers.length > 0 ? contractDetails.assigned_seat_numbers.join(', ') : 'N/A'}</p>
                <p><span className="font-semibold">Estado:</span> {contractDetails.status}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-semibold mb-2">Pasajeros:</h4>
              {contractDetails.companions.length > 0 ? (
                <ul className="list-disc list-inside">
                  {contractDetails.companions.map((p, index) => (
                    <li key={p.id || index}>{p.first_name} {p.last_name} (Asiento: {p.seat_number}) {p.age !== null && `(${p.age} años)`} {p.is_contractor && '(Contratante)'}</li>
                  ))}
                </ul>
              ) : (
                <p>No se registraron pasajeros.</p>
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
              <h4 className="text-xl font-semibold mb-2">Historial de Abonos:</h4>
              {contractDetails.payments_history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-md">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Fecha</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractDetails.payments_history.map((payment) => (
                        <tr key={payment.id}>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{format(parseISO(payment.payment_date), 'dd/MM/yyyy', { locale: es })}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">${payment.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No hay abonos registrados para este contrato.</p>
              )}
            </div>

            <div className="mb-6">
              <h4 className="text-xl font-semibold mb-2">Descripción del Viaje:</h4>
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