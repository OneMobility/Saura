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

    // Calculate number of nights for the tour
    const numNightsTour = differenceInDays(returnDate, departureDate);
    console.log(`[find-cheapest-hotel-quote] Calculated nights for tour: ${numNightsTour}`);

    if (numNightsTour <= 0) {
        return jsonResponse({ error: 'Number of nights must be greater than zero.' }, 400);
    }

    // Fetch all active hotel quotes, including room counts and costs
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, location, num_nights_quoted, cost_per_night_double, cost_per_night_triple, cost_per_night_quad, num_double_rooms, num_triple_rooms, num_quad_rooms, num_courtesy_rooms, quoted_date');

    if (quotesError) {
      console.error('[find-cheapest-hotel-quote] Error fetching hotel quotes:', quotesError.message);
      return jsonResponse({ error: 'Error fetching hotel quotes.' }, 500);
    }

    let cheapestQuote = null;
    let minEstimatedTotalCost = Infinity;

    for (const quote of quotes) {
      const numNightsQuote = quote.num_nights_quoted || 1;
      
      // 1. Calculate the total contracted cost for the quote (before adjusting for tour duration)
      const costDouble = (quote.num_double_rooms || 0) * quote.cost_per_night_double * numNightsQuote;
      const costTriple = (quote.num_triple_rooms || 0) * quote.cost_per_night_triple * numNightsQuote;
      const costQuad = (quote.num_quad_rooms || 0) * quote.cost_per_night_quad * numNightsQuote;
      const costCourtesy = (quote.num_courtesy_rooms || 0) * quote.cost_per_night_quad * numNightsQuote;
      
      const totalQuoteCost = (costDouble + costTriple + costQuad) - costCourtesy;

      if (totalQuoteCost <= 0) continue; // Skip quotes with zero or negative cost

      // 2. Calculate the average cost per night for the entire contracted quote
      const averageCostPerNightQuote = totalQuoteCost / numNightsQuote;

      // 3. Estimate the total cost if this quote were applied to the tour's duration
      const estimatedTotalCost = averageCostPerNightQuote * numNightsTour;

      if (estimatedTotalCost < minEstimatedTotalCost) {
        minEstimatedTotalCost = estimatedTotalCost;
        cheapestQuote = {
          id: quote.id,
          name: quote.name,
          location: quote.location,
          estimated_total_cost: estimatedTotalCost,
          num_nights_tour: numNightsTour,
          quoted_date: quote.quoted_date,
        };
      }
    }

    if (!cheapestQuote) {
      return jsonResponse({ error: 'No active hotel quotes found with positive cost.' }, 404);
    }

    return jsonResponse({ cheapestQuote }, 200);

  } catch (error: any) {
    console.error('[find-cheapest-hotel-quote] Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});