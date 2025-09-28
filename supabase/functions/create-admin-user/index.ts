import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Edge Function: create-admin-user invoked.');

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
  // This client will be used for all operations that require bypassing RLS,
  // including checking the role of the invoking user.
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
    const { email, password, first_name, last_name, username, role } = await req.json();
    console.log('Edge Function: Received data for new user:', { email, first_name, last_name, username, role });

    if (!email || !password) {
      console.error('Edge Function: Missing email or password in request body.');
      return jsonResponse({ error: 'Missing email or password' }, 400);
    }

    // Check if user with this email already exists
    console.log('Edge Function: Checking for existing user by email...');
    const { data: existingUser, error: existingUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (existingUser && !existingUserError) {
      console.error('Edge Function: User with this email already exists:', email);
      return jsonResponse({ error: 'User with this email already exists.' }, 409); // Conflict
    }
    if (existingUserError && existingUserError.message !== 'User not found') {
      console.error('Edge Function: Error checking for existing user:', existingUserError.message);
      return jsonResponse({ error: 'Failed to check for existing user.' }, 500);
    }
    console.log('Edge Function: No existing user found with this email.');

    // Create user in Supabase Auth
    console.log('Edge Function: Creating user in Supabase Auth...');
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: { first_name, last_name },
    });

    if (createUserError) {
      console.error('Edge Function: Error creating user:', createUserError.message);
      return jsonResponse({ error: createUserError.message }, 400);
    }
    console.log('Edge Function: User created in Auth:', newUser.user?.id);

    // Update the profile with the specified role and username
    // The handle_new_user trigger will create a basic profile, so we update it.
    console.log('Edge Function: Updating user profile in public.profiles...');
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
      console.error('Edge Function: Error updating user profile:', updateProfileError.message);
      // Optionally delete the user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user?.id as string);
      return jsonResponse({ error: 'Failed to update user profile after creation.' }, 500);
    }
    console.log('Edge Function: User profile updated successfully.');

    return jsonResponse({ message: 'User created successfully', userId: newUser.user?.id }, 201);
  } catch (error: any) {
    console.error('Edge Function: Unexpected error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});