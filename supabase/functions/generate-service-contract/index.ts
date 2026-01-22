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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato de Prestación de Servicios - ${client.contract_number}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 40px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #91045A; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { max-width: 150px; margin-bottom: 5px; }
            .contract-title { font-size: 16px; font-weight: bold; color: #91045A; margin: 0; }
            .contract-number { font-size: 14px; font-weight: bold; margin-top: 5px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; text-transform: uppercase; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            .details-table td { padding: 3px 5px; border: 1px solid #ddd; }
            .details-table .label { font-weight: bold; background-color: #f9f9f9; width: 30%; }
            .clause { text-align: justify; margin-bottom: 8px; }
            .signatures { display: flex; justify-content: space-around; margin-top: 40px; }
            .signature-box { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
            .bold { font-weight: bold; }
            .highlight { color: #91045A; font-weight: bold; }
            @media print { body { padding: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo" alt="Logo">` : ''}
            <p class="contract-title">CONTRATO DE PRESTACIÓN DE SERVICIOS TURÍSTICOS</p>
            <p class="contract-number">CONTRATO No: ${client.contract_number}</p>
        </div>

        <div class="section">
            <p>CONTRATO QUE CELEBRAN POR UNA PARTE <span class="bold">SAURA TOURS</span>, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "LA AGENCIA" Y POR OTRA PARTE EL/LA <span class="bold">SR(A). ${clientFullName}</span>, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL CLIENTE", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:</p>
        </div>

        <div class="section">
            <p class="section-title">DECLARACIONES</p>
            <p>I.- Declara "LA AGENCIA" ser una prestadora de servicios turísticos legalmente constituida y contar con los elementos propios para cumplir con las obligaciones de este contrato.</p>
            <p>II.- Declara "EL CLIENTE" que es su deseo contratar los servicios de transporte y/o turísticos que se detallan en el presente documento, conociendo y aceptando los términos del mismo.</p>
        </div>

        <div class="section">
            <p class="section-title">DETALLES DEL SERVICIO</p>
            <table class="details-table">
                <tr>
                    <td class="label">Servicio/Destino:</td>
                    <td>${title}</td>
                </tr>
                <tr>
                    <td class="label">Fecha de Expedición:</td>
                    <td>${contractDate}</td>
                </tr>
                <tr>
                    <td class="label">Asientos Asignados:</td>
                    <td class="bold highlight">${seatNumbers}</td>
                </tr>
                <tr>
                    <td class="label">Número de Pasajeros:</td>
                    <td>${client.number_of_people}</td>
                </tr>
            </table>
        </div>

        <div class="section">
            <p class="section-title">CLÁUSULAS</p>
            <p class="clause"><span class="bold">PRIMERA:</span> El objeto del presente contrato es la prestación de los servicios de transporte y/o turísticos descritos, comprometiéndose "LA AGENCIA" a cumplir con los mismos en los tiempos y formas acordados.</p>
            <p class="clause"><span class="bold">SEGUNDA (PAGO):</span> El costo total convenido por el servicio es de <span class="bold">$${client.total_amount.toLocaleString()} MXN</span>. "EL CLIENTE" ha cubierto a la fecha la cantidad de <span class="bold">$${client.total_paid.toLocaleString()} MXN</span>, quedando un saldo pendiente de <span class="bold highlight">$${amountRemaining.toLocaleString()} MXN</span>.</p>
            <p class="clause"><span class="bold">TERCERA (CANCELACIONES):</span> En caso de cancelación por parte del cliente, "LA AGENCIA" se reserva el derecho de aplicar cargos administrativos. Los depósitos de apartado no son reembolsables salvo causas imputables directamente a la empresa.</p>
            <p class="clause"><span class="bold">CUARTA (IDENTIFICACIÓN):</span> Los pasajeros deberán portar identificación oficial vigente y presentarse en los puntos de salida 30 minutos antes de la hora señalada.</p>
            <p class="clause"><span class="bold">QUINTA:</span> El seguro de viajero incluido en el transporte es de responsabilidad civil de acuerdo a las leyes federales vigentes.</p>
        </div>

        <div class="signatures">
            <div class="signature-box">
                <p>POR "LA AGENCIA"</p>
                <p style="margin-top: 30px;">SAURA TOURS</p>
            </div>
            <div class="signature-box">
                <p>POR "EL CLIENTE"</p>
                <p style="margin-top: 30px;">${clientFullName}</p>
            </div>
        </div>

        <div style="margin-top: 30px; font-size: 9px; color: #666; text-align: center;">
            <p>${agency?.agency_address || ''} | Tel: ${agency?.agency_phone || ''} | Email: ${agency?.agency_email || ''}</p>
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

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`*, tours (*), bus_routes (*)`)
      .ilike('contract_number', contractNumber.trim())
      .single();

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