import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Helper function to generate HTML for the booking sheet
const generateBookingSheetHtml = (data: any) => {
  const client = data.client;
  const tour = data.tour || {};
  const seats = data.seats;
  const agency = data.agency;

  const safeCompanions = Array.isArray(client.companions) ? client.companions : [];
  const safeExtraServices = Array.isArray(client.extra_services) ? client.extra_services : [];
  const safeIncludes = Array.isArray(tour.includes) ? tour.includes : [];

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

  const clientTotalAmount = typeof client.total_amount === 'number' ? client.total_amount : 0;
  const clientTotalPaid = typeof client.total_paid === 'number' ? client.total_paid : 0;
  const remainingPayment = (clientTotalAmount - clientTotalPaid).toFixed(2);

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
                font-size: 10pt; /* Base font size for screen */
            }
            .page-container {
                max-width: 210mm; /* A4 width, close to Letter */
                min-height: 297mm; /* A4 height, close to Letter */
                margin: 20px auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                padding: 25px; /* Slightly reduced padding */
                box-sizing: border-box;
            }
            h1, h2, h3 {
                color: #E4007C; /* Rosa Mexicano */
                font-weight: 700;
                margin-top: 0;
            }
            h1 {
                text-align: center;
                font-size: 2em; /* Slightly smaller */
                margin-bottom: 20px;
                text-transform: uppercase;
            }
            h2 {
                font-size: 1.3em; /* Slightly smaller */
                margin-bottom: 12px;
                border-bottom: 2px solid #E4007C;
                padding-bottom: 4px;
            }
            h3 {
                font-size: 1.1em; /* Slightly smaller */
                margin-bottom: 8px;
            }
            .agency-header {
                background-color: #E4007C;
                color: white;
                padding: 20px; /* Slightly reduced padding */
                border-radius: 8px;
                text-align: center;
                margin-bottom: 25px; /* Slightly reduced margin */
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
                max-width: 100px; /* Slightly smaller logo */
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
                font-size: 1.8em; /* Slightly smaller */
                border-bottom: none;
                padding-bottom: 0;
            }
            .agency-header p {
                margin: 0;
                font-size: 0.85em; /* Slightly smaller */
                opacity: 0.9;
            }
            .main-content-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px; /* Gap between columns */
                margin-bottom: 25px;
            }
            .section {
                padding: 12px; /* Slightly reduced padding */
                border: 1px solid #eee;
                border-radius: 5px;
                background-color: #fdfdfd;
                height: 100%; /* Ensure columns stretch */
                box-sizing: border-box;
            }
            .section p, .section ul {
                margin-bottom: 6px; /* Reduced margin */
            }
            .label {
                font-weight: 600;
                color: #555;
            }
            ul {
                list-style-type: disc;
                padding-left: 18px; /* Reduced padding */
                margin-top: 4px;
            }
            ul li {
                margin-bottom: 2px; /* Reduced margin */
                font-size: 0.9em; /* Slightly smaller */
            }
            .payment-summary {
                background-color: #fff0f5; /* Light pink */
                padding: 18px; /* Slightly reduced padding */
                border-radius: 8px;
                border: 1px solid #E4007C;
                margin-top: 25px; /* Slightly reduced margin */
            }
            .payment-summary p {
                margin: 6px 0; /* Reduced margin */
                font-size: 1em;
            }
            .total-amount {
                font-size: 1.3em; /* Slightly smaller */
                font-weight: 700;
                color: #E4007C;
                border-top: 1px solid #E4007C;
                padding-top: 8px; /* Reduced padding */
                margin-top: 12px; /* Reduced margin */
            }
            .footer-info {
                text-align: center;
                margin-top: 30px; /* Slightly reduced margin */
                font-size: 0.8em; /* Slightly smaller */
                color: #888;
            }

            /* Print-specific styles */
            @media print {
                @page {
                    size: letter; /* Set page size to Letter */
                    margin: 0.4in; /* Even smaller margins for print */
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact; /* Ensure background colors are printed */
                    print-color-adjust: exact;
                    font-size: 9.5pt; /* Increased base font size for print */
                    line-height: 1.4; /* Tighter line height */
                }
                .page-container {
                    width: 100%;
                    margin: 0;
                    box-shadow: none;
                    border-radius: 0;
                    border: none;
                    padding: 15px; /* Minimal padding for print */
                }
                h1 { font-size: 1.8em; margin-bottom: 18px; } /* Slightly larger and more margin */
                h2 { font-size: 1.3em; margin-bottom: 10px; border-bottom: 1px solid #E4007C; padding-bottom: 4px; } /* Slightly larger */
                h3 { font-size: 1.05em; margin-bottom: 7px; } /* Slightly larger */
                .agency-header { padding: 18px; margin-bottom: 20px; } /* Slightly more padding */
                .agency-header img { max-width: 85px; margin-bottom: 10px; } /* Slightly larger logo */
                .agency-header h2 { font-size: 1.6em; } /* Slightly larger */
                .agency-header p { font-size: 0.8em; } /* Slightly larger */
                .main-content-grid {
                    gap: 18px; /* Slightly larger gap */
                    margin-bottom: 20px; /* Slightly more margin */
                }
                .section { padding: 10px; margin-bottom: 8px; } /* Slightly more padding and margin */
                .section p, .section ul { margin-bottom: 5px; } /* Slightly more margin */
                ul { padding-left: 18px; margin-top: 4px; } /* Slightly more padding */
                ul li { font-size: 0.9em; margin-bottom: 2px; } /* Slightly larger */
                .payment-summary { padding: 15px; margin-top: 20px; } /* Slightly more padding and margin */
                .payment-summary p { margin: 5px 0; } /* Slightly more margin */
                .total-amount { font-size: 1.2em; padding-top: 8px; margin-top: 12px; } /* Slightly larger */
                .footer-info { margin-top: 25px; font-size: 0.75em; } /* Slightly more margin and larger font */
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
                        <h3>Acompañantes:</h3>
                        <ul>
                            ${companionsList}
                        </ul>
                    </div>
                </div>
                <div class="booking-details-column">
                    <div class="section">
                        <h2>Detalles de la Reserva</h2>
                        <p><span class="label">Número de Reserva:</span> ${client.contract_number || 'N/A'}</p>
                        <p><span class="label">Tour:</span> ${tour?.title || 'N/A'}</p>
                        <p><span class="label">Duración:</span> ${tour?.duration || 'N/A'}</p>
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
                <h2>Incluye el Tour:</h2>
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

            <div class="footer-info">
                <p>&copy; ${new Date().getFullYear()} ${agency?.agency_name || 'Tu Agencia de Viajes'}. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  console.log('Edge Function: generate-booking-sheet invoked.');

  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper function to standardize JSON error responses
  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  // Helper function to standardize HTML responses
  const htmlResponse = (html: string, status: number) => new Response(html, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });

  console.log('Edge Function: Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
  console.log('Edge Function: Content-Length header:', req.headers.get('Content-Length'));

  // Verify JWT token to ensure request comes from an authenticated user (admin)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('Edge Function: Unauthorized: Missing Authorization header.');
    return jsonResponse({ error: 'Unauthorized: Missing Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Initialize Supabase client with service role key for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );
  console.log('Edge Function: Supabase admin client initialized.');

  console.log('Edge Function: Verifying user token with admin client...');
  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser) {
    console.error('Edge Function: Auth error:', authError?.message || 'User not found.');
    return jsonResponse({ error: 'Unauthorized: Invalid token or user not found' }, 401);
  }
  console.log('Edge Function: User authenticated:', authUser.id);

  // Check if the authenticated user is an admin using the supabaseAdmin client
  console.log('Edge Function: Checking invoking user role with admin client...');
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error('Edge Function: Profile error or not admin. Profile error:', profileError?.message, 'User role:', profile?.role);
    return jsonResponse({ error: 'Forbidden: Only administrators can perform this action' }, 403);
  }
  console.log('Edge Function: Invoking user is an administrator.');

  let clientId: string;
  try {
    // Read clientId from the JSON body
    const requestBody = await req.json();
    clientId = requestBody.clientId;
    console.log('Edge Function: Parsed clientId from request body:', clientId);
  } catch (parseError: any) {
    console.error('Edge Function: Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!clientId) {
      return jsonResponse({ error: 'Client ID is required.' }, 400);
    }

    console.log('Edge Function: Fetching client data...');
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
      console.error('Edge Function: Error fetching client:', clientError?.message || 'Client not found.');
      return jsonResponse({ error: 'Client not found or error fetching client data.' }, 404);
    }
    console.log('Edge Function: Client data fetched successfully.');
    console.log('Edge Function: Client object:', JSON.stringify(client));
    console.log('Edge Function: Client.tours object:', JSON.stringify(client.tours));


    let seats: any[] = [];
    if (client.tour_id) { // Only fetch seats if a tour_id is present
      console.log('Edge Function: Fetching seat assignments for tour_id:', client.tour_id);
      const { data: fetchedSeats, error: seatsError } = await supabaseAdmin
        .from('tour_seat_assignments')
        .select('seat_number')
        .eq('client_id', clientId)
        .eq('tour_id', client.tour_id);

      if (seatsError) {
        console.error('Edge Function: Error fetching seats:', seatsError.message);
        // Continue without seats if there's an error, but log it
      } else {
        seats = fetchedSeats || [];
        console.log('Edge Function: Fetched seats:', JSON.stringify(seats));
      }
    } else {
      console.log('Edge Function: Client has no tour_id, skipping seat assignment fetch.');
    }

    console.log('Edge Function: Fetching agency settings...');
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agency_settings')
      .select('*')
      .single();

    if (agencyError && agencyError.code !== 'PGRST116') {
      console.error('Edge Function: Error fetching agency settings:', agencyError.message);
    }
    console.log('Edge Function: Agency data:', JSON.stringify(agency));

    console.log('Edge Function: Generating HTML content...');
    const htmlContent = generateBookingSheetHtml({
      client,
      tour: client.tours,
      seats: seats,
      agency: agency,
    });
    console.log('Edge Function: HTML content generated successfully.');

    return htmlResponse(htmlContent, 200);

  } catch (error: any) {
    console.error('Edge Function: UNEXPECTED ERROR IN CATCH BLOCK:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});