import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateHtml = (data: any) => {
  const { client, tour, agency } = data;
  const dateStr = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const tourDate = tour?.departure_date ? new Date(tour.departure_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
  const primaryColor = agency?.primary_color || '#91045A';
  const agencyName = agency?.agency_name || "SAURA TOURS";
  const agencyAddress = agency?.agency_address || "Saltillo, Coahuila, México";
  const clientFullName = `${client.first_name} ${client.last_name}`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Montserrat', sans-serif; color: #1a1a1a; line-height: 1.4; padding: 0; margin: 0; font-size: 9px; background: #fff; }
            .page { padding: 40px 50px; max-width: 800px; margin: auto; border: 1px solid #eee; }
            
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { max-height: 70px; }
            .contract-id-box { text-align: right; }
            .contract-id-box h1 { color: ${primaryColor}; font-size: 16px; margin: 0; font-weight: 900; text-transform: uppercase; }
            .contract-id-box p { margin: 2px 0; font-weight: bold; color: #555; }
            
            .intro-text { text-align: justify; margin-bottom: 20px; font-size: 10px; }
            .bold { font-weight: 700; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .data-card { background: #fdf2f8; padding: 12px; border-radius: 8px; border: 1px solid #fbcfe8; }
            .data-card h3 { margin: 0 0 8px 0; font-size: 10px; color: ${primaryColor}; text-transform: uppercase; border-bottom: 1px solid #fbcfe8; padding-bottom: 4px; }
            .data-card p { margin: 3px 0; }

            .clauses-section { text-align: justify; columns: 1; }
            .clause { margin-bottom: 10px; }
            .clause-num { font-weight: 900; color: #000; }
            
            .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; text-align: center; }
            .signature-box { border-top: 1px solid #000; padding-top: 10px; }
            
            .footer-legal { text-align: center; margin-top: 30px; font-size: 7px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
            
            @media print { .page { border: none; padding: 20px; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo">` : '<div></div>'}
                <div class="contract-id-box">
                    <h1>CONTRATO DE VENTA DE TOUR</h1>
                    <p>No. Contrato: ${client.contract_number}</p>
                    <p>Fecha de Emisión: ${dateStr}</p>
                </div>
            </div>

            <div class="intro-text">
                En la ciudad de Saltillo, Coahuila, México, a <span class="bold">${dateStr}</span>, se celebra el presente contrato de prestación de servicios turísticos entre: 
                <span class="bold">${agencyName}</span>, con domicilio en ${agencyAddress}, representada por el C. Juan De Dios Saucedo Cortés, en adelante “LA AGENCIA”; y 
                <span class="bold">${clientFullName}</span>, con domicilio en ${client.address || 'Domicilio Conocido'}, identificado con ${client.identification_number || 'N/A'}, en adelante “EL CLIENTE”.
            </div>

            <div class="info-grid">
                <div class="data-card">
                    <h3>Detalles del Tour</h3>
                    <p><span class="bold">Nombre del Tour:</span> ${tour.title}</p>
                    <p><span class="bold">Fecha del Tour:</span> ${tourDate}</p>
                    <p><span class="bold">Duración:</span> ${tour.duration || 'N/A'}</p>
                    <p><span class="bold">Precio Total:</span> $${client.total_amount.toLocaleString()} MXN</p>
                </div>
                <div class="data-card">
                    <h3>Servicios</h3>
                    <p><span class="bold">Incluye:</span> ${tour.includes?.join(', ') || 'Ver itinerario'}</p>
                    <p><span class="bold">No incluye:</span> Gastos personales, propinas y servicios no especificados.</p>
                </div>
            </div>

            <div class="clauses-section">
                <div class="clause">
                    <span class="clause-num">1. OBJETO DEL CONTRATO:</span> LA AGENCIA se compromete a coordinar y poner a disposición de EL CLIENTE el tour denominado ${tour.title}, con las características detalladas en este documento e itinerarios compartidos.
                </div>
                <div class="clause">
                    <span class="clause-num">2. NATURALEZA DEL SERVICIO:</span> LA AGENCIA actúa únicamente como coordinadora de servicios turísticos, contratando servicios con proveedores independientes. EL CLIENTE acepta que cada servicio está sujeto a los términos de dichos proveedores.
                </div>
                <div class="clause">
                    <span class="clause-num">3. EXCLUSIÓN DE RESPONSABILIDAD:</span> LA AGENCIA no será responsable por situaciones de fuerza mayor, desastres naturales, accidentes, averías mecánicas o cancelaciones de proveedores. EL CLIENTE libera a LA AGENCIA de responsabilidad por daños o lesiones.
                </div>
                <div class="clause">
                    <span class="clause-num">4. CANCELACIONES Y REEMBOLSOS:</span> <span class="bold">Por parte del CLIENTE: No habrá reembolso en caso de cancelación.</span> Se puede traspasar el lugar notificando con 48 horas de anticipación. Por parte de LA AGENCIA: Reembolso o reprogramación si es causa imputable a la misma.
                </div>
                <div class="clause">
                    <span class="clause-num">5. PAGOS Y PENALIZACIONES:</span> El servicio debe pagarse totalmente en la fecha límite. Los anticipos son no reembolsables. Los pagos solo son válidos a cuentas oficiales de LA AGENCIA.
                </div>
                <div class="clause">
                    <span class="clause-num">6. OBLIGACIONES DEL CLIENTE:</span> Puntualidad absoluta, contar con identificaciones vigentes, respetar normas de conducta y seguridad, y cubrir gastos personales.
                </div>
                <div class="clause">
                    <span class="clause-num">7. CESIÓN DE DERECHOS Y USO DE IMAGEN:</span> EL CLIENTE autoriza el uso de fotos o videos del tour para fines publicitarios.
                </div>
                <div class="clause">
                    <span class="clause-num">8. SEGUROS Y COBERTURA:</span> Los servicios no incluyen seguros médicos privados salvo que se especifique. El seguro de viajero es de responsabilidad del transportista.
                </div>
                <div class="clause">
                    <span class="clause-num">9. CONFIDENCIALIDAD:</span> LA AGENCIA protege los datos personales conforme a la Ley Federal de Protección de Datos Personales.
                </div>
                <div class="clause">
                    <span class="clause-num">10. COMUNICACIÓN OFICIAL:</span> Solo son válidas comunicaciones por escrito (WhatsApp corporativo o Email). Lo verbal no tiene valor contractual.
                </div>
                <div class="clause">
                    <span class="clause-num">11. SUCESIÓN Y CESIÓN:</span> No se pueden transferir derechos sin autorización. LA AGENCIA puede ceder derechos en caso de reestructuración.
                </div>
                <div class="clause">
                    <span class="clause-num">12. PROPIEDAD INTELECTUAL:</span> Imágenes y marcas de Saura Tours son propiedad exclusiva de la empresa.
                </div>
                <div class="clause">
                    <span class="clause-num">13. LEY APLICABLE Y JURISDICCIÓN:</span> Las partes se someten a las leyes y tribunales de la ciudad de Saltillo, Coahuila.
                </div>
                <div class="clause">
                    <span class="clause-num">14. CLÁUSULA SUPLETORIA:</span> La nulidad de una cláusula no afecta la validez de las demás.
                </div>
            </div>

            <div class="signatures">
                <div class="signature-box">
                    <p class="bold">Juan De Dios Saucedo Cortés</p>
                    <p>Representante Legal<br>“LA AGENCIA”</p>
                </div>
                <div class="signature-box">
                    <p class="bold">${clientFullName}</p>
                    <p>“El Cliente”</p>
                </div>
            </div>

            <div class="footer-legal">
                Documento generado electrónicamente por el sistema administrativo de Saura Tours. Saltillo, Coahuila.
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*, tours(*)')
      .ilike('contract_number', contractNumber)
      .single();

    if (clientError || !client) throw new Error('Contrato no encontrado');

    const { data: agency } = await supabaseAdmin
      .from('agency_settings')
      .select('*')
      .single();

    const html = generateHtml({ client, tour: client.tours, agency });

    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});