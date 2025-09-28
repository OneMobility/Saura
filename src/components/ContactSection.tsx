"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Using sonner for toasts

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Por favor, rellena todos los campos del formulario.');
      return;
    }
    // Aquí iría la lógica para enviar el formulario (e.g., a una API)
    console.log('Formulario de contacto enviado:', formData);
    toast.success('¡Mensaje enviado! Nos pondremos en contacto contigo pronto.');
    setFormData({ name: '', email: '', message: '' }); // Limpiar formulario
  };

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-white text-gray-800">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Contáctanos
        </h2>
        <p className="text-center text-lg mb-10">
          ¿Tienes alguna pregunta o necesitas ayuda? Envíanos un mensaje.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-lg">Nombre</Label>
            <Input
              type="text"
              id="name"
              placeholder="Tu Nombre"
              className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-rosa-mexicano"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-lg">Correo Electrónico</Label>
            <Input
              type="email"
              id="email"
              placeholder="tu.correo@ejemplo.com"
              className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-rosa-mexicano"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="message" className="text-lg">Mensaje</Label>
            <Textarea
              id="message"
              placeholder="Escribe tu mensaje aquí..."
              rows={5}
              className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-rosa-mexicano"
              value={formData.message}
              onChange={handleChange}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-3 text-lg"
          >
            Enviar Mensaje
          </Button>
        </form>
      </div>
    </section>
  );
};

export default ContactSection;