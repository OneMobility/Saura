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
    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();

    const seatNumbers = seats?.map(s => s.seat_number).sort((a, b) => a - b).join(', ') || 'N/A';
    const primaryColor = agency?.primary_color || '#91045A';

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Montserrat', sans-serif; padding: 30px; font-size: 11px; color: #333; background: #fff; }
              .header { border-bottom: 4px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
              .header h1 { margin: 0; font-size: 24px; font-weight: 900; color: #1a1a1a; text-transform: uppercase; }
              
              .audit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
              .audit-card { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
              .audit-card h3 { margin: 0 0 8px 0; font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
              .audit-card p { margin: 0; font-size: 13px; font-weight: bold; }
              
              .section-title { background: #1a1a1a; color: white; padding: 6px 12px; border-radius: 4px; font-weight: 900; margin: 20px 0 10px; text-transform: uppercase; font-size: 10px; }
              
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { text-align: left; padding: 10px; background: #f4f4f4; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 9px; }
              td { padding: 10px; border-bottom: 1px solid #eee; }
              
              .financial-summary { margin-top: 30px; float: right; width: 300px; }
              .fin-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .fin-total { border-bottom: none; font-size: 16px; font-weight: 900; color: ${primaryColor}; padding-top: 15px; }
              
              .footer-stamp { margin-top: 100px; text-align: center; border: 2px dashed #ddd; padding: 20px; border-radius: 10px; color: #aaa; }
          </style>
      </head>
      <body>
          <div class="header">
              <div>
                  <h1>Hoja de Auditoría</h1>
                  <p>Control Interno Administrativo</p>
              </div>
              <div style="text-align: right;">
                  <p style="font-weight: bold; font-size: 16px; color: ${primaryColor}">FOLIO: ${client.contract_number}</p>
                  <p>${new Date().toLocaleString()}</p>
              </div>
          </div>

          <div class="audit-grid">
              <div class="audit-card"><h3>Titular</h3><p>${client.first_name} ${client.last_name}</p></div>
              <div class="audit-card"><h3>Tour / Destino</h3><p>${client.tours?.title}</p></div>
              <div class="audit-card"><h3>Asientos Asignados</h3><p>[ ${seatNumbers} ]</p></div>
          </div>

          <div class="section-title">Historial de Transacciones</div>
          <table>
              <thead>
                  <tr>
                      <th>Fecha de Pago</th>
                      <th>Método</th>
                      <th>ID Referencia</th>
                      <th style="text-align: right;">Monto</th>
                  </tr>
              </thead>
              <tbody>
                  ${payments?.map(p => `
                      <tr>
                          <td>${new Date(p.payment_date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                          <td style="text-transform: capitalize;">${p.payment_method}</td>
                          <td style="font-family: monospace; color: #888;">${p.id.substring(0, 18)}...</td>
                          <td style="text-align: right; font-weight: bold;">$${p.amount.toLocaleString()}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>

          <div class="financial-summary">
              <div class="fin-row"><span>Monto Contractual:</span> <span>$${client.total_amount.toLocaleString()}</span></div>
              <div class="fin-row"><span>Total Abonado:</span> <span style="color: green;">$${client.total_paid.toLocaleString()}</span></div>
              <div class="fin-row fin-total"><span>SALDO PENDIENTE:</span> <span>$${(client.total_amount - client.total_paid).toLocaleString()}</span></div>
          </div>

          <div style="clear: both;"></div>

          <div class="footer-stamp">
              Sello y Firma de Recepción de Caja<br>
              <span style="font-size: 8px;">Documento generado por el sistema de gestión Saura Tours. Reservados todos los derechos.</span>
          </div>
      </body>
      </html>
    `;
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});