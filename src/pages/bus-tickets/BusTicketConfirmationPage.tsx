"use client";

import React, { useState, useEffect } from 'react';
import BusTicketsNavbar from '@/components/BusTicketsNavbar';
import BusTicketsFooter from '@/components/BusTicketsFooter';
import BusTicketsThemeProvider from '@/components/BusTicketsThemeProvider';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner'; // Import toast from sonner

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

interface ClientBookingDetails {
  id: string;
  first_name: string; // Contractor's first name
  last_name: string;  // Contractor's last name
  email: string;      // Contractor's email
  phone: string | null; // Contractor's phone
  identification_number: string | null; // Contractor's identification
  contract_number: string;
  number_of_people: number;
  total_amount: number;
  total_paid: number;
  status: string;
  contractor_age: number | null;
  route_id: string;
  schedule_id: string;
  route_name: string;
  origin_name: string;
  destination_name: string;
  departure_time: string;
  search_date: string;
  passengers: BusPassenger[]; // NEW: Array of all passengers
  assigned_seat_numbers: number[]; // Added missing property
}

const BusTicketConfirmationPage: React.FC = () => {
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const [bookingDetails, setBookingDetails] = useState<ClientBookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!contractNumber) {
        setError('Número de contrato no proporcionado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch client details
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            identification_number,
            contract_number,
            number_of_people,
            total_amount,
            total_paid,
            status,
            contractor_age,
            bus_route_id
          `)
          .eq('contract_number', contractNumber)
          .single();

        if (clientError || !clientData) {
          console.error('Error fetching client data:', clientError);
          setError('No se encontraron los detalles de la reserva para este número de contrato.');
          setLoading(false);
          return;
        }

        // Fetch passengers for this client
        const { data: passengersData, error: passengersError } = await supabase
          .from('bus_passengers')
          .select('*')
          .eq('client_id', clientData.id)
          .order('seat_number', { ascending: true });

        if (passengersError || !passengersData || passengersData.length === 0) {
          console.error('Error fetching passengers data:', passengersError);
          setError('No se encontraron los pasajeros asociados a esta reserva.');
          setLoading(false);
          return;
        }

        const assignedSeats = passengersData.map(p => p.seat_number).sort((a, b) => a - b);
        const scheduleId = passengersData[0].schedule_id; // Assuming all passengers are on the same schedule

        // Fetch route details (using bus_route_id)
        const { data: routeData, error: routeError } = await supabase
          .from('bus_routes')
          .select(`
            name,
            all_stops
          `)
          .eq('id', clientData.bus_route_id)
          .single();

        if (routeError || !routeData) {
          console.error('Error fetching route data:', routeError);
          setError('No se encontraron los detalles de la ruta para esta reserva.');
          setLoading(false);
          return;
        }

        // Fetch all destinations to map IDs to names
        const { data: destinationsData, error: destinationsError } = await supabase
          .from('bus_destinations')
          .select('id, name');
        if (destinationsError) throw destinationsError;
        const destinationMap = new Map(destinationsData.map(d => [d.id, d.name]));

        // Determine origin and destination names from all_stops array
        const originName = destinationMap.get(routeData.all_stops[0]) || 'N/A';
        const destinationName = destinationMap.get(routeData.all_stops[routeData.all_stops.length - 1]) || 'N/A';

        // Fetch schedule details using the scheduleId from bus_passengers
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('bus_schedules')
          .select('departure_time, effective_date_start')
          .eq('id', scheduleId)
          .single();

        if (scheduleError || !scheduleData) {
          console.error('Error fetching schedule data:', scheduleError);
          setError('No se encontraron los detalles del horario para esta reserva.');
          setLoading(false);
          return;
        }

        setBookingDetails({
          id: clientData.id,
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          email: clientData.email,
          phone: clientData.phone,
          identification_number: clientData.identification_number,
          contract_number: clientData.contract_number,
          number_of_people: clientData.number_of_people,
          total_amount: clientData.total_amount,
          total_paid: clientData.total_paid,
          status: clientData.status,
          contractor_age: clientData.contractor_age,
          route_id: clientData.bus_route_id,
          schedule_id: scheduleId,
          route_name: routeData.name,
          origin_name: originName,
          destination_name: destinationName,
          departure_time: scheduleData.departure_time,
          assigned_seat_numbers: assignedSeats,
          search_date: scheduleData.effective_date_start || format(new Date(), 'yyyy-MM-dd'),
          passengers: passengersData,
        });

      } catch (err: any) {
        console.error('Unexpected error fetching booking details:', err);
        setError(`Ocurrió un error inesperado: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [contractNumber]);

  const handlePrintTicket = async () => {
    if (!bookingDetails) {
      toast.error('No hay detalles de reserva para imprimir.');
      return;
    }

    setIsGeneratingTicket(true);
    toast.info('Generando boleto...');

    try {
      const ticketHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Boleto de Autobús - ${bookingDetails.contract_number}</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Poppins', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
                .ticket-container { max-width: 800px; margin: 20px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); border: 2px dashed #1e293b; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #1e293b; font-size: 2.5em; margin-bottom: 5px; }
                .header p { color: #ffd700; font-size: 1.2em; font-weight: 600; }
                .section { margin-bottom: 20px; padding: 15px; border-left: 5px solid #ffd700; background-color: #fdfdfd; border-radius: 5px; }
                .section h2 { color: #1e293b; font-size: 1.5em; margin-bottom: 10px; }
                .section p { margin: 5px 0; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .passengers-list { list-style-type: disc; padding-left: 20px; }
                .passengers-list li { margin-bottom: 5px; }
                .footer { text-align: center; margin-top: 40px; color: #777; font-size: 0.9em; }
                .total-amount { font-size: 1.8em; font-weight: 700; color: #1e293b; text-align: right; margin-top: 20px; }
                @media print {
                    body { background-color: white; padding: 0; }
                    .ticket-container { box-shadow: none; border: 1px solid #ccc; margin: 0; width: 100%; min-height: 100vh; border-radius: 0; }
                }
            </style>
        </head>
        <body>
            <div class="ticket-container">
                <div class="header">
                    <h1>Saura Bus</h1>
                    <p>¡Tu viaje comienza aquí!</p>
                </div>

                <div class="section">
                    <h2>Detalles de la Reserva</h2>
                    <div class="details-grid">
                        <div>
                            <p><strong>Ruta:</strong> ${bookingDetails.route_name}</p>
                            <p><strong>Origen:</strong> ${bookingDetails.origin_name}</p>
                            <p><strong>Destino:</strong> ${bookingDetails.destination_name}</p>
                            <p><strong>Fecha de Viaje:</strong> ${format(parseISO(bookingDetails.search_date), 'dd/MM/yyyy', { locale: es })}</p>
                            <p><strong>Hora de Salida:</strong> ${bookingDetails.departure_time}</p>
                        </div>
                        <div>
                            <p><strong>Número de Contrato:</strong> ${bookingDetails.contract_number}</p>
                            <p><strong>Asientos Asignados:</strong> ${bookingDetails.assigned_seat_numbers.join(', ') || 'N/A'}</p>
                            <p><strong>Total de Personas:</strong> ${bookingDetails.number_of_people}</p>
                            <p><strong>Estado:</strong> ${bookingDetails.status}</p>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h2>Datos del Contratante</h2>
                    <p><strong>Nombre:</strong> ${bookingDetails.first_name} ${bookingDetails.last_name}</p>
                    <p><strong>Email:</strong> ${bookingDetails.email}</p>
                    <p><strong>Teléfono:</strong> ${bookingDetails.phone || 'N/A'}</p>
                    <p><strong>Identificación:</strong> ${bookingDetails.identification_number || 'N/A'}</p>
                    <p><strong>Edad:</strong> ${bookingDetails.contractor_age !== null ? bookingDetails.contractor_age : 'N/A'}</p>
                </div>

                ${bookingDetails.passengers.filter(p => !p.is_contractor).length > 0 ? `
                <div class="section">
                    <h2>Acompañantes</h2>
                    <ul class="passengers-list">
                        ${bookingDetails.passengers.filter(p => !p.is_contractor).map(p => `<li>${p.first_name} ${p.last_name} (Asiento: ${p.seat_number}) ${p.age !== null ? `(${p.age} años)` : ''}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="total-amount">
                    Total Pagado: $${bookingDetails.total_amount.toFixed(2)}
                </div>

                <div class="footer">
                    <p>Gracias por elegir Saura Bus. ¡Que tengas un excelente viaje!</p>
                    <p>Este es un comprobante de tu reserva. Por favor, preséntalo al abordar.</p>
                </div>
            </div>
        </body>
        </html>
      `;

      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(ticketHtml);
        newWindow.document.close();
        newWindow.focus();
        toast.success('Boleto generado. Puedes imprimirlo desde la nueva pestaña.');
      } else {
        toast.error('No se pudo abrir una nueva ventana. Por favor, permite pop-ups.');
      }
    } catch (err: any) {
      console.error('Error generating ticket:', err);
      toast.error(`Error inesperado al generar el boleto: ${err.message}`);
    } finally {
      setIsGeneratingTicket(false);
    }
  };

  if (loading) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-bus-primary" />
            <p className="ml-4 text-xl">Cargando detalles de la reserva...</p>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  if (error || !bookingDetails) {
    return (
      <BusTicketsThemeProvider>
        <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
          <BusTicketsNavbar />
          <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-red-600">Error de Reserva</h1>
            <p className="text-xl mb-6">{error || 'No se pudieron cargar los detalles de tu reserva.'}</p>
            <Button asChild className="bg-bus-primary hover:bg-bus-primary/90 text-bus-primary-foreground">
              <Link to="/bus-tickets">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ir a la Página Principal de Boletos
              </Link>
            </Button>
          </main>
          <BusTicketsFooter />
        </div>
      </BusTicketsThemeProvider>
    );
  }

  return (
    <BusTicketsThemeProvider>
      <div className="min-h-screen flex flex-col bg-bus-background text-bus-foreground">
        <BusTicketsNavbar />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-10">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-bus-primary">
              ¡Reserva Confirmada!
            </h1>
            <p className="text-lg text-muted-foreground">
              Tu reserva ha sido procesada con éxito. Aquí están los detalles:
            </p>
          </div>

          <Card className="max-w-3xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-bus-primary">Contrato: {bookingDetails.contract_number}</CardTitle>
              <CardDescription>
                Ruta: {bookingDetails.route_name} ({bookingDetails.origin_name} a {bookingDetails.destination_name})
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-bus-primary">Datos del Contratante</h3>
                <p><span className="font-medium">Nombre:</span> {bookingDetails.first_name} {bookingDetails.last_name}</p>
                <p><span className="font-medium">Email:</span> {bookingDetails.email}</p>
                <p><span className="font-medium">Teléfono:</span> {bookingDetails.phone || 'N/A'}</p>
                <p><span className="font-medium">Identificación:</span> {bookingDetails.identification_number || 'N/A'}</p>
                <p><span className="font-medium">Edad:</span> {bookingDetails.contractor_age !== null ? bookingDetails.contractor_age : 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-bus-primary">Detalles del Viaje</h3>
                <p><span className="font-medium">Salida:</span> {bookingDetails.departure_time}</p>
                <p><span className="font-medium">Fecha de Viaje:</span> {format(parseISO(bookingDetails.search_date), 'dd/MM/yyyy', { locale: es })}</p>
                <p><span className="font-medium">Asientos:</span> {bookingDetails.assigned_seat_numbers.join(', ') || 'N/A'}</p>
                <p><span className="font-medium">Total Personas:</span> {bookingDetails.number_of_people}</p>
                <p><span className="font-medium">Monto Total:</span> ${bookingDetails.total_amount.toFixed(2)}</p>
                <p><span className="font-medium">Estado:</span> {bookingDetails.status}</p>
              </div>
              {bookingDetails.passengers.filter(p => !p.is_contractor).length > 0 && (
                <div className="md:col-span-2">
                  <h3 className="text-xl font-semibold mb-3 text-bus-primary">Acompañantes</h3>
                  <ul className="list-disc list-inside">
                    {bookingDetails.passengers.filter(p => !p.is_contractor).map((p, index) => (
                      <li key={index}>{p.first_name} {p.last_name} (Asiento: {p.seat_number}) {p.age !== null && `(${p.age} años)`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center space-x-4 mt-10">
            <Button
              onClick={handlePrintTicket}
              disabled={isGeneratingTicket}
              className="bg-bus-secondary hover:bg-bus-secondary/90 text-bus-secondary-foreground"
            >
              {isGeneratingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Imprimir Boleto
            </Button>
            <Button asChild variant="outline" className="bg-white text-bus-primary hover:bg-gray-100 border-bus-primary hover:border-bus-primary/90">
              <Link to="/bus-tickets">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a la Página Principal
              </Link>
            </Button>
          </div>
        </main>
        <BusTicketsFooter />
      </div>
    </BusTicketsThemeProvider>
  );
};

export default BusTicketConfirmationPage;