import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateHtml = (data: any) => {
  const { client, tour, agency } = data;
  const dateStr = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const primaryColor = agency?.primary_color || '#91045A';
  const agencyName = agency?.agency_name || "Saura Tours";
  const agencyAddress = agency?.agency_address || "Saltillo, Coahuila, México";
  const clientFullName = `${client.first_name} ${client.last_name}`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Montserrat', sans-serif; color: #1a1a1a; line-height: 1.4; padding: 0; margin: 0; font-size: 9.5px; background: #fff; }
            .page { padding: 30px 45px; max-width: 800px; margin: auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; margin-bottom: 15px; }
            .logo { max-height: 60px; }
            .contract-title { text-align: right; }
            .contract-title h1 { color: ${primaryColor}; font-size: 16px; margin: 0; text-transform: uppercase; font-weight: 900; }
            .contract-title p { margin: 2px 0; font-weight: bold; color: #666; font-size: 10px; }
            
            .intro { text-align: justify; margin-bottom: 15px; }
            .intro strong { color: ${primaryColor}; }
            
            .clause-container { text-align: justify; }
            .clause { margin-bottom: 10px; }
            .clause-title { font-weight: 700; color: #000; text-transform: uppercase; display: block; margin-bottom: 3px; text-decoration: underline; }
            
            .tour-details-box { background: #fdf2f8; padding: 12px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin: 10px 0; }
            .tour-details-box p { margin: 3px 0; font-size: 9px; }
            
            .footer-sigs { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; text-align: center; }
            .sign-space { border-top: 1px solid #000; padding-top: 8px; margin-top: 35px; }
            .footer-info { text-align: center; margin-top: 25px; font-size: 8px; color: #999; }
            @media print { .page { padding: 15px 30px; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo">` : '<div></div>'}
                <div class="contract-title">
                    <h1>CONTRATO DE VENTA DE TOUR</h1>
                    <p>Número de Contrato: ${client.contract_number}</p>
                </div>
            </div>

            <div class="intro">
                En la ciudad de Saltillo, Coahuila, México, a <strong>${dateStr}</strong>, se celebra el presente contrato de prestación de servicios turísticos entre: 
                <strong>${agencyName}</strong>, con domicilio en ${agencyAddress}, representada por el C. Juan De Dios Saucedo Cortés, en adelante “LA AGENCIA”; y 
                <strong>${clientFullName}</strong>, con domicilio en ${client.address || 'Domicilio Conocido'}, identificado con ${client.identification_number || 'N/A'}, en adelante “EL CLIENTE”.
            </div>

            <div class="clause-container">
                <div class="clause">
                    <span class="clause-title">1. OBJETO DEL CONTRATO</span>
                    LA AGENCIA se compromete a coordinar y poner a disposición de EL CLIENTE el tour denominado <strong>${tour.title}</strong>, que se llevará a cabo el día ${tour.departure_date ? format(parseISO(tour.departure_date), 'dd/MM/yyyy') : 'N/A'}, con las siguientes características:
                    <div class="tour-details-box">
                        <p><strong>Destino / Itinerario:</strong> ${stripHtmlTags(tour.description)}</p>
                        <p><strong>Duración:</strong> ${tour.duration}</p>
                        <p><strong>Incluye:</strong> ${tour.includes?.join(', ') || 'Servicios base'}</p>
                        <p><strong>No incluye:</strong> Gastos personales, propinas y servicios no especificados.</p>
                        <p><strong>Precio Total:</strong> $${client.total_amount.toLocaleString()} MXN</p>
                    </div>
                </div>

                <div class="clause">
                    <span class="clause-title">2. NATURALEZA DEL SERVICIO</span>
                    LA AGENCIA actúa únicamente como coordinadora de servicios turísticos, contratando servicios con proveedores independientes de transporte, hospedaje, alimentación, guías, accesos y demás. EL CLIENTE acepta que cada servicio está sujeto a los términos y condiciones de dichos proveedores. LA AGENCIA no será responsable de fallas, retrasos o incumplimientos atribuibles a terceros.
                </div>

                <div class="clause">
                    <span class="clause-title">3. EXCLUSIÓN DE RESPONSABILIDAD</span>
                    LA AGENCIA no será responsable por situaciones de fuerza mayor o ajenas a su control, tales como desastres naturales, fenómenos meteorológicos, pandemias, accidentes, disturbios sociales, cierres de carreteras, restricciones gubernamentales, averías mecánicas o cancelaciones de proveedores. EL CLIENTE libera a LA AGENCIA de cualquier responsabilidad por daños, pérdidas, lesiones o fallecimientos.
                </div>

                <div class="clause">
                    <span class="clause-title">4. CANCELACIONES Y REEMBOLSOS</span>
                    <strong>Por parte del CLIENTE:</strong> No habrá reembolso en caso de cancelación. EL CLIENTE podrá traspasar su lugar a otra persona notificando con 48 horas de anticipación. 
                    <strong>Por parte de LA AGENCIA:</strong> Si es por causa imputable a LA AGENCIA, se ofrece reembolso en 90 días naturales o reprogramación válida por 1 año. En casos de fuerza mayor, no hay obligación de reembolso.
                </div>

                <div class="clause">
                    <span class="clause-title">5. PAGOS Y PENALIZACIONES</span>
                    El servicio deberá estar pagado en su totalidad en la fecha límite establecida. En caso de incumplimiento, LA AGENCIA podrá cancelar la reserva sin reembolso. Los anticipos realizados son no reembolsables bajo ninguna circunstancia.
                </div>

                <div class="clause">
                    <span class="clause-title">6. OBLIGACIONES DEL CLIENTE</span>
                    Presentarse en el lugar e indicado, contar con documentación requerida (identificaciones, visas, etc.), respetar las normas de seguridad y convivencia, y asumir gastos personales no incluidos.
                </div>

                <div class="clause">
                    <span class="clause-title">7. CESIÓN DE DERECHOS Y USO DE IMAGEN</span>
                    EL CLIENTE autoriza a LA AGENCIA a utilizar fotografías o videos tomados durante el tour con fines publicitarios. En caso de cesión de lugar, LA AGENCIA no asume responsabilidades adicionales.
                </div>

                <div class="clause">
                    <span class="clause-title">8. SEGUROS Y COBERTURA</span>
                    EL CLIENTE reconoce que los servicios no incluyen seguros médicos ni de accidentes, salvo que se especifique. EL CLIENTE es responsable de contratar seguros adicionales.
                </div>

                <div class="clause">
                    <span class="clause-title">9. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</span>
                    LA AGENCIA se compromete a proteger los datos personales conforme a la Ley Federal de Protección de Datos Personales. Los datos serán usados únicamente para la gestión del servicio.
                </div>

                <div class="clause">
                    <span class="clause-title">10. COMUNICACIÓN OFICIAL</span>
                    Toda comunicación válida deberá realizarse por escrito (Email, WhatsApp corporativo o documento físico). Las comunicaciones verbales carecen de valor contractual.
                </div>

                <div class="clause">
                    <span class="clause-title">11. SUCESIÓN Y CESIÓN DE DERECHOS</span>
                    EL CLIENTE no podrá ceder derechos u obligaciones sin autorización. LA AGENCIA podrá ceder sus derechos en caso de reestructuración empresarial.
                </div>

                <div class="clause">
                    <span class="clause-title">12. PROPIEDAD INTELECTUAL</span>
                    Todo material publicitario, marcas y logotipos relacionados con el tour son propiedad de LA AGENCIA y no podrán ser reproducidos sin autorización.
                </div>

                <div class="clause">
                    <span class="clause-title">13. LEY APLICABLE Y JURISDICCIÓN</span>
                    Para la interpretación y cumplimiento, las partes se someten a las leyes y tribunales de la ciudad de Saltillo, Coahuila, México, renunciando a cualquier otro fuero.
                </div>

                <div class="clause">
                    <span class="clause-title">14. CLAÚSULA SUPLETORIA</span>
                    Si alguna disposición es declarada nula, las demás cláusulas conservarán su plena validez y obligatoriedad.
                </div>
            </div>

            <div class="footer-sigs">
                <div>
                    <div class="sign-space"></div>
                    <p><strong>Juan De Dios Saucedo Cortés</strong></p>
                    <p>Representante Legal<br>“LA AGENCIA”</p>
                </div>
                <div>
                    <div class="sign-space"></div>
                    <p><strong>${clientFullName}</strong></p>
                    <p>“El Cliente”</p>
                </div>
            </div>
            
            <div class="footer-info">
                Este contrato es un documento legalmente vinculante para ${agencyName} y el Cliente identificado.
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
    
    const { data: client } = await supabaseAdmin.from('clients').select('*, tours(*)').ilike('contract_number', contractNumber).single();
    if (!client) throw new Error('Cliente no encontrado');

    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    
    // Helper to strip tags since it's an edge function (copy of the utility)
    const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '');

    return new Response(generateHtml({ 
      client, 
      tour: client.tours, 
      agency,
      // Pass a reference or copy logic since it's in the edge environment
    }), { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});

function stripHtmlTags(html: any) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>?/gm, '');
}