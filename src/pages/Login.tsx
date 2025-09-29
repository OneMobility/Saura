"use client";

import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';

const Login = () => {
  const navigate = useNavigate();
  const { session, isLoading, isAdmin } = useSession(); // También obtenemos isAdmin aquí

  useEffect(() => {
    console.log('Login Page useEffect: isLoading:', isLoading, 'Session:', session, 'isAdmin:', isAdmin);
    // Si ya está logueado y no está cargando, y es admin, redirigir al dashboard
    if (!isLoading && session && isAdmin) {
      console.log('Login Page: User is authenticated and is admin, redirecting to /admin/dashboard.');
      navigate('/admin/dashboard');
    } else if (!isLoading && session && !isAdmin) {
      // Si está logueado pero NO es admin, redirigir a la página de inicio
      console.log('Login Page: User is authenticated but NOT admin, redirecting to /.');
      navigate('/');
    }
  }, [session, isLoading, isAdmin, navigate]); // Dependencias del useEffect

  // No renderizar el formulario de login si ya estamos redirigiendo o si está cargando
  if (isLoading || (session && isAdmin)) { // Si está cargando o ya está logueado como admin, no mostrar el formulario
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