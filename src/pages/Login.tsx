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
    // Si ya está logueado y no está cargando, y es admin, redirigir al dashboard
    if (!isLoading && session && isAdmin) {
      navigate('/admin/dashboard');
    }
    // Si un usuario no admin está logueado y llega a /login, simplemente verá el formulario.
    // Si intenta acceder a una ruta /admin, ProtectedRoute lo redirigirá.
  }, [session, isLoading, isAdmin, navigate]);

  // No renderizar el formulario de login si ya estamos redirigiendo o si está cargando
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
          redirectTo={window.location.origin + '/admin/dashboard'} // Redirigir después de un login exitoso
        />
      </div>
    </div>
  );
};

export default Login;