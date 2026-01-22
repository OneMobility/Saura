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
  const { client, tour, agency, busRoute, busPassengers, tourSeats, payments } = data;
  const isTour = !!client.tour_id;
  const title = isTour ? tour?.title : busRoute?.name;
  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const bookingDate = format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es });
  
  let seatNumbers = isTour 
    ? tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ')
    : busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ');

  // REGLA: 12 o menores son Niños
  let adults = (client.contractor_age === null || client.contractor_age > 12) ? 1 : 0;
  let children = (client.contractor_age !== null && client.contractor_age <= 12) ? 1 : 0;
  if (client.companions) {
    client.companions.forEach((c: any) => { (c.age === null || c.age > 12) ? adults++ : children++; });
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Control de Reserva - ${client.contract_number}</title>
        <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 4px solid #91045A; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .label { font-weight: bold; color: #666; font-size: 11px; text-transform: uppercase; }
            .value { font-size: 16px; font-weight: bold; display: block; margin-bottom: 10px; }
            .seat-badge { font-size: 40px; color: #91045A; font-weight: 900; text-align: center; display: block; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #eee; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .total-row { background: #fff0f5; font-weight: bold; font-size: 18px; color: #91045A; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>CONTROL DE ABORDÓ</h1>
            <p>CONTRATO: ${client.contract_number} | FECHA: ${bookingDate}</p>
        </div>

        <div class="section" style="text-align: center;">
            <span class="label">Asientos Asignados</span>
            <span class="seat-badge">${seatNumbers || 'N/A'}</span>
        </div>

        <div class="section">
            <span class="label">Titular de la Reserva</span>
            <span class="value">${clientFullName}</span>
            <span class="label">Teléfono / WhatsApp</span>
            <span class="value">${client.phone || 'N/A'}</span>
        </div>

        <div class="section">
            <h3>Desglose de Pasajeros</h3>
            <table>
                <tr><th>Tipo</th><th>Cantidad</th><th>Monto</th></tr>
                <tr><td>Adultos</td><td>${adults}</td><td>Costo Habitación</td></tr>
                <tr><td>Niños (<=12 años)</td><td>${children}</td><td>Tarifa Especial</td></tr>
            </table>
        </div>

        <div class="section">
            <h3>Resumen de Cuenta</h3>
            <table>
                <tr><td>Total del Contrato:</td><td>$${client.total_amount.toLocaleString()}</td></tr>
                <tr><td>Total Abonado:</td><td style="color: green;">$${client.total_paid.toLocaleString()}</td></tr>
                <tr class="total-row"><td>SALDO PENDIENTE:</td><td>$${(client.total_amount - client.total_paid).toLocaleString()} MXN</td></tr>
            </table>
        </div>

        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
            Documento de control interno para ${agency?.agency_name || 'Saura Tours'}
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
    const { data: client } = await supabaseAdmin.from('clients').select(`*, tours (*), bus_routes (*)`).ilike('contract_number', contractNumber.trim()).single();
    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    const { data: payments } = await supabaseAdmin.from('client_payments').select('*').eq('client_id', client.id);
    let tourSeats = [], busPassengers = [];
    if (client.tour_id) {
      const { data } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
      tourSeats = data || [];
    }
    const html = generateBookingSheetHtml({ client, tour: client.tours, busRoute: client.bus_routes, agency, tourSeats, busPassengers, payments: payments || [] });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});