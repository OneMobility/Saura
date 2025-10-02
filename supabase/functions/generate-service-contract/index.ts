import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Helper function to format room details
const formatRoomDetails = (details: any) => {
  const parts = [];
  const safeDetails = details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

  if (safeDetails.quad_rooms > 0) parts.push(`${safeDetails.quad_rooms} Cuádruple(s)`);
  if (safeDetails.triple_rooms > 0) parts.push(`${safeDetails.triple_rooms} Triple(s)`);
  if (safeDetails.double_rooms > 0) parts.push(`${safeDetails.double_rooms} Doble(s)`);
  return parts.join(', ') || 'N/A';
};

// Helper function to generate HTML for the service contract
const generateServiceContractHtml = (data: any) => {
  const client = data.client;
  const tour = data.tour || {};
  const seats = data.seats;
  const agency = data.agency;

  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const tourTitle = tour?.title || 'N/A';
  const contractDate = format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es });

  const safeCompanions = Array.isArray(client.companions) ? client.companions : [];
  const safeExtraServices = Array.isArray(client.extra_services) ? client.extra_services : [];
  const safeIncludes = Array.isArray(tour.includes) ? tour.includes : [];
  const safeItinerary = Array.isArray(tour.itinerary) ? tour.itinerary : [];

  const companionsList = safeCompanions.length > 0
    ? safeCompanions.map((c: any) => `<li>${c.name || 'Acompañante sin nombre'} ${c.age !== null && typeof c.age === 'number' ? `(${c.age} años)` : ''}</li>`).join('')
    : '<li>N/A</li>';

  let seatNumbers = 'N/A';
  if (seats && seats.length > 0) {
    const validSeats = seats.filter((s: any) => s && typeof s.seat_number === 'number');
    if (validSeats.length > 0) {
      const numbers = validSeats.map((s: any) => s.seat_number);
      const sortedNumbers = numbers.sort((a: number, b: number) => a - b);
      seatNumbers = sortedNumbers.join(', ');
    }
  }

  const extraServicesList = safeExtraServices.length > 0
    ? safeExtraServices.map((s: any) => {
        const price = typeof s.selling_price_per_unit_snapshot === 'number' ? s.selling_price_per_unit_snapshot : 0;
        const quantity = typeof s.quantity === 'number' ? s.quantity : 0;
        return `<li>${s.name_snapshot || 'Servicio sin nombre'} (${s.service_type_snapshot || 'N/A'}) - Cantidad: ${quantity} - Precio: $${price.toFixed(2)}</li>`;
      }).join('')
    : '<li>N/A</li>';

  const includesList = safeIncludes.length > 0
    ? safeIncludes.map((item: string) => `<li>${item}</li>`).join('')
    : '<li>N/A</li>';

  const itineraryList = safeItinerary.length > 0
    ? safeItinerary.map((item: any) => `<li>Día ${item.day}: ${item.activity}</li>`).join('')
    : '<li>N/A</li>';

  const clientTotalAmount = typeof client.total_amount === 'number' ? client.total_amount : 0;
  const clientTotalPaid = typeof client.total_paid === 'number' ? client.total_paid : 0;
  const remainingPayment = (clientTotalAmount - clientTotalPaid).toFixed(2);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato de Servicio - ${client.contract_number || 'N/A'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Poppins', sans-serif;
                line-height: 1.5;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f8f8f8;
                font-size: 10pt;
            }
            .page-container {
                max-width: 210mm;
                min-height: 297mm;
                margin: 20px auto;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                padding: 25px;
                box-sizing: border-box;
            }
            h1, h2, h3 {
                color: #E4007C; /* Rosa Mexicano */
                font-weight: 700;
                margin-top: 0;
            }
            h1 {
                text-align: center;
                font-size: 2.2em;
                margin-bottom: 20px;
                text-transform: uppercase;
            }
            h2 {
                font-size: 1.4em;
                margin-bottom: 12px;
                border-bottom: 2px solid #E4007C;
                padding-bottom: 4px;
            }
            h3 {
                font-size: 1.1em;
                margin-bottom: 8px;
            }
            .agency-header {
                background-color: #E4007C;
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 25px;
                position: relative;
                overflow: hidden;
            }
            .agency-header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
                transform: rotate(45deg);
                opacity: 0.3;
            }
            .agency-header img {
                max-width: 100px;
                height: auto;
                display: block;
                margin: 0 auto 10px auto;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .agency-header h2 {
                color: white;
                margin-top: 0;
                margin-bottom: 6px;
                font-size: 1.8em;
                border-bottom: none;
                padding-bottom: 0;
            }
            .agency-header p {
                margin: 0;
                font-size: 0.85em;
                opacity: 0.9;
            }
            .section {
                padding: 12px;
                border: 1px solid #eee;
                border-radius: 5px;
                background-color: #fdfdfd;
                margin-bottom: 20px;
            }
            .section p, .section ul, .section ol {
                margin-bottom: 6px;
            }
            .label {
                font-weight: 600;
                color: #555;
            }
            ul, ol {
                padding-left: 18px;
                margin-top: 4px;
            }
            ul li, ol li {
                margin-bottom: 2px;
                font-size: 0.9em;
            }
            .payment-summary {
                background-color: #fff0f5; /* Light pink */
                padding: 18px;
                border-radius: 8px;
                border: 1px solid #E4007C;
                margin-top: 25px;
            }
            .payment-summary p {
                margin: 6px 0;
                font-size: 1em;
            }
            .total-amount {
                font-size: 1.3em;
                font-weight: 700;
                color: #E4007C;
                border-top: 1px solid #E4007C;
                padding-top: 8px;
                margin-top: 12px;
            }
            .signature-section {
                margin-top: 50px;
                display: flex;
                justify-content: space-around;
                text-align: center;
            }
            .signature-block {
                width: 45%;
            }
            .signature-line {
                border-top: 1px solid #ccc;
                width: 80%;
                margin: 0 auto 5px auto;
            }
            .footer-info {
                text-align: center;
                margin-top: 30px;
                font-size: 0.8em;
                color: #888;
            }

            /* Print-specific styles */
            @media print {
                @page {
                    size: letter;
                    margin: 0.4in;
                }
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    font-size: 9.5pt;
                    line-height: 1.4;
                }
                .page-container {
                    width: 100%;
                    margin: 0;
                    box-shadow: none;
                    border-radius: 0;
                    border: none;
                    padding: 15px;
                }
                h1 { font-size: 1.8em; margin-bottom: 18px; }
                h2 { font-size: 1.3em; margin-bottom: 10px; border-bottom: 1px solid #E4007C; padding-bottom: 4px; }
                h3 { font-size: 1.05em; margin-bottom: 7px; }
                .agency-header { padding: 18px; margin-bottom: 20px; }
                .agency-header img { max-width: 85px; margin-bottom: 10px; }
                .agency-header h2 { font-size: 1.6em; }
                .agency-header p { font-size: 0.8em; }
                .section { padding: 10px; margin-bottom: 15px; }
                .section p, .section ul, .section ol { margin-bottom: 5px; }
                ul, ol { padding-left: 18px; margin-top: 4px; }
                ul li, ol li { font-size: 0.9em; margin-bottom: 2px; }
                .payment-summary { padding: 15px; margin-top: 20px; }
                .payment-summary p { margin: 5px 0; }
                .total-amount { font-size: 1.2em; padding-top: 8px; margin-top: 12px; }
                .signature-section { margin-top: 40px; }
                .signature-line { width: 200px; }
                .footer-info { margin-top: 25px; font-size: 0.75em; }
            }
        </style>
    </head>
    <body>
        <div class="page-container">
            <div class="agency-header">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" alt="${agency?.agency_name || 'Logo de la Agencia'}">` : ''}
                <h2>${agency?.agency_name || 'Tu Agencia de Viajes'}</h2>
                <p>Teléfono: ${agency?.agency_phone || 'N/A'}</p>
                <p>Email: ${agency?.agency_email || 'N/A'}</p>
                <p>Dirección: ${agency?.agency_address || 'N/A'}</p>
            </div>

            <h1>CONTRATO DE VENTA DE TOUR</h1>

            <div class="section">
                <p>Número de Contrato: <strong>${client.contract_number || 'N/A'}</strong></p>
                <p>En la ciudad de Saltillo, Coahuila, México, a <strong>${contractDate}</strong>, se celebra el presente contrato de prestación de servicios turísticos entre:</p>
                <p><strong>${agency?.agency_name || 'LA AGENCIA'},</strong> con domicilio en <strong>${agency?.agency_address || 'N/A'}</strong>, representada por el C. Juan De Dios Saucedo Cortés, en adelante “LA AGENCIA”; y</p>
                <p><strong>${clientFullName},</strong> con domicilio en <strong>${client.address || 'N/A'}</strong>, identificado con <strong>[CAMPO NO DISPONIBLE EN DB]</strong>, en adelante “EL CLIENTE”.</p>
            </div>

            <div class="section">
                <h2>1. OBJETO DEL CONTRATO</h2>
                <p>LA AGENCIA se compromete a coordinar y poner a disposición de EL CLIENTE el tour denominado <strong>${tourTitle}</strong>, que se llevará a cabo el día <strong>[FECHA DEL TOUR NO DISPONIBLE EN DB]</strong>, con las siguientes características:</p>
                <p><span class="label">Destino / Itinerario:</span></p>
                <ol>
                    ${itineraryList}
                </ol>
                <p><span class="label">Duración:</span> ${tour?.duration || 'N/A'}</p>
                <p><span class="label">Incluye:</span></p>
                <ul>
                    ${includesList}
                </ul>
                <p><span class="label">No incluye:</span> [SERVICIOS NO INCLUIDOS NO DISPONIBLES EN DB]</p>
                <p><span class="label">Precio Total:</span> $${clientTotalAmount.toFixed(2)} MXN</p>
            </div>

            <div class="section">
                <h2>2. NATURALEZA DEL SERVICIO</h2>
                <p>LA AGENCIA actúa únicamente como coordinadora de servicios turísticos, contratando servicios con proveedores independientes de transporte, hospedaje, alimentación, guías, accesos y demás.</p>
                <p>EL CLIENTE acepta que cada servicio está sujeto a los términos y condiciones de dichos proveedores, debiendo respetar sus contratos en lo individual y grupal.</p>
                <p>LA AGENCIA no será responsable de fallas, retrasos o incumplimientos atribuibles a terceros.</p>
            </div>

            <div class="section">
                <h2>3. EXCLUSIÓN DE RESPONSABILIDAD</h2>
                <p>LA AGENCIA no será responsable por situaciones de fuerza mayor o ajenas a su control, tales como:</p>
                <ul>
                    <li>Desastres naturales, fenómenos meteorológicos, pandemias, accidentes, disturbios sociales, cierres de carreteras, restricciones gubernamentales.</li>
                    <li>Averías mecánicas, fallas en transportes, problemas en hospedajes o cancelaciones por parte de proveedores.</li>
                </ul>
                <p>LA AGENCIA solo responderá por lo contratado expresamente en este documento.</p>
                <p>EL CLIENTE libera a LA AGENCIA de cualquier responsabilidad por daños, pérdidas, lesiones, enfermedades o fallecimientos ocurridos durante el tour, salvo negligencia comprobada y directa de LA AGENCIA.</p>
            </div>

            <div class="section">
                <h2>4. CANCELACIONES Y REEMBOLSOS</h2>
                <h3>Por parte del CLIENTE:</h3>
                <ul>
                    <li>No habrá reembolso en caso de cancelación.</li>
                    <li>EL CLIENTE podrá traspasar su lugar a otra persona, notificándolo con al menos 48 horas de anticipación.</li>
                </ul>
                <h3>Por parte de LA AGENCIA:</h3>
                <ul>
                    <li>En caso de cancelación por causas imputables a LA AGENCIA, se ofrecerán dos opciones:</li>
                    <ol type="a">
                        <li>Reembolso dentro de 90 días naturales.</li>
                        <li>Reprogramación del viaje válida hasta por 1 año.</li>
                    </ol>
                    <li>En caso de fuerza mayor o causas externas, LA AGENCIA no está obligada a reembolsar ni reprogramar.</li>
                </ul>
            </div>

            <div class="section">
                <h2>5. PAGOS Y PENALIZACIONES</h2>
                <p>El servicio deberá estar pagado en su totalidad en la fecha límite establecida.</p>
                <p>En caso de incumplimiento de pago, LA AGENCIA podrá cancelar la reserva sin obligación de reembolso.</p>
                <p>Los anticipos realizados son no reembolsables bajo ninguna circunstancia.</p>
                <p>Los pagos deberán realizarse únicamente a las cuentas oficiales de LA AGENCIA.</p>
            </div>

            <div class="section">
                <h2>6. OBLIGACIONES DEL CLIENTE</h2>
                <ul>
                    <li>Presentarse en el lugar y hora indicados.</li>
                    <li>Contar con la documentación requerida (identificaciones, permisos, visas, certificados médicos, etc.).</li>
                    <li>Respetar las normas de seguridad y convivencia durante el tour.</li>
                    <li>Asumir los gastos personales no incluidos en el contrato.</li>
                </ul>
            </div>

            <div class="section">
                <h2>7. CESIÓN DE DERECHOS Y USO DE IMAGEN</h2>
                <p>EL CLIENTE autoriza a LA AGENCIA a utilizar fotografías o videos tomados durante el tour con fines publicitarios o promocionales.</p>
                <p>En caso de cesión de lugar a otra persona, LA AGENCIA no asume responsabilidades adicionales.</p>
            </div>

            <div class="section">
                <h2>8. SEGUROS Y COBERTURA</h2>
                <p>EL CLIENTE reconoce que los servicios no incluyen seguros médicos, de accidentes ni de viaje, salvo que se especifique en un anexo.</p>
                <p>EL CLIENTE es responsable de contratar seguros adicionales si así lo requiere.</p>
            </div>

            <div class="section">
                <h2>9. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</h2>
                <p>LA AGENCIA se compromete a proteger los datos personales de EL CLIENTE conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>
                <p>Los datos serán usados únicamente para la gestión del servicio contratado.</p>
            </div>

            <div class="section">
                <h2>10. COMUNICACIÓN OFICIAL</h2>
                <p>Toda comunicación válida deberá realizarse por escrito, vía correo electrónico, WhatsApp corporativo o documento físico con acuse de recibido.</p>
                <p>Las comunicaciones verbales carecen de valor contractual.</p>
            </div>

            <div class="section">
                <h2>11. SUCESIÓN Y CESIÓN DE DERECHOS</h2>
                <p>EL CLIENTE no podrá ceder ni transferir derechos u obligaciones derivados del presente contrato sin autorización por escrito de LA AGENCIA.</p>
                <p>LA AGENCIA podrá ceder sus derechos a terceros en caso de fusión, venta o reestructuración de la empresa.</p>
            </div>

            <div class="section">
                <h2>12. PROPIEDAD INTELECTUAL</h2>
                <p>Todo material informativo, publicitario, imágenes, marcas y logotipos relacionados con el tour son propiedad de LA AGENCIA y no podrán ser reproducidos sin su autorización.</p>
            </div>

            <div class="section">
                <h2>13. LEY APLICABLE Y JURISDICCIÓN</h2>
                <p>Para la interpretación y cumplimiento del presente contrato, las partes se someten a las leyes y tribunales de la ciudad de Saltillo, Coahuila, México, renunciando expresamente a cualquier otro fuero.</p>
            </div>

            <div class="section">
                <h2>14. CLAÚSULA SUPLETORIA</h2>
                <p>En caso de que alguna disposición del presente contrato sea declarada nula, inválida o inaplicable, las demás cláusulas conservarán su plena validez y obligatoriedad.</p>
            </div>

            <div class="signature-section">
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <p>Juan De Dios Saucedo Cortés</p>
                    <p>Representante Legal</p>
                    <p>“LA AGENCIA”</p>
                </div>
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <p>${clientFullName}</p>
                    <p>“EL CLIENTE”</p>
                </div>
            </div>

            <div class="footer-info">
                <p>&copy; ${new Date().getFullYear()} ${agency?.agency_name || 'Tu Agencia de Viajes'}. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  console.log('Edge Function: generate-service-contract invoked (start of serve).');

  if (req.method === 'OPTIONS') {
    console.log('Edge Function: OPTIONS request received for generate-service-contract. Responding with 200 OK and full CORS headers.');
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  const htmlResponse = (html: string, status: number) => new Response(html, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('Edge Function: Unauthorized: Missing Authorization header.');
    return jsonResponse({ error: 'Unauthorized: Missing Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser) {
    console.error('Edge Function: Auth error:', authError?.message || 'User not found.');
    return jsonResponse({ error: 'Unauthorized: Invalid token or user not found' }, 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error('Edge Function: Profile error or not admin. Profile error:', profileError?.message, 'User role:', profile?.role);
    return jsonResponse({ error: 'Forbidden: Only administrators can perform this action' }, 403);
  }

  let clientId: string;
  try {
    const requestBody = await req.json();
    clientId = requestBody.clientId;
  } catch (parseError: any) {
    console.error('Edge Function: Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!clientId) {
      return jsonResponse({ error: 'Client ID is required.' }, 400);
    }

    console.log('Edge Function: Fetching client data for contract...');
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        tours (
          title,
          description,
          duration,
          includes,
          itinerary
        ),
        tour_seat_assignments (
          seat_number
        )
      `)
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Edge Function: Error fetching client for contract:', clientError?.message || 'Client not found.');
      return jsonResponse({ error: 'Client not found or error fetching client data.' }, 404);
    }
    console.log('Edge Function: Client data fetched successfully for contract.');

    let seats: any[] = [];
    if (client.tour_id) {
      const { data: fetchedSeats, error: seatsError } = await supabaseAdmin
        .from('tour_seat_assignments')
        .select('seat_number')
        .eq('client_id', clientId)
        .eq('tour_id', client.tour_id);

      if (seatsError) {
        console.error('Edge Function: Error fetching seats for contract:', seatsError.message);
      } else {
        seats = fetchedSeats || [];
      }
    }

    console.log('Edge Function: Fetching agency settings for contract...');
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agency_settings')
      .select('*')
      .single();

    if (agencyError && agencyError.code !== 'PGRST116') {
      console.error('Edge Function: Error fetching agency settings for contract:', agencyError.message);
    }

    console.log('Edge Function: Generating HTML content for contract...');
    const htmlContent = generateServiceContractHtml({
      client,
      tour: client.tours,
      seats: seats,
      agency: agency,
    });
    console.log('Edge Function: HTML content generated successfully for contract.');

    return htmlResponse(htmlContent, 200);

  } catch (error: any) {
    console.error('Edge Function: UNEXPECTED ERROR IN CATCH BLOCK for contract:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});