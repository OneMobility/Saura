import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { contractNumber } = await req.json();
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: client } = await supabaseAdmin.from('clients').select('*, tours(*)').ilike('contract_number', contractNumber).single();
    
    const totalPax = client.number_of_people;
    const roomsCount = Math.ceil(totalPax / 4);

    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 30px;">
          <h1 style="border-bottom: 5px solid #91045A; color: #91045A;">HOJA DE CONTROL INTERNO</h1>
          <div style="background: #f1f1f1; padding: 20px; border-radius: 15px;">
            <h2 style="margin:0;">Contrato: ${client.contract_number}</h2>
            <p><strong>Titular:</strong> ${client.first_name} ${client.last_name}</p>
            <p><strong>WhatsApp:</strong> ${client.phone || 'N/A'}</p>
          </div>

          <div style="margin-top: 20px; display: flex; gap: 20px;">
            <div style="flex:1; border: 2px solid #91045A; padding: 15px; border-radius: 10px; text-align: center;">
              <span style="font-size: 12px; font-weight: bold; color: #999;">HABITACIONES</span><br>
              <span style="font-size: 40px; font-weight: 900;">${roomsCount}</span>
            </div>
            <div style="flex:1; border: 2px solid #333; padding: 15px; border-radius: 10px; text-align: center;">
              <span style="font-size: 12px; font-weight: bold; color: #999;">PASAJEROS</span><br>
              <span style="font-size: 40px; font-weight: 900;">${totalPax}</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
            <tr style="background: #91045A; color: white;">
              <th style="padding: 15px; text-align: left;">Resumen Financiero</th>
              <th style="padding: 15px; text-align: right;">Monto</th>
            </tr>
            <tr><td style="padding: 15px; border-bottom: 1px solid #eee;">Valor Total del Contrato</td><td style="padding: 15px; text-align: right; border-bottom: 1px solid #eee;">$${client.total_amount.toLocaleString()}</td></tr>
            <tr><td style="padding: 15px; border-bottom: 1px solid #eee;">Total Recibido (Abonado)</td><td style="padding: 15px; text-align: right; border-bottom: 1px solid #eee; color: green; font-weight: bold;">$${client.total_paid.toLocaleString()}</td></tr>
            <tr style="font-size: 20px; font-weight: 900;"><td style="padding: 15px;">SALDO PENDIENTE</td><td style="padding: 15px; text-align: right; color: red;">$${(client.total_amount - client.total_paid).toLocaleString()} MXN</td></tr>
          </table>
        </body>
      </html>
    `;
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});