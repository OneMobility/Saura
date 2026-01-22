"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getGreeting } from '@/utils/greetings';
import { Sun, CloudSun, Moon, Bell, Mail, UserPlus, ArrowRight, Circle, Check, Package, MessageSquareText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminHeaderProps {
  pageTitle: string;
  children?: React.ReactNode;
}

const iconMap: { [key: string]: React.ElementType } = { 
  Sun, 
  CloudSun, 
  Moon 
};

const AdminHeader: React.FC<AdminHeaderProps> = ({ pageTitle, children }) => {
  const { firstName, lastName } = useSession();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [unreadClients, setUnreadClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    // Fetch Unread Messages (Formularios)
    const { data: messages } = await supabase
      .from('contact_messages')
      .select('id, name, created_at, status')
      .eq('status', 'unread')
      .order('created_at', { ascending: false });
    setUnreadMessages(messages || []);

    // Fetch Unread Clients (Reservas)
    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name, contract_number, created_at, is_read')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    setUnreadClients(clients || []);
  };

  useEffect(() => {
    fetchNotifications();
    
    const channel = supabase.channel('admin-notifs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchNotifications())
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    navigate('/login'); 
  };

  const markMessageAsRead = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { error } = await supabase.from('contact_messages').update({ status: 'read' }).eq('id', id);
    if (!error) {
      setUnreadMessages(prev => prev.filter(m => m.id !== id));
      toast.success("Mensaje marcado como leído");
    }
  };

  const markClientAsRead = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { error } = await supabase.from('clients').update({ is_read: true }).eq('id', id);
    if (!error) {
      setUnreadClients(prev => prev.filter(c => c.id !== id));
      toast.success("Reserva marcada como vista");
    }
  };

  const { greetingPart, namePart, icon: greetingIconName } = getGreeting(firstName, lastName);
  const GreetingIcon = iconMap[greetingIconName] || Sun;
  const totalNotifs = unreadMessages.length + unreadClients.length;

  return (
    <header className="bg-white shadow-sm p-4 sticky top-0 z-40">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2 text-gray-800">
          <GreetingIcon className="h-6 w-6 text-rosa-mexicano" />
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
              <div className="bg-gray-900 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 text-rosa-mexicano" /> Centro de Avisos
                </h3>
                <Badge className="bg-rosa-mexicano text-[10px] font-black">{totalNotifs} Pendientes</Badge>
              </div>
              
              <div className="max-h-[450px] overflow-auto bg-gray-50">
                {/* SECCIÓN RESERVAS */}
                <div className="p-2 bg-gray-100/50 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b flex items-center gap-1.5">
                  <Package className="h-3 w-3" /> Reservas ({unreadClients.length})
                </div>
                {unreadClients.length > 0 ? unreadClients.map(c => (
                  <div key={c.id} className="group relative flex items-center gap-3 p-4 bg-white hover:bg-rosa-mexicano/5 border-b transition-colors">
                    <div className="bg-blue-50 p-2 rounded-full text-blue-600 shrink-0">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <Link to={`/admin/clients/edit/${c.id}`} className="flex-grow min-w-0">
                      <p className="text-xs font-black truncate">Reserva: {c.contract_number}</p>
                      <p className="text-[10px] text-gray-500 truncate">{c.first_name} {c.last_name}</p>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => markClientAsRead(e, c.id)}
                      className="h-8 w-8 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )) : (
                  <div className="p-4 text-center text-[10px] text-gray-400 italic">Sin reservas nuevas</div>
                )}

                {/* SECCIÓN FORMULARIOS */}
                <div className="p-2 bg-gray-100/50 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-t flex items-center gap-1.5">
                  <MessageSquareText className="h-3 w-3" /> Formularios ({unreadMessages.length})
                </div>
                {unreadMessages.length > 0 ? unreadMessages.map(m => (
                  <div key={m.id} className="group relative flex items-center gap-3 p-4 bg-white hover:bg-rosa-mexicano/5 border-b transition-colors">
                    <div className="bg-rosa-mexicano/10 p-2 rounded-full text-rosa-mexicano shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Link to={`/admin/contacto`} className="flex-grow min-w-0">
                      <p className="text-xs font-black truncate">{m.name}</p>
                      <p className="text-[10px] text-gray-500">Nuevo mensaje de contacto</p>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => markMessageAsRead(e, m.id)}
                      className="h-8 w-8 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )) : (
                  <div className="p-4 text-center text-[10px] text-gray-400 italic">Sin mensajes nuevos</div>
                )}
                
                {totalNotifs === 0 && (
                  <div className="p-10 text-center text-gray-400">
                    <Circle className="h-10 w-10 mx-auto mb-2 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-tighter">Todo al día</p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">
            Cerrar Sesión
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">{pageTitle}</h1>
        <div className="flex gap-2">
          {children}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;