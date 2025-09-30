import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to format room details
const formatRoomDetails = (details: any) => {
  const parts = [];
  // Ensure details is an object before accessing properties
  const safeDetails = details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

  if (safeDetails.quad_rooms > 0) parts.push(`${safeDetails.quad_rooms} Cuádruple(s)`);
  if (safeDetails.triple_rooms > 0) parts.push(`${safeDetails.triple_rooms} Triple(s)`);
  if (safeDetails.double_rooms > 0) parts.push(`${safeDetails.double_rooms} Doble(s)`);
  return parts.join(', ') || 'N/A';
};

// Helper function to generate HTML for the booking sheet
const generateBookingSheetHtml = (data: any) => {
  const client = data.client;
  const tour = data.tour || {}; // Ensure tour is at least an empty object
  const seats = data.seats;
  const agency = data.agency;

  // Provide default empty arrays for companions and extra_services if they are null or not arrays
  const safeCompanions = Array.isArray(client.companions) ? client.companions : [];
  const safeExtraServices = Array.isArray(client.extra_services) ? client.extra_services : [];

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

  // Ensure total_amount and total_paid are numbers before calling toFixed
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
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 20px; }
            .container { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            h1, h2, h3 { color: #E4007C; }
            h1 { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px dashed #eee; }
            .section:last-child { border-bottom: none; }
            .label { font-weight: bold; }
            ul { list-style-type: none; padding: 0; }
            ul li { margin-bottom: 5px; }
            .payment-summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee; }
            .payment-summary p { margin: 5px 0; }
            .total-amount { font-size: 1.2em; font-weight: bold; color: #E4007C; }
            .agency-info { text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Hoja de Reserva</h1>

            <div class="section">
                <h2>Datos del Cliente</h2>
                <p><span class="label">Nombre del Cliente:</span> ${client.first_name || 'N/A'} ${client.last_name || 'N/A'}</p>
                <p><span class="label">Teléfono:</span> ${client.phone || 'N/A'}</p>
                <p><span class="label">Edad del Contratante:</span> ${client.contractor_age !== null && typeof client.contractor_age === 'number' ? client.contractor_age : 'N/A'}</p>
                <p><span class="label">Acompañantes:</span></p>
                <ul>
                    ${companionsList}
                </ul>
            </div>

            <div class="section">
                <h2>Detalles de la Reserva</h2>
                <p><span class="label">Número de Reserva:</span> ${client.contract_number || 'N/A'}</p>
                <p><span class="label">Tour:</span> ${tour?.title || 'N/A'}</p>
                <p><span class="label">Distribución de Habitación:</span> ${formatRoomDetails(client.room_details)}</p>
                <p><span class="label">Asientos Asignados:</span> ${seatNumbers}</p>
                <p><span class="label">Servicios Adicionales:</span></p>
                <ul>
                    ${extraServicesList}
                </ul>
            </div>

            <div class="section payment-summary">
                <h2>Resumen de Pagos</h2>
                <p><span class="label">Monto Total del Contrato:</span> $${clientTotalAmount.toFixed(2)}</p>
                <p><span class="label">Total Pagado:</span> $${clientTotalPaid.toFixed(2)}</p>
                <p class="total-amount"><span class="label">Adeudo:</span> $${remainingPayment}</p>
            </div>

            <div class="agency-info">
                <p><span class="label">${agency?.agency_name || 'Tu Agencia de Viajes'}</span></p>
                <p>Teléfono: ${agency?.agency_phone || 'N/A'} | Email: ${agency?.agency_email || 'N/A'} | Dirección: ${agency?.agency_address || 'N/A'}</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  console.log('Edge Function: generate-booking-sheet invoked.');

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

  console.log('Edge Function: Verifying user token with admin client...');
  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser) {
    console.error('Edge Function: Auth error:', authError?.message || 'User not found.');
    return jsonResponse({ error: 'Unauthorized: Invalid token or user not found' }, 401);
  }
  console.log('Edge Function: User authenticated:', authUser.id);

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

  try {
    const { clientId } = await req.json();
    console.log('Edge Function: Received clientId:', clientId);
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