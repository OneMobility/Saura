import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateHtml = (data: any) => {
  const { client, tour } = data;
  const totalPax = client.number_of_people;
  const roomsCount = Math.ceil(totalPax / 4);

  let adults = (client.contractor_age === null || client.contractor_age > 12) ? 1 : 0;
  let children = (client.contractor_age !== null && client.contractor_age <= 12) ? 1 : 0;
  (client.companions || []).forEach((c: any) => { (c.age === null || c.age > 12) ? adults++ : children++; });

  let tempAdults = adults;
  let tempChildren = children;
  let breakdownRows = "";

  for (let i = 0; i < roomsCount; i++) {
    const paxInRoom = Math.min(4, tempAdults + tempChildren);
    let occupancyLabel = paxInRoom === 4 ? "Cuádruple" : (paxInRoom === 3 ? "Triple" : "Doble");
    let adultPrice = paxInRoom === 4 ? tour.selling_price_quad_occupancy : (paxInRoom === 3 ? tour.selling_price_triple_occupancy : tour.selling_price_double_occupancy);

    const adultsInRoom = Math.min(paxInRoom, tempAdults);
    const childrenInRoom = paxInRoom - adultsInRoom;

    if (adultsInRoom > 0) {
      breakdownRows += `<tr><td>Habitación ${i+1} - Adultos en ${occupancyLabel}</td><td>${adultsInRoom}</td><td>$${(adultsInRoom * adultPrice).toLocaleString()}</td></tr>`;
    }
    if (childrenInRoom > 0) {
      breakdownRows += `<tr><td>Habitación ${i+1} - Niños (<=12 años)</td><td>${childrenInRoom}</td><td>$${(childrenInRoom * tour.selling_price_child).toLocaleString()}</td></tr>`;
    }

    tempAdults -= adultsInRoom;
    tempChildren -= childrenInRoom;
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; color: #333; padding: 40px; }
          .header { border-bottom: 3px solid #91045A; margin-bottom: 20px; }
          .badge { background: #91045A; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #eee; padding: 12px; text-align: left; }
          .total { background: #91045A; color: white; font-size: 22px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CONTRATO DE SERVICIO - ${client.contract_number}</h1>
        </div>
        <p><strong>Titular:</strong> ${client.first_name} ${client.last_name}</p>
        <p><strong>Viaje:</strong> ${tour.title}</p>
        <p><span class="badge">HABITACIONES: ${roomsCount}</span></p>
        
        <table>
          <thead><tr style="background:#f9f9f9;"><th>Concepto</th><th>Pax</th><th>Monto</th></tr></thead>
          <tbody>
            ${breakdownRows}
            <tr class="total"><td>TOTAL CONTRATO</td><td></td><td>$${client.total_amount.toLocaleString()} MXN</td></tr>
          </tbody>
        </table>
        <p style="margin-top: 50px; border-top: 2px solid #333; width: 250px; text-align: center;">Firma de Aceptación</p>
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
    return new Response(generateHtml({ client, tour: client.tours }), { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});