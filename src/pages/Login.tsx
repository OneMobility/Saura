"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession

const Login = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useSession(); // Use useSession to check if already logged in

  // If already logged in and not loading, redirect to admin dashboard
  if (!isLoading && session) {
    navigate('/admin/dashboard');
    return null; // Prevent rendering login form
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Acceso Administrador</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers for admin login unless specified
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#E4007C', // Rosa Mexicano
                  brandAccent: '#C00066', // Un tono más oscuro para el hover
                },
              },
            },
          }}
          theme="light"
          redirectTo={window.location.origin + '/admin/dashboard'} // Redirect after successful login
        />
      </div>
    </div>
  );
};

export default Login;