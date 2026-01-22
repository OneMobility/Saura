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
    companionsHtml = `<ol style="margin-top: 5px;">${client.companions.map((c: any) => `<li>${c.name} ${c.age ? `(${c.age} años)` : ''}</li>`).join('')}</ol>`;
  } else if (!isTour && busPassengers && busPassengers.length > 1) {
    // Si es bus, los acompañantes están en la tabla de pasajeros
    const others = busPassengers.filter((p: any) => !p.is_contractor);
    if (others.length > 0) {
      companionsHtml = `<ol style="margin-top: 5px;">${others.map((c: any) => `<li>${c.first_name} ${c.last_name} (Asiento: ${c.seat_number})</li>`).join('')}</ol>`;
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
            body { font-family: 'Poppins', sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 0; font-size: 9pt; }
            .page { width: 215.9mm; min-height: 279.4mm; margin: 0 auto; padding: 20mm; box-sizing: border-box; background: white; }
            .header { text-align: center; border-bottom: 2px solid #91045A; padding-bottom: 10px; margin-bottom: 15px; }
            .logo { max-width: 100px; margin-bottom: 5px; display: block; margin-left: auto; margin-right: auto; }
            .contract-title { font-size: 14pt; font-weight: 900; color: #91045A; margin: 0; text-transform: uppercase; }
            .contract-number { font-size: 11pt; font-weight: 700; margin-top: 3px; color: #333; }
            .section-title { font-weight: 700; text-transform: uppercase; font-size: 10pt; color: #91045A; margin-top: 12px; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-bottom: 8px; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .details-table td { padding: 4px 8px; border: 1px solid #eee; font-size: 9pt; vertical-align: top; }
            .details-table .label { font-weight: 600; background-color: #fcfcfc; width: 25%; color: #666; }
            .clause { text-align: justify; margin-bottom: 6px; font-size: 8.5pt; }
            .signatures { display: flex; justify-content: space-around; margin-top: 40px; }
            .signature-box { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px; font-weight: 600; font-size: 9pt; }
            .bold { font-weight: 700; }
            @media print { .page { width: 100%; padding: 15mm; margin: 0; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo" alt="Logo">` : ''}
                <p class="contract-title">CONTRATO DE PRESTACIÓN DE SERVICIOS TURÍSTICOS</p>
                <p class="contract-number">CONTRATO No: ${client.contract_number}</p>
            </div>

            <p class="clause">Contrato que celebran <span class="bold">SAURA TOURS</span> ("LA AGENCIA") y el/la <span class="bold">SR(A). ${clientFullName}</span> ("EL CLIENTE"), bajo las siguientes declaraciones y cláusulas:</p>

            <div class="section-title">DATOS DEL TITULAR (CLIENTE)</div>
            <table class="details-table">
                <tr>
                    <td class="label">Nombre:</td><td>${clientFullName}</td>
                    <td class="label">Identificación:</td><td>${client.identification_number || 'No proporcionada'}</td>
                </tr>
                <tr>
                    <td class="label">Edad:</td><td>${client.contractor_age ? `${client.contractor_age} años` : 'N/A'}</td>
                    <td class="label">Teléfono:</td><td>${client.phone || 'N/A'}</td>
                </tr>
                <tr>
                    <td class="label">Domicilio:</td><td colspan="3">${client.address || 'Domicilio no registrado'}</td>
                </tr>
            </table>

            <div class="section-title">DETALLES DEL VIAJE Y ACOMPAÑANTES</div>
            <table class="details-table">
                <tr><td class="label">Servicio:</td><td colspan="3"><span class="bold">${title}</span></td></tr>
                <tr>
                    <td class="label">Salida:</td><td>${departureDate} - ${departureTime}</td>
                    <td class="label">Regreso:</td><td>${returnDate} - ${returnTime}</td>
                </tr>
                <tr>
                    <td class="label">Asientos:</td><td class="bold" style="color: #91045A;">${seatNumbers}</td>
                    <td class="label">Pasajeros:</td><td>${client.number_of_people} Persona(s)</td>
                </tr>
            </table>
            
            <div style="margin-left: 10px; margin-bottom: 15px;">
                <span class="bold" style="font-size: 8.5pt; color: #666;">LISTA DE ACOMPAÑANTES:</span>
                <div style="font-size: 8.5pt;">${companionsHtml}</div>
            </div>

            <div class="section-title">ESTADO DE CUENTA</div>
            <table class="details-table">
                <tr>
                    <td class="label">Total Contrato:</td><td class="bold">$${client.total_amount.toLocaleString()} MXN</td>
                    <td class="label">Liquidado:</td><td>$${client.total_paid.toLocaleString()} MXN</td>
                    <td class="label">Pendiente:</td><td class="bold" style="color: red;">$${amountRemaining.toLocaleString()} MXN</td>
                </tr>
            </table>

            <div class="section-title">CLÁUSULAS PRINCIPALES</div>
            <p class="clause"><span class="bold">1. ANTICIPOS:</span> La reservación solo es válida con el pago del anticipo pactado. <span class="bold">2. LIQUIDACIÓN:</span> El saldo debe cubrirse en su totalidad antes de la fecha de salida. <span class="bold">3. CANCELACIONES:</span> No hay reembolsos en cancelaciones con menos de 72h de anticipación. <span class="bold">4. IDENTIFICACIÓN:</span> Es obligatorio portar identificación oficial original para abordar. <span class="bold">5. SEGURO:</span> El servicio incluye seguro de viajero limitado a la responsabilidad civil del transporte.</p>

            <div class="signatures">
                <div class="signature-box"><p>Representante Legal<br>SAURA TOURS</p></div>
                <div class="signature-box"><p>${clientFullName}<br>EL CLIENTE</p></div>
            </div>

            <div style="margin-top: 20px; text-align: center; font-size: 7pt; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
                ${agency?.agency_address || ''} | WhatsApp: ${agency?.agency_phone || ''}<br>
                Este documento es un comprobante oficial de su reservación. Fecha de emisión: ${contractDate}
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