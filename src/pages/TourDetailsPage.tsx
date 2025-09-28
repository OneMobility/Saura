"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { allTours } from '@/data/tours'; // Import allTours from the new data file

const TourDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const tour = allTours.find((t) => t.id === id); // Use allTours here

  if (!tour) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
        <h1 className="text-4xl font-bold mb-4">Tour no encontrado</h1>
        <p className="text-xl mb-6">Lo sentimos, el tour que buscas no existe.</p>
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <Button asChild variant="outline" className="bg-white text-rosa-mexicano hover:bg-gray-100 border-rosa-mexicano hover:border-rosa-mexicano/90">
            <Link to="/tours"> {/* Link back to the /tours page */}
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Tours
            </Link>
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="relative h-64 md:h-96 w-full">
            <img
              src={tour.imageUrl}
              alt={tour.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-6">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                {tour.title}
              </h1>
            </div>
          </div>

          <div className="p-6 md:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Descripción del Tour</h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                {tour.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Detalles Clave</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li><span className="font-medium">Precio:</span> {tour.price}</li>
                    <li><span className="font-medium">Duración:</span> {tour.duration}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Incluye</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {tour.includes.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Itinerario</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                {tour.itinerary.map((item) => (
                  <li key={item.day}>
                    <span className="font-medium">Día {item.day}:</span> {item.activity}
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-1 bg-gray-50 p-6 rounded-lg shadow-inner">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">¡Reserva Ahora!</h3>
              <p className="text-gray-700 mb-6">
                ¿Listo para tu próxima aventura? Contáctanos para personalizar tu viaje o reservar este tour.
              </p>
              <Button className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-3 text-lg">
                Reservar Tour
              </Button>
              <Button variant="outline" className="w-full mt-4 bg-white text-rosa-mexicano hover:bg-gray-100 border-rosa-mexicano hover:border-rosa-mexicano/90">
                Contactar Asesor
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TourDetailsPage;