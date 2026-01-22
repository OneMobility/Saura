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
  const description = isTour ? tour?.description : 'Servicio de transporte terrestre.';
  const duration = isTour ? tour?.duration : 'Viaje sencillo';
  const includes = isTour ? (tour?.includes?.join(', ') || 'N/A') : 'Transporte y seguro de viajero.';
  const notIncludes = isTour ? 'Gastos personales, comidas no especificadas, propinas.' : 'Gastos personales, comidas, hospedaje.';

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
        <title>Contrato de Venta de Tour - ${client.contract_number}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 40px; font-size: 10px; }
            .header { text-align: center; border-bottom: 3px solid #91045A; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { max-width: 160px; margin-bottom: 5px; }
            .contract-title { font-size: 15px; font-weight: bold; color: #91045A; margin: 0; text-transform: uppercase; }
            .contract-number { font-size: 13px; font-weight: bold; margin-top: 5px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; text-transform: uppercase; font-size: 11px; color: #91045A; }
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
            <p class="contract-title">CONTRATO DE VENTA DE TOUR</p>
            <p class="contract-number">Número de Contrato: ${client.contract_number}</p>
        </div>

        <div class="section">
            <p class="clause">En la ciudad de Saltillo, Coahuila, México, a <span class="bold">${contractDate}</span>, se celebra el presente contrato de prestación de servicios turísticos entre:</p>
            <p class="clause"><span class="bold">${agency?.agency_name || 'LA AGENCIA'}</span>, con domicilio en <span class="bold">${agency?.agency_address || 'N/A'}</span>, representada por el C. Juan De Dios Saucedo Cortés, en adelante “LA AGENCIA”; y</p>
            <p class="clause"><span class="bold">${clientFullName}</span>, con domicilio en <span class="bold">${client.address || 'N/A'}</span>, identificado con <span class="bold">${client.identification_number || 'N/A'}</span>, en adelante “EL CLIENTE”.</p>
        </div>

        <div class="section">
            <p class="section-title">1. OBJETO DEL CONTRATO</p>
            <p class="clause">LA AGENCIA se compromete a coordinar y poner a disposición de EL CLIENTE el tour denominado <span class="bold">${title}</span>, que se llevará a cabo el día <span class="bold">${client.tours?.departure_date ? format(parseISO(client.tours.departure_date), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</span>, con las siguientes características:</p>
            <table class="details-table">
                <tr><td class="label">Destino / Itinerario:</td><td>${description}</td></tr>
                <tr><td class="label">Duración:</td><td>${duration}</td></tr>
                <tr><td class="label">Incluye:</td><td>${includes}</td></tr>
                <tr><td class="label">No incluye:</td><td>${notIncludes}</td></tr>
                <tr><td class="label">Precio Total:</td><td class="bold">$${client.total_amount.toLocaleString()} MXN</td></tr>
                <tr><td class="label">Asientos Asignados:</td><td class="bold" style="font-size: 14px; color: #91045A;">${seatNumbers}</td></tr>
            </table>
        </div>

        <div class="section">
            <p class="section-title">2. NATURALEZA DEL SERVICIO</p>
            <p class="clause">LA AGENCIA actúa únicamente como coordinadora de servicios turísticos, contratando servicios con proveedores independientes de transporte, hospedaje, alimentación, guías, accesos y demás.</p>
            <p class="clause">EL CLIENTE acepta que cada servicio está sujeto a los términos y condiciones de dichos proveedores, debiendo respetar sus contratos en lo individual y grupal.</p>
            <p class="clause">LA AGENCIA no será responsable de fallas, retrasos o incumplimientos atribuibles a terceros.</p>
        </div>

        <div class="section">
            <p class="section-title">3. EXCLUSIÓN DE RESPONSABILIDAD</p>
            <p class="clause">LA AGENCIA no será responsable por situaciones de fuerza mayor o ajenas a su control, tales como: Desastres naturales, fenómenos meteorológicos, pandemias, accidentes, disturbios sociales, cierres de carreteras, restricciones gubernamentales. Averías mecánicas, fallas en transportes, problemas en hospedajes o cancelaciones por parte de proveedores.</p>
            <p class="clause">LA AGENCIA solo responderá por lo contratado expresamente en este documento.</p>
            <p class="clause">EL CLIENTE libera a LA AGENCIA de cualquier responsabilidad por daños, pérdidas, lesiones, enfermedades o fallecimientos ocurridos durante el tour, salvo negligencia comprobada y directa de LA AGENCIA.</p>
        </div>

        <div class="section">
            <p class="section-title">4. CANCELACIONES Y REEMBOLSOS</p>
            <p class="clause"><span class="bold">Por parte del CLIENTE:</span> No habrá reembolso en caso de cancelación. EL CLIENTE podrá traspasar su lugar a otra persona, notificándolo con al menos 48 horas de anticipación.</p>
            <p class="clause"><span class="bold">Por parte de LA AGENCIA:</span> En caso de cancelación por causas imputables a LA AGENCIA, se ofrecerán dos opciones: a) Reembolso dentro de 90 días naturales. b) Reprogramación del viaje válida hasta por 1 año. En caso de fuerza mayor o causas externas, LA AGENCIA no está obligada a reembolsar ni reprogramar.</p>
        </div>

        <div class="section">
            <p class="section-title">5. PAGOS Y PENALIZACIONES</p>
            <p class="clause">El servicio deberá estar pagado en su totalidad en la fecha límite establecida. En caso de incumplimiento de pago, LA AGENCIA podrá cancelar la reserva sin obligación de reembolso. Los anticipos realizados son no reembolsables bajo ninguna circunstancia. Los pagos deberán realizarse únicamente a las cuentas oficiales de LA AGENCIA.</p>
        </div>

        <div class="section">
            <p class="section-title">6. OBLIGACIONES DEL CLIENTE</p>
            <p class="clause">Presentarse en el lugar y hora indicados. Contar con la documentación requerida (identificaciones, permisos, visas, certificados médicos, etc.). Respetar las normas de seguridad y convivencia durante el tour. Asumir los gastos personales no incluidos en el contrato.</p>
        </div>

        <div class="section">
            <p class="section-title">7. CESIÓN DE DERECHOS Y USO DE IMAGEN</p>
            <p class="clause">EL CLIENTE autoriza a LA AGENCIA a utilizar fotografías o videos tomados durante el tour con fines publicitarios o promocionales. En caso de cesión de lugar a otra persona, LA AGENCIA no asume responsabilidades adicionales.</p>
        </div>

        <div class="section">
            <p class="section-title">8. SEGUROS Y COBERTURA</p>
            <p class="clause">EL CLIENTE reconoce que los servicios no incluyen seguros médicos, de accidentes ni de viaje, salvo que se especifique en un anexo. EL CLIENTE es responsable de contratar seguros adicionales si así lo requiere.</p>
        </div>

        <div class="section">
            <p class="section-title">9. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</p>
            <p class="clause">LA AGENCIA se compromete a proteger los datos personales de EL CLIENTE conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Los datos serán usados únicamente para la gestión del servicio contratado.</p>
        </div>

        <div class="section">
            <p class="section-title">10. COMUNICACIÓN OFICIAL</p>
            <p class="clause">Toda comunicación válida deberá realizarse por escrito, vía correo electrónico, WhatsApp corporativo o documento físico con acuse de recibido. Las comunicaciones verbales carecen de valor contractual.</p>
        </div>

        <div class="section">
            <p class="section-title">11. SUCESIÓN Y CESIÓN DE DERECHOS</p>
            <p class="clause">EL CLIENTE no podrá ceder ni transferir derechos u obligaciones derivados del presente contrato sin autorización por escrito de LA AGENCIA. LA AGENCIA podrá ceder sus derechos a terceros en caso de fusión, venta o reestructuración de la empresa.</p>
        </div>

        <div class="section">
            <p class="section-title">12. PROPIEDAD INTELECTUAL</p>
            <p class="clause">Todo material informativo, publicitario, imágenes, marcas y logotipos relacionados con el tour son propiedad de LA AGENCIA y no podrán ser reproducidos sin su autorización.</p>
        </div>

        <div class="section">
            <p class="section-title">13. LEY APLICABLE Y JURISDICCIÓN</p>
            <p class="clause">Para la interpretación y cumplimiento del presente contrato, las partes se someten a las leyes y tribunales de la ciudad de Saltillo, Coahuila, México, renunciando expresamente a cualquier otro fuero.</p>
        </div>

        <div class="section">
            <p class="section-title">14. CLAÚSULA SUPLETORIA</p>
            <p class="clause">En caso de que alguna disposición del presente contrato sea declarada nula, inválida o inaplicable, las demás cláusulas conservarán su plena validez y obligatoriedad.</p>
        </div>

        <div class="signatures">
            <div class="signature-box">
                <p>Juan De Dios Saucedo Cortés</p>
                <p style="margin-top: 40px; font-size: 8px;">Representante Legal<br>“LA AGENCIA”</p>
            </div>
            <div class="signature-box">
                <p>${clientFullName}</p>
                <p style="margin-top: 40px; font-size: 8px;">“EL CLIENTE”</p>
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