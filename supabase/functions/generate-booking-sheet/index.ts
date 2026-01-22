import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0';
import es from 'https://esm.sh/date-fns@2.30.0/locale/es';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const generateBookingSheetHtml = (data: any) => {
  const { client, tour, agency, busRoute, busPassengers, tourSeats } = data;
  const isTour = !!client.tour_id;
  const title = isTour ? tour?.title : busRoute?.name;
  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const bookingDate = format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es });
  
  let seatNumbers = "";
  if (isTour) {
    seatNumbers = tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  } else {
    seatNumbers = busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ') || 'N/A';
  }

  const totalPeople = client.number_of_people || 1;
  const remainingPayment = (client.total_amount - client.total_paid).toFixed(2);

  const roomDetails = client.room_details || {};
  const roomDetailsDisplay = `${roomDetails.quad_rooms || 0} Cuádruple(s), ${roomDetails.triple_rooms || 0} Triple(s), ${roomDetails.double_rooms || 0} Doble(s)`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Hoja de Control de Reserva - ${client.contract_number}</title>
        <style>
            body { 
                font-family: 'Helvetica', 'Arial', sans-serif; 
                padding: 30px; 
                border: 8px double #91045A; 
                min-height: 90vh; 
                box-sizing: border-box; 
                color: #333; 
                font-size: 10pt;
            }
            .header { 
                text-align: center; 
                background-color: #91045A; 
                color: white; 
                padding: 15px; 
                margin-bottom: 25px; 
            }
            .header h1 { 
                margin: 0; 
                font-size: 26px; 
                text-transform: uppercase; 
                letter-spacing: 1px; 
            }
            .header p { 
                margin: 5px 0 0; 
                font-weight: bold; 
                font-size: 18px; 
            }
            .section-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 20px; 
                margin-bottom: 20px; 
            }
            .section-box { 
                padding: 15px; 
                border: 1px solid #ccc; 
                border-radius: 5px; 
                background-color: #f9f9f9;
            }
            .section-box h2 { 
                font-size: 14pt; 
                color: #91045A; 
                margin-top: 0; 
                margin-bottom: 10px; 
                border-bottom: 1px solid #91045A; 
                padding-bottom: 5px;
            }
            .label { 
                font-weight: bold; 
                color: #666; 
                display: block; 
                margin-bottom: 2px; 
                text-transform: uppercase; 
                font-size: 9pt; 
            }
            .value { 
                font-size: 11pt; 
                font-weight: bold; 
                color: #000; 
                margin-bottom: 10px;
            }
            .seats-container { 
                text-align: center; 
                background-color: #fff0f5; 
                padding: 25px; 
                border: 3px solid #91045A; 
                margin: 20px 0; 
                border-radius: 10px; 
            }
            .seats-label { 
                font-size: 16px; 
                font-weight: bold; 
                color: #91045A; 
                margin-bottom: 10px; 
            }
            .seats-value { 
                font-size: 60px; 
                font-weight: bold; 
                color: #91045A; 
                display: block; 
            }
            .payment-summary { 
                border: 2px solid #d32f2f; 
                background-color: #fff8f8; 
                padding: 15px; 
                text-align: right; 
                margin-top: 20px;
            }
            .total-value-red { 
                color: #d32f2f; 
                font-size: 30px; 
                font-weight: bold; 
            }
            .footer { 
                text-align: center; 
                margin-top: 50px; 
                font-size: 13px; 
                color: #888; 
                border-top: 1px dashed #ccc; 
                padding-top: 20px; 
            }
            .status-badge { 
                display: inline-block; 
                padding: 5px 15px; 
                background: #91045A; 
                color: white; 
                border-radius: 20px; 
                font-size: 12px; 
                margin-top: 10px; 
            }
            @media print { 
                body { 
                    border: 8px double #91045A; 
                    -webkit-print-color-adjust: exact; 
                    padding: 15mm;
                } 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>HOJA DE CONTROL DE RESERVA</h1>
            <p>Agencia: ${agency?.agency_name || 'SAURA TOURS'}</p>
        </div>

        <div class="section-grid">
            <div class="section-box">
                <h2>Datos del Contrato</h2>
                <span class="label">Número de Contrato:</span>
                <span class="value">${client.contract_number}</span>
                
                <span class="label">Fecha de Reserva:</span>
                <span class="value">${bookingDate}</span>

                <span class="label">Servicio Reservado:</span>
                <span class="value">${title}</span>
                
                <span class="label">Total de Personas:</span>
                <span class="value">${totalPeople}</span>
                
                ${isTour ? `
                    <span class="label">Distribución de Habitaciones:</span>
                    <span class="value">${roomDetailsDisplay}</span>
                ` : ''}
            </div>
            
            <div class="section-box">
                <h2>Datos del Cliente</h2>
                <span class="label">Nombre Completo:</span>
                <span class="value">${clientFullName}</span>
                
                <span class="label">Email:</span>
                <span class="value">${client.email || 'N/A'}</span>

                <span class="label">Teléfono:</span>
                <span class="value">${client.phone || 'N/A'}</span>
                
                <span class="label">Identificación:</span>
                <span class="value">${client.identification_number || 'N/A'}</span>
                
                <span class="label">Dirección:</span>
                <span class="value">${client.address || 'N/A'}</span>
            </div>
        </div>

        <div class="seats-container">
            <span class="seats-label">ASIENTOS ASIGNADOS</span>
            <span class="seats-value">${seatNumbers}</span>
            <div class="status-badge">Estado del Contrato: ${client.status.toUpperCase()}</div>
        </div>

        <div class="section-grid">
            <div class="section-box">
                <h2>Detalles de Pago</h2>
                <span class="label">Costo Total del Servicio:</span>
                <span class="value" style="color: #91045A;">$${client.total_amount.toLocaleString()} MXN</span>
                
                <span class="label">Anticipo Registrado:</span>
                <span class="value" style="color: #2e7d32;">$${client.advance_payment.toLocaleString()} MXN</span>
                
                <span class="label">Total Abonado:</span>
                <span class="value" style="color: #2e7d32;">$${client.total_paid.toLocaleString()} MXN</span>
            </div>
            
            <div class="payment-summary">
                <span class="label" style="color: #d32f2f;">Saldo Pendiente de Liquidar:</span>
                <span class="total-value-red">$${remainingPayment} MXN</span>
            </div>
        </div>

        <div class="footer">
            <p><strong>IMPORTANTE:</strong> Esta hoja es para control interno y debe ser presentada al abordar.</p>
            <p>Agencia: ${agency?.agency_name || 'Saura Tours'} | Tel: ${agency?.agency_phone || 'N/A'}</p>
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
    if (clientError || !client) throw new Error("Reserva no encontrada.");
    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    let tourSeats = [], busPassengers = [];
    if (client.tour_id) {
      const { data } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
      tourSeats = data || [];
    } else {
      const { data } = await supabaseAdmin.from('bus_passengers').select('seat_number').eq('client_id', client.id);
      busPassengers = data || [];
    }
    const html = generateBookingSheetHtml({ client, tour: client.tours, busRoute: client.bus_routes, agency, tourSeats, busPassengers });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});