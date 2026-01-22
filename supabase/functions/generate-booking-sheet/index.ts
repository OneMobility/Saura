import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const generateBookingSheetHtml = (data: any) => {
  const { client, tour, agency, busRoute, busPassengers, tourSeats } = data;
  
  const isTour = !!client.tour_id;
  const title = isTour ? tour?.title : busRoute?.name;
  
  let seatNumbers = "";
  if (isTour) {
    seatNumbers = tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  } else {
    seatNumbers = busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Hoja de Reserva - ${client.contract_number}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; border: 5px solid #91045A; }
            .header { text-align: center; background-color: #91045A; color: white; padding: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
            .label { font-weight: bold; color: #555; }
            .value { font-size: 18px; font-weight: bold; color: #91045A; }
            .footer { text-align: center; margin-top: 30px; font-style: italic; color: #777; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>HOJA DE CONTROL DE RESERVA</h1>
            <p>Contrato No: ${client.contract_number}</p>
        </div>
        <div class="section">
            <p><span class="label">CLIENTE:</span> ${client.first_name} ${client.last_name}</p>
            <p><span class="label">DESTINO/SERVICIO:</span> ${title}</p>
        </div>
        <div class="section" style="text-align: center;">
            <p class="label">ASIENTOS ASIGNADOS:</p>
            <p class="value" style="font-size: 48px;">${seatNumbers}</p>
            <p><span class="label">TOTAL PERSONAS:</span> ${client.number_of_people}</p>
        </div>
        <div class="section">
            <p><span class="label">TOTAL DEL CONTRATO:</span> $${client.total_amount.toLocaleString()}</p>
            <p><span class="label">TOTAL PAGADO:</span> $${client.total_paid.toLocaleString()}</p>
            <p><span class="label">SALDO PENDIENTE:</span> <span style="color: red;">$${(client.total_amount - client.total_paid).toLocaleString()}</span></p>
        </div>
        <div class="footer">
            <p>Presente este comprobante al momento de abordar. ¡Gracias por viajar con Saura!</p>
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