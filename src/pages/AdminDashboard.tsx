"use client";

import React from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

const AdminDashboard = () => {
  const { user, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Cargando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    // This redirect is also handled by SessionContextProvider, but good to have a fallback
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100"> {/* Added bg-gray-100 for consistent background */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
        <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
          Cerrar Sesión
        </Button>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <p className="text-lg text-gray-600 text-center mb-10">
          Bienvenido, {user.email}. Aquí puedes gestionar el contenido de tu sitio.
        </p>
        {/* Aquí iría el contenido específico del panel de administración */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Gestión de Contenido</h2>
          <p className="text-gray-700">
            En esta sección podrás añadir, editar o eliminar tours, entradas de blog y gestionar las opiniones de los clientes.
          </p>
          {/* Añadir más componentes de administración aquí */}
        </div>
      </main>
      <footer className="bg-gray-800 text-white py-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;