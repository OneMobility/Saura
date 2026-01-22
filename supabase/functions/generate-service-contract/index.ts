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
  let companionsHtml = '<p>Sin acompañantes registrados.</p>';
  if (client.companions && client.companions.length > 0) {
    companionsHtml = `<ol style="margin-top: 5px; padding-left: 15px;">${client.companions.map((c: any) => `<li>${c.name} ${c.age ? `(${c.age} años)` : ''}</li>`).join('')}</ol>`;
  } else if (!isTour && busPassengers && busPassengers.length > 1) {
    const others = busPassengers.filter((p: any) => !p.is_contractor);
    if (others.length > 0) {
      companionsHtml = `<ol style="margin-top: 5px; padding-left: 15px;">${others.map((c: any) => `<li>${c.first_name} ${c.last_name} (Asiento: ${c.seat_number})</li>`).join('')}</ol>`;
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Contrato de Venta - ${client.contract_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.25; color: #333; margin: 0; padding: 0; font-size: 8.5pt; }
            .page { width: 215.9mm; min-height: 279.4mm; margin: 0 auto; padding: 15mm; box-sizing: border-box; background: white; border: 1px solid #eee; }
            .header { text-align: center; border-bottom: 2px solid #91045A; padding-bottom: 8px; margin-bottom: 12px; }
            .logo { max-width: 80px; margin-bottom: 4px; display: block; margin-left: auto; margin-right: auto; }
            .contract-title { font-size: 12pt; font-weight: 900; color: #91045A; margin: 0; text-transform: uppercase; }
            .contract-number { font-size: 10pt; font-weight: 700; margin-top: 2px; color: #333; }
            .section-title { font-weight: 700; text-transform: uppercase; font-size: 9pt; color: #91045A; margin-top: 10px; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-bottom: 6px; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            .details-table td { padding: 3px 6px; border: 1px solid #eee; font-size: 8.5pt; vertical-align: top; }
            .details-table .label { font-weight: 600; background-color: #fcfcfc; width: 20%; color: #666; }
            .clauses-container { margin-top: 10px; }
            .clause { text-align: justify; margin-bottom: 4px; font-size: 7.5pt; color: #444; }
            .clause-title { font-weight: 700; color: #333; }
            .signatures { display: flex; justify-content: space-around; margin-top: 25px; }
            .signature-box { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 4px; font-weight: 600; font-size: 8.5pt; }
            .bold { font-weight: 700; }
            @media print { .page { width: 100%; padding: 10mm; margin: 0; border: none; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo" alt="Logo">` : ''}
                <p class="contract-title">CONTRATO DE PRESTACIÓN DE SERVICIOS TURÍSTICOS</p>
                <p class="contract-number">CONTRATO No: ${client.contract_number}</p>
            </div>

            <p style="font-size: 8pt; margin-bottom: 8px;">Contrato que celebran <span class="bold">SAURA TOURS</span> ("LA AGENCIA") y el/la <span class="bold">SR(A). ${clientFullName}</span> ("EL CLIENTE"), bajo las siguientes declaraciones y cláusulas:</p>

            <div class="section-title">DATOS DEL TITULAR Y VIAJE</div>
            <table class="details-table">
                <tr>
                    <td class="label">Titular:</td><td>${clientFullName}</td>
                    <td class="label">Identificación:</td><td>${client.identification_number || 'N/A'}</td>
                </tr>
                <tr>
                    <td class="label">Edad:</td><td>${client.contractor_age ? `${client.contractor_age} años` : 'N/A'}</td>
                    <td class="label">Domicilio:</td><td>${client.address || 'N/A'}</td>
                </tr>
                <tr>
                    <td class="label">Servicio:</td><td colspan="3"><span class="bold">${title}</span></td>
                </tr>
                <tr>
                    <td class="label">Salida:</td><td>${departureDate} - ${departureTime}</td>
                    <td class="label">Regreso:</td><td>${returnDate} - ${returnTime}</td>
                </tr>
                <tr>
                    <td class="label">Asientos:</td><td class="bold" style="color: #91045A;">${seatNumbers}</td>
                    <td class="label">Total Pax:</td><td>${client.number_of_people} Persona(s)</td>
                </tr>
            </table>
            
            <div style="margin-bottom: 10px;">
                <span class="bold" style="font-size: 8pt; color: #666;">ACOMPAÑANTES:</span>
                <div style="font-size: 7.5pt;">${companionsHtml}</div>
            </div>

            <div class="section-title">ESTADO DE CUENTA</div>
            <table class="details-table">
                <tr>
                    <td class="label">Total Contrato:</td><td class="bold">$${client.total_amount.toLocaleString()}</td>
                    <td class="label">Pagado:</td><td style="color: green;">$${client.total_paid.toLocaleString()}</td>
                    <td class="label">Pendiente:</td><td class="bold" style="color: red;">$${(client.total_amount - client.total_paid).toLocaleString()}</td>
                </tr>
            </table>

            <div class="section-title">CLÁUSULAS DEL CONTRATO</div>
            <div class="clauses-container">
                <p class="clause"><span class="clause-title">PRIMERA (OBJETO):</span> LA AGENCIA se obliga a prestar a EL CLIENTE los servicios turísticos descritos en la carátula de este contrato.</p>
                <p class="clause"><span class="clause-title">SEGUNDA (ANTICIPO):</span> EL CLIENTE se obliga a cubrir el anticipo pactado para garantizar su lugar. Sin anticipo, la reservación no tiene validez legal.</p>
                <p class="clause"><span class="clause-title">TERCERA (LIQUIDACIÓN):</span> El saldo total deberá ser cubierto por EL CLIENTE a más tardar 15 días antes de la fecha programada de salida.</p>
                <p class="clause"><span class="clause-title">CUARTA (CANCELACIONES):</span> Si EL CLIENTE cancela con más de 15 días de antelación, perderá el anticipo. Con menos de 72 horas, no habrá reembolso alguno.</p>
                <p class="clause"><span class="clause-title">QUINTA (REPROGRAMACIÓN):</span> LA AGENCIA se reserva el derecho de modificar itinerarios por causas de fuerza mayor para garantizar la seguridad del grupo.</p>
                <p class="clause"><span class="clause-title">SEXTA (IDENTIFICACIÓN):</span> Es responsabilidad de EL CLIENTE portar identificación oficial original (INE o Pasaporte) para abordar la unidad.</p>
                <p class="clause"><span class="clause-title">SÉPTIMA (SEGURO):</span> El servicio incluye seguro de viajero limitado exclusivamente a la responsabilidad civil del transporte durante los traslados.</p>
                <p class="clause"><span class="clause-title">OCTAVA (COMPORTAMIENTO):</span> LA AGENCIA podrá negar el servicio a personas bajo el influjo de sustancias o que alteren el orden del grupo.</p>
                <p class="clause"><span class="clause-title">NOVENA (EQUIPAJE):</span> LA AGENCIA no se hace responsable por pérdida de objetos personales o equipaje olvidado en la unidad o instalaciones.</p>
                <p class="clause"><span class="clause-title">DÉCIMA (ASIENTOS):</span> Los números de asiento asignados al momento de la reserva son definitivos y no están sujetos a cambios el día de la salida.</p>
                <p class="clause"><span class="clause-title">DÉCIMA PRIMERA (MENORES):</span> Los menores de edad son responsabilidad absoluta de sus padres o tutores durante todo el trayecto y estancia.</p>
                <p class="clause"><span class="clause-title">DÉCIMA SEGUNDA (IMPUNTUALIDAD):</span> LA AGENCIA no se responsabiliza por clientes que no lleguen a la hora pactada de salida; se aplicará política de NO SHOW.</p>
                <p class="clause"><span class="clause-title">DÉCIMA TERCERA (JURISDICCIÓN):</span> Para la interpretación de este contrato, las partes se someten a las leyes y tribunales de la ciudad de Saltillo, Coahuila.</p>
                <p class="clause"><span class="clause-title">DÉCIMA CUARTA (PRIVACIDAD):</span> Los datos personales proporcionados serán tratados conforme a la Ley Federal de Protección de Datos Personales.</p>
            </div>

            <div class="signatures">
                <div class="signature-box"><p>Representante Legal<br>SAURA TOURS</p></div>
                <div class="signature-box"><p>${clientFullName}<br>EL CLIENTE</p></div>
            </div>

            <div style="margin-top: 15px; text-align: center; font-size: 7pt; color: #999; border-top: 1px solid #eee; padding-top: 8px;">
                ${agency?.agency_address || ''} | WhatsApp: ${agency?.agency_phone || ''}<br>
                Emisión: ${contractDate} | Documento Oficial de Saura Tours
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