"use client";

import React from 'react';
import { Facebook, Instagram, Twitter } from 'lucide-react'; // Using Twitter as a placeholder for TikTok if needed
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

const Footer = () => {
  return (
    <footer className="bg-rosa-mexicano text-white py-10 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
        {/* Columna 1: Nombre SEO */}
        <div className="col-span-1 md:col-span-1">
          <h3 className="text-xl font-bold mb-4">Saura Tours</h3>
          <p className="text-sm">
            Tu agencia de viajes de confianza para aventuras inolvidables en México y el mundo.
            Descubre destinos mágicos, culturas vibrantes y crea recuerdos preciosos con nosotros.
          </p>
        </div>

        {/* Columna 2: Enlaces Rápidos */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
          <ul className="space-y-2">
            <li><Link to="/" className="hover:underline">Inicio</Link></li>
            <li><Link to="/tours" className="hover:underline">Tours</Link></li> {/* Assuming a /tours page will be created later */}
            <li><Link to="/blog" className="hover:underline">Blog</Link></li> {/* Updated link */}
            <li><Link to="/contact" className="hover:underline">Contacto</Link></li> {/* Assuming a /contact page will be created later */}
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
            {/* Usamos Twitter como un ejemplo si no hay un icono de TikTok directo en Lucide */}
            <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200 transition-colors">
              <Twitter className="h-6 w-6" /> {/* Considerar un SVG personalizado si se necesita el logo de TikTok */}
            </a>
          </div>
        </div>

        {/* Columna 4: Botón de Admin */}
        <div className="flex flex-col items-center md:items-end justify-start">
          <h3 className="text-lg font-semibold mb-4">Administración</h3>
          <Button variant="outline" className="bg-white text-rosa-mexicano hover:bg-gray-100 font-semibold">
            Acceso Admin
          </Button>
        </div>
      </div>

      <div className="border-t border-white/20 mt-8 pt-6 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Saura Tours. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;