import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateHtml = (data: any) => {
  const { client, tour, agency, tourSeats } = data;
  const clientFullName = `${client.first_name} ${client.last_name}`;
  const totalPax = client.number_of_people;
  const roomsCount = Math.ceil(totalPax / 4);

  // Lógica de cobro en contrato
  let adults = (client.contractor_age === null || client.contractor_age > 12) ? 1 : 0;
  let children = (client.contractor_age !== null && client.contractor_age <= 12) ? 1 : 0;
  (client.companions || []).forEach((c: any) => { (c.age === null || c.age > 12) ? adults++ : children++; });

  let breakdownHtml = "";
  if (adults === 1 && children === 1) {
    breakdownHtml = `<tr><td>Servicio Todo Incluido (1 Ad + 1 Niñ)</td><td>1 Pareja</td><td>$${(tour.selling_price_double_occupancy * 2).toLocaleString()}</td></tr>`;
  } else if (adults === 1 && (children === 2 || children === 3)) {
    breakdownHtml = `<tr><td>Habitación Cuádruple (Tarifa Base)</td><td>1 Hab.</td><td>$${(tour.selling_price_quad_occupancy * 4).toLocaleString()}</td></tr>`;
  } else {
    breakdownHtml = `<tr><td>Pasajeros Adultos</td><td>${adults}</td><td>$${(adults * tour.selling_price_double_occupancy).toLocaleString()}</td></tr>
                    <tr><td>Pasajeros Niños</td><td>${children}</td><td>$${(children * tour.selling_price_child).toLocaleString()}</td></tr>`;
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; color: #333; padding: 40px; }
          .header { border-bottom: 2px solid #91045A; margin-bottom: 20px; }
          .room-badge { background: #91045A; color: white; padding: 10px; border-radius: 5px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #eee; padding: 10px; text-align: left; }
          .total { background: #fdfdfd; font-size: 20px; font-weight: bold; color: #91045A; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CONTRATO DE SERVICIO - ${client.contract_number}</h1>
        </div>
        <p><strong>Cliente:</strong> ${clientFullName}</p>
        <p><strong>Viaje:</strong> ${tour.title}</p>
        <p class="room-badge">HABITACIONES ASIGNADAS: ${roomsCount}</p>
        
        <table>
          <thead><tr><th>Concepto</th><th>Cantidad</th><th>Monto</th></tr></thead>
          <tbody>
            ${breakdownHtml}
            <tr class="total"><td>TOTAL DEL CONTRATO</td><td></td><td>$${client.total_amount.toLocaleString()} MXN</td></tr>
          </tbody>
        </table>
        <p style="margin-top: 40px; border-top: 1px solid #ccc; width: 200px; text-align: center;">Firma del Cliente</p>
      </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { contractNumber } = await req.json();
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: client } = await supabaseAdmin.from('clients').select('*, tours(*)').ilike('contract_number', contractNumber).single();
    const html = generateHtml({ client, tour: client.tours });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});