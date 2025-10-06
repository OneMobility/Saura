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

interface Companion {
  id: string;
  name: string;
  age: number | null;
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
  companions: Companion[];
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
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          contract_number,
          identification_number,
          number_of_people,
          companions,
          total_amount,
          advance_payment,
          total_paid,
          status,
          contractor_age,
          room_details,
          tour_id,
          bus_route_id, -- NEW: Select bus_route_id
          tours (
            title,
            description,
            image_url
          ),
          bus_routes ( -- NEW: Select bus_routes
            name,
            all_stops
          ),
          tour_seat_assignments (
            seat_number
          ),
          bus_seat_assignments ( -- NEW: Select bus_seat_assignments
            schedule_id,
            seat_number
          )
        `)
        .eq('contract_number', contractNumber.trim())
        .single();

      if (clientError) {
        console.error('Error fetching contract:', clientError);
        if (clientError.code === 'PGRST116') {
          setError('Número de contrato no encontrado. Por favor, verifica e intenta de nuevo.');
        } else {
          setError('Error al consultar el contrato. Intenta de nuevo más tarde.');
        }
        toast.error(clientError.code === 'PGRST116' ? 'Número de contrato no encontrado.' : 'Error al consultar el contrato.');
        setLoading(false);
        return;
      }

      if (clientData) {
        let tourTitle = 'N/A';
        let tourDescription = 'N/A';
        let tourImageUrl = 'https://via.placeholder.com/400x200?text=Imagen+No+Disponible';
        let assignedSeats: number[] = [];

        if (clientData.tour_id && clientData.tours) {
          tourTitle = clientData.tours.title || 'N/A';
          tourDescription = clientData.tours.description || 'N/A';
          tourImageUrl = clientData.tours.image_url || tourImageUrl;
          assignedSeats = (clientData.tour_seat_assignments || []).map((s: { seat_number: number }) => s.seat_number).sort((a: number, b: number) => a - b);
        } else if (clientData.bus_route_id && clientData.bus_routes) { // NEW: Handle bus route details
          tourTitle = `Ruta de Autobús: ${clientData.bus_routes.name || 'N/A'}`;
          tourDescription = `Viaje de ${destinationMap.get(clientData.bus_routes.all_stops[0]) || 'N/A'} a ${destinationMap.get(clientData.bus_routes.all_stops[clientData.bus_routes.all_stops.length - 1]) || 'N/A'}`;
          // For bus tickets, we might not have a specific image per route, use a generic one or route-specific if available
          tourImageUrl = 'https://images.unsplash.com/photo-1544620347-c4fd4a8d462c?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'; // Generic bus image
          assignedSeats = (clientData.bus_seat_assignments || []).map((s: { seat_number: number }) => s.seat_number).sort((a: number, b: number) => a - b);
        }

        // Fetch all destinations to map IDs to names for bus routes
        const { data: destinationsData, error: destinationsError } = await supabase
          .from('bus_destinations')
          .select('id, name');
        if (destinationsError) throw destinationsError;
        const destinationMap = new Map(destinationsData.map(d => [d.id, d.name]));


        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const functionName = 'get-public-client-payments';
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

        const paymentsResponse = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contractNumber: contractNumber.trim() }),
        });

        let paymentsHistory: Payment[] = [];
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          paymentsHistory = paymentsData.payments || [];
        } else {
          const errorData = await paymentsResponse.json();
          console.error('Error fetching public payments from Edge Function:', errorData);
          toast.error(`Error al cargar el historial de pagos: ${errorData.error || 'Error desconocido.'}`);
        }

        setContractDetails({
          ...clientData,
          tour_title: tourTitle,
          tour_description: tourDescription,
          tour_image_url: tourImageUrl,
          companions: clientData.companions || [],
          identification_number: clientData.identification_number || null,
          contractor_age: clientData.contractor_age || null,
          room_details: clientData.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 },
          assigned_seat_numbers: assignedSeats,
          payments_history: paymentsHistory,
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
                <p><span className="font-semibold">Tour:</span> {contractDetails.tour_title}</p>
                <p><span className="font-semibold">Personas:</span> {contractDetails.number_of_people}</p>
                <p><span className="font-semibold">Habitaciones:</span> {formatRoomDetails(contractDetails.room_details)}</p>
                <p><span className="font-semibold">Asientos Asignados:</span> {contractDetails.assigned_seat_numbers.length > 0 ? contractDetails.assigned_seat_numbers.join(', ') : 'N/A'}</p>
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