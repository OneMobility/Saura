import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type', // No auth header for public function
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('Edge Function: get-public-client-payments invoked.');

  if (req.method === 'OPTIONS') {
    console.log('Edge Function: OPTIONS request received. Responding with 200 OK and CORS headers.');
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  let contractNumber: string;
  try {
    const requestBody = await req.json();
    contractNumber = requestBody.contractNumber;
    console.log('Edge Function: Parsed contractNumber from body:', contractNumber);
  } catch (parseError: any) {
    console.error('Edge Function: Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!contractNumber || typeof contractNumber !== 'string' || contractNumber.trim() === '') {
      console.error('Edge Function: Contract number is missing, not a string, or empty.');
      return jsonResponse({ error: 'Contract number is required.' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // First, find the client_id using the contract_number
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('contract_number', contractNumber.trim())
      .single();

    if (clientError || !clientData) {
      console.error('Edge Function: Client not found for contract number:', contractNumber, clientError?.message);
      return jsonResponse({ error: 'Contract number not found.' }, 404);
    }

    const clientId = clientData.id;
    console.log('Edge Function: Found client ID:', clientId, 'for contract number:', contractNumber);

    // Then, fetch payments for that client_id
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('client_payments')
      .select('*')
      .eq('client_id', clientId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Edge Function: Error fetching client payments:', paymentsError.message);
      return jsonResponse({ error: 'Error fetching client payments.' }, 500);
    }

    console.log('Edge Function: Payments fetched successfully for client ID:', clientId);
    return jsonResponse({ payments }, 200);

  } catch (error: any) {
    console.error('Edge Function: Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});