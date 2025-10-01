import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('Edge Function: list-provider-payments invoked.');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  let providerId: string;
  try {
    const requestBody = await req.json();
    providerId = requestBody.providerId;
  } catch (parseError: any) {
    console.error('Edge Function: Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!providerId || typeof providerId !== 'string' || providerId.trim() === '') {
      console.error('Edge Function: Provider ID is missing, not a string, or empty.');
      return jsonResponse({ error: 'Provider ID is required and must be a non-empty string.' }, 400);
    }

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('provider_payments')
      .select('*')
      .eq('provider_id', providerId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Edge Function: Error fetching provider payments:', paymentsError.message);
      return jsonResponse({ error: 'Error fetching provider payments.' }, 500);
    }

    return jsonResponse({ payments }, 200);

  } catch (error: any) {
    console.error('Edge Function: Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});