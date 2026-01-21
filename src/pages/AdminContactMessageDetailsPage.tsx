"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, Calendar, User, Info, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const AdminContactMessageDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [message, setMessage] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin && id) {
      fetchMessage();
    }
  }, [user, isAdmin, sessionLoading, navigate, id]);

  const fetchMessage = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching message details:', error);
      toast.error('No se pudo encontrar el mensaje.');
      navigate('/admin/contacto');
    } else {
      setMessage(data);
      // Auto-mark as read if unread
      if (data.status === 'unread') {
        await supabase.from('contact_messages').update({ status: 'read' }).eq('id', id);
      }
    }
    setLoading(false);
  };

  const deleteMessage = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;
    
    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar el mensaje.');
    } else {
      toast.success('Mensaje eliminado.');
      navigate('/admin/contacto');
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando mensaje...</p>
        </div>
      </div>
    );
  }

  if (!message) return null;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Detalles del Mensaje">
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link to="/admin/contacto">
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Link>
            </Button>
            <Button variant="destructive" onClick={deleteMessage}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          </div>
        </AdminHeader>
        
        <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
          <Card className="shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-gray-50 border-b p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-rosa-mexicano/10 p-3 rounded-full">
                    <User className="h-8 w-8 text-rosa-mexicano" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">{message.name}</CardTitle>
                    <p className="text-gray-500 flex items-center mt-1">
                      <Mail className="h-4 w-4 mr-2" /> {message.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={cn(
                    message.source === 'bus' ? "bg-bus-primary text-white" : "bg-rosa-mexicano text-white"
                  )}>
                    Origen: {message.source === 'bus' ? 'Autobús' : 'Tours'}
                  </Badge>
                  <p className="text-sm text-gray-400 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" /> {format(parseISO(message.created_at), 'PPPp', { locale: es })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-b pb-2">
                <Info className="h-5 w-5 mr-2 text-rosa-mexicano" /> Mensaje del Cliente
              </h3>
              <div 
                className="prose prose-pink max-w-none text-gray-700 bg-gray-50 p-6 rounded-xl border border-gray-100"
                dangerouslySetInnerHTML={{ __html: message.message }}
              />
              
              <div className="mt-8 pt-6 border-t flex justify-end">
                <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90">
                  <a href={`mailto:${message.email}?subject=Respuesta de Saura Tours - Re: Contacto`}>
                    <Mail className="h-4 w-4 mr-2" /> Responder por Email
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default AdminContactMessageDetailsPage;