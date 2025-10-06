import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log('Edge Function: validate-bus-ticket invoked.');

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

  try {
    const { action, qrData, passengerId, newStatus } = await req.json();

    if (action === 'get_passenger_details') {
      if (!qrData) {
        return jsonResponse({ error: 'QR data is required.' }, 400);
      }
      const [pId, sId, seatNum] = qrData.split('_');

      if (!pId || !sId || !seatNum) {
        return jsonResponse({ error: 'Invalid QR data format.' }, 400);
      }

      const { data: passenger, error: passengerError } = await supabaseAdmin
        .from('bus_passengers')
        .select(`
          *,
          clients ( contract_number, first_name, last_name, email, phone ),
          bus_schedules ( departure_time, effective_date_start, bus_routes ( name, all_stops ) )
        `)
        .eq('id', pId)
        .eq('schedule_id', sId)
        .eq('seat_number', parseInt(seatNum, 10))
        .single();

      if (passengerError || !passenger) {
        console.error('Error fetching passenger details:', passengerError?.message);
        return jsonResponse({ error: 'Passenger not found or invalid ticket.' }, 404);
      }

      // Fetch destinations to map route stops
      const { data: destinationsData, error: destinationsError } = await supabaseAdmin
        .from('bus_destinations')
        .select('id, name');
      if (destinationsError) throw destinationsError;
      const destinationMap = new Map(destinationsData.map(d => [d.id, d.name]));

      const routeStops = passenger.bus_schedules?.bus_routes?.all_stops || [];
      const originName = destinationMap.get(routeStops[0]) || 'N/A';
      const destinationName = destinationMap.get(routeStops[routeStops.length - 1]) || 'N/A';

      return jsonResponse({
        passenger: {
          id: passenger.id,
          first_name: passenger.first_name,
          last_name: passenger.last_name,
          age: passenger.age,
          seat_number: passenger.seat_number,
          boarding_status: passenger.boarding_status,
          contract_number: passenger.clients?.contract_number,
          route_name: passenger.bus_schedules?.bus_routes?.name,
          origin_name: originName,
          destination_name: destinationName,
          departure_time: passenger.bus_schedules?.departure_time,
          schedule_date: passenger.bus_schedules?.effective_date_start,
        }
      }, 200);

    } else if (action === 'update_boarding_status') {
      if (!passengerId || !newStatus) {
        return jsonResponse({ error: 'Passenger ID and new status are required.' }, 400);
      }

      const { data, error: updateError } = await supabaseAdmin
        .from('bus_passengers')
        .update({ boarding_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', passengerId)
        .select()
        .single();

      if (updateError || !data) {
        console.error('Error updating boarding status:', updateError?.message);
        return jsonResponse({ error: 'Failed to update boarding status.' }, 500);
      }

      return jsonResponse({ message: 'Boarding status updated successfully.', passenger: data }, 200);
    } else {
      return jsonResponse({ error: 'Invalid action specified.' }, 400);
    }
  } catch (error: any) {
    console.error('Edge Function: Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});