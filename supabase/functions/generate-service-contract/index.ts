import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateHtml = (data: any) => {
  const { client, tour, agency } = data;
  
  const formatDate = (dateStr: string | null) => 
    dateStr ? new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

  const dateStr = formatDate(new Date().toISOString());
  const departureDate = formatDate(tour?.departure_date);
  const returnDate = formatDate(tour?.return_date);
  
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
            body { font-family: 'Poppins', sans-serif; color: #1e293b; line-height: 1.6; padding: 0; margin: 0; background: #f8fafc; font-size: 18px; }
            .document { background: white; width: 216mm; min-height: 279mm; margin: 0 auto; padding: 40px 50px; box-sizing: border-box; }
            
            /* Encabezado - Datos Agencia a 12px */
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 4px solid ${primaryColor}; padding-bottom: 20px; }
            .logo { max-height: 90px; max-width: 200px; object-fit: contain; }
            .agency-info { text-align: right; font-size: 12px; color: #475569; }
            .agency-info h2 { margin: 0 0 5px 0; color: ${primaryColor}; font-weight: 800; font-size: 20px; text-transform: uppercase; }
            .agency-info p { margin: 2px 0; }

            /* Folio y Fecha */
            .contract-meta { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 15px 25px; border-radius: 12px; margin-bottom: 30px; font-size: 16px; }
            .folio { font-weight: 800; color: ${primaryColor}; }

            /* Grid de Datos */
            .data-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 2px solid #e2e8f0; border-radius: 15px; overflow: hidden; }
            .card-header { background: ${primaryColor}; color: white; padding: 10px 20px; font-weight: 700; text-transform: uppercase; font-size: 14px; }
            .card-body { padding: 20px; background: #fff; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .card-body p { margin: 5px 0; }
            .label { font-weight: 700; color: #64748b; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 2px; }

            /* Itinerario */
            .itinerary-section { margin-bottom: 30px; padding: 20px; background: #fff; border: 2px solid #e2e8f0; border-radius: 15px; }
            .itinerary-title { color: ${primaryColor}; font-weight: 800; margin-bottom: 15px; font-size: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; }
            .day-item { margin-bottom: 10px; border-left: 4px solid ${primaryColor}; padding-left: 15px; }
            .day-num { font-weight: 800; color: ${primaryColor}; margin-right: 10px; }

            /* Cláusulas Legal */
            .legal-content { text-align: justify; border-top: 2px solid #e2e8f0; padding-top: 30px; font-size: 18px; }
            .clause { margin-bottom: 20px; }
            .clause-title { font-weight: 800; color: #0f172a; }
            
            /* Firmas */
            .signatures { margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; text-align: center; }
            .sign-box { border-top: 2px solid #0f172a; padding-top: 15px; }
            .sign-name { font-weight: 800; font-size: 18px; }

            @media print {
                body { background: white; }
                .document { width: 100%; padding: 20mm; }
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
                <div class="emit-date">${dateStr}</div>
            </div>

            <div class="data-grid">
                <div class="card">
                    <div class="card-header">Logística del Tour</div>
                    <div class="card-body">
                        <div>
                            <span class="label">Tour / Destino</span>
                            <strong>${tour.title}</strong>
                        </div>
                        <div>
                            <span class="label">Inversión Total</span>
                            <strong>$${client.total_amount.toLocaleString()} MXN</strong>
                        </div>
                        <div>
                            <span class="label">Salida</span>
                            <strong>${departureDate} - ${tour.departure_time || 'N/A'}</strong>
                        </div>
                        <div>
                            <span class="label">Regreso</span>
                            <strong>${returnDate} - ${tour.return_time || 'N/A'}</strong>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">Información del Cliente</div>
                    <div class="card-body">
                        <div>
                            <span class="label">Titular de Reserva</span>
                            <strong>${clientFullName}</strong>
                        </div>
                        <div>
                            <span class="label">Identificación</span>
                            <strong>${client.identification_number || 'N/A'}</strong>
                        </div>
                        <div class="col-span-2">
                            <span class="label">Domicilio</span>
                            <strong>${client.address || 'Conocido'}</strong>
                        </div>
                    </div>
                </div>
            </div>

            ${tour.itinerary && tour.itinerary.length > 0 ? `
            <div class="itinerary-section">
                <div class="itinerary-title">Itinerario de Viaje</div>
                ${tour.itinerary.map((item: any) => `
                    <div class="day-item">
                        <span class="day-num">Día ${item.day}:</span>
                        <span>${item.activity}</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <div class="legal-content">
                <p>En la ciudad de Saltillo, Coahuila, México, se celebra el presente contrato de prestación de servicios turísticos entre <strong>${agency?.agency_name || 'Saura Tours'}</strong>, representada por el C. <strong>Juan De Dios Saucedo Cortés</strong>, en adelante “LA AGENCIA”; y el ciudadano <strong>${clientFullName}</strong>, en adelante “EL CLIENTE”.</p>

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
                    <div>Representante Legal - LA AGENCIA</div>
                </div>
                <div class="sign-box">
                    <div class="sign-name">${clientFullName}</div>
                    <div>Firma del Cliente</div>
                </div>
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