import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Helper function to format room details
const formatRoomDetails = (details: any) => {
  const parts = [];
  const safeDetails = details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

  if (safeDetails.quad_rooms > 0) parts.push(`${safeDetails.quad_rooms} Cuádruple(s)`);
  if (safeDetails.triple_rooms > 0) parts.push(`${safeDetails.triple_rooms} Triple(s)`);
  if (safeDetails.double_rooms > 0) parts.push(`${safeDetails.double_rooms} Doble(s)`);
  return parts.join(', ') || 'N/A';
};

// Helper function to generate HTML for the service contract
const generateServiceContractHtml = (data: any) => {
  const client = data.client;
  const tour = data.tour || {};
  const seats = data.seats;
  const agency = data.agency;

  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const tourTitle = tour?.title || 'N/A';
  const contractDate = format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es });

  const safeCompanions = Array.isArray(client.companions) ? client.companions : [];
  const safeExtraServices = Array.isArray(client.extra_services) ? client.extra_services : [];
  const safeIncludes = Array.isArray(tour.includes) ? tour.includes : [];
  const safeItinerary = Array.isArray(tour.itinerary) ? tour.itinerary : [];

  const companionsList = safeCompanions.length > 0
    ? safeCompanions.map((c: any) => `<li>${c.name || 'Acompañante sin nombre'} ${c.age !== null && typeof c.age === 'number' ? `(${c.age} años)` : ''}</li>`).join('')
    : '<li>N/A</li>';

  let seatNumbers = 'N/A';
  if (seats && seats.length > 0) {
    const validSeats = seats.filter((s: any) => s && typeof s.seat_number === 'number');
    if (validSeats.length > 0) {
      const numbers = validSeats.map((s: any) => s.seat_number);
      const sortedNumbers = numbers.sort((a: number, b: number) => a - b);
      seatNumbers = sortedNumbers.join(', ');
    }
  }

  const extraServicesList = safeExtraServices.length > 0
    ? safeExtraServices.map((s: any) => {
        const price = typeof s.selling_price_per_unit_snapshot === 'number' ? s.selling_price_per_unit_snapshot : 0;
        const quantity = typeof s.quantity === 'number' ? s.quantity : 0;
        return `<li>${s.name_snapshot || 'Servicio sin nombre'} (${s.service_type_snapshot || 'N/A'}) - Cantidad: ${quantity} - Precio: $${price.toFixed(2)}</li>`;
      }).join('')
    : '<li>N/A</li>';

  const includesList = safeIncludes.length > 0
    ? safeIncludes.map((item: string) => `<li>${item}</li>`).join('')
    : '<li>N/A</li>';

  const itineraryList = safeItinerary.length > 0
    ? safeItinerary.map((item: any) => `<li>Día ${item.day}: ${item.activity}</li>`).join('')
    : '<li>N/A</li>';

  const clientTotalAmount = typeof client.total_amount === 'number' ? client.total_amount : 0;
  const clientTotalPaid = typeof client.total_paid === 'number' ? client.total_paid : 0;
  const remainingPayment = (clientTotalAmount - clientTotalPaid).toFixed(2);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato de Servicio - ${client.contract_number || 'N/A'}</title>
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
                color: #E4007C; /* Rosa Mexicano */
                font-weight: 700;
                margin-top: 0;
            }
            h1 {
                text-align: center;
                font-size: 2.2em;
                margin-bottom: 20px;
                text-transform: uppercase;
            }
            h2 {
                font-size: 1.4em;
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
            .section {
                padding: 12px;
                border: 1px solid #eee;
                border-radius: 5px;
                background-color: #fdfdfd;
                margin-bottom: 20px;
            }
            .section p, .section ul, .section ol {
                margin-bottom: 6px;
            }
            .label {
                font-weight: 600;
                color: #555;
            }
            ul, ol {
                padding-left: 18px;
                margin-top: 4px;
            }
            ul li, ol li {
                margin-bottom: 2px;
                font-size: 0.9em;
            }
            .payment-summary {
                background-color: #fff0f5; /* Light pink */
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
            .signature-section {
                margin-top: 50px;
                display: flex;
                justify-content: space-around;
                text-align: center;
            }
            .signature-block {
                width: 45%;
            }
            .signature-line {
                border-top: 1px solid #ccc;
                width: 80%;
                margin: 0 auto 5px auto;
            }
            .footer-info {
                text-align: center;
                margin-top: 30px;
                font-size: 0.8em;
                color: #888;
            }

            /* Print-specific styles */
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
                .section { padding: 10px; margin-bottom: 15px; }
                .section p, .section ul, .section ol { margin-bottom: 5px; }
                ul, ol { padding-left: 18px; margin-top: 4px; }
                ul li, ol li { font-size: 0.9em; margin-bottom: 2px; }
                .payment-summary { padding: 15px; margin-top: 20px; }
                .payment-summary p { margin: 5px 0; }
                .total-amount { font-size: 1.2em; padding-top: 8px; margin-top: 12px; }
                .signature-section { margin-top: 40px; }
                .signature-line { width: 200px; }
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

            <h1>Contrato de Servicio de Viaje</h1>

            <div class="section">
                <p>Este contrato de servicio de viaje ("Contrato") se celebra y entra en vigor el día <strong>${contractDate}</strong>, entre:</p>
                <p><strong>La Agencia:</strong> ${agency?.agency_name || 'N/A'}</p>
                <p><strong>El Cliente:</strong> ${clientFullName} con número de contrato <strong>${client.contract_number || 'N/A'}</strong>.</p>
            </div>

            <div class="section">
                <h2>Detalles del Cliente</h2>
                <p><span class="label">Nombre Completo:</span> ${clientFullName}</p>
                <p><span class="label">Email:</span> ${client.email || 'N/A'}</p>
                <p><span class="label">Teléfono:</span> ${client.phone || 'N/A'}</p>
                <p><span class="label">Dirección:</span> ${client.address || 'N/A'}</p>
                <p><span class="label">Edad del Contratante:</span> ${client.contractor_age !== null && typeof client.contractor_age === 'number' ? client.contractor_age : 'N/A'}</p>
                <h3>Acompañantes (${client.number_of_people - 1}):</h3>
                <ul>
                    ${companionsList}
                </ul>
            </div>

            <div class="section">
                <h2>Detalles del Tour Contratado</h2>
                <p><span class="label">Nombre del Tour:</span> ${tourTitle}</p>
                <p><span class="label">Descripción:</span> ${tour?.description || 'N/A'}</p>
                <p><span class="label">Duración:</span> ${tour?.duration || 'N/A'}</p>
                <p><span class="label">Número de Personas:</span> ${client.number_of_people || 'N/A'}</p>
                <p><span class="label">Distribución de Habitaciones:</span> ${formatRoomDetails(client.room_details)}</p>
                <p><span class="label">Asientos Asignados:</span> ${seatNumbers}</p>
                <h3>Servicios Incluidos en el Tour:</h3>
                <ul>
                    ${includesList}
                </ul>
                <h3>Itinerario Resumido:</h3>
                <ol>
                    ${itineraryList}
                </ol>
            </div>

            <div class="section">
                <h2>Servicios Adicionales Contratados</h2>
                <ul>
                    ${extraServicesList}
                </ul>
            </div>

            <div class="payment-summary">
                <h2>Resumen Financiero</h2>
                <p><span class="label">Monto Total del Contrato:</span> $${clientTotalAmount.toFixed(2)}</p>
                <p><span class="label">Total Pagado (acumulado):</span> $${clientTotalPaid.toFixed(2)}</p>
                <p class="total-amount"><span class="label">Adeudo Pendiente:</span> $${remainingPayment}</p>
            </div>

            <div class="section">
                <h2>Términos y Condiciones</h2>
                <p>
                    <strong>[INSERTA AQUÍ TUS TÉRMINOS Y CONDICIONES LEGALES ESPECÍFICOS]</strong>
                </p>
                <p>
                    Esto puede incluir políticas de cancelación, políticas de reembolso, responsabilidades de la agencia,
                    responsabilidades del cliente, información sobre seguros de viaje, cambios en el itinerario,
                    fuerza mayor, etc. Es crucial que esta sección sea legalmente sólida y adaptada a tu negocio.
                </p>
                <p>
                    <em>Ejemplo de cláusula:</em> "El Cliente acepta que cualquier cancelación o modificación de la reserva
                    estará sujeta a las políticas de cancelación de la Agencia y de los proveedores de servicios,
                    pudiendo incurrir en cargos adicionales. Se recomienda encarecidamente la contratación de un seguro de viaje."
                </p>
            </div>

            <div class="signature-section">
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <p>Firma del Cliente</p>
                    <p>${clientFullName}</p>
                </div>
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <p>Firma de la Agencia</p>
                    <p>${agency?.agency_name || 'N/A'}</p>
                </div>
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
  console.log('Edge Function: generate-service-contract invoked (start of serve).');

  if (req.method === 'OPTIONS') {
    console.log('Edge Function: OPTIONS request received for generate-service-contract. Responding with 200 OK and full CORS headers.');
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  const htmlResponse = (html: string, status: number) => new Response(html, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('Edge Function: Unauthorized: Missing Authorization header.');
    return jsonResponse({ error: 'Unauthorized: Missing Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser) {
    console.error('Edge Function: Auth error:', authError?.message || 'User not found.');
    return jsonResponse({ error: 'Unauthorized: Invalid token or user not found' }, 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error('Edge Function: Profile error or not admin. Profile error:', profileError?.message, 'User role:', profile?.role);
    return jsonResponse({ error: 'Forbidden: Only administrators can perform this action' }, 403);
  }

  let clientId: string;
  try {
    const requestBody = await req.json();
    clientId = requestBody.clientId;
  } catch (parseError: any) {
    console.error('Edge Function: Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!clientId) {
      return jsonResponse({ error: 'Client ID is required.' }, 400);
    }

    console.log('Edge Function: Fetching client data for contract...');
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        tours (
          title,
          description,
          duration,
          includes,
          itinerary
        ),
        tour_seat_assignments (
          seat_number
        )
      `)
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Edge Function: Error fetching client for contract:', clientError?.message || 'Client not found.');
      return jsonResponse({ error: 'Client not found or error fetching client data.' }, 404);
    }
    console.log('Edge Function: Client data fetched successfully for contract.');

    let seats: any[] = [];
    if (client.tour_id) {
      const { data: fetchedSeats, error: seatsError } = await supabaseAdmin
        .from('tour_seat_assignments')
        .select('seat_number')
        .eq('client_id', clientId)
        .eq('tour_id', client.tour_id);

      if (seatsError) {
        console.error('Edge Function: Error fetching seats for contract:', seatsError.message);
      } else {
        seats = fetchedSeats || [];
      }
    }

    console.log('Edge Function: Fetching agency settings for contract...');
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agency_settings')
      .select('*')
      .single();

    if (agencyError && agencyError.code !== 'PGRST116') {
      console.error('Edge Function: Error fetching agency settings for contract:', agencyError.message);
    }

    console.log('Edge Function: Generating HTML content for contract...');
    const htmlContent = generateServiceContractHtml({
      client,
      tour: client.tours,
      seats: seats,
      agency: agency,
    });
    console.log('Edge Function: HTML content generated successfully for contract.');

    return htmlResponse(htmlContent, 200);

  } catch (error: any) {
    console.error('Edge Function: UNEXPECTED ERROR IN CATCH BLOCK for contract:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});