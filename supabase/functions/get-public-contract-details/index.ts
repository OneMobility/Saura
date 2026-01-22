import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const { contractNumber } = await req.json();
    if (!contractNumber) return jsonResponse({ error: 'Contract number required.' }, 400);

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        tours (title, description, image_url, departure_date, return_date, departure_time, return_time),
        bus_routes (name, all_stops)
      `)
      .ilike('contract_number', contractNumber.trim())
      .single();

    if (error || !client) return jsonResponse({ error: 'Número no encontrado.' }, 404);

    const { data: seatAssignments } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', client.id);
    const { data: payments } = await supabaseAdmin.from('client_payments').select('*').eq('client_id', client.id).order('payment_date', { ascending: false });

    return jsonResponse({ 
      contractDetails: {
        ...client,
        tour_title: client.tours?.title || client.bus_routes?.name || 'N/A',
        tour_description: client.tours?.description || 'N/A',
        assigned_seat_numbers: seatAssignments?.map(s => s.seat_number).sort((a, b) => a - b) || [],
        payments_history: payments || [],
        cancel_reason: client.cancel_reason // NUEVO
      } 
    }, 200);

  } catch (error: any) {
    return jsonResponse({ error: error.message }, 500);
  }
});