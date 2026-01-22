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
    const { data: seats } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
    const { data: payments } = await supabaseAdmin.from('client_payments').select('*').eq('client_id', client.id).order('payment_date', { ascending: true });

    const seatNumbers = seats?.map(s => s.seat_number).sort((a, b) => a - b).join(', ') || 'N/A';
    const totalPax = client.number_of_people;
    const roomsCount = Math.ceil(totalPax / 4);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 13px; color: #000; }
              .header { text-align: center; border-bottom: 4px double #000; margin-bottom: 20px; padding-bottom: 10px; }
              .box { border: 2px solid #000; padding: 15px; margin-bottom: 20px; }
              .title { font-weight: bold; text-decoration: underline; margin-bottom: 10px; display: block; font-size: 16px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .stat-box { border: 1px solid #000; padding: 10px; text-align: center; background: #eee; }
              .stat-val { font-size: 24px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              th { background: #f0f0f0; }
              .footer { margin-top: 40px; text-align: center; font-style: italic; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>HOJA DE CONTROL INTERNO - SAURA TOURS</h1>
              <p>AUDITORÍA DE RESERVA: ${client.contract_number}</p>
          </div>

          <div class="grid">
              <div class="box">
                  <span class="title">DATOS DEL CLIENTE</span>
                  <p><strong>NOMBRE:</strong> ${client.first_name} ${client.last_name}</p>
                  <p><strong>TELÉFONO:</strong> ${client.phone || 'N/A'}</p>
                  <p><strong>EMAIL:</strong> ${client.email}</p>
                  <p><strong>IDENTIFICACIÓN:</strong> ${client.identification_number || 'N/A'}</p>
              </div>
              <div class="box">
                  <span class="title">DETALLES DEL VIAJE</span>
                  <p><strong>TOUR:</strong> ${client.tours?.title}</p>
                  <p><strong>ASIENTOS:</strong> [ ${seatNumbers} ]</p>
                  <p><strong>STATUS:</strong> ${client.status.toUpperCase()}</p>
              </div>
          </div>

          <div class="grid">
              <div class="stat-box">
                  <span>TOTAL PASAJEROS</span><br>
                  <span class="stat-val">${totalPax}</span>
              </div>
              <div class="stat-box">
                  <span>HABITACIONES ESTIMADAS</span><br>
                  <span class="stat-val">${roomsCount}</span>
              </div>
          </div>

          <span class="title" style="margin-top: 30px;">ESTADO DE CUENTA Y PAGOS</span>
          <table>
              <thead>
                  <tr>
                      <th>Fecha</th>
                      <th>Método</th>
                      <th>Referencia</th>
                      <th align="right">Monto</th>
                  </tr>
              </thead>
              <tbody>
                  ${payments?.map(p => `
                      <tr>
                          <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                          <td>${p.payment_method}</td>
                          <td style="font-size: 10px;">${p.id}</td>
                          <td align="right">$${p.amount.toLocaleString()}</td>
                      </tr>
                  `).join('')}
                  <tr style="background: #f0f0f0; font-weight: bold;">
                      <td colspan="3" align="right">TOTAL ABONADO:</td>
                      <td align="right">$${client.total_paid.toLocaleString()}</td>
                  </tr>
                  <tr style="background: #000; color: #fff; font-size: 18px;">
                      <td colspan="3" align="right">SALDO PENDIENTE:</td>
                      <td align="right">$${(client.total_amount - client.total_paid).toLocaleString()} MXN</td>
                  </tr>
              </tbody>
          </table>

          <div class="footer">
              <p>Este documento es para uso exclusivo de control interno y auditoría de Saura Tours.</p>
              <p>Impreso el: ${new Date().toLocaleString()}</p>
          </div>
      </body>
      </html>
    `;
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});