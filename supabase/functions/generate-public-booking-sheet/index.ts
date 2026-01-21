import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0'; // Import date-fns for formatting
import es from 'https://esm.sh/date-fns@2.30.0/locale/es'; // Import locale

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Helper function to format room details (copied from generate-booking-sheet)
const formatRoomDetails = (details: any) => {
  const parts = [];
  const safeDetails = details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

  if (safeDetails.quad_rooms > 0) parts.push(`${safeDetails.quad_rooms} Cuádruple(s)`);
  if (safeDetails.triple_rooms > 0) parts.push(`${safeDetails.triple_rooms} Triple(s)`);
  if (safeDetails.double_rooms > 0) parts.push(`${safeDetails.double_rooms} Doble(s)`);
  return parts.join(', ') || 'N/A';
};

// Helper function to generate HTML for the booking sheet (copied from generate-booking-sheet)
const generateBookingSheetHtml = (data: any) => {
  const client = data.client;
  const tour = data.tour || {}; // Can be a tour or a bus route
  const agency = data.agency;
  const busRoute = data.busRoute || {}; // NEW: Bus route data
  const busPassengers = data.busPassengers || []; // NEW: Bus passengers data
  const payments = data.payments || []; // NEW: Payments history

  const safeCompanions = Array.isArray(client.companions) ? client.companions : [];
  const safeExtraServices = Array.isArray(client.extra_services) ? client.extra_services : [];
  
  let includesList = '<li>N/A</li>';
  let tourOrRouteTitle = 'N/A';
  let tourOrRouteDuration = 'N/A';
  let seatNumbers = 'N/A';
  let passengersListHtml = '';

  if (client.tour_id && tour.title) {
    tourOrRouteTitle = tour.title;
    tourOrRouteDuration = tour.duration || 'N/A';
    const safeIncludes = Array.isArray(tour.includes) ? tour.includes : [];
    includesList = safeIncludes.length > 0
      ? safeIncludes.map((item: string) => `<li>${item}</li>`).join('')
      : '<li>N/A</li>';
    const tourSeats = data.tourSeats || [];
    if (tourSeats && tourSeats.length > 0) {
      seatNumbers = tourSeats.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ');
    }
    passengersListHtml = safeCompanions.length > 0
      ? safeCompanions.map((c: any) => `<li>${c.name || 'Acompañante sin nombre'} ${c.age !== null && typeof c.age === 'number' ? `(${c.age} años)` : ''}</li>`).join('')
      : '<li>N/A</li>';

  } else if (client.bus_route_id && busRoute.name) {
    tourOrRouteTitle = `Ruta de Autobús: ${busRoute.name}`;
    tourOrRouteDuration = data.busSchedule?.departure_time ? `Salida: ${data.busSchedule.departure_time}` : 'N/A';
    includesList = '<li>Transporte en autobús</li><li>Asiento asignado</li>';

    if (busPassengers.length > 0) {
      seatNumbers = busPassengers.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ');
      passengersListHtml = busPassengers.filter((p: any) => !p.is_contractor).length > 0
        ? busPassengers.filter((p: any) => !p.is_contractor).map((p: any) => `<li>${p.first_name || 'N/A'} ${p.last_name || 'N/A'} (Asiento: ${p.seat_number}) ${p.age !== null && typeof p.age === 'number' ? `(${p.age} años)` : ''}</li>`).join('')
        : '<li>N/A</li>';
    } else {
      passengersListHtml = '<li>N/A</li>';
    }
  }

  const extraServicesList = safeExtraServices.length > 0
    ? safeExtraServices.map((s: any) => {
        const price = typeof s.selling_price_per_unit_snapshot === 'number' ? s.selling_price_per_unit_snapshot : 0;
        const quantity = typeof s.quantity === 'number' ? s.quantity : 0;
        return `<li>${s.name_snapshot || 'Servicio sin nombre'} (${s.service_type_snapshot || 'N/A'}) - Cantidad: ${quantity} - Precio: $${price.toFixed(2)}</li>`;
      }).join('')
    : '<li>N/A</li>';

  const clientTotalAmount = typeof client.total_amount === 'number' ? client.total_amount : 0;
  const clientTotalPaid = typeof client.total_paid === 'number' ? client.total_paid : 0;
  const remainingPayment = (clientTotalAmount - clientTotalPaid).toFixed(2);

  const paymentsListHtml = payments.length > 0
    ? payments.map((p: any) => `
        <tr>
          <td>${format(parseISO(p.payment_date), 'dd/MM/yyyy', { locale: es })}</td>
          <td>$${(typeof p.amount === 'number' ? p.amount : 0).toFixed(2)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2">No hay abonos registrados.</td></tr>';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hoja de Reserva - ${client.contract_number || 'N/A'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Poppins', sans-serif;
                line-height: 1.5;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f8f8f8;
                font-size: 10pt;
            }
            .page-container {
                max-width: 210mm;
                min-height: 297mm;
                margin: 20px auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                padding: 25px;
                box-sizing: border-box;
            }
            h1, h2, h3 {
                color: #E4007C;
                font-weight: 700;
                margin-top: 0;
            }
            h1 {
                text-align: center;
                font-size: 2em;
                margin-bottom: 20px;
                text-transform: uppercase;
            }
            h2 {
                font-size: 1.3em;
                margin-bottom: 12px;
                border-bottom: 2px solid #E4007C;
                padding-bottom: 4px;
            }
            h3 {
                font-size: 1.1em;
                margin-bottom: 8px;
            }
            .agency-header {
                background-color: #E4007C;
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 25px;
                position: relative;
                overflow: hidden;
            }
            .agency-header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
                transform: rotate(45deg);
                opacity: 0.3;
            }
            .agency-header img {
                max-width: 100px;
                height: auto;
                display: block;
                margin: 0 auto 10px auto;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .agency-header h2 {
                color: white;
                margin-top: 0;
                margin-bottom: 6px;
                font-size: 1.8em;
                border-bottom: none;
                padding-bottom: 0;
            }
            .agency-header p {
                margin: 0;
                font-size: 0.85em;
                opacity: 0.9;
            }
            .main-content-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 25px;
            }
            .section {
                padding: 12px;
                border: 1px solid #eee;
                border-radius: 5px;
                background-color: #fdfdfd;
                height: 100%;
                box-sizing: border-box;
            }
            .section p, .section ul {
                margin-bottom: 6px;
            }
            .label {
                font-weight: 600;
                color: #555;
            }
            ul {
                list-style-type: disc;
                padding-left: 18px;
                margin-top: 4px;
            }
            ul li {
                margin-bottom: 2px;
                font-size: 0.9em;
            }
            .payment-summary {
                background-color: #fff0f5;
                padding: 18px;
                border-radius: 8px;
                border: 1px solid #E4007C;
                margin-top: 25px;
            }
            .payment-summary p {
                margin: 6px 0;
                font-size: 1em;
            }
            .total-amount {
                font-size: 1.3em;
                font-weight: 700;
                color: #E4007C;
                border-top: 1px solid #E4007C;
                padding-top: 8px;
                margin-top: 12px;
            }
            .footer-info {
                text-align: center;
                margin-top: 30px;
                font-size: 0.8em;
                color: #888;
            }
            .payments-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            .payments-table th, .payments-table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            .payments-table th {
                background-color: #f2f2f2;
                font-weight: 600;
            }

            @media print {
                @page {
                    size: letter;
                    margin: 0.4in;
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    font-size: 9.5pt;
                    line-height: 1.4;
                }
                .page-container {
                    width: 100%;
                    margin: 0;
                    box-shadow: none;
                    border-radius: 0;
                    border: none;
                    padding: 15px;
                }
                h1 { font-size: 1.8em; margin-bottom: 18px; }
                h2 { font-size: 1.3em; margin-bottom: 10px; border-bottom: 1px solid #E4007C; padding-bottom: 4px; }
                h3 { font-size: 1.05em; margin-bottom: 7px; }
                .agency-header { padding: 18px; margin-bottom: 20px; }
                .agency-header img { max-width: 85px; margin-bottom: 10px; }
                .agency-header h2 { font-size: 1.6em; }
                .agency-header p { font-size: 0.8em; }
                .main-content-grid {
                    gap: 18px;
                    margin-bottom: 20px;
                }
                .section { padding: 10px; margin-bottom: 8px; }
                .section p, .section ul { margin-bottom: 5px; }
                ul { padding-left: 18px; margin-top: 4px; }
                ul li { font-size: 0.9em; margin-bottom: 2px; }
                .payment-summary { padding: 15px; margin-top: 20px; }
                .payment-summary p { margin: 5px 0; }
                .total-amount { font-size: 1.2em; padding-top: 8px; margin-top: 12px; }
                .footer-info { margin-top: 25px; font-size: 0.75em; }
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <div class="agency-header">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" alt="${agency?.agency_name || 'Logo de la Agencia'}">` : ''}
                <h2>${agency?.agency_name || 'Tu Agencia de Viajes'}</h2>
                <p>Teléfono: ${agency?.agency_phone || 'N/A'}</p>
                <p>Email: ${agency?.agency_email || 'N/A'}</p>
                <p>Dirección: ${agency?.agency_address || 'N/A'}</p>
            </div>

            <h1>Hoja de Reserva</h1>

            <div class="main-content-grid">
                <div class="client-details-column">
                    <div class="section">
                        <h2>Datos del Cliente</h2>
                        <p><span class="label">Nombre:</span> ${client.first_name || 'N/A'} ${client.last_name || 'N/A'}</p>
                        <p><span class="label">Teléfono:</span> ${client.phone || 'N/A'}</p>
                        <p><span class="label">Edad Contratante:</span> ${client.contractor_age !== null && typeof client.contractor_age === 'number' ? client.contractor_age : 'N/A'}</p>
                        <p><span class="label">Identificación:</span> ${client.identification_number || 'N/A'}</p>
                        <h3>Pasajeros:</h3>
                        <ul>
                            ${passengersListHtml}
                        </ul>
                    </div>
                </div>
                <div class="booking-details-column">
                    <div class="section">
                        <h2>Detalles de la Reserva</h2>
                        <p><span class="label">Número de Reserva:</span> ${client.contract_number || 'N/A'}</p>
                        <p><span class="label">Viaje:</span> ${tourOrRouteTitle}</p>
                        <p><span class="label">Duración/Salida:</span> ${tourOrRouteDuration}</p>
                        <p><span class="label">Personas:</span> ${client.number_of_people || 'N/A'}</p>
                        <p><span class="label">Habitación:</span> ${formatRoomDetails(client.room_details)}</p>
                        <p><span class="label">Asientos:</span> ${seatNumbers}</p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Servicios Adicionales:</h2>
                <ul>
                    ${extraServicesList}
                </ul>
            </div>

            <div class="section">
                <h2>Incluye el Viaje:</h2>
                <ul>
                    ${includesList}
                </ul>
            </div>

            <div class="payment-summary">
                <h2>Resumen de Pagos</h2>
                <p><span class="label">Monto Total del Contrato:</span> $${clientTotalAmount.toFixed(2)}</p>
                <p><span class="label">Total Pagado:</span> $${clientTotalPaid.toFixed(2)}</p>
                <p class="total-amount"><span class="label">Adeudo:</span> $${remainingPayment}</p>
            </div>

            <div class="section">
                <h2>Historial de Abonos</h2>
                <table class="payments-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentsListHtml}
                    </tbody>
                </table>
            </div>

            <div class="footer-info">
                <p>&copy; ${new Date().getFullYear()} ${agency?.agency_name || 'Tu Agencia de Viajes'}. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  console.log('[generate-public-booking-sheet] Edge Function invoked.');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  const htmlResponse = (html: string, status: number) => new Response(html, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });

  let contractNumber: string;
  try {
    const requestBody = await req.json();
    contractNumber = requestBody.contractNumber;
    console.log('[generate-public-booking-sheet] Parsed contractNumber:', contractNumber);
  } catch (parseError: any) {
    console.error('[generate-public-booking-sheet] Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!contractNumber) {
      return jsonResponse({ error: 'Contract number is required.' }, 400);
    }

    // Use the Service Role Key to bypass RLS and fetch sensitive client data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[generate-public-booking-sheet] Fetching client data...');
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        tours (
          title,
          description,
          duration,
          includes,
          itinerary,
          departure_date,
          return_date
        ),
        bus_routes (
          name,
          all_stops
        )
      `)
      .ilike('contract_number', contractNumber.trim())
      .single();

    if (clientError || !client) {
      console.error('[generate-public-booking-sheet] Error fetching client:', clientError?.message || 'Client not found.');
      return jsonResponse({ error: 'Client not found or error fetching client data.' }, 404);
    }
    console.log('[generate-public-booking-sheet] Client data fetched successfully.');

    // Fetch payments history
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('client_payments')
      .select('*')
      .eq('client_id', client.id)
      .order('payment_date', { ascending: false });
    if (paymentsError) console.error('[generate-public-booking-sheet] Error fetching payments:', paymentsError.message);


    let tourSeats: any[] = [];
    let busPassengers: any[] = [];
    let busSchedule: any = null;

    if (client.tour_id) {
      const { data: fetchedSeats, error: seatsError } = await supabaseAdmin
        .from('tour_seat_assignments')
        .select('seat_number')
        .eq('client_id', client.id)
        .eq('tour_id', client.tour_id);
      if (seatsError) console.error('[generate-public-booking-sheet] Error fetching tour seats:', seatsError.message);
      tourSeats = fetchedSeats || [];
    } else if (client.bus_route_id) {
      const { data: fetchedBusPassengers, error: busPassengersError } = await supabaseAdmin
        .from('bus_passengers')
        .select('id, first_name, last_name, age, is_contractor, seat_number, schedule_id')
        .eq('client_id', client.id);
      if (busPassengersError) console.error('[generate-public-booking-sheet] Error fetching bus passengers:', busPassengersError.message);
      busPassengers = fetchedBusPassengers || [];
      if (busPassengers.length > 0) {
        const { data: fetchedSchedule, error: scheduleError } = await supabaseAdmin
          .from('bus_schedules')
          .select('departure_time')
          .eq('id', busPassengers[0].schedule_id)
          .single();
        if (scheduleError) console.error('[generate-public-booking-sheet] Error fetching bus schedule:', scheduleError.message);
        busSchedule = fetchedSchedule;
      }
    }

    console.log('[generate-public-booking-sheet] Fetching agency settings...');
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agency_settings')
      .select('*')
      .single();
    if (agencyError && agencyError.code !== 'PGRST116') console.error('[generate-public-booking-sheet] Error fetching agency settings:', agencyError.message);

    console.log('[generate-public-booking-sheet] Fetching destinations...');
    const { data: destinationsData, error: destinationsError } = await supabaseAdmin
      .from('bus_destinations')
      .select('id, name');
    if (destinationsError) throw destinationsError;
    const destinationMap = new Map(destinationsData.map(d => [d.id, d.name]));

    console.log('[generate-public-booking-sheet] Generating HTML content...');
    const htmlContent = generateBookingSheetHtml({
      client,
      tour: client.tours,
      busRoute: client.bus_routes,
      tourSeats: tourSeats,
      busPassengers: busPassengers,
      busSchedule: busSchedule,
      agency: agency,
      destinationMap: destinationMap,
      payments: payments, // Pass payments history
    });
    console.log('[generate-public-booking-sheet] HTML content generated successfully.');

    return htmlResponse(htmlContent, 200);

  } catch (error: any) {
    console.error('[generate-public-booking-sheet] UNEXPECTED ERROR IN CATCH BLOCK:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});