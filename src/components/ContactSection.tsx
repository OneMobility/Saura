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
      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 items-center">
        {/* Columna del Formulario */}
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-center lg:text-left mb-8">
            Contáctanos
          </h2>
          <p className="text-center lg:text-left text-lg mb-10">
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

        {/* Columna de la Imagen con Recorte Abstracto */}
        <div className="mt-12 lg:mt-0 flex justify-center items-center">
          <div className="relative w-full max-w-md h-80 lg:h-[450px] overflow-hidden rounded-lg shadow-xl">
            <img
              src="https://tse3.mm.bing.net/th/id/OIP.tB2ifJ5D_V1kcDQkRItOvAHaEK?rs=1&pid=ImgDetMain&o=7&rm=3" // Imagen actualizada
              alt="Imagen abstracta de contacto"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: 'polygon(0 0, 100% 15%, 100% 100%, 0% 85%)' }} // Recorte abstracto
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;