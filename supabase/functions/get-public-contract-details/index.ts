import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const { contractNumber } = await req.json();
    if (!contractNumber) {
      return jsonResponse({ error: 'Contract number is required.' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`
        id, first_name, last_name, email, phone, address, contract_number,
        identification_number, number_of_people, companions, total_amount,
        advance_payment, total_paid, status, contractor_age, room_details,
        tour_id, bus_route_id,
        tours (title, description, image_url),
        bus_routes (name, all_stops)
      `)
      .ilike('contract_number', contractNumber.trim())
      .single();

    if (clientError || !clientData) {
      return jsonResponse({ error: 'Número de contrato no encontrado.' }, 404);
    }

    let tourTitle = 'N/A';
    let tourDescription = 'N/A';
    let tourImageUrl = 'https://via.placeholder.com/400x200?text=Imagen+No+Disponible';
    let assignedSeats: number[] = [];
    let companionsList: any[] = [];
    let roomDetailsForClient = clientData.room_details || { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };

    const { data: destinationsData, error: destinationsError } = await supabaseAdmin
      .from('bus_destinations')
      .select('id, name');
    if (destinationsError) throw destinationsError;
    const destinationMap = new Map(destinationsData.map(d => [d.id, d.name]));

    if (clientData.tour_id && clientData.tours) {
      tourTitle = clientData.tours.title || 'N/A';
      tourDescription = clientData.tours.description || 'N/A';
      tourImageUrl = clientData.tours.image_url || tourImageUrl;
      const { data: seatAssignments } = await supabaseAdmin.from('tour_seat_assignments').select('seat_number').eq('client_id', clientData.id);
      assignedSeats = seatAssignments?.map(s => s.seat_number).sort((a, b) => a - b) || [];
      companionsList = (clientData.companions || []).map((c: any) => ({ ...c, is_contractor: false, seat_number: 0 }));
    } else if (clientData.bus_route_id && clientData.bus_routes) {
      tourTitle = `Ruta de Autobús: ${clientData.bus_routes.name || 'N/A'}`;
      tourDescription = `Viaje de ${destinationMap.get(clientData.bus_routes.all_stops[0]) || 'N/A'} a ${destinationMap.get(clientData.bus_routes.all_stops[clientData.bus_routes.all_stops.length - 1]) || 'N/A'}`;
      tourImageUrl = 'https://images.unsplash.com/photo-1544620347-c4fd4a8d462c?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
      const { data: busPassengersData } = await supabaseAdmin.from('bus_passengers').select('*').eq('client_id', clientData.id).order('seat_number', { ascending: true });
      companionsList = busPassengersData || [];
      assignedSeats = companionsList.map(p => p.seat_number).sort((a, b) => a - b);
      roomDetailsForClient = { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };
    }

    const { data: paymentsHistory } = await supabaseAdmin.from('client_payments').select('*').eq('client_id', clientData.id).order('payment_date', { ascending: false });

    const contractDetails = {
      ...clientData,
      tour_title: tourTitle,
      tour_description: tourDescription,
      tour_image_url: tourImageUrl,
      companions: companionsList,
      room_details: roomDetailsForClient,
      assigned_seat_numbers: assignedSeats,
      payments_history: paymentsHistory || [],
    };

    return jsonResponse({ contractDetails }, 200);

  } catch (error: any) {
    console.error('Edge Function: Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});