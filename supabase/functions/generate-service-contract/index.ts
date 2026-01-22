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
    const remainingInContract = tempAdults + tempChildren;
    const paxInRoom = Math.min(4, remainingInContract);
    const adultsInRoom = Math.min(paxInRoom, tempAdults);
    const childrenInRoom = paxInRoom - adultsInRoom;

    // REGLA: 1 Adulto Solo o Pareja (1 ad + 1 niñ) pagan el total de Habitación Doble
    if (paxInRoom === 1 && adultsInRoom === 1) {
      breakdownRows += `<tr><td>Habitación ${i+1}: 1 Adulto Solo (Servicio en Hab. Doble)</td><td>2 pax (costo)</td><td>$${(2 * tour.selling_price_double_occupancy).toLocaleString()}</td></tr>`;
    } else if (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1) {
      breakdownRows += `<tr><td>Habitación ${i+1}: Servicio en Doble (1 Ad + 1 Niñ como 2 Ad)</td><td>2 pax (costo)</td><td>$${(2 * tour.selling_price_double_occupancy).toLocaleString()}</td></tr>`;
    } else {
      let occupancyLabel = paxInRoom === 4 ? "Cuádruple" : (paxInRoom === 3 ? "Triple" : "Doble");
      let adultPrice = paxInRoom === 4 ? tour.selling_price_quad_occupancy : (paxInRoom === 3 ? tour.selling_price_triple_occupancy : tour.selling_price_double_occupancy);

      if (adultsInRoom > 0) {
        breakdownRows += `<tr><td>Habitación ${i+1}: Adultos en Ocupación ${occupancyLabel}</td><td>${adultsInRoom} pax</td><td>$${(adultsInRoom * adultPrice).toLocaleString()}</td></tr>`;
      }
      if (childrenInRoom > 0) {
        breakdownRows += `<tr><td>Habitación ${i+1}: Tarifa de Menor (Niños)</td><td>${childrenInRoom} pax</td><td>$${(childrenInRoom * tour.selling_price_child).toLocaleString()}</td></tr>`;
      }
    }

    tempAdults -= adultsInRoom;
    tempChildren -= childrenInRoom;
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.6; }
          .header { border-bottom: 4px solid #91045A; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
          .badge { background: #91045A; color: white; padding: 8px 15px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: #f8f8f8; color: #666; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; padding: 15px; border-bottom: 2px solid #eee; }
          td { padding: 15px; border-bottom: 1px solid #f1f1f1; font-size: 14px; }
          .total { background: #91045A; color: white; font-size: 22px; font-weight: 900; }
          .footer { margin-top: 60px; text-align: center; }
          .sign { border-top: 2px solid #91045A; width: 300px; margin: 0 auto; padding-top: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #91045A; margin: 0;">CONTRATO DE PRESTACIÓN DE SERVICIOS</h1>
          <p style="margin: 5px 0; font-weight: bold;">Contrato No: ${client.contract_number}</p>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <div>
            <p><strong>CLIENTE:</strong> ${client.first_name} ${client.last_name}</p>
            <p><strong>DESTINO:</strong> ${tour.title}</p>
          </div>
          <div style="text-align: right;">
            <span class="badge">HABITACIONES: ${roomsCount}</span>
          </div>
        </div>

        <table>
          <thead><tr><th align="left">Concepto de Alojamiento y Viaje</th><th align="center">Pasajeros</th><th align="right">Subtotal</th></tr></thead>
          <tbody>
            ${breakdownRows}
            <tr class="total"><td colspan="2" align="right">VALOR TOTAL DEL CONTRATO:</td><td align="right">$${client.total_amount.toLocaleString()} MXN</td></tr>
          </tbody>
        </table>

        <p style="font-size: 10px; color: #888; margin-top: 20px;">* Las habitaciones son compartidas para 4 personas. Reservas individuales o de pareja cubren el costo total de la habitación doble.</p>

        <div class="footer">
          <div class="sign">FIRMA DEL CLIENTE</div>
          <p style="font-size: 11px;">Acepto los términos y condiciones de este contrato.</p>
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
    const { data: client } = await supabaseAdmin.from('clients').select('*, tours(*)').ilike('contract_number', contractNumber).single();
    return new Response(generateHtml({ client, tour: client.tours }), { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});