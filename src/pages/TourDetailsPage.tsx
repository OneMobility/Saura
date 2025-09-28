"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Datos de ejemplo para tours (en una aplicación real, esto vendría de una API)
const tourData = [
  {
    id: 'tour-1',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Aventura en la Riviera Maya',
    description: 'Explora las ruinas mayas y relájate en las playas de arena blanca. Este tour de 7 días incluye visitas a Chichén Itzá, Tulum, y nado en cenotes cristalinos. Disfruta de la gastronomía local y de la vibrante vida nocturna de Playa del Carmen. Alojamiento en hoteles boutique y transporte privado incluido.',
    details: [
      '7 días / 6 noches',
      'Guía bilingüe',
      'Transporte de lujo',
      'Comidas incluidas',
      'Actividades acuáticas',
      'Visitas culturales',
    ],
    price: '$1200 USD',
  },
  {
    id: 'tour-2',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Senderismo en la Sierra Madre',
    description: 'Descubre paisajes montañosos impresionantes y cascadas ocultas en un viaje de 5 días. Ideal para amantes de la naturaleza y la aventura. Incluye rutas de senderismo guiadas, acampada bajo las estrellas y avistamiento de fauna local. Equipo de seguridad y alimentación proporcionados.',
    details: [
      '5 días / 4 noches',
      'Guía de montaña certificado',
      'Equipo de acampada',
      'Todas las comidas',
      'Avistamiento de aves',
      'Baños en cascadas',
    ],
    price: '$850 USD',
  },
  {
    id: 'tour-3',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Cultura y Sabor en Oaxaca',
    description: 'Sumérgete en la rica gastronomía y tradiciones de Oaxaca en un tour cultural de 4 días. Visita mercados, talleres de artesanía, y prueba el mezcal local. Aprende sobre la historia zapoteca y mixteca, y participa en clases de cocina tradicional. Alojamiento en hoteles boutique del centro histórico.',
    details: [
      '4 días / 3 noches',
      'Guía cultural',
      'Degustación de mezcal',
      'Clases de cocina',
      'Visitas a sitios arqueológicos',
      'Transporte local',
    ],
    price: '$700 USD',
  },
];

const TourDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const tour = tourData.find((t) => t.id === id);

  if (!tour) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Tour no encontrado</h1>
        <p className="text-lg text-gray-600 mb-6">Lo sentimos, el tour que buscas no existe.</p>
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
        <img
          src={tour.imageUrl}
          alt={tour.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white text-center">
            {tour.title}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-12 px-4 md:px-8">
        <div className="flex justify-start mb-8">
          <Link
            to="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "bg-white text-rosa-mexicano hover:bg-gray-100 border-rosa-mexicano"
            )}
          >
            <span> {/* Envuelve el icono y el texto en un span */}
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a Tours
            </span>
          </Link>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Descripción del Tour</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {tour.description}
          </p>

          <h3 className="text-2xl font-semibold text-gray-800 mb-3">Qué incluye:</h3>
          <ul className="list-disc list-inside text-gray-700 text-lg space-y-2">
            {tour.details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>

          <div className="mt-8 text-right">
            <span className="text-2xl font-bold text-rosa-mexicano mr-4">Precio: {tour.price}</span>
            <Button className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white font-semibold py-3 px-6 text-lg">
              Reservar Ahora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDetailsPage;