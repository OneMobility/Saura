"use client";

import React from 'react';
import { Facebook, Instagram, Bus } from 'lucide-react';
import TikTokIcon from '@/components/icons/TikTokIcon';
import { Link } from 'react-router-dom';

const BusTicketsFooter = () => {
  return (
    <footer className="bg-bus-primary text-bus-primary-foreground py-10 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
        {/* Columna 1: Nombre SEO */}
        <div className="col-span-1">
          <h3 className="text-xl font-bold mb-4 flex items-center justify-center md:justify-start">
            <Bus className="h-6 w-6 mr-2" /> Saura Bus
          </h3>
          <p className="text-sm">
            Tu plataforma de confianza para reservar boletos de autobús. Viaja cómodo y seguro a tus destinos favoritos.
          </p>
        </div>

        {/* Columna 2: Enlaces Rápidos */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
          <ul className="space-y-2">
            <li><Link to="/bus-tickets" className="hover:underline">Inicio</Link></li>
            <li><Link to="/bus-tickets/destinations" className="hover:underline">Destinos</Link></li>
            <li><Link to="/bus-tickets/about" className="hover:underline">Sobre Nosotros</Link></li>
            <li><Link to="/bus-tickets/contact" className="hover:underline">Contacto</Link></li>
          </ul>
        </div>

        {/* Columna 3: Redes Sociales */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Síguenos</h3>
          <div className="flex justify-center md:justify-start space-x-4">
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200 transition-colors">
              <Facebook className="h-6 w-6" />
            </a>
            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200 transition-colors">
              <Instagram className="h-6 w-6" />
            </a>
            <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200 transition-colors">
              <TikTokIcon className="h-6 w-6" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-bus-primary-foreground/20 mt-8 pt-6 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Saura Bus. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default BusTicketsFooter;