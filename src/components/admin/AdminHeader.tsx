"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getGreeting } from '@/utils/greetings';
import { Sun, CloudSun, Moon, Bell, Mail, UserPlus, ArrowRight, Circle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface AdminHeaderProps {
  pageTitle: string;
  children?: React.ReactNode;
}

const iconMap: { [key: string]: React.ElementType } = { Sun, CloudSun, Moon };

const AdminHeader: React.FC<AdminHeaderProps> = ({ pageTitle, children }) => {
  const { firstName, lastName } = useSession();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { count } = await supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread');
      setUnreadMessages(count || 0);

      const { data } = await supabase.from('clients').select('id, first_name, last_name, contract_number').order('created_at', { ascending: false }).limit(3);
      setRecentClients(data || []);
    };
    fetchNotifications();
    
    // Suscripción en tiempo real (opcional pero recomendado)
    const channel = supabase.channel('admin-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, () => fetchNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  const { greetingPart, namePart, icon: greetingIconName } = getGreeting(firstName, lastName);
  const GreetingIcon = iconMap[greetingIconName];

  const totalNotifs = unreadMessages + recentClients.length;

  return (
    <header className="bg-white shadow-sm p-4 sticky top-0 z-40">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2 text-gray-800">
          {GreetingIcon && <GreetingIcon className="h-6 w-6 text-rosa-mexicano" />}
          <span className="text-xl font-bold">
            {greetingPart}, <span className="text-rosa-mexicano">{namePart}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:bg-rosa-mexicano/5">
                <Bell className="h-6 w-6 text-gray-600" />
                {totalNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rosa-mexicano text-[10px] font-bold text-white border-2 border-white">
                    {totalNotifs}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-none overflow-hidden" align="end">
              <div className="bg-gray-900 p-4 text-white">
                <h3 className="font-bold flex items-center gap-2"><Bell className="h-4 w-4 text-rosa-mexicano" /> Notificaciones</h3>
              </div>
              <div className="max-h-[400px] overflow-auto">
                {unreadMessages > 0 && (
                  <Link to="/admin/contacto" className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b transition-colors group">
                    <div className="bg-rosa-mexicano/10 p-2 rounded-full text-rosa-mexicano"><Mail className="h-4 w-4" /></div>
                    <div className="flex-grow">
                      <p className="text-sm font-bold">Mensajes sin leer</p>
                      <p className="text-xs text-gray-500">Tienes {unreadMessages} mensajes nuevos esperando respuesta.</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-rosa-mexicano" />
                  </Link>
                )}
                {recentClients.map(c => (
                  <Link key={c.id} to={`/admin/clients/edit/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b transition-colors group">
                    <div className="bg-blue-50 p-2 rounded-full text-blue-600"><UserPlus className="h-4 w-4" /></div>
                    <div className="flex-grow">
                      <p className="text-sm font-bold">Nueva Reserva: {c.contract_number}</p>
                      <p className="text-xs text-gray-500">{c.first_name} {c.last_name}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600" />
                  </Link>
                )}
                {totalNotifs === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <Circle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Todo al día por aquí.</p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">Cerrar Sesión</Button>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">{pageTitle}</h1>
        <div className="flex gap-2">{children}</div>
      </div>
    </header>
  );
};

export default AdminHeader;