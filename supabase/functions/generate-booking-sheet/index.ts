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
    
    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet">
          <style>
              @page { size: letter; margin: 15mm; }
              body { font-family: 'Poppins', sans-serif; color: #1e293b; line-height: 1.4; font-size: 11px; margin: 0; background: #fff; }
              
              .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
              .logo { max-height: 70px; max-width: 180px; object-fit: contain; }
              .agency-info { text-align: right; font-size: 10px; color: #64748b; }
              .agency-info h2 { margin: 0; color: ${primaryColor}; font-weight: 800; font-size: 18px; }

              .sheet-title { text-align: center; margin-bottom: 25px; }
              .sheet-title h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
              .sheet-title p { margin: 5px 0; color: ${primaryColor}; font-weight: 700; font-size: 14px; }

              .section { margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
              .section-header { background: #f8fafc; padding: 8px 15px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #475569; }
              .section-body { padding: 12px 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .field { margin-bottom: 5px; }
              .label { font-weight: 600; color: #64748b; font-size: 9px; text-transform: uppercase; display: block; }
              .value { font-weight: 700; color: #0f172a; font-size: 12px; }

              table { width: 100%; border-collapse: collapse; margin-top: 5px; }
              th { text-align: left; padding: 10px; background: #f1f5f9; font-weight: 700; color: #475569; font-size: 9px; text-transform: uppercase; }
              td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }

              .summary-box { float: right; width: 250px; margin-top: 20px; background: #f8fafc; border-radius: 10px; padding: 15px; border: 1px solid #e2e8f0; }
              .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .summary-total { border-top: 2px solid ${primaryColor}; padding-top: 8px; margin-top: 8px; font-weight: 800; color: ${primaryColor}; font-size: 14px; }

              .footer { clear: both; margin-top: 50px; text-align: center; font-size: 9px; color: #94a3b8; }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="logo-box">
                  ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo">` : ''}
              </div>
              <div class="agency-info">
                  <h2>${agency?.agency_name || 'Saura Tours'}</h2>
                  <p>${agency?.agency_address || 'Saltillo, Coahuila, México'}</p>
                  <p>WhatsApp: ${agency?.agency_phone || 'N/A'}</p>
                  <p>${agency?.agency_email || 'N/A'}</p>
              </div>
          </div>

          <div class="sheet-title">
              <h1>Hoja de Confirmación de Reserva</h1>
              <p>FOLIO: #${client.contract_number}</p>
          </div>

          <div class="section">
              <div class="section-header">Información del Tour</div>
              <div class="section-body">
                  <div class="field"><span class="label">Destino</span><div class="value">${client.tours?.title || 'N/A'}</div></div>
                  <div class="field"><span class="label">Asientos</span><div class="value">${seatNumbers}</div></div>
                  <div class="field"><span class="label">Salida</span><div class="value">${formatDate(client.tours?.departure_date)} - ${client.tours?.departure_time || ''}</div></div>
                  <div class="field"><span class="label">Regreso</span><div class="value">${formatDate(client.tours?.return_date)} - ${client.tours?.return_time || ''}</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-header">Datos del Cliente</div>
              <div class="section-body">
                  <div class="field"><span class="label">Titular</span><div class="value">${client.first_name} ${client.last_name}</div></div>
                  <div class="field"><span class="label">WhatsApp / Tel</span><div class="value">${client.phone || 'N/A'}</div></div>
                  <div class="field"><span class="label">Email</span><div class="value">${client.email}</div></div>
                  <div class="field"><span class="label">ID / Documento</span><div class="value">${client.identification_number || 'N/A'}</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-header">Historial de Pagos y Abonos</div>
              <table>
                  <thead>
                      <tr>
                          <th>Fecha</th>
                          <th>Concepto / Método</th>
                          <th>ID Referencia</th>
                          <th style="text-align: right;">Monto</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${payments?.map(p => `
                          <tr>
                              <td>${formatDate(p.payment_date)}</td>
                              <td style="text-transform: capitalize;">Abono: ${p.payment_method}</td>
                              <td style="color: #94a3b8; font-family: monospace; font-size: 9px;">${p.id.substring(0, 16)}...</td>
                              <td style="text-align: right; font-weight: 700;">$${p.amount.toLocaleString()}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
          </div>

          <div class="summary-box">
              <div class="summary-row"><span>Costo Total:</span> <strong>$${client.total_amount.toLocaleString()}</strong></div>
              <div class="summary-row"><span>Total Pagado:</span> <strong style="color: #10b981;">$${client.total_paid.toLocaleString()}</strong></div>
              <div class="summary-row summary-total"><span>SALDO PENDIENTE:</span> <span>$${(client.total_amount - client.total_paid).toLocaleString()}</span></div>
          </div>

          <div class="footer">
              Este documento es un comprobante de reserva interno para Saura Tours. <br>
              Generado electrónicamente el ${new Date().toLocaleString('es-MX')}.
          </div>
      </body>
      </html>
    `;
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});