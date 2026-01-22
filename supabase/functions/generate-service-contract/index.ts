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
  const clientFullName = `${client.first_name} ${client.last_name}`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&display=swap" rel="stylesheet">
        <style>
            @page { size: letter; margin: 0; }
            body { font-family: 'Poppins', sans-serif; color: #1e293b; line-height: 1.5; padding: 0; margin: 0; background: #f8fafc; font-size: 10px; }
            .document { background: white; width: 216mm; min-height: 279mm; margin: 0 auto; padding: 40px 50px; box-sizing: border-box; position: relative; }
            
            /* Encabezado */
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid ${primaryColor}; padding-bottom: 20px; }
            .agency-brand { display: flex; align-items: center; gap: 15px; }
            .logo { max-height: 85px; max-width: 180px; object-fit: contain; }
            .agency-info { text-align: right; font-size: 12px; color: #475569; }
            .agency-info h2 { margin: 0 0 5px 0; color: ${primaryColor}; font-weight: 800; font-size: 18px; text-transform: uppercase; }
            .agency-info p { margin: 2px 0; line-height: 1.2; }

            /* Folio Box */
            .contract-meta { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 10px 20px; border-radius: 12px; margin-bottom: 25px; }
            .folio { font-weight: 800; color: ${primaryColor}; font-size: 14px; }
            .emit-date { font-weight: 600; color: #64748b; }

            /* Grid de Datos */
            .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
            .card-header { background: ${primaryColor}; color: white; padding: 6px 15px; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
            .card-body { padding: 12px 15px; background: #fff; }
            .card-body p { margin: 4px 0; }
            .label { font-weight: 700; color: #64748b; font-size: 9px; text-transform: uppercase; display: inline-block; width: 80px; }

            /* Cláusulas */
            .legal-content { text-align: justify; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .intro-text { margin-bottom: 20px; font-size: 11px; line-height: 1.6; }
            .clause { margin-bottom: 12px; padding-left: 5px; }
            .clause-title { font-weight: 800; color: #0f172a; margin-right: 5px; }
            
            /* Firmas */
            .signatures { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 100px; text-align: center; }
            .sign-box { border-top: 1.5px solid #cbd5e1; padding-top: 12px; }
            .sign-name { font-weight: 700; font-size: 12px; margin-bottom: 2px; }
            .sign-role { color: #64748b; font-size: 10px; font-weight: 500; }

            .footer-legal { text-align: center; margin-top: 40px; font-size: 8px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
            
            @media print {
                body { background: white; }
                .document { box-shadow: none; margin: 0; width: 100%; }
            }
        </style>
    </head>
    <body>
        <div class="document">
            <div class="header">
                <div class="agency-brand">
                    ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo">` : '<div></div>'}
                </div>
                <div class="agency-info">
                    <h2>${agency?.agency_name || 'Saura Tours'}</h2>
                    <p>${agency?.agency_address || 'Saltillo, Coahuila, México'}</p>
                    <p>WhatsApp: ${agency?.agency_phone || 'N/A'}</p>
                    <p>${agency?.agency_email || 'N/A'}</p>
                </div>
            </div>

            <div class="contract-meta">
                <div class="folio">CONTRATO DE SERVICIO: #${client.contract_number}</div>
                <div class="emit-date">EMITIDO EL: ${dateStr}</div>
            </div>

            <div class="data-grid">
                <div class="card">
                    <div class="card-header">Detalles del Tour</div>
                    <div class="card-body">
                        <p><span class="label">Destino:</span> <strong>${tour.title}</strong></p>
                        <p><span class="label">Fecha:</span> <strong>${tourDate}</strong></p>
                        <p><span class="label">Duración:</span> <strong>${tour.duration || 'N/A'}</strong></p>
                        <p><span class="label">Inversión:</span> <strong>$${client.total_amount.toLocaleString()} MXN</strong></p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">Datos del Cliente</div>
                    <div class="card-body">
                        <p><span class="label">Titular:</span> <strong>${clientFullName}</strong></p>
                        <p><span class="label">ID:</span> <strong>${client.identification_number || 'N/A'}</strong></p>
                        <p><span class="label">Teléfono:</span> <strong>${client.phone || 'N/A'}</strong></p>
                        <p><span class="label">Domicilio:</span> <strong>${client.address || 'Conocido'}</strong></p>
                    </div>
                </div>
            </div>

            <div class="legal-content">
                <div class="intro-text">
                    En la ciudad de Saltillo, Coahuila, México, se celebra el presente contrato de prestación de servicios turísticos entre <strong>${agency?.agency_name || 'Saura Tours'}</strong>, representada por el C. <strong>Juan De Dios Saucedo Cortés</strong>, en adelante “LA AGENCIA”; y el ciudadano <strong>${clientFullName}</strong>, en adelante “EL CLIENTE”.
                </div>

                <div class="clause"><span class="clause-title">1. OBJETO DEL CONTRATO:</span> LA AGENCIA se compromete a coordinar y poner a disposición de EL CLIENTE el tour mencionado en este documento, con las características de itinerario y servicios aquí descritos.</div>
                <div class="clause"><span class="clause-title">2. NATURALEZA DEL SERVICIO:</span> LA AGENCIA actúa únicamente como coordinadora de servicios turísticos, contratando con proveedores independientes. EL CLIENTE acepta los términos de dichos proveedores. LA AGENCIA no es responsable de fallas atribuibles a terceros.</div>
                <div class="clause"><span class="clause-title">3. EXCLUSIÓN DE RESPONSABILIDAD:</span> LA AGENCIA no responde por fuerza mayor (desastres, pandemias, cierres viales) ni fallas mecánicas de terceros. EL CLIENTE libera a LA AGENCIA de responsabilidad por daños o pérdidas, salvo negligencia directa comprobada.</div>
                <div class="clause"><span class="clause-title">4. CANCELACIONES Y REEMBOLSOS:</span> Por parte del CLIENTE: No hay reembolsos; el lugar es traspasable avisando 48h antes. Por parte de LA AGENCIA: Reembolso en 90 días o reprogramación de 1 año si la causa le es imputable.</div>
                <div class="clause"><span class="clause-title">5. PAGOS Y PENALIZACIONES:</span> El servicio debe liquidarse en la fecha límite. La falta de pago faculta a la cancelación sin reembolso. Los anticipos no son reembolsables bajo ninguna circunstancia.</div>
                <div class="clause"><span class="clause-title">6. OBLIGACIONES DEL CLIENTE:</span> Puntualidad, portar documentación vigente, respetar normas de conducta y seguridad, y cubrir gastos personales no incluidos expresamente.</div>
                <div class="clause"><span class="clause-title">7. CESIÓN DE DERECHOS Y USO DE IMAGEN:</span> EL CLIENTE autoriza el uso de material audiovisual tomado en el tour para fines publicitarios. LA AGENCIA no asume cargos por cesiones de lugar entre particulares.</div>
                <div class="clause"><span class="clause-title">8. SEGUROS Y COBERTURA:</span> Los servicios no incluyen gastos médicos privados. El seguro de viajero es responsabilidad exclusiva de la empresa transportista contratada.</div>
                <div class="clause"><span class="clause-title">9. CONFIDENCIALIDAD:</span> LA AGENCIA protege los datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</div>
                <div class="clause"><span class="clause-title">10. COMUNICACIÓN OFICIAL:</span> Solo son válidas comunicaciones por escrito (WhatsApp corporativo o Email). Acuerdos verbales no tienen validez legal.</div>
                <div class="clause"><span class="clause-title">11. SUCESIÓN Y CESIÓN:</span> EL CLIENTE no puede transferir derechos sin permiso. LA AGENCIA puede ceder derechos en caso de reestructuración corporativa.</div>
                <div class="clause"><span class="clause-title">12. PROPIEDAD INTELECTUAL:</span> Marcas, logos y material publicitario son propiedad exclusiva de Saura Tours. Queda prohibida su reproducción.</div>
                <div class="clause"><span class="clause-title">13. LEY APLICABLE Y JURISDICCIÓN:</span> Para cualquier controversia, las partes se someten a los tribunales de la ciudad de Saltillo, Coahuila, México.</div>
                <div class="clause"><span class="clause-title">14. CLÁUSULA SUPLETORIA:</span> La invalidez de una cláusula no afecta la vigencia y obligatoriedad del resto del contrato.</div>
            </div>

            <div class="signatures">
                <div class="sign-box">
                    <div class="sign-name">Juan De Dios Saucedo Cortés</div>
                    <div class="sign-role">Representante Legal - LA AGENCIA</div>
                </div>
                <div class="sign-box">
                    <div class="sign-name">${clientFullName}</div>
                    <div class="sign-role">EL CLIENTE</div>
                </div>
            </div>

            <div class="footer-legal">
                Documento legal emitido por Saura Tours. Saltillo, Coahuila. Prohibida su reproducción total o parcial.
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