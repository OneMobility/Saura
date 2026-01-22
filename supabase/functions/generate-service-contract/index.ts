import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const tour = client.tours || {};
    const dateStr = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const tourDate = tour.departure_date ? new Date(tour.departure_date).toLocaleDateString('es-MX') : 'N/A';

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: sans-serif; line-height: 1.5; color: #000; padding: 40px; font-size: 12px; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .justify { text-align: justify; }
              .margin-v { margin: 20px 0; }
              .clause { margin-bottom: 15px; }
              .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
              .sign-box { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 10px; }
          </style>
      </head>
      <body>
          <h2 class="center">CONTRATO DE VENTA DE TOUR</h2>
          <p class="bold">Número de Contrato: ${client.contract_number}</p>

          <p class="justify">
              En la ciudad de Saltillo, Coahuila, México, a ${dateStr}, se celebra el presente contrato de prestación de servicios turísticos entre:
              <br><br>
              <span class="bold">SAURA TOURS</span>, con domicilio en Saltillo, Coahuila, representada por el C. Juan De Dios Saucedo Cortés, en adelante “LA AGENCIA”; y
              <br><br>
              <span class="bold">${client.first_name} ${client.last_name}</span>, con domicilio en ${client.address || 'Domicilio Conocido'}, identificado con ${client.identification_number || 'N/A'}, en adelante “EL CLIENTE”.
          </p>

          <div class="clause">
              <p class="bold">1. OBJETO DEL CONTRATO</p>
              <p class="justify">
                  LA AGENCIA se compromete a coordinar y poner a disposición de EL CLIENTE el tour denominado <span class="bold">${tour.title || 'N/A'}</span>, que se llevará a cabo el día ${tourDate}, con las siguientes características:
                  <br><br>
                  Destino / Itinerario: ${String(tour.description || '').replace(/<[^>]*>?/gm, '')}
                  <br>
                  Duración: ${tour.duration || 'N/A'}
                  <br>
                  Incluye: ${tour.includes?.join(', ') || 'Servicios base'}
                  <br>
                  Precio Total: $${client.total_amount.toLocaleString()} MXN
              </p>
          </div>

          <div class="clause">
              <p class="bold">2. NATURALEZA DEL SERVICIO</p>
              <p class="justify">LA AGENCIA actúa únicamente como coordinadora de servicios turísticos, contratando servicios con proveedores independientes de transporte, hospedaje, alimentación, guías, accesos y demás. EL CLIENTE acepta que cada servicio está sujeto a los términos y condiciones de dichos proveedores, debiendo respetar sus contratos en lo individual y grupal. LA AGENCIA no será responsable de fallas, retrasos o incumplimientos atribuibles a terceros.</p>
          </div>

          <div class="clause">
              <p class="bold">3. EXCLUSIÓN DE RESPONSABILIDAD</p>
              <p class="justify">LA AGENCIA no será responsable por situaciones de fuerza mayor o ajenas a su control, tales como desastres naturales, fenómenos meteorológicos, pandemias, accidentes, disturbios sociales, cierres de carreteras, restricciones gubernamentales. Averías mecánicas, fallas en transportes, problemas en hospedajes o cancelaciones por parte de proveedores. LA AGENCIA solo responderá por lo contratado expresamente en este documento. EL CLIENTE libera a LA AGENCIA de cualquier responsabilidad por daños, pérdidas, lesiones, enfermedades o fallecimientos ocurridos durante el tour.</p>
          </div>

          <div class="clause">
              <p class="bold">4. CANCELACIONES Y REEMBOLSOS</p>
              <p class="justify"><span class="bold">Por parte del CLIENTE:</span> No habrá reembolso en caso de cancelación. EL CLIENTE podrá traspasar su lugar a otra persona, notificándolo con al menos 48 horas de anticipación. <br><span class="bold">Por parte de LA AGENCIA:</span> En caso de cancelación por causas imputables a LA AGENCIA, se ofrecerán dos opciones: a) Reembolso dentro de 90 días naturales o b) Reprogramación del viaje válida hasta por 1 año. En caso de fuerza mayor, LA AGENCIA no está obligada a reembolsar ni reprogramar.</p>
          </div>

          <div class="clause">
              <p class="bold">5. PAGOS Y PENALIZACIONES</p>
              <p class="justify">El servicio deberá estar pagado en su totalidad en la fecha límite establecida. En caso de incumplimiento de pago, LA AGENCIA podrá cancelar la reserva sin obligación de reembolso. Los anticipos realizados son no reembolsables bajo ninguna circunstancia. Los pagos deberán realizarse únicamente a las cuentas oficiales de LA AGENCIA.</p>
          </div>

          <div class="clause">
              <p class="bold">6. OBLIGACIONES DEL CLIENTE</p>
              <p class="justify">Presentarse en el lugar y hora indicados. Contar con la documentación requerida (identificaciones, permisos, visas, certificados médicos, etc.). Respetar las normas de seguridad y convivencia durante el tour. Asumir los gastos personales no incluidos en el contrato.</p>
          </div>

          <div class="clause">
              <p class="bold">7. CESIÓN DE DERECHOS Y USO DE IMAGEN</p>
              <p class="justify">EL CLIENTE autoriza a LA AGENCIA a utilizar fotografías o videos tomados durante el tour con fines publicitarios o promocionales. En caso de cesión de lugar a otra persona, LA AGENCIA no asume responsabilidades adicionales.</p>
          </div>

          <div class="clause">
              <p class="bold">8. SEGUROS Y COBERTURA</p>
              <p class="justify">EL CLIENTE reconoce que los servicios no incluyen seguros médicos, de accidentes ni de viaje, salvo que se especifique en un anexo. EL CLIENTE es responsable de contratar seguros adicionales si así lo requiere.</p>
          </div>

          <div class="clause">
              <p class="bold">9. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</p>
              <p class="justify">LA AGENCIA se compromete a proteger los datos personales de EL CLIENTE conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Los datos serán usados únicamente para la gestión del servicio contratado.</p>
          </div>

          <div class="clause">
              <p class="bold">10. COMUNICACIÓN OFICIAL</p>
              <p class="justify">Toda comunicación válida deberá realizarse por escrito, vía correo electrónico, WhatsApp corporativo o documento físico con acuse de recibido. Las comunicaciones verbales carecen de valor contractual.</p>
          </div>

          <div class="clause">
              <p class="bold">11. SUCESIÓN Y CESIÓN DE DERECHOS</p>
              <p class="justify">EL CLIENTE no podrá ceder ni transferir derechos u obligaciones derivados del presente contrato sin autorización por escrito de LA AGENCIA. LA AGENCIA podrá ceder sus derechos a terceros en caso de fusión, venta o reestructuración de la empresa.</p>
          </div>

          <div class="clause">
              <p class="bold">12. PROPIEDAD INTELECTUAL</p>
              <p class="justify">Todo material informativo, publicitario, imágenes, marcas y logotipos relacionados con el tour son propiedad de LA AGENCIA y no podrán ser reproducidos sin su autorización.</p>
          </div>

          <div class="clause">
              <p class="bold">13. LEY APLICABLE Y JURISDICCIÓN</p>
              <p class="justify">Para la interpretación y cumplimiento del presente contrato, las partes se someten a las leyes y tribunales de la ciudad de Saltillo, Coahuila, México, renunciando expresamente a cualquier otro fuero.</p>
          </div>

          <div class="clause">
              <p class="bold">14. CLAÚSULA SUPLETORIA</p>
              <p class="justify">En caso de que alguna disposición del presente contrato sea declarada nula, inválida o inaplicable, las demás cláusulas conservarán su plena validez y obligatoriedad.</p>
          </div>

          <div class="signatures">
              <div class="sign-box">
                  <p>Juan De Dios Saucedo Cortés</p>
                  <p>Representante Legal<br>“LA AGENCIA”</p>
              </div>
              <div class="sign-box">
                  <p>${client.first_name} ${client.last_name}</p>
                  <p>“El Cliente”</p>
              </div>
          </div>
      </body>
      </html>
    `;

    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});