"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Trash2, Mail, Bus, TreePalm, CheckCircle2, Circle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { stripHtmlTags } from '@/utils/html';

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
          <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
            {messages.length === 0 ? (
              <div className="text-center py-24 text-gray-500">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl">No hay mensajes de contacto aún.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[80px]">Visto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vista Previa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map((m) => (
                      <TableRow key={m.id} className={cn(m.status === 'unread' ? "bg-rosa-mexicano/5" : "hover:bg-gray-50")}>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleStatus(m.id, m.status)}
                            title={m.status === 'unread' ? "Marcar como leído" : "Marcar como no leído"}
                          >
                            {m.status === 'unread' ? (
                              <Circle className="h-5 w-5 text-rosa-mexicano fill-rosa-mexicano animate-pulse" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-600">
                          {format(parseISO(m.created_at), 'dd/MM HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[10px] uppercase tracking-wider",
                            m.source === 'bus' ? "border-blue-400 text-blue-600" : "border-pink-400 text-pink-600"
                          )}>
                            {m.source === 'bus' ? 'Autobús' : 'Tours'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">{m.email}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px] lg:max-w-xs">
                          <p className="text-sm truncate italic text-gray-500" title={stripHtmlTags(m.message)}>
                            {stripHtmlTags(m.message)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin/contacto/${m.id}`}>
                                <Eye className="h-4 w-4 mr-2" /> Detalles
                              </Link>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteMessage(m.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminContactMessagesPage;