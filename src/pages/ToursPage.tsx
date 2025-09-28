"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ToursPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
          Todos Nuestros Tours
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Aquí encontrarás una lista completa de todas las increíbles aventuras que ofrecemos.
          ¡Pronto tendremos más detalles y opciones de filtrado!
        </p>
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
          </Link>
        </Button>
      </main>
      <Footer />
    </div>
  );
};

export default ToursPage;