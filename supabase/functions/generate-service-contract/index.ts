import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const formatRoomDetails = (details: any) => {
  const parts = [];
  const safeDetails = details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };
  if (safeDetails.quad_rooms > 0) parts.push(`${safeDetails.quad_rooms} Cuádruple(s)`);
  if (safeDetails.triple_rooms > 0) parts.push(`${safeDetails.triple_rooms} Triple(s)`);
  if (safeDetails.double_rooms > 0) parts.push(`${safeDetails.double_rooms} Doble(s)`);
  return parts.join(', ') || 'N/A';
};

const generateServiceContractHtml = (data: any) => {
  const { client, tour, agency, busRoute, busPassengers, destinationMap, tourSeats } = data;
  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const contractDate = format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es });
  const safeIncludes = Array.isArray(tour?.includes) ? tour.includes : [];
  const safeItinerary = Array.isArray(tour?.itinerary) ? tour.itinerary : [];

  let tourOrRouteTitle = tour?.title || busRoute?.name || 'N/A';
  let tourOrRouteDuration = tour?.duration || 'N/A';
  let includesList = safeIncludes.map((item: string) => `<li>${item}</li>`).join('') || '<li>N/A</li>';
  let itineraryList = safeItinerary.map((item: any) => `<li>Día ${item.day}: ${item.activity}</li>`).join('') || '<li>N/A</li>';
  let seatNumbers = tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ') || 
                  busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Contrato - ${client.contract_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { border-bottom: 3px solid #E4007C; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .agency-name { color: #E4007C; font-size: 24px; font-weight: bold; }
            .section { margin-bottom: 25px; padding: 15px; border: 1px solid #eee; border-radius: 10px; }
            h2 { color: #E4007C; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .total { font-size: 20px; font-weight: bold; color: #E4007C; text-align: right; }
            @media print { body { padding: 0; } .header { -webkit-print-color-adjust: exact; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="agency-name">${agency?.agency_name || 'Saura Tours'}</div>
            <p>${agency?.agency_address || ''} | Tel: ${agency?.agency_phone || ''}</p>
        </div>
        <h1>CONTRATO DE SERVICIO: ${client.contract_number}</h1>
        <div class="section">
            <h2>Datos del Cliente</h2>
            <p><strong>Titular:</strong> ${clientFullName}</p>
            <p><strong>Fecha:</strong> ${contractDate}</p>
        </div>
        <div class="section">
            <h2>Detalles del Viaje</h2>
            <p><strong>Tour:</strong> ${tourOrRouteTitle}</p>
            <p><strong>Asientos:</strong> ${seatNumbers}</p>
            <p><strong>Incluye:</strong></p><ul>${includesList}</ul>
        </div>
        <div class="total">Total del Servicio: $${client.total_amount.toLocaleString()} MXN</div>
        <div style="margin-top: 50px; display: flex; justify-content: space-around;">
            <div style="border-top: 1px solid #000; width: 200px; text-align: center;">Firma Agencia</div>
            <div style="border-top: 1px solid #000; width: 200px; text-align: center;">Firma Cliente</div>
        </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  
  try {
    const { contractNumber } = await req.json();
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`*, tours (*), bus_routes (*)`)
      .ilike('contract_number', contractNumber.trim())
      .single();

    if (clientError || !client) throw new Error("Contrato no encontrado.");

    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    let tourSeats = [], busPassengers = [];

    if (client.tour_id) {
      const { data } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
      tourSeats = data || [];
    } else {
      const { data } = await supabaseAdmin.from('bus_passengers').select('seat_number').eq('client_id', client.id);
      busPassengers = data || [];
    }

    const html = generateServiceContractHtml({ client, tour: client.tours, busRoute: client.bus_routes, agency, tourSeats, busPassengers });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});