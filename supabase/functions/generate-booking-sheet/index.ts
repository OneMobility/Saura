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
    
    const roomsCount = Math.ceil(client.number_of_people / 4);
    
    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1 style="text-align: center; border-bottom: 3px solid #91045A;">HOJA DE CONTROL DE RESERVA</h1>
          <div style="background: #f8f8f8; padding: 20px; border-radius: 10px;">
            <p><strong>Contrato:</strong> ${client.contract_number}</p>
            <p><strong>Titular:</strong> ${client.first_name} ${client.last_name}</p>
            <p><strong>Viaje:</strong> ${client.tours.title}</p>
            <h2 style="color: #91045A;">HABITACIONES: ${roomsCount}</h2>
            <p><strong>Pax Totales:</strong> ${client.number_of_people}</p>
          </div>
          <div style="margin-top: 20px;">
            <h3>Detalles de Pago</h3>
            <p>Monto Total: $${client.total_amount.toLocaleString()}</p>
            <p>Abonado: $${client.total_paid.toLocaleString()}</p>
            <p style="font-size: 20px; font-weight: bold; color: red;">Pendiente: $${(client.total_amount - client.total_paid).toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});