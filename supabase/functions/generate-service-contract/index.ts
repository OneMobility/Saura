import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0';
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
  const title = isTour ? tour?.title : `Boleto de Autobús: ${busRoute?.name || 'N/A'}`;
  
  const departureDate = isTour ? (client.tours?.departure_date ? format(parseISO(client.tours.departure_date), 'dd/MM/yyyy', { locale: es }) : 'N/A') : 'N/A';
  const returnDate = isTour ? (client.tours?.return_date ? format(parseISO(client.tours.return_date), 'dd/MM/yyyy', { locale: es }) : 'N/A') : 'N/A';

  // Lógica de conteo para desglose (REGLA: 12 o menores son Niños)
  let adults = (client.contractor_age === null || client.contractor_age > 12) ? 1 : 0;
  let children = (client.contractor_age !== null && client.contractor_age <= 12) ? 1 : 0;
  
  if (client.companions) {
    client.companions.forEach((c: any) => {
      (c.age === null || c.age > 12) ? adults++ : children++;
    });
  }

  let seatNumbers = isTour 
    ? tourSeats?.map((s: any) => s.seat_number).sort((a: number, b: number) => a - b).join(', ')
    : busPassengers?.map((p: any) => p.seat_number).sort((a: number, b: number) => a - b).join(', ');

  const rd = client.room_details || {};

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Contrato - ${client.contract_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Poppins', sans-serif; line-height: 1.4; color: #1e293b; margin: 0; padding: 0; font-size: 12px; }
            .page { width: 215.9mm; margin: 10px auto; padding: 15mm; background: white; box-sizing: border-box; border: 1px solid #eee; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #91045A; padding-bottom: 10px; margin-bottom: 15px; }
            .primary-text { color: #91045A; font-weight: 800; }
            .section-title { font-weight: 700; font-size: 11px; color: #91045A; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #fdfdfd; }
            .breakdown-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
            .breakdown-table th { text-align: left; background: #f8fafc; padding: 6px; border: 1px solid #e2e8f0; }
            .breakdown-table td { padding: 6px; border: 1px solid #e2e8f0; }
            .total-box { background: #91045A; color: white; padding: 10px; border-radius: 8px; text-align: right; margin-top: 10px; }
            .clauses { font-size: 9.5px; text-align: justify; color: #64748b; height: 350px; overflow: hidden; border: 1px solid #f1f5f9; padding: 10px; border-radius: 5px; }
            .signature-area { display: flex; justify-content: space-around; margin-top: 30px; }
            .sig-box { width: 40%; text-align: center; border-top: 1px solid #333; padding-top: 5px; font-weight: 700; }
            @media print { .page { margin: 0; box-shadow: none; border: none; } }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <div class="agency-info">
                    <h1 class="primary-text" style="margin:0; font-size: 24px;">${agency?.agency_name || 'SAURA TOURS'}</h1>
                    <p style="margin:2px 0;">${agency?.agency_address || ''}</p>
                </div>
                <div style="text-align: right;">
                    <p class="primary-text" style="font-size: 16px; margin:0;">CONTRATO DE SERVICIO</p>
                    <p style="font-weight: 700; margin:0;">No. ${client.contract_number}</p>
                </div>
            </div>

            <div class="grid">
                <div class="card">
                    <div class="section-title">Datos del Cliente</div>
                    <p><strong>Titular:</strong> ${clientFullName}</p>
                    <p><strong>ID:</strong> ${client.identification_number || 'N/A'}</p>
                    <p><strong>Tel:</strong> ${client.phone || 'N/A'}</p>
                </div>
                <div class="card">
                    <div class="section-title">Detalles del Viaje</div>
                    <p><strong>Tour:</strong> ${title}</p>
                    <p><strong>Salida:</strong> ${departureDate}</p>
                    <p><strong>Asientos:</strong> ${seatNumbers}</p>
                </div>
            </div>

            <div class="section-title">Desglose de Precios</div>
            <table class="breakdown-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Cantidad</th>
                        <th>Costo Unitario</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${rd.double_rooms > 0 ? `<tr><td>Habitación Doble (2 Adultos)</td><td>${rd.double_rooms}</td><td>$${(tour.selling_price_double_occupancy * 2).toLocaleString()}</td><td>$${(rd.double_rooms * tour.selling_price_double_occupancy * 2).toLocaleString()}</td></tr>` : ''}
                    ${rd.triple_rooms > 0 ? `<tr><td>Habitación Triple (3 Adultos)</td><td>${rd.triple_rooms}</td><td>$${(tour.selling_price_triple_occupancy * 3).toLocaleString()}</td><td>$${(rd.triple_rooms * tour.selling_price_triple_occupancy * 3).toLocaleString()}</td></tr>` : ''}
                    ${rd.quad_rooms > 0 ? `<tr><td>Habitación Cuádruple (4 Adultos)</td><td>${rd.quad_rooms}</td><td>$${(tour.selling_price_quad_occupancy * 4).toLocaleString()}</td><td>$${(rd.quad_rooms * tour.selling_price_quad_occupancy * 4).toLocaleString()}</td></tr>` : ''}
                    ${children > 0 ? `<tr><td>Tarifa de Niño (12 años o menos)</td><td>${children}</td><td>$${tour.selling_price_child.toLocaleString()}</td><td>$${(children * tour.selling_price_child).toLocaleString()}</td></tr>` : ''}
                </tbody>
            </table>

            <div class="total-box">
                <p style="margin:0; font-size: 10px; opacity: 0.8;">MONTO TOTAL DEL CONTRATO</p>
                <h2 style="margin:0; font-size: 22px;">$${client.total_amount.toLocaleString()} MXN</h2>
            </div>

            <div style="margin-top: 15px;">
                <div class="section-title">Cláusulas de Reserva</div>
                <div class="clauses">
                    <p><strong>1. OBJETO:</strong> La agencia se compromete a prestar los servicios turísticos descritos...</p>
                    <p><strong>2. PAGOS:</strong> El cliente debe liquidar el total del viaje 15 días antes de la salida...</p>
                    <p><strong>3. CANCELACIONES:</strong> No hay reembolsos en anticipos ni cancelaciones de último momento...</p>
                    <p><strong>4. EDADES:</strong> Se considera tarifa de niño estrictamente a menores de 12 años cumplidos a la fecha del viaje...</p>
                    <p><strong>5. SEGURIDAD:</strong> El pasajero debe seguir las instrucciones del coordinador en todo momento...</p>
                </div>
            </div>

            <div class="signature-area">
                <div class="sig-box">POR LA AGENCIA</div>
                <div class="sig-box">EL CLIENTE<br><span style="font-size: 8px; font-weight: 400;">${clientFullName}</span></div>
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
    const { data: client } = await supabaseAdmin.from('clients').select(`*, tours (*), bus_routes (*)`).ilike('contract_number', contractNumber.trim()).single();
    const { data: agency } = await supabaseAdmin.from('agency_settings').select('*').single();
    let tourSeats = [], busPassengers = [];
    if (client.tour_id) {
      const { data } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
      tourSeats = data || [];
    }
    const html = generateServiceContractHtml({ client, tour: client.tours, busRoute: client.bus_routes, agency, tourSeats, busPassengers });
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});