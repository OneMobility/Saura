import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { differenceInDays, parseISO } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('[find-cheapest-hotel-quote] Edge Function invoked.');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('[find-cheapest-hotel-quote] Unauthorized: Missing Authorization header.');
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
    console.error('[find-cheapest-hotel-quote] Auth error:', authError?.message || 'User not found.');
    return jsonResponse({ error: 'Unauthorized: Invalid token or user not found' }, 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error('[find-cheapest-hotel-quote] Profile error or not admin. User role:', profile?.role);
    return jsonResponse({ error: 'Forbidden: Only administrators can perform this action' }, 403);
  }

  let departureDateStr: string;
  let returnDateStr: string;
  try {
    const requestBody = await req.json();
    departureDateStr = requestBody.departureDate;
    returnDateStr = requestBody.returnDate;
  } catch (parseError: any) {
    console.error('[find-cheapest-hotel-quote] Error parsing JSON body:', parseError.message);
    return jsonResponse({ error: `Invalid JSON in request body: ${parseError.message}` }, 400);
  }

  try {
    if (!departureDateStr || !returnDateStr) {
      return jsonResponse({ error: 'Departure and return dates are required.' }, 400);
    }

    const departureDate = parseISO(departureDateStr);
    const returnDate = parseISO(returnDateStr);

    if (departureDate >= returnDate) {
      return jsonResponse({ error: 'Return date must be after departure date.' }, 400);
    }

    // Calculate number of nights (return date - departure date)
    const numNights = differenceInDays(returnDate, departureDate);
    console.log(`[find-cheapest-hotel-quote] Calculated nights: ${numNights}`);

    if (numNights <= 0) {
        return jsonResponse({ error: 'Number of nights must be greater than zero.' }, 400);
    }

    // Fetch all active hotel quotes
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, location, cost_per_night_double, num_nights_quoted, num_double_rooms, num_courtesy_rooms, total_paid')
      .eq('is_active', true);

    if (quotesError) {
      console.error('[find-cheapest-hotel-quote] Error fetching hotel quotes:', quotesError.message);
      return jsonResponse({ error: 'Error fetching hotel quotes.' }, 500);
    }

    let cheapestQuote = null;
    let minTotalCost = Infinity;

    for (const quote of quotes) {
      // Calculate the total cost for a single double room for the required number of nights
      // We use the cost_per_night_double from the quote, assuming the quote's num_nights_quoted is the basis for that price.
      // If the quote's num_nights_quoted is different from the tour's numNights, we need to adjust the cost.
      
      // Calculate cost per night (based on the quote's duration)
      const quoteCostPerNight = quote.cost_per_night_double / (quote.num_nights_quoted || 1);
      
      // Calculate the estimated total cost for the tour's duration
      const estimatedTotalCost = quoteCostPerNight * numNights;

      if (estimatedTotalCost < minTotalCost) {
        minTotalCost = estimatedTotalCost;
        cheapestQuote = {
          id: quote.id,
          name: quote.name,
          location: quote.location,
          estimated_total_cost: estimatedTotalCost,
          cost_per_night_double: quote.cost_per_night_double,
          num_nights_quoted: quote.num_nights_quoted,
          num_nights_tour: numNights,
        };
      }
    }

    if (!cheapestQuote) {
      return jsonResponse({ error: 'No active hotel quotes found.' }, 404);
    }

    return jsonResponse({ cheapestQuote }, 200);

  } catch (error: any) {
    console.error('[find-cheapest-hotel-quote] Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});