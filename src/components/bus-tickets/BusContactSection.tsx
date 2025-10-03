"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner'; // Using sonner for toasts
import { Mail, Phone, MapPin } from 'lucide-react'; // Icons for contact info

const BusContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | React.ChangeEvent<HTMLTextAreaElement>>) => {
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
    console.log('Formulario de contacto de Saura Bus enviado:', formData);
    toast.success('¡Mensaje enviado! Nos pondremos en contacto contigo pronto.');
    setFormData({ name: '', email: '', message: '' }); // Limpiar formulario
  };

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-bus-background text-bus-foreground">
      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 items-start"> {/* Cambiado a items-start para alinear arriba */}
        {/* Columna del Formulario en caja azul */}
        <div className="bg-bus-primary p-8 rounded-lg shadow-lg mb-8 lg:mb-0"> {/* Caja azul para el formulario */}
          <h2 className="text-3xl md:text-4xl font-bold text-center lg:text-left mb-8 text-bus-primary-foreground"> {/* Título en blanco */}
            Contáctanos <span className="text-bus-secondary">Hoy</span> {/* Énfasis en amarillo */}
          </h2>
          <p className="text-center lg:text-left text-lg mb-10 text-bus-primary-foreground"> {/* Texto en blanco */}
            ¿Tienes alguna pregunta o necesitas ayuda con tu reserva de autobús? Envíanos un mensaje.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-lg text-bus-primary-foreground">Nombre</Label> {/* Label en blanco */}
              <Input
                type="text"
                id="name"
                placeholder="Tu Nombre"
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-white text-bus-foreground" {/* Input en blanco con ring amarillo */}
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-lg text-bus-primary-foreground">Correo Electrónico</Label> {/* Label en blanco */}
              <Input
                type="email"
                id="email"
                placeholder="tu.correo@ejemplo.com"
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-white text-bus-foreground" {/* Input en blanco con ring amarillo */}
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="message" className="text-lg text-bus-primary-foreground">Mensaje</Label> {/* Label en blanco */}
              <Textarea
                id="message"
                placeholder="Escribe tu mensaje aquí..."
                rows={5}
                className="mt-2 p-3 border border-gray-300 rounded-md focus-visible:ring-bus-secondary bg-white text-bus-foreground" {/* Textarea en blanco con ring amarillo */}
                value={formData.message}
                onChange={handleChange}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-bus-secondary hover:bg-bus-secondary/90 text-bus-secondary-foreground font-semibold py-3 text-lg" {/* Botón amarillo */}
            >
              Enviar Mensaje
            </Button>
          </form>
        </div>

        {/* Columna de Información de Contacto en caja azul */}
        <div className="bg-bus-primary p-8 rounded-lg shadow-lg flex flex-col justify-center items-center lg:items-start space-y-6"> {/* Caja azul para la información */}
          <h3 className="text-2xl font-bold text-bus-secondary mb-4">Nuestra Información</h3> {/* Título en amarillo */}
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-bus-secondary" /> {/* Icono en amarillo */}
            <p className="text-lg text-bus-primary-foreground">info@saurabus.com</p> {/* Texto en blanco */}
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-6 w-6 text-bus-secondary" /> {/* Icono en amarillo */}
            <p className="text-lg text-bus-primary-foreground">+52 55 1234 5678</p> {/* Texto en blanco */}
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-bus-secondary" /> {/* Icono en amarillo */}
            <p className="text-lg text-bus-primary-foreground">Calle Falsa 123, Ciudad de México</p> {/* Texto en blanco */}
          </div>
          <img
            src="https://tse3.mm.bing.net/th/id/OIP.tB2ifJ5D_V1kcDQkRItOvAHaEK?rs=1&pid=ImgDetMain&o=7&rm=3"
            alt="Oficina de Saura Bus"
            className="w-full max-w-sm h-auto rounded-lg mt-8 shadow-md"
          />
        </div>
      </div>
    </section>
  );
};

export default BusContactSection;