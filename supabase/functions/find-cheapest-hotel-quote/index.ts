import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { differenceInDays, parseISO, isSameDay, isAfter, isBefore, isEqual } from 'https://esm.sh/date-fns@2.30.0';

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
    // If tour starts on day 1 and returns on day 5, that's 4 nights (1->2, 2->3, 3->4, 4->5)
    const numNightsTour = differenceInDays(returnDate, departureDate);
    console.log(`[find-cheapest-hotel-quote] Calculated nights for tour: ${numNightsTour}`);

    if (numNightsTour <= 0) {
        return jsonResponse({ error: 'Number of nights must be greater than zero.' }, 400);
    }

    // Fetch all active hotel quotes, including room counts and costs
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, location, num_nights_quoted, cost_per_night_double, cost_per_night_triple, cost_per_night_quad, num_double_rooms, num_triple_rooms, num_quad_rooms, num_courtesy_rooms, quoted_date, quote_end_date');

    if (quotesError) {
      console.error('[find-cheapest-hotel-quote] Error fetching hotel quotes:', quotesError.message);
      return jsonResponse({ error: 'Error fetching hotel quotes.' }, 500);
    }

    let relevantQuotes: any[] = [];

    for (const quote of quotes) {
      // --- Date Matching Logic ---
      if (!quote.quoted_date || !quote.quote_end_date) {
        console.log(`[find-cheapest-hotel-quote] Skipping quote ${quote.id}: Missing quoted_date or quote_end_date.`);
        continue;
      }

      const quoteStartDate = parseISO(quote.quoted_date);
      const quoteEndDate = parseISO(quote.quote_end_date);
      const numNightsQuote = quote.num_nights_quoted || 1;

      // The quote must cover the exact number of nights of the tour
      if (numNightsQuote !== numNightsTour) {
        console.log(`[find-cheapest-hotel-quote] Skipping quote ${quote.id}: Night count mismatch (${numNightsQuote} vs ${numNightsTour}).`);
        continue;
      }

      // The quote must start on or before the tour departure date AND end on or after the tour return date.
      // Since we require exact night match, we only need to check if the tour dates fall within the quote's effective period.
      // Given the current schema, we assume the quote is valid for the period [quoted_date, quote_end_date).
      // If the quote is for a specific period, we check if the tour dates are covered.
      
      // For simplicity and based on the user request (e.g., tour 1-5, hotel 2-5), we assume the hotel quote
      // is relevant if the tour's stay period is covered by the quote's effective period.
      // Let's assume the hotel stay starts the day *after* departure and ends on the return date.
      // Tour: Departure 1, Return 5 (4 nights). Hotel Stay: Start 2, End 5 (3 nights).
      
      // Let's stick to the simplest interpretation: the quote must cover the exact number of nights,
      // and the quote's start date must match the tour's departure date (or the day after, depending on check-in logic).
      
      // Since the user example is: Tour 1-5, Hotel 2-5. This means the hotel stay is 3 nights.
      // Let's assume the hotel quote is for the *duration of the stay*.
      
      // If the tour is 4 nights (1-5), the hotel stay is usually 3 nights (2-5).
      const hotelStayNights = numNightsTour - 1;
      
      if (numNightsQuote !== hotelStayNights) {
          console.log(`[find-cheapest-hotel-quote] Skipping quote ${quote.id}: Hotel stay night count mismatch (${numNightsQuote} vs ${hotelStayNights}).`);
          continue;
      }

      // Hotel stay starts the day after tour departure
      const hotelStayStartDate = addDays(departureDate, 1);
      
      // Check if the quote starts on the day after tour departure
      const isDateMatch = isEqual(hotelStayStartDate, quoteStartDate);

      if (!isDateMatch) {
        console.log(`[find-cheapest-hotel-quote] Skipping quote ${quote.id}: Quote start date mismatch.`);
        continue;
      }
      
      // --- End Date Matching Logic ---

      // 1. Calculate the total contracted cost for the quote
      const costDouble = (quote.num_double_rooms || 0) * quote.cost_per_night_double * numNightsQuote;
      const costTriple = (quote.num_triple_rooms || 0) * quote.cost_per_night_triple * numNightsQuote;
      const costQuad = (quote.num_quad_rooms || 0) * quote.cost_per_night_quad * numNightsQuote;
      const costCourtesy = (quote.num_courtesy_rooms || 0) * quote.cost_per_night_quad * numNightsQuote;
      
      const totalQuoteCost = (costDouble + costTriple + costQuad) - costCourtesy;

      if (totalQuoteCost <= 0) continue;

      // 2. Calculate the average cost per night for the entire contracted quote
      const averageCostPerNightQuote = totalQuoteCost / numNightsQuote;

      // 3. Estimate the total cost if this quote were applied to the tour's duration
      // Since we matched the nights, the estimated cost is the total quote cost.
      const estimatedTotalCost = totalQuoteCost;

      relevantQuotes.push({
        id: quote.id,
        name: quote.name,
        location: quote.location,
        estimated_total_cost: estimatedTotalCost,
        num_nights_tour: numNightsTour,
        quoted_date: quote.quoted_date,
      });
    }
    
    // Sort by estimated total cost (lowest to highest)
    relevantQuotes.sort((a, b) => a.estimated_total_cost - b.estimated_total_cost);

    if (relevantQuotes.length === 0) {
      return jsonResponse({ error: `No active hotel quotes found matching the tour dates (${numNightsTour} noches).` }, 404);
    }

    // Return the cheapest one
    const cheapestQuote = relevantQuotes[0];

    return jsonResponse({ cheapestQuote }, 200);

  } catch (error: any) {
    console.error('[find-cheapest-hotel-quote] Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});