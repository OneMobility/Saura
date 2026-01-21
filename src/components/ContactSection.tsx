"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactImage, setContactImage] = useState('https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?q=80&w=2070&auto=format&fit=crop');

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('agency_settings').select('contact_image_url').single();
      if (data?.contact_image_url) setContactImage(data.contact_image_url);
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [id]: value }));
  };

  const handleRichTextChange = (content: string) => {
    setFormData((prevData) => ({ ...prevData, message: content }));
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
        .insert([{ name: formData.name, email: formData.email, message: formData.message, source: 'tours' }]);

      if (error) throw error;
      toast.success('¡Mensaje enviado!');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Error al enviar el mensaje.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-white text-gray-800">
      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-center lg:text-left mb-8">Contáctanos</h2>
          <p className="text-center lg:text-left text-lg mb-10">¿Tienes alguna pregunta? Envíanos un mensaje.</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-lg font-semibold">Nombre</Label>
              <Input type="text" id="name" className="mt-2" value={formData.name} onChange={handleChange} disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="email" className="text-lg font-semibold">Correo Electrónico</Label>
              <Input type="email" id="email" className="mt-2" value={formData.email} onChange={handleChange} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-lg font-semibold">Mensaje</Label>
              <div className="mt-2 border rounded-md overflow-hidden bg-white">
                <RichTextEditor value={formData.message} onChange={handleRichTextChange} placeholder="Escribe tu mensaje..." className="min-h-[200px]" />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-4 text-lg">
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Enviar Mensaje
            </Button>
          </form>
        </div>

        <div className="mt-12 lg:mt-0 flex justify-center items-center h-full">
          <div className="relative w-full max-w-md h-80 lg:h-[600px] overflow-hidden rounded-2xl">
            <img src={contactImage} alt="Contacto" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;