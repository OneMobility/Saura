"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react'; // Import Loader2
import ParallaxCard from '@/components/ParallaxCard';
import { supabase } from '@/integrations/supabase/client'; // Import supabase

interface Tour {
  id: string;
  image_url: string;
  title: string;
  description: string;
  slug: string; // Use slug for linking
}

const ToursPage = () => {
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllTours = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('tours')
        .select('id, image_url, title, description, slug')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all tours for ToursPage:', error);
        setError('Error al cargar los tours.');
        setAllTours([]);
      } else {
        setAllTours(data || []);
      }
      setLoading(false);
    };

    fetchAllTours();
  }, []);

  const rotationClasses = [
    "transform rotate-1",
    "transform -rotate-1",
    "transform rotate-2",
    "transform -rotate-2",
    "transform rotate-3",
    "transform -rotate-3",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-12 px-4 md:px-8 lg:px-16 bg-white flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="ml-4 text-gray-700 text-xl">Cargando todos los tours...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-12 px-4 md:px-8 lg:px-16 bg-white text-center text-red-600">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Error</h1>
          <p className="text-xl">{error}</p>
        </main>
        <Footer />
      </div>
    );
  }

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

        {allTours.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No hay tours disponibles en este momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allTours.map((tour, index) => (
              <ParallaxCard
                key={tour.id}
                imageUrl={tour.image_url}
                title={tour.title}
                description={tour.description}
                rotationClass={rotationClasses[index % rotationClasses.length]}
                isMobile={false}
                tourId={tour.slug} // Use slug for the link
              />
            ))}
          </div>
        )}

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