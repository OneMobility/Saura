"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ParallaxCard from '@/components/ParallaxCard'; // Import ParallaxCard
import { allTours } from '@/data/tours'; // Import allTours

const ToursPage = () => {
  const rotationClasses = [
    "transform rotate-1",
    "transform -rotate-1",
    "transform rotate-2",
    "transform -rotate-2",
    "transform rotate-3",
    "transform -rotate-3",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-6">
          Todos Nuestros Tours
        </h1>
        <p className="text-lg text-gray-600 text-center mb-10">
          Explora nuestra colección completa de aventuras y encuentra tu próximo destino.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allTours.map((tour, index) => (
            <ParallaxCard
              key={tour.id}
              imageUrl={tour.imageUrl}
              title={tour.title}
              description={tour.description}
              rotationClass={rotationClasses[index % rotationClasses.length]}
              tourId={tour.id}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ToursPage;