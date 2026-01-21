"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, MapPin, Clock, Loader2 } from 'lucide-react';

const BusContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
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
              <Label htmlFor="name" className="text-lg">Nombre</Label>
              <Input
                type="text"
                id="name"
                placeholder="Tu Nombre"
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-bus-background text-bus-foreground"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-lg">Correo Electrónico</Label>
              <Input
                type="email"
                id="email"
                placeholder="tu.correo@ejemplo.com"
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-bus-background text-bus-foreground"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="message" className="text-lg">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Escribe tu mensaje aquí..."
                rows={5}
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-bus-background text-bus-foreground"
                value={formData.message}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-bus-secondary hover:bg-bus-secondary/90 text-bus-secondary-foreground font-semibold py-3 text-lg"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar Mensaje
            </Button>
          </form>
        </div>

        <div className="flex flex-col justify-start items-center lg:items-start space-y-6 p-8 bg-bus-primary rounded-lg shadow-lg text-bus-primary-foreground">
          <h3 className="text-2xl font-bold text-bus-secondary mb-4">Nuestra Información</h3>
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-bus-secondary" />
            <p className="text-lg">info@saurabus.com</p>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-6 w-6 text-bus-secondary" />
            <p className="text-lg">+52 55 1234 5678</p>
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-bus-secondary" />
            <p className="text-lg">Calle Falsa 123, Ciudad de México</p>
          </div>

          <h3 className="text-2xl font-bold text-bus-secondary mt-8 mb-4">Horarios de Atención</h3>
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-bus-secondary" />
            <div className="text-lg">
              <p>Lunes a Viernes: 9:00 AM - 6:00 PM</p>
              <p>Sábados: 10:00 AM - 2:00 PM</p>
              <p>Domingos: Cerrado</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusContactSection;