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
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; padding: 30px; background: #f4f4f4; color: #333; }
            .sheet-container { max-width: 800px; margin: 0 auto; background: white; border: 2px solid #91045A; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: #91045A; color: white; padding: 25px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .content { padding: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .label { font-size: 12px; color: #888; text-transform: uppercase; font-weight: 700; margin-bottom: 5px; }
            .value { font-size: 16px; font-weight: 600; color: #222; }
            .highlight-box { background: #fff5f9; border: 1px solid #91045A; padding: 20px; border-radius: 10px; text-align: center; }
            .seats-large { font-size: 42px; font-weight: 700; color: #91045A; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; border-top: 1px dashed #ddd; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="sheet-container">
            <div class="header">
                <h1>Hoja de Reserva Control</h1>
            </div>
            <div class="content">
                <div class="grid">
                    <div>
                        <div class="label">Número de Contrato</div>
                        <div class="value" style="font-size: 24px; color: #91045A;">${client.contract_number}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="label">Estado de Reserva</div>
                        <div class="value">${client.status.toUpperCase()}</div>
                    </div>
                </div>

                <div class="section" style="margin-top: 20px;">
                    <div class="label">Titular de la Reserva</div>
                    <div class="value" style="font-size: 20px;">${client.first_name} ${client.last_name}</div>
                </div>

                <div class="section" style="margin-top: 20px;">
                    <div class="label">Destino / Servicio</div>
                    <div class="value">${title}</div>
                </div>

                <div class="highlight-box" style="margin-top: 30px;">
                    <div class="label">Asientos Confirmados</div>
                    <div class="seats-large">${seatNumbers}</div>
                    <div class="value">${client.number_of_people} Persona(s) en total</div>
                </div>

                <div class="grid" style="margin-top: 30px;">
                    <div>
                        <div class="label">Total del Contrato</div>
                        <div class="value">$${client.total_amount.toLocaleString()}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="label">Saldo Pendiente</div>
                        <div class="value" style="color: #d32f2f;">$${(client.total_amount - client.total_paid).toLocaleString()}</div>
                    </div>
                </div>
            </div>
            <div class="footer">
                Presente este documento al momento de abordar. ¡Gracias por viajar con Saura!
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