"use client";

import React from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getGreeting } from '@/utils/greetings';
import { Sun, CloudSun, Moon } from 'lucide-react';

interface AdminHeaderProps {
  pageTitle: string;
  children?: React.ReactNode; // Para acciones específicas de la página
}

const iconMap: { [key: string]: React.ElementType } = {
  Sun: Sun,
  CloudSun: CloudSun,
  Moon: Moon,
};

const AdminHeader: React.FC<AdminHeaderProps> = ({ pageTitle, children }) => {
  const { user, isAdmin, isLoading, firstName, lastName } = useSession(); // Get lastName
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const { greetingPart, namePart, icon: greetingIconName } = getGreeting(firstName, lastName); // Pass both firstName and lastName
  const GreetingIcon = iconMap[greetingIconName];

  return (
    <header className="bg-white shadow-sm p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2 text-gray-800">
          {GreetingIcon && <GreetingIcon className="h-6 w-6 text-rosa-mexicano" />}
          <span className="text-xl font-bold">
            {greetingPart}, <span className="text-rosa-mexicano">{namePart}</span>
          </span>
        </div>
        <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white">
          Cerrar Sesión
        </Button>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
        {children} {/* Renderiza las acciones específicas de la página aquí */}
      </div>
    </header>
  );
};

export default AdminHeader;