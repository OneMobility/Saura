import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const generateBookingSheetHtml = (data: any) => {
  const { client, tour, agency, busRoute, busPassengers, tourSeats } = data;
  const tourOrRouteTitle = tour?.title || busRoute?.name || 'N/A';
  let seatNumbers = tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ') || 
                  busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Hoja de Reserva - ${client.contract_number}</title>
        <style>
            body { font-family: sans-serif; padding: 30px; }
            .box { border: 2px solid #333; padding: 20px; border-radius: 10px; }
            .header { text-align: center; color: #E4007C; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="box">
            <h1 class="header">HOJA DE RESERVA</h1>
            <div class="info-grid">
                <div>
                    <h3>Detalles del Cliente</h3>
                    <p>Nombre: ${client.first_name} ${client.last_name}</p>
                    <p>Contrato: ${client.contract_number}</p>
                </div>
                <div>
                    <h3>Detalles del Viaje</h3>
                    <p>Tour: ${tourOrRouteTitle}</p>
                    <p>Asientos: ${seatNumbers}</p>
                </div>
            </div>
            <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px;">
                <h3>Resumen de Pago</h3>
                <p>Total: $${client.total_amount.toLocaleString()}</p>
                <p>Pagado: $${client.total_paid.toLocaleString()}</p>
                <p style="color: red; font-weight: bold;">Pendiente: $${(client.total_amount - client.total_paid).toLocaleString()}</p>
            </div>
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

    if (clientError || !client) throw new Error("Reserva no encontrada.");

    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    let tourSeats = [], busPassengers = [];

    if (client.tour_id) {
      const { data } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
      tourSeats = data || [];
    } else {
      const { data } = await supabaseAdmin.from('bus_passengers').select('seat_number').eq('client_id', client.id);
      busPassengers = data || [];
    }

    const html = generateBookingSheetHtml({ client, tour: client.tours, busRoute: client.bus_routes, agency, tourSeats, busPassengers });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});