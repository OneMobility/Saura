import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format } from 'https://esm.sh/date-fns@2.30.0';
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
  const title = isTour ? tour?.title : `Boleto de Autobús: ${busRoute?.name}`;
  
  let seatNumbers = "";
  if (isTour) {
    seatNumbers = tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  } else {
    seatNumbers = busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  }

  const amountRemaining = (client.total_amount - client.total_paid).toFixed(2);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Contrato de Prestación de Servicios - ${client.contract_number}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.3; color: #000; margin: 0; padding: 30px; font-size: 10px; }
            .header { text-align: center; border-bottom: 2px solid #91045A; padding-bottom: 10px; margin-bottom: 15px; }
            .logo { max-width: 140px; margin-bottom: 5px; }
            .contract-title { font-size: 14px; font-weight: bold; color: #91045A; margin: 0; }
            .contract-number { font-size: 12px; font-weight: bold; margin-top: 5px; }
            .section { margin-bottom: 10px; }
            .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 3px; text-transform: uppercase; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            .details-table td { padding: 4px; border: 1px solid #000; }
            .details-table .label { font-weight: bold; background-color: #eee; width: 30%; }
            .clause { text-align: justify; margin-bottom: 6px; }
            .signatures { display: flex; justify-content: space-around; margin-top: 30px; }
            .signature-box { border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 5px; }
            .bold { font-weight: bold; }
            @media print { body { padding: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo" alt="Logo">` : ''}
            <p class="contract-title">CONTRATO DE PRESTACIÓN DE SERVICIOS TURÍSTICOS Y DE TRANSPORTE</p>
            <p class="contract-number">No. DE CONTRATO: ${client.contract_number}</p>
        </div>

        <div class="section">
            <p>Contrato que celebran por una parte <span class="bold">SAURA TOURS</span> (en adelante "LA AGENCIA") y por otra el/la <span class="bold">SR(A). ${clientFullName}</span> (en adelante "EL CLIENTE"), bajo las siguientes declaraciones y cláusulas:</p>
        </div>

        <div class="section">
            <p class="section-title">DETALLES DEL SERVICIO</p>
            <table class="details-table">
                <tr><td class="label">Destino / Servicio:</td><td>${title}</td></tr>
                <tr><td class="label">Fecha de Contrato:</td><td>${contractDate}</td></tr>
                <tr><td class="label">Asientos Asignados:</td><td class="bold">${seatNumbers}</td></tr>
                <tr><td class="label">Número de Pasajeros:</td><td>${client.number_of_people}</td></tr>
            </table>
        </div>

        <div class="section">
            <p class="section-title">CLÁUSULAS</p>
            <p class="clause"><span class="bold">PRIMERA (OBJETO):</span> "LA AGENCIA" se obliga a prestar el servicio de transporte y/o tour especificado, garantizando la logística necesaria para su realización.</p>
            <p class="clause"><span class="bold">SEGUNDA (PRECIO):</span> El monto total es de <span class="bold">$${client.total_amount.toLocaleString()} MXN</span>. Se ha liquidado <span class="bold">$${client.total_paid.toLocaleString()} MXN</span>, quedando pendiente <span class="bold">$${amountRemaining.toLocaleString()} MXN</span>.</p>
            <p class="clause"><span class="bold">TERCERA (CANCELACIONES):</span> Toda cancelación por parte de "EL CLIENTE" genera un cargo administrativo del 20%. Si se cancela con menos de 72 horas de anticipación, no habrá reembolso del anticipo.</p>
            <p class="clause"><span class="bold">CUARTA (IDENTIFICACIÓN):</span> Es obligación del pasajero portar identificación oficial vigente durante todo el trayecto. "LA AGENCIA" no se hace responsable por omisiones del cliente.</p>
            <p class="clause"><span class="bold">QUINTA (EQUIPAJE):</span> Se permite una maleta de mano y una de hasta 20kg por persona. "LA AGENCIA" no se hace responsable por objetos de valor no declarados.</p>
            <p class="clause"><span class="bold">SEXTA (HORARIOS):</span> El cliente debe presentarse 30 minutos antes en el punto de salida. El transporte no se hace responsable por retrasos del cliente.</p>
            <p class="clause"><span class="bold">SÉPTIMA (SEGURO):</span> El servicio cuenta con seguro de viajero de responsabilidad civil según las normas de transporte vigentes.</p>
            <p class="clause"><span class="bold">OCTAVA (CONDUCTA):</span> "LA AGENCIA" se reserva el derecho de negar el servicio a personas bajo influencia de sustancias o que alteren el orden.</p>
            <p class="clause"><span class="bold">NOVENA (CAMBIOS):</span> "LA AGENCIA" podrá realizar ajustes en itinerarios por causas de fuerza mayor o seguridad, notificando al cliente.</p>
            <p class="clause"><span class="bold">DÉCIMA (JURISDICCIÓN):</span> Para cualquier controversia, ambas partes se someten a las leyes y tribunales competentes de la ciudad sede de la agencia.</p>
        </div>

        <div class="signatures">
            <div class="signature-box"><p>POR LA AGENCIA</p></div>
            <div class="signature-box"><p>POR EL CLIENTE</p></div>
        </div>

        <div style="margin-top: 20px; font-size: 8px; color: #555; text-align: center;">
            <p>${agency?.agency_address || ''} | WhatsApp: ${agency?.agency_phone || ''}</p>
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
    } else {
      const { data } = await supabaseAdmin.from('bus_passengers').select('seat_number').eq('client_id', client.id);
      busPassengers = data || [];
    }
    const html = generateServiceContractHtml({ client, tour: client.tours, busRoute: client.bus_routes, agency, tourSeats, busPassengers });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});