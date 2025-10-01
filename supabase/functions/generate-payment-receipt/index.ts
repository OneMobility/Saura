import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, parseISO } from 'https://esm.sh/date-fns@2.30.0'; // Import date-fns for formatting

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to generate HTML for the payment receipt
const generatePaymentReceiptHtml = (data: any) => {
  const client = data.client;
  const tour = data.tour || {};
  const payments = data.payments;
  const agency = data.agency;

  const clientFullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  const tourTitle = tour?.title || 'N/A';

  const paymentsList = payments.map((p: any) => `
    <div class="payment-item">
      <p><span class="label">Fecha:</span> ${format(parseISO(p.payment_date), 'dd/MM/yyyy')}</p>
      <p><span class="label">Monto:</span> $${(typeof p.amount === 'number' ? p.amount : 0).toFixed(2)}</p>
      <p class="payment-id"><span class="label">ID de Pago:</span> ${p.id}</p>
    </div>
  `).join('');

  const totalAmountPaidInReceipt = payments.reduce((sum: number, p: any) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo de Pago - ${client.contract_number || 'N/A'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Poppins', sans-serif;
                line-height: 1.5;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f8f8f8;
                font-size: 10pt; /* Base font size for screen */
            }
            .page-container {
                max-width: 210mm; /* A4 width, close to Letter */
                min-height: 297mm; /* A4 height, close to Letter */
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
                font-size: 2em;
                margin-bottom: 20px;
                text-transform: uppercase;
            }
            h2 {
                font-size: 1.3em;
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
            .section p {
                margin-bottom: 6px;
            }
            .label {
                font-weight: 600;
                color: #555;
            }
            .payment-details-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .payment-item {
                border: 1px solid #E4007C;
                border-radius: 5px;
                padding: 10px;
                background-color: #fff0f5; /* Light pink */
            }
            .payment-item p {
                margin: 4px 0;
            }
            .payment-id {
                font-size: 0.8em;
                color: #777;
            }
            .total-receipt-amount {
                background-color: #E4007C;
                color: white;
                padding: 18px;
                border-radius: 8px;
                text-align: center;
                margin-top: 25px;
            }
            .total-receipt-amount p {
                margin: 0;
                font-size: 1.5em;
                font-weight: 700;
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
                .section p { margin-bottom: 5px; }
                .payment-details-grid { gap: 10px; margin-top: 10px; }
                .payment-item { padding: 8px; }
                .total-receipt-amount { padding: 15px; margin-top: 20px; }
                .total-receipt-amount p { font-size: 1.3em; }
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

            <h1>Recibo de Pago</h1>

            <div class="section">
                <h2>Información del Cliente</h2>
                <p><span class="label">Cliente:</span> ${clientFullName}</p>
                <p><span class="label">Número de Contrato:</span> ${client.contract_number || 'N/A'}</p>
                <p><span class="label">Tour Asociado:</span> ${tourTitle}</p>
            </div>

            <div class="section">
                <h2>Detalles de los Pagos Recibidos</h2>
                <div class="payment-details-grid">
                    ${paymentsList}
                </div>
            </div>

            <div class="total-receipt-amount">
                <p><span class="label">Monto Total Recibido:</span> $${totalAmountPaidInReceipt.toFixed(2)}</p>
            </div>

            <div class="footer-info">
                <p>Gracias por tu preferencia. Este recibo es un comprobante de los pagos registrados.</p>
                <p>&copy; ${new Date().getFullYear()} ${agency?.agency_name || 'Tu Agencia de Viajes'}. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  console.log('Edge Function: generate-payment-receipt invoked.');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
  let paymentIds: string[];
  try {
    const requestBody = await req.json();
    clientId = requestBody.clientId;
    paymentIds = requestBody.paymentIds;
  } catch (parseError: any) {
    console.error('Edge Function: Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!clientId || !paymentIds || paymentIds.length === 0) {
      return jsonResponse({ error: 'Client ID and at least one Payment ID are required.' }, 400);
    }

    // Fetch client data
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`
        id,
        first_name,
        last_name,
        contract_number,
        tour_id
      `)
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Edge Function: Error fetching client for receipt:', clientError?.message || 'Client not found.');
      return jsonResponse({ error: 'Client not found or error fetching client data.' }, 404);
    }

    // Fetch tour data if tour_id exists
    let tour = null;
    if (client.tour_id) {
      const { data: fetchedTour, error: tourError } = await supabaseAdmin
        .from('tours')
        .select('title')
        .eq('id', client.tour_id)
        .single();
      if (tourError) {
        console.error('Edge Function: Error fetching tour for receipt:', tourError.message);
      } else {
        tour = fetchedTour;
      }
    }

    // Fetch selected payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('client_payments')
      .select('*')
      .in('id', paymentIds)
      .eq('client_id', clientId) // Ensure payments belong to this client
      .order('payment_date', { ascending: true });

    if (paymentsError || !payments || payments.length === 0) {
      console.error('Edge Function: Error fetching payments for receipt:', paymentsError?.message || 'No payments found for the given IDs.');
      return jsonResponse({ error: 'No payments found for the given IDs or client.' }, 404);
    }

    // Fetch agency settings
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agency_settings')
      .select('*')
      .single();

    if (agencyError && agencyError.code !== 'PGRST116') {
      console.error('Edge Function: Error fetching agency settings:', agencyError.message);
    }

    const htmlContent = generatePaymentReceiptHtml({
      client,
      tour,
      payments,
      agency,
    });

    return htmlResponse(htmlContent, 200);

  } catch (error: any) {
    console.error('Edge Function: Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});