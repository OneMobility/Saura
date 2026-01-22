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
        <title>Contrato Saura - ${client.contract_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #91045A; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-section h1 { color: #91045A; margin: 0; font-size: 28px; text-transform: uppercase; }
            .contract-id { text-align: right; }
            .contract-id h2 { margin: 0; color: #666; font-size: 14px; text-transform: uppercase; }
            .contract-id p { margin: 0; font-size: 22px; font-weight: 700; color: #91045A; }
            
            .section { margin-bottom: 25px; }
            .section-title { background: #f8f8f8; padding: 8px 15px; font-weight: 700; color: #91045A; text-transform: uppercase; border-left: 5px solid #91045A; margin-bottom: 15px; }
            
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-box p { margin: 5px 0; font-size: 14px; }
            .info-box strong { color: #444; }
            
            .terms { font-size: 11px; color: #777; text-align: justify; border-top: 1px solid #eee; pt: 20px; margin-top: 40px; }
            .signatures { margin-top: 60px; display: flex; justify-content: space-around; }
            .sig-block { border-top: 1px solid #333; width: 220px; text-align: center; padding-top: 10px; font-size: 12px; font-weight: 700; }
            
            .price-total { text-align: right; margin-top: 20px; padding: 15px; background: #91045A; color: white; border-radius: 8px; }
            .price-total h3 { margin: 0; font-size: 24px; }
            
            @media print {
              body { padding: 0; }
              .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo-section">
                <h1>${agency?.agency_name || 'Saura Tours'}</h1>
                <p style="font-size: 12px; color: #666;">${agency?.agency_address || 'México'}</p>
            </div>
            <div class="contract-id">
                <h2>Contrato de Servicio</h2>
                <p>${client.contract_number}</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Información del Cliente</div>
            <div class="grid">
                <div class="info-box">
                    <p><strong>Titular:</strong> ${clientFullName}</p>
                    <p><strong>Identificación:</strong> ${client.identification_number || 'N/A'}</p>
                </div>
                <div class="info-box">
                    <p><strong>Fecha de Expedición:</strong> ${contractDate}</p>
                    <p><strong>Teléfono:</strong> ${client.phone || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Detalles del Servicio</div>
            <div class="info-box">
                <p><strong>Servicio Contratado:</strong> ${title}</p>
                <p><strong>Asientos Asignados:</strong> <span style="color: #91045A; font-weight: bold;">${seatNumbers}</span></p>
                <p><strong>Pasajeros:</strong> ${client.number_of_people} Persona(s)</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Resumen Económico</div>
            <div class="grid">
                <div class="info-box">
                    <p><strong>Costo Total:</strong> $${client.total_amount.toLocaleString()}</p>
                    <p><strong>Anticipo/Abonado:</strong> $${client.total_paid.toLocaleString()}</p>
                </div>
                <div class="info-box" style="text-align: right;">
                    <p style="color: #d32f2f; font-weight: bold;">Saldo Pendiente: $${amountRemaining.toLocaleString()}</p>
                </div>
            </div>
        </div>

        <div class="terms">
            <strong>TÉRMINOS Y CONDICIONES:</strong> El presente documento acredita la reserva de los servicios descritos. La agencia se compromete a prestar el servicio en las fechas y formas estipuladas. El cliente declara conocer las políticas de cancelación y reembolso. Cualquier cambio en la reserva debe notificarse con anticipación. Este contrato tiene validez legal como comprobante de servicio una vez liquidado el monto total.
        </div>

        <div class="signatures">
            <div class="sig-block">Firma Autorizada Saura</div>
            <div class="sig-block">Firma del Cliente</div>
        </div>

        <div class="price-total">
            <p style="font-size: 12px; margin-bottom: 5px; opacity: 0.9;">Total a Liquidar</p>
            <h3>$${client.total_amount.toLocaleString()} MXN</h3>
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