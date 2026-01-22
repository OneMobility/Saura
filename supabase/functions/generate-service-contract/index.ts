import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateHtml = (data: any) => {
  const { client, tour, agency } = data;
  const totalPax = client.number_of_people;
  const roomsCount = Math.ceil(totalPax / 4);
  const dateStr = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Helvetica', Arial, sans-serif; color: #333; line-height: 1.4; padding: 40px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #91045A; margin-bottom: 20px; padding-bottom: 10px; }
            .logo { max-width: 150px; margin-bottom: 10px; }
            h1 { color: #91045A; font-size: 18px; margin: 0; text-transform: uppercase; }
            .contract-info { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
            .section-title { color: #91045A; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #eee; margin: 15px 0 8px; font-size: 12px; }
            .clauses { text-align: justify; }
            .clause { margin-bottom: 10px; }
            .clause-title { font-weight: bold; }
            .footer { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; }
            .sign-box { border-top: 1px solid #333; width: 200px; padding-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { background: #91045A; color: white; padding: 8px; text-align: left; }
            td { padding: 8px; border: 1px solid #eee; }
            .total-row { background: #f5f5f5; font-weight: bold; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="header">
            ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo">` : ''}
            <h1>Contrato de Prestación de Servicios Turísticos</h1>
            <p><strong>Saura Tours S.A. de C.V.</strong></p>
        </div>

        <div class="contract-info">
            <div>
                <p><strong>FOLIO:</strong> ${client.contract_number}</p>
                <p><strong>FECHA:</strong> ${dateStr}</p>
            </div>
            <div style="text-align: right;">
                <p><strong>CLIENTE:</strong> ${client.first_name} ${client.last_name}</p>
                <p><strong>DESTINO:</strong> ${tour.title}</p>
            </div>
        </div>

        <div class="clauses">
            <div class="clause">
                <span class="clause-title">PRIMERA. OBJETO DEL CONTRATO:</span> El prestador se obliga a proporcionar al cliente los servicios turísticos detallados en la reserva adjunta, consistentes en transporte y/o hospedaje según lo contratado.
            </div>
            <div class="clause">
                <span class="clause-title">SEGUNDA. PRECIO Y FORMA DE PAGO:</span> El cliente se obliga a pagar la cantidad total de <strong style="color: #91045A;">$${client.total_amount.toLocaleString()} MXN</strong>. El lugar no se considera reservado hasta cubrir el anticipo mínimo estipulado.
            </div>
            <div class="clause">
                <span class="clause-title">TERCERA. OBLIGACIONES DE LA AGENCIA:</span> Proporcionar los servicios con calidad y seguridad, informando oportunamente cualquier cambio en el itinerario derivado de causas de fuerza mayor.
            </div>
            <div class="clause">
                <span class="clause-title">CUARTA. OBLIGACIONES DEL CLIENTE:</span> Presentarse puntualmente en los lugares de salida. La agencia no se hace responsable por retrasos del cliente, perdiendo este su derecho al servicio sin reembolso.
            </div>
            <div class="clause">
                <span class="clause-title">QUINTA. CANCELACIONES:</span> Al ser precios de promoción y grupales, <strong style="text-decoration: underline;">NO EXISTEN DEVOLUCIONES NI CANCELACIONES</strong> bajo ninguna circunstancia por parte del cliente.
            </div>
            <div class="clause">
                <span class="clause-title">SEXTA. CAMBIOS POR LA AGENCIA:</span> La agencia se reserva el derecho de modificar itinerarios o sustituir hoteles por otros de similar o superior categoría si las circunstancias así lo exigen.
            </div>
            <div class="clause">
                <span class="clause-title">SÉPTIMA. RESPONSABILIDAD:</span> La agencia actúa como intermediaria. No se responsabiliza por accidentes, enfermedades o pérdidas materiales fuera de su control directo.
            </div>
            <div class="clause">
                <span class="clause-title">OCTAVA. EQUIPAJE:</span> El cliente es responsable de su equipaje. Se permite una maleta de mano y una de carga por persona según las políticas de la transportadora.
            </div>
            <div class="clause">
                <span class="clause-title">NOVENA. DOCUMENTACIÓN:</span> El cliente es responsable de contar con sus documentos de identificación oficiales vigentes necesarios para el viaje.
            </div>
            <div class="clause">
                <span class="clause-title">DÉCIMA. SEGURO DE VIAJERO:</span> El servicio incluye el seguro de viajero obligatorio de la unidad de transporte, vigente exclusivamente mientras se esté a bordo de la misma.
            </div>
            <div class="clause">
                <span class="clause-title">DÉCIMA PRIMERA. COMPORTAMIENTO:</span> El cliente deberá observar una conducta adecuada. La agencia podrá negar el servicio si el cliente se encuentra bajo efectos de sustancias o muestra agresividad.
            </div>
            <div class="clause">
                <span class="clause-title">DÉCIMA SEGUNDA. CESIÓN DE DERECHOS:</span> El cliente puede ceder su lugar a otra persona notificando a la agencia con al menos 48 horas de anticipación.
            </div>
            <div class="clause">
                <span class="clause-title">DÉCIMA TERCERA. PRIVACIDAD:</span> Los datos personales serán tratados conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
            </div>
            <div class="clause">
                <span class="clause-title">DÉCIMA CUARTA. JURISDICCIÓN:</span> Para cualquier controversia, las partes se someten a las leyes y tribunales competentes de la ciudad de Saltillo, Coahuila.
            </div>
        </div>

        <div class="footer">
            <div class="sign-box">
                <p>Saura Tours</p>
                <p style="font-size: 9px; margin-top: 20px;">Firma Autorizada</p>
            </div>
            <div class="sign-box">
                <p>${client.first_name} ${client.last_name}</p>
                <p style="font-size: 9px; margin-top: 20px;">Acepto de Conformidad</p>
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
    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    
    return new Response(generateHtml({ client, tour: client.tours, agency }), { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});