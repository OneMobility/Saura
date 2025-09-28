import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify JWT token to ensure request comes from an authenticated user (admin)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized: Missing Authorization header', {
      status: 401,
      headers: corsHeaders,
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !authUser) {
    console.error('Auth error:', authError);
    return new Response('Unauthorized: Invalid token or user not found', {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Check if the authenticated user is an admin
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error('Profile error or not admin:', profileError, profile?.role);
    return new Response('Forbidden: Only administrators can perform this action', {
      status: 403,
      headers: corsHeaders,
    });
  }

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

  try {
    const { email, password, first_name, last_name, username, role } = await req.json();

    if (!email || !password) {
      return new Response('Missing email or password', { status: 400, headers: corsHeaders });
    }

    // Create user in Supabase Auth
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: { first_name, last_name },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return new Response(JSON.stringify({ error: createUserError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the profile with the specified role and username
    // The handle_new_user trigger will create a basic profile, so we update it.
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        username: username || null,
        role: role || 'user', // Default to 'user' if not specified
      })
      .eq('id', newUser.user?.id);

    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError);
      // Optionally delete the user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user?.id as string);
      return new Response(JSON.stringify({ error: 'Failed to update user profile after creation.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'User created successfully', userId: newUser.user?.id }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});