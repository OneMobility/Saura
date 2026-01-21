"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, Mail, Bus, TreePalm, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  source: 'tours' | 'bus';
  status: 'unread' | 'read' | 'archived';
  created_at: string;
}

const AdminContactMessagesPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchMessages();
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error al cargar los mensajes de contacto.');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'unread' ? 'read' : 'unread';
    const { error } = await supabase
      .from('contact_messages')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('Error al actualizar el estado.');
    } else {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
    }
  };

  const deleteMessage = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;
    
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar el mensaje.');
    } else {
      toast.success('Mensaje eliminado.');
      setMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Mensajes de Contacto" />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay mensajes de contacto aún.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((m) => (
                    <TableRow key={m.id} className={cn(m.status === 'unread' && "bg-rosa-mexicano/5")}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleStatus(m.id, m.status)}
                          title={m.status === 'unread' ? "Marcar como leído" : "Marcar como no leído"}
                        >
                          {m.status === 'unread' ? (
                            <Circle className="h-5 w-5 text-rosa-mexicano fill-rosa-mexicano" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(parseISO(m.created_at), 'dd/MM/yy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          m.source === 'bus' ? "border-bus-primary text-bus-primary" : "border-rosa-mexicano text-rosa-mexicano"
                        )}>
                          {m.source === 'bus' ? <Bus className="h-3 w-3 mr-1" /> : <TreePalm className="h-3 w-3 mr-1" />}
                          {m.source === 'bus' ? 'Autobús' : 'Tours'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate" title={m.message}>{m.message}</p>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteMessage(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminContactMessagesPage;