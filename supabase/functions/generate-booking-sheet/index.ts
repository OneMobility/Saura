import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
        <title>Hoja de Control de Reserva - ${client.contract_number}</title>
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; border: 8px double #91045A; min-height: 90vh; box-sizing: border-box; color: #333; }
            .header { text-align: center; background-color: #91045A; color: white; padding: 15px; margin-bottom: 25px; }
            .header h1 { margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0; font-weight: bold; font-size: 18px; }
            .section { margin-bottom: 25px; padding: 15px; border: 1px solid #ccc; border-radius: 5px; }
            .label { font-weight: bold; color: #666; display: block; margin-bottom: 5px; text-transform: uppercase; font-size: 12px; }
            .value { font-size: 20px; font-weight: bold; color: #000; }
            .seats-container { text-align: center; background-color: #f9f9f9; padding: 25px; border: 2px solid #91045A; margin: 20px 0; border-radius: 10px; }
            .seats-label { font-size: 16px; font-weight: bold; color: #91045A; margin-bottom: 10px; }
            .seats-value { font-size: 60px; font-weight: bold; color: #91045A; display: block; }
            .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .payment-box { padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .total-label { font-size: 14px; font-weight: bold; }
            .total-value { font-size: 22px; font-weight: bold; color: #91045A; }
            .footer { text-align: center; margin-top: 50px; font-size: 13px; color: #888; border-top: 1px dashed #ccc; padding-top: 20px; }
            .status-badge { display: inline-block; padding: 5px 15px; background: #91045A; color: white; border-radius: 20px; font-size: 12px; margin-top: 10px; }
            @media print { body { border: 8px double #91045A; -webkit-print-color-adjust: exact; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Hoja de Control de Reserva</h1>
            <p>Contrato: ${client.contract_number}</p>
        </div>

        <div class="section">
            <span class="label">Nombre del Cliente:</span>
            <span class="value">${client.first_name} ${client.last_name}</span>
            <br><br>
            <span class="label">Servicio Reservado:</span>
            <span class="value">${title}</span>
        </div>

        <div class="seats-container">
            <span class="seats-label">ASIENTOS ASIGNADOS</span>
            <span class="seats-value">${seatNumbers}</span>
            <div class="status-badge">Estado: ${client.status.toUpperCase()}</div>
        </div>

        <div class="payment-grid">
            <div class="payment-box">
                <span class="label">Costo Total del Servicio:</span>
                <span class="total-value">$${client.total_amount.toLocaleString()}</span>
            </div>
            <div class="payment-box">
                <span class="label">Total Abonado:</span>
                <span class="total-value" style="color: #2e7d32;">$${client.total_paid.toLocaleString()}</span>
            </div>
        </div>

        <div class="section" style="border-color: #d32f2f; background-color: #fff8f8; text-align: right;">
            <span class="label" style="color: #d32f2f;">Saldo Pendiente de Liquidar:</span>
            <span class="total-value" style="color: #d32f2f; font-size: 30px;">$${(client.total_amount - client.total_paid).toLocaleString()} MXN</span>
        </div>

        <div class="footer">
            <p><strong>IMPORTANTE:</strong> Favor de presentar esta hoja al momento de abordar el autobús.</p>
            <p>Muchas gracias por su preferencia. ¡Disfrute su viaje!</p>
            <p style="margin-top: 15px;">Saura Tours - Agencia de Viajes y Transporte</p>
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
    const { data: client, error: clientError } = await supabaseAdmin.from('clients').select(`*, tours (*), bus_routes (*)`).ilike('contract_number', contractNumber.trim()).single();
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