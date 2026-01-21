"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';

const Login = () => {
  const navigate = useNavigate();
  const { session, isLoading, isAdmin } = useSession();

  useEffect(() => {
    if (!isLoading && session && isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [session, isLoading, isAdmin, navigate]);

  if (isLoading || (session && isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Acceso Administrador</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#91045A', // Nuevo color actualizado
                  brandAccent: '#700346', // Tono más oscuro para el hover
                },
              },
            },
          }}
          theme="light"
          redirectTo={window.location.origin + '/admin/dashboard'}
        />
      </div>
    </div>
  );
};

export default Login;