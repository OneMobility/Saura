"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, MapPin, Clock, Loader2 } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

const BusContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleRichTextChange = (content: string) => {
    setFormData((prevData) => ({
      ...prevData,
      message: content,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMessage = formData.message.replace(/<[^>]*>/g, '').trim();

    if (!formData.name || !formData.email || !cleanMessage) {
      toast.error('Por favor, rellena todos los campos del formulario.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{ 
          name: formData.name, 
          email: formData.email, 
          message: formData.message,
          source: 'bus'
        }]);

      if (error) throw error;

      toast.success('¡Mensaje enviado! Nos pondremos en contacto contigo pronto.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
      <div className="max-w-6xl mx-auto text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-bus-primary">
          Contáctanos <span className="text-bus-secondary">Hoy</span>
        </h2>
        <p className="text-lg mt-4">
          ¿Tienes alguna pregunta o necesitas ayuda con tu reserva de autobús? Envíanos un mensaje.
        </p>
      </div>

      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 items-stretch">
        <div className="bg-bus-primary p-8 rounded-lg shadow-lg mb-8 lg:mb-0 text-bus-primary-foreground">
          <h3 className="text-2xl font-bold text-center lg:text-left mb-8 text-bus-secondary">
            Envíanos un Mensaje
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-lg font-semibold">Nombre</Label>
              <Input
                type="text"
                id="name"
                placeholder="Tu Nombre"
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-white text-bus-foreground"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-lg font-semibold">Correo Electrónico</Label>
              <Input
                type="email"
                id="email"
                placeholder="tu.correo@ejemplo.com"
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-white text-bus-foreground"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-lg font-semibold">Mensaje</Label>
              <div className="mt-2 border rounded-md overflow-hidden bg-white text-bus-foreground">
                <RichTextEditor
                  value={formData.message}
                  onChange={handleRichTextChange}
                  placeholder="Describe tu consulta..."
                  className="min-h-[150px]"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-bus-secondary hover:bg-bus-secondary/90 text-bus-secondary-foreground font-semibold py-4 text-lg transition-transform active:scale-95"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Enviar Mensaje
            </Button>
          </form>
        </div>

        <div className="flex flex-col justify-start items-center lg:items-start space-y-8 p-8 bg-white border border-gray-100 rounded-lg shadow-lg text-bus-foreground">
          <h3 className="text-2xl font-bold text-bus-primary mb-2">Información de Contacto</h3>
          
          <div className="space-y-6 w-full">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-bus-secondary/20 rounded-full">
                <Mail className="h-6 w-6 text-bus-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Correo electrónico</p>
                <p className="text-lg font-medium">info@saurabus.com</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-bus-secondary/20 rounded-full">
                <Phone className="h-6 w-6 text-bus-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="text-lg font-medium">+52 844 404 1469</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-bus-secondary/20 rounded-full">
                <MapPin className="h-6 w-6 text-bus-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ubicación</p>
                <p className="text-lg font-medium">Saltillo, Coahuila, México</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 w-full">
            <h3 className="text-xl font-bold text-bus-primary mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-bus-secondary" /> Horarios de Atención
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-muted-foreground">Lunes - Viernes:</p>
              <p className="font-medium">9:00 AM - 6:00 PM</p>
              <p className="text-muted-foreground">Sábados:</p>
              <p className="font-medium">10:00 AM - 2:00 PM</p>
              <p className="text-muted-foreground">Domingos:</p>
              <p className="font-medium">Cerrado</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusContactSection;