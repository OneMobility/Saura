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
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 40px; font-size: 10px; }
            .header { text-align: center; border-bottom: 3px solid #91045A; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { max-width: 160px; margin-bottom: 5px; }
            .contract-title { font-size: 15px; font-weight: bold; color: #91045A; margin: 0; text-transform: uppercase; }
            .contract-number { font-size: 13px; font-weight: bold; margin-top: 5px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; text-transform: uppercase; font-size: 11px; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 15px; }
            .details-table td { padding: 5px 8px; border: 1px solid #000; font-size: 11px; }
            .details-table .label { font-weight: bold; background-color: #f0f0f0; width: 35%; }
            .clause { text-align: justify; margin-bottom: 8px; font-size: 10px; }
            .signatures { display: flex; justify-content: space-around; margin-top: 40px; }
            .signature-box { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px; font-weight: bold; }
            .bold { font-weight: bold; }
            .footer-info { margin-top: 40px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { padding: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo" alt="Logo">` : ''}
            <p class="contract-title">CONTRATO DE PRESTACIÓN DE SERVICIOS TURÍSTICOS Y DE TRANSPORTE</p>
            <p class="contract-number">CONTRATO No: ${client.contract_number}</p>
        </div>

        <div class="section">
            <p class="clause">Contrato de prestación de servicios que celebran por una parte la empresa denominada <span class="bold">SAURA TOURS</span>, a quien en lo sucesivo se le denominará como "LA AGENCIA", y por la otra parte el/la <span class="bold">SR(A). ${clientFullName}</span>, a quien en lo sucesivo se le denominará como "EL CLIENTE", de conformidad con las siguientes declaraciones y cláusulas:</p>
        </div>

        <div class="section">
            <p class="section-title">DECLARACIONES</p>
            <p class="clause">I.- <span class="bold">LA AGENCIA</span> declara ser una empresa legalmente constituida dedicada a la organización y comercialización de servicios turísticos y de transporte, contando con los recursos técnicos y humanos para cumplir con el objeto del presente contrato.</p>
            <p class="clause">II.- <span class="bold">EL CLIENTE</span> declara por su propio derecho ser mayor de edad, con capacidad legal para contratar y manifiesta su interés en adquirir los servicios detallados a continuación bajo los términos aquí establecidos.</p>
        </div>

        <div class="section">
            <p class="section-title">DATOS DEL SERVICIO</p>
            <table class="details-table">
                <tr><td class="label">Destino o Servicio:</td><td><span class="bold">${title}</span></td></tr>
                <tr><td class="label">Fecha de Contrato:</td><td>${contractDate}</td></tr>
                <tr><td class="label">Asientos Asignados:</td><td class="bold" style="font-size: 14px; color: #91045A;">${seatNumbers}</td></tr>
                <tr><td class="label">Número de Pasajeros:</td><td>${client.number_of_people} Persona(s)</td></tr>
                <tr><td class="label">Monto Total del Contrato:</td><td class="bold">$${client.total_amount.toLocaleString()} MXN</td></tr>
                <tr><td class="label">Monto Liquidado a la Fecha:</td><td>$${client.total_paid.toLocaleString()} MXN</td></tr>
                <tr><td class="label">Saldo Pendiente:</td><td class="bold" style="color: red;">$${amountRemaining.toLocaleString()} MXN</td></tr>
            </table>
        </div>

        <div class="section">
            <p class="section-title">CLÁUSULAS</p>
            <p class="clause"><span class="bold">PRIMERA (OBJETO):</span> El presente contrato tiene por objeto la prestación por parte de "LA AGENCIA" de los servicios de transporte y/o turísticos especificados en la sección de datos, obligándose a prestar el servicio en las condiciones pactadas.</p>
            <p class="clause"><span class="bold">SEGUNDA (ANTICIPOS Y RESERVACIÓN):</span> Para garantizar el servicio, el cliente deberá cubrir un anticipo. No se considera reservación confirmada hasta haber realizado el pago correspondiente y recibido este documento.</p>
            <p class="clause"><span class="bold">TERCERA (LIQUIDACIÓN):</span> El cliente se obliga a liquidar el saldo total del servicio en el tiempo estipulado por la agencia. El incumplimiento del pago total en las fechas acordadas facultará a la agencia para cancelar el servicio sin derecho a reembolso.</p>
            <p class="clause"><span class="bold">CUARTA (CANCELACIONES):</span> En caso de cancelación por parte del cliente: a) Con más de 15 días de anticipación: se aplicará un cargo administrativo del 20%. b) Con menos de 72 horas o no presentarse (No Show): no habrá reembolso alguno bajo ninguna circunstancia.</p>
            <p class="clause"><span class="bold">QUINTA (RESPONSABILIDAD):</span> "LA AGENCIA" actúa como intermediaria entre el cliente y los prestadores finales de servicios (hoteles, transportes locales, etc.). No se hace responsable por retrasos, huelgas o fenómenos naturales que alteren el itinerario.</p>
            <p class="clause"><span class="bold">SEXTA (IDENTIFICACIÓN):</span> Es responsabilidad absoluta del cliente y sus acompañantes portar identificación oficial original y vigente durante todo el trayecto. El impedimento de viaje por falta de documentación no genera responsabilidad para la agencia.</p>
            <p class="clause"><span class="bold">SÉPTIMA (EQUIPAJE):</span> El cliente tiene derecho a una maleta de mano y una de hasta 20kg. La agencia no se responsabiliza por objetos de valor, dinero o electrónicos que no hayan sido declarados explícitamente.</p>
            <p class="clause"><span class="bold">OCTAVA (CONDUCTA):</span> La agencia se reserva el derecho de negar el servicio o retirar del tour a cualquier persona que altere el orden, se encuentre bajo influjo de sustancias o ponga en riesgo la seguridad del grupo.</p>
            <p class="clause"><span class="bold">NOVENA (SEGURO):</span> El servicio cuenta con seguro de viajero de acuerdo a las normas de transporte federal vigentes, limitado a la responsabilidad civil del transporte.</p>
            <p class="clause"><span class="bold">DÉCIMA (JURISDICCIÓN):</span> Para la interpretación y cumplimiento del presente contrato, las partes se someten a las leyes y tribunales competentes de la sede de "LA AGENCIA".</p>
        </div>

        <div class="signatures">
            <div class="signature-box">
                <p>POR LA AGENCIA</p>
                <p style="margin-top: 40px; font-size: 8px;">SAURA TOURS</p>
            </div>
            <div class="signature-box">
                <p>POR EL CLIENTE</p>
                <p style="margin-top: 40px; font-size: 8px;">${clientFullName}</p>
            </div>
        </div>

        <div class="footer-info">
            <p>${agency?.agency_address || ''} | WhatsApp: ${agency?.agency_phone || ''} | Email: ${agency?.agency_email || ''}</p>
            <p>Este documento es un comprobante oficial de su reservación.</p>
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