"use client";

import React from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AdminSidebar from '@/components/AdminSidebar';
import { getGreeting } from '@/utils/greetings'; // Import getGreeting
import { Sun, CloudSun, Moon } from 'lucide-react'; // Import icons

const iconMap: { [key: string]: React.ElementType } = {
  Sun: Sun,
  CloudSun: CloudSun,
  Moon: Moon,
};

const AdminDashboard = () => {
  const { user, isAdmin, isLoading, firstName } = useSession(); // Get firstName again
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
    navigate('/login');
    return null;
  }

  const { text: personalizedGreetingText, icon: greetingIconName } = getGreeting(firstName);
  const GreetingIcon = iconMap[greetingIconName];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex flex-col flex-grow">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          {user && (
            <div className="flex items-center space-x-2 text-gray-700">
              {GreetingIcon && <GreetingIcon className="h-5 w-5 text-rosa-mexicano" />}
              <span className="font-medium">{personalizedGreetingText}</span>
            </div>
          )}
          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
            Cerrar Sesión
          </Button>
        </header>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 px-4 pt-8 pb-4">Dashboard de Administración</h1>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <p className="text-lg text-gray-600 text-center mb-10">
            Aquí puedes gestionar el contenido de tu sitio.
          </p>
          <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Gestión de Contenido</h2>
            <p className="text-gray-700">
              En esta sección podrás añadir, editar o eliminar tours, entradas de blog y gestionar las opiniones de los clientes.
            </p>
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;