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

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Montserrat', sans-serif; color: #1a1a1a; line-height: 1.5; padding: 0; margin: 0; font-size: 10px; background: #fff; }
            .page { padding: 40px; max-width: 800px; margin: auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${primaryColor}; padding-bottom: 15px; margin-bottom: 25px; }
            .logo { max-height: 70px; }
            .contract-title { text-align: right; }
            .contract-title h1 { color: ${primaryColor}; font-size: 18px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
            .contract-title p { margin: 2px 0; font-weight: bold; color: #666; }
            
            .info-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 25px; }
            .info-box { background: #f8f8f8; padding: 15px; border-radius: 12px; border-left: 4px solid ${primaryColor}; }
            .info-box h3 { margin: 0 0 10px 0; font-size: 11px; color: ${primaryColor}; text-transform: uppercase; }
            .info-box p { margin: 4px 0; }
            
            .clause-container { text-align: justify; columns: 1; column-gap: 30px; }
            .clause { margin-bottom: 12px; font-size: 9.5px; }
            .clause-title { font-weight: 700; color: #000; text-decoration: underline; }
            
            .highlight-box { background: ${primaryColor}; color: white; padding: 12px; border-radius: 8px; margin: 15px 0; text-align: center; font-weight: bold; }
            
            .footer-sigs { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; text-align: center; }
            .sign-space { border-top: 1px solid #000; padding-top: 10px; margin-top: 40px; }
            .footer-info { text-align: center; margin-top: 30px; font-size: 8px; color: #999; }
            @media print { .page { padding: 20px; } button { display: none; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                ${agency?.logo_url ? `<img src="${agency.logo_url}" class="logo">` : '<div></div>'}
                <div class="contract-title">
                    <h1>Contrato de Servicio</h1>
                    <p>FOLIO: ${client.contract_number}</p>
                    <p>FECHA: ${dateStr}</p>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-box">
                    <h3>Datos del Cliente</h3>
                    <p><strong>NOMBRE:</strong> ${client.first_name} ${client.last_name}</p>
                    <p><strong>IDENTIFICACIÓN:</strong> ${client.identification_number || 'N/A'}</p>
                    <p><strong>CONTACTO:</strong> ${client.phone || client.email}</p>
                </div>
                <div class="info-box">
                    <h3>Detalles del Tour</h3>
                    <p><strong>DESTINO:</strong> ${tour.title}</p>
                    <p><strong>PASAJEROS:</strong> ${client.number_of_people}</p>
                    <p><strong>ESTATUS:</strong> ${client.status.toUpperCase()}</p>
                </div>
            </div>

            <div class="highlight-box">
                MONTO TOTAL DEL CONTRATO: $${client.total_amount.toLocaleString()} MXN
            </div>

            <div class="clause-container">
                <div class="clause">
                    <span class="clause-title">PRIMERA. OBJETO:</span> El presente contrato tiene por objeto la prestación de servicios turísticos consistentes en transporte terrestre y/o hospedaje detallados en el itinerario anexo, obligándose "LA AGENCIA" a su cumplimiento y "EL CLIENTE" al pago del precio convenido.
                </div>
                <div class="clause">
                    <span class="clause-title">SEGUNDA. PRECIO Y PAGO:</span> El costo total es de <strong style="color:${primaryColor}">$${client.total_amount.toLocaleString()}</strong>. El cliente reconoce que su lugar solo será garantizado una vez cubierto el anticipo. Los pagos deberán completarse 15 días antes de la salida.
                </div>
                <div class="clause">
                    <span class="clause-title">TERCERA. OBLIGACIONES AGENCIA:</span> Proporcionar las unidades de transporte con seguro de viajero vigente y las reservaciones de hotel en las categorías pactadas.
                </div>
                <div class="clause">
                    <span class="clause-title">CUARTA. PUNTUALIDAD:</span> "EL CLIENTE" deberá presentarse 30 minutos antes en el punto de reunión. En caso de retraso por parte del cliente, la unidad no esperará y no habrá derecho a reembolso.
                </div>
                <div class="clause">
                    <span class="clause-title">QUINTA. CANCELACIONES:</span> Al tratarse de tarifas de grupo y preventas especiales, <strong style="color:red">NO EXISTEN DEVOLUCIONES, REEMBOLSOS NI CANCELACIONES</strong> bajo ninguna circunstancia.
                </div>
                <div class="clause">
                    <span class="clause-title">SEXTA. CAMBIOS:</span> "LA AGENCIA" se reserva el derecho de modificar el orden de las visitas o sustituir hoteles por causas ajenas o de fuerza mayor, manteniendo siempre la calidad del servicio.
                </div>
                <div class="clause">
                    <span class="clause-title">SÉPTIMA. RESPONSABILIDAD:</span> La agencia funge como intermediaria. No se hace responsable por accidentes ocurridos fuera de la unidad, enfermedades, huelgas o fenómenos naturales.
                </div>
                <div class="clause">
                    <span class="clause-title">OCTAVA. EQUIPAJE:</span> Se permite una maleta de hasta 15kg y un bolso de mano. "LA AGENCIA" no se hace responsable por objetos olvidados dentro de la unidad o el hotel.
                </div>
                <div class="clause">
                    <span class="clause-title">NOVENA. DOCUMENTACIÓN:</span> Es responsabilidad exclusiva del cliente contar con identificaciones oficiales vigentes (INE/Pasaporte) para el registro en hoteles y puntos de control.
                </div>
                <div class="clause">
                    <span class="clause-title">DÉCIMA. SEGURO:</span> El seguro de viajero incluido aplica exclusivamente mientras los pasajeros se encuentran a bordo de la unidad de transporte.
                </div>
                <div class="clause">
                    <span class="clause-title">DÉCIMA PRIMERA. CONDUCTA:</span> Queda estrictamente prohibido el consumo de sustancias prohibidas a bordo. La agencia podrá negar el servicio a quien presente conducta agresiva o inapropiada.
                </div>
                <div class="clause">
                    <span class="clause-title">DÉCIMA SEGUNDA. TRANSFERENCIA:</span> En caso de no poder asistir, el cliente podrá ceder sus derechos a un tercero, notificando a la agencia con 72 horas de anticipación.
                </div>
                <div class="clause">
                    <span class="clause-title">DÉCIMA TERCERA. PRIVACIDAD:</span> Los datos personales aquí recabados están protegidos bajo el aviso de privacidad de Saura Tours conforme a la ley vigente.
                </div>
                <div class="clause">
                    <span class="clause-title">DÉCIMA CUARTA. JURISDICCIÓN:</span> Para la interpretación de este contrato, las partes se someten a las leyes y tribunales de Saltillo, Coahuila, renunciando a cualquier otro fuero.
                </div>
            </div>

            <div class="footer-sigs">
                <div>
                    <div class="sign-space"></div>
                    <p><strong>Saura Tours</strong></p>
                    <p style="font-size: 8px;">REPRESENTANTE AUTORIZADO</p>
                </div>
                <div>
                    <div class="sign-space"></div>
                    <p><strong>${client.first_name} ${client.last_name}</strong></p>
                    <p style="font-size: 8px;">ACEPTO DE CONFORMIDAD ("EL CLIENTE")</p>
                </div>
            </div>
            
            <div class="footer-info">
                Este contrato es un documento legalmente vinculante para Saura Tours y el Cliente identificado.
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