import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Edge Function: list-admin-users invoked.');

  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Edge Function: OPTIONS request received.');
    return new Response(null, { headers: corsHeaders });
  }

  // Helper function to standardize JSON error responses
  const jsonResponse = (body: any, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  // Verify JWT token to ensure request comes from an authenticated user (admin)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('Edge Function: Unauthorized: Missing Authorization header.');
    return jsonResponse({ error: 'Unauthorized: Missing Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Initialize Supabase client with service role key for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );
  console.log('Edge Function: Supabase admin client initialized.');

  console.log('Edge Function: Verifying user token with admin client...');
  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authUser) {
    console.error('Edge Function: Auth error:', authError?.message || 'User not found.');
    return jsonResponse({ error: 'Unauthorized: Invalid token or user not found' }, 401);
  }
  console.log('Edge Function: User authenticated:', authUser.id);

  // Check if the authenticated user is an admin using the supabaseAdmin client
  console.log('Edge Function: Checking invoking user role with admin client...');
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error('Edge Function: Profile error or not admin. Profile error:', profileError?.message, 'User role:', profile?.role);
    return jsonResponse({ error: 'Forbidden: Only administrators can perform this action' }, 403);
  }
  console.log('Edge Function: Invoking user is an administrator.');

  try {
    // Fetch users from auth.users
    console.log('Edge Function: Fetching users from auth.admin.listUsers()...');
    const { data: authUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();

    if (listUsersError) {
      console.error('Edge Function: Error listing auth users:', listUsersError.message);
      return jsonResponse({ error: 'Failed to list authentication users.' }, 500);
    }
    console.log(`Edge Function: Found ${authUsers.users.length} auth users.`);

    // Fetch profiles from public.profiles
    console.log('Edge Function: Fetching user profiles from public.profiles...');
    // Removed 'created_at' from select as it's not in public.profiles, using authUser.created_at instead.
    const { data: profiles, error: fetchProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, username, role'); 

    if (fetchProfilesError) {
      console.error('Edge Function: Error fetching user profiles:', fetchProfilesError.message);
      return jsonResponse({ error: 'Failed to fetch user profiles.' }, 500);
    }
    console.log(`Edge Function: Found ${profiles?.length || 0} profiles.`);

    // Merge auth user data with profile data
    const mergedUsers = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email || 'N/A',
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        username: profile?.username || null,
        role: profile?.role || 'user',
        created_at: authUser.created_at, // Use created_at from auth.users
      };
    });

    console.log('Edge Function: Successfully merged user data.');
    return jsonResponse({ users: mergedUsers }, 200);

  } catch (error: any) {
    console.error('Edge Function: Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});