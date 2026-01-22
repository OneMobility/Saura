import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const generateServiceContractHtml = (data: any) => {
  const { client, tour, agency, busRoute, busPassengers, tourSeats } = data;
  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const contractDate = format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es });
  
  const isTour = !!client.tour_id;
  const title = isTour ? tour?.title : `Boleto de Autobús: ${busRoute?.name || 'N/A'}`;
  
  const departureDate = isTour ? (client.tours?.departure_date ? format(parseISO(client.tours.departure_date), 'dd/MM/yyyy', { locale: es }) : 'N/A') : 'N/A';
  const returnDate = isTour ? (client.tours?.return_date ? format(parseISO(client.tours.return_date), 'dd/MM/yyyy', { locale: es }) : 'N/A') : 'N/A';
  const departureTime = isTour ? (client.tours?.departure_time || 'N/A') : 'N/A';
  const returnTime = isTour ? (client.tours?.return_time || 'N/A') : 'N/A';

  let seatNumbers = "";
  if (isTour) {
    seatNumbers = tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  } else {
    seatNumbers = busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  }

  const amountRemaining = (client.total_amount - client.total_paid).toFixed(2);

  // Acompañantes
  let companionsHtml = '<p style="color: #666; font-style: italic;">Sin acompañantes registrados.</p>';
  if (client.companions && client.companions.length > 0) {
    companionsHtml = `<ol style="margin-top: 5px; padding-left: 15px; color: #444;">${client.companions.map((c: any) => `<li>${c.name} ${c.age ? `(${c.age} años)` : ''}</li>`).join('')}</ol>`;
  } else if (!isTour && busPassengers && busPassengers.length > 1) {
    const others = busPassengers.filter((p: any) => !p.is_contractor);
    if (others.length > 0) {
      companionsHtml = `<ol style="margin-top: 5px; padding-left: 15px; color: #444;">${others.map((c: any) => `<li>${c.first_name} ${c.last_name} (Asiento: ${c.seat_number})</li>`).join('')}</ol>`;
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Contrato - ${client.contract_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            :root { --primary: #91045A; --bg-soft: #f8fafc; --text-main: #1e293b; --text-muted: #64748b; }
            body { font-family: 'Poppins', sans-serif; line-height: 1.4; color: var(--text-main); margin: 0; padding: 0; font-size: 8.5pt; background: #e2e8f0; }
            .page { width: 215.9mm; min-height: 279.4mm; margin: 20px auto; padding: 15mm; box-sizing: border-box; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 4px; }
            
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--primary); padding-bottom: 15px; margin-bottom: 20px; }
            .agency-info { text-align: right; }
            .agency-info h1 { margin: 0; color: var(--primary); font-size: 16pt; font-weight: 800; text-transform: uppercase; }
            .agency-info p { margin: 2px 0; color: var(--text-muted); font-size: 7.5pt; }
            .logo { max-width: 120px; height: auto; }

            .contract-badge { display: flex; justify-content: space-between; align-items: center; background: var(--bg-soft); padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
            .badge-title { font-weight: 800; color: var(--text-main); font-size: 10pt; text-transform: uppercase; }
            .badge-number { color: var(--primary); font-weight: 800; font-size: 11pt; }

            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
            .card-title { font-weight: 700; font-size: 8.5pt; color: var(--primary); text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
            
            .data-row { display: flex; margin-bottom: 4px; border-bottom: 1px solid #f8fafc; padding-bottom: 2px; }
            .data-label { font-weight: 600; color: var(--text-muted); width: 35%; font-size: 8pt; }
            .data-value { font-weight: 500; color: var(--text-main); width: 65%; }

            .seats-highlight { background: var(--primary); color: white; padding: 8px 12px; border-radius: 6px; margin-top: 10px; display: inline-block; }
            .seats-label { font-size: 7pt; font-weight: 600; text-transform: uppercase; display: block; opacity: 0.9; }
            .seats-numbers { font-size: 12pt; font-weight: 800; letter-spacing: 1px; }

            .financial-card { background: #fff1f2; border: 1px solid #fecdd3; }
            .amount-total { font-size: 11pt; font-weight: 800; color: var(--text-main); }
            .amount-paid { font-size: 11pt; font-weight: 800; color: #059669; }
            .amount-pending { font-size: 14pt; font-weight: 900; color: #dc2626; }

            .clauses-container { margin-top: 15px; padding: 12px; background: var(--bg-soft); border-radius: 8px; border: 1px solid #e2e8f0; }
            .clause { text-align: justify; margin-bottom: 5px; font-size: 7.2pt; color: #475569; line-height: 1.3; }
            .clause-num { font-weight: 800; color: var(--primary); }

            .signatures { display: flex; justify-content: space-around; margin-top: 30px; }
            .sig-box { width: 40%; text-align: center; }
            .sig-line { border-top: 1.5px solid var(--text-main); margin-bottom: 5px; }
            .sig-name { font-weight: 700; font-size: 8pt; text-transform: uppercase; }

            @media print { 
                body { background: white; }
                .page { margin: 0; width: 100%; box-shadow: none; border: none; }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header-container">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo" alt="Logo">` : '<div></div>'}
                <div class="agency-info">
                    <h1>${agency?.agency_name || 'SAURA TOURS'}</h1>
                    <p>${agency?.agency_address || 'Dirección no registrada'}</p>
                    <p>WhatsApp: ${agency?.agency_phone || 'N/A'} | Email: ${agency?.agency_email || 'N/A'}</p>
                </div>
            </div>

            <div class="contract-badge">
                <span class="badge-title">Contrato de Prestación de Servicios</span>
                <span class="badge-number">No. ${client.contract_number}</span>
            </div>

            <div class="grid">
                <div class="card">
                    <div class="card-title">Datos del Cliente</div>
                    <div class="data-row"><span class="data-label">Titular:</span><span class="data-value bold">${clientFullName}</span></div>
                    <div class="data-row"><span class="data-label">Identificación:</span><span class="data-value">${client.identification_number || 'No proporcionada'}</span></div>
                    <div class="data-row"><span class="data-label">Edad:</span><span class="data-value">${client.contractor_age ? `${client.contractor_age} años` : 'N/A'}</span></div>
                    <div class="data-row"><span class="data-label">Domicilio:</span><span class="data-value">${client.address || 'N/A'}</span></div>
                </div>
                <div class="card">
                    <div class="card-title">Detalles del Destino</div>
                    <div class="data-row"><span class="data-label">Servicio:</span><span class="data-value bold">${title}</span></div>
                    <div class="data-row"><span class="data-label">Salida:</span><span class="data-value">${departureDate} - ${departureTime}</span></div>
                    <div class="data-row"><span class="data-label">Regreso:</span><span class="data-value">${returnDate} - ${returnTime}</span></div>
                    <div class="seats-highlight">
                        <span class="seats-label">Asientos Seleccionados</span>
                        <span class="seats-numbers">${seatNumbers}</span>
                    </div>
                </div>
            </div>

            <div class="grid" style="grid-template-columns: 1.2fr 0.8fr;">
                <div class="card">
                    <div class="card-title">Acompañantes Registrados</div>
                    <div style="font-size: 7.5pt;">${companionsHtml}</div>
                </div>
                <div class="card financial-card">
                    <div class="card-title">Resumen de Cuenta</div>
                    <div class="data-row"><span class="data-label">Total:</span><span class="data-value amount-total">$${client.total_amount.toLocaleString()}</span></div>
                    <div class="data-row"><span class="data-label">Abonado:</span><span class="data-value amount-paid">$${client.total_paid.toLocaleString()}</span></div>
                    <div style="margin-top: 10px; border-top: 1px dashed #fca5a5; padding-top: 5px; text-align: right;">
                        <span class="data-label" style="width: 100%; display: block; text-align: right;">Saldo Pendiente</span>
                        <span class="amount-pending">$${(client.total_amount - client.total_paid).toLocaleString()} MXN</span>
                    </div>
                </div>
            </div>

            <div class="clauses-container">
                <div class="card-title" style="border: none;">Cláusulas del Contrato</div>
                <p class="clause"><span class="clause-num">1. OBJETO:</span> LA AGENCIA se obliga a prestar a EL CLIENTE los servicios turísticos descritos en la carátula de este contrato.</p>
                <p class="clause"><span class="clause-num">2. ANTICIPO:</span> EL CLIENTE se obliga a cubrir el anticipo pactado para garantizar su lugar. Sin anticipo, la reservación no tiene validez legal.</p>
                <p class="clause"><span class="clause-num">3. LIQUIDACIÓN:</span> El saldo total deberá ser cubierto por EL CLIENTE a más tardar 15 días antes de la fecha programada de salida.</p>
                <p class="clause"><span class="clause-num">4. CANCELACIONES:</span> Si EL CLIENTE cancela con más de 15 días de antelación, perderá el anticipo. Con menos de 72 horas, no habrá reembolso alguno.</p>
                <p class="clause"><span class="clause-num">5. REPROGRAMACIÓN:</span> LA AGENCIA se reserva el derecho de modificar itinerarios por causas de fuerza mayor para garantizar la seguridad del grupo.</p>
                <p class="clause"><span class="clause-num">6. IDENTIFICACIÓN:</span> Es responsabilidad de EL CLIENTE portar identificación oficial original (INE o Pasaporte) para abordar la unidad.</p>
                <p class="clause"><span class="clause-num">7. SEGURO:</span> El servicio incluye seguro de viajero limitado exclusivamente a la responsabilidad civil del transporte durante los traslados.</p>
                <p class="clause"><span class="clause-num">8. COMPORTAMIENTO:</span> LA AGENCIA podrá negar el servicio a personas bajo el influjo de sustancias o que alteren el orden del grupo.</p>
                <p class="clause"><span class="clause-num">9. EQUIPAJE:</span> LA AGENCIA no se hace responsable por pérdida de objetos personales o equipaje olvidado en la unidad o instalaciones.</p>
                <p class="clause"><span class="clause-num">10. ASIENTOS:</span> Los números de asiento asignados al momento de la reserva son definitivos y no están sujetos a cambios el día de la salida.</p>
                <p class="clause"><span class="clause-num">11. MENORES:</span> Los menores de edad son responsabilidad absoluta de sus padres o tutores durante todo el trayecto y estancia.</p>
                <p class="clause"><span class="clause-num">12. IMPUNTUALIDAD:</span> LA AGENCIA no se responsabiliza por clientes que no lleguen a la hora pactada de salida; se aplicará política de NO SHOW.</p>
                <p class="clause"><span class="clause-num">13. JURISDICCIÓN:</span> Para la interpretación de este contrato, las partes se someten a las leyes y tribunales de la ciudad de Saltillo, Coahuila.</p>
                <p class="clause"><span class="clause-num">14. PRIVACIDAD:</span> Los datos personales proporcionados serán tratados conforme a la Ley Federal de Protección de Datos Personales.</p>
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <span class="sig-name">Representante Legal</span><br>
                    <span style="font-size: 7pt; color: var(--text-muted);">SAURA TOURS</span>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <span class="sig-name">${clientFullName}</span><br>
                    <span style="font-size: 7pt; color: var(--text-muted);">EL CLIENTE</span>
                </div>
            </div>

            <div style="margin-top: 15px; text-align: center; font-size: 7pt; color: var(--text-muted); border-top: 1px solid #f1f5f9; padding-top: 10px;">
                Emitido el ${contractDate} | Documento Oficial de Saura Tours | www.sauratours.com
            </div>
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
    if (clientError || !client) throw new Error("Contrato no encontrado.");
    
    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    
    let tourSeats = [], busPassengers = [];
    if (client.tour_id) {
      const { data } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
      tourSeats = data || [];
    } else if (client.bus_route_id) {
      const { data } = await supabaseAdmin.from('bus_passengers').select('*').eq('client_id', client.id);
      busPassengers = data || [];
    }
    
    const html = generateServiceContractHtml({ client, tour: client.tours, busRoute: client.bus_routes, agency, tourSeats, busPassengers });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});