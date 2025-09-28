"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Datos de ejemplo para los tours (esto se reemplazaría con una llamada a una API real)
const tourData = [
  {
    id: 'tour-1',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Aventura en la Riviera Maya',
    description: 'Explora las ruinas mayas y relájate en las playas de arena blanca. Este tour incluye transporte, alojamiento en hoteles boutique, visitas guiadas a Chichén Itzá, Tulum y Cobá, así como tiempo libre para disfrutar de las hermosas playas de Cancún y Playa del Carmen. Disfruta de la gastronomía local y actividades acuáticas.',
    price: '$1,200 USD',
    duration: '7 días / 6 noches',
    includes: ['Transporte aéreo y terrestre', 'Alojamiento en hoteles 4 estrellas', 'Desayunos diarios', 'Guía bilingüe', 'Entradas a sitios arqueológicos'],
    itinerary: [
      { day: 1, activity: 'Llegada a Cancún, traslado al hotel y tarde libre.' },
      { day: 2, activity: 'Visita a Chichén Itzá y cenote Ik Kil.' },
      { day: 3, activity: 'Exploración de Tulum y Playa Paraíso.' },
      { day: 4, activity: 'Aventura en Cobá y nado en cenotes.' },
      { day: 5, activity: 'Día libre en Playa del Carmen.' },
      { day: 6, activity: 'Actividades acuáticas en Xcaret o Xel-Há (opcional).' },
      { day: 7, activity: 'Desayuno y traslado al aeropuerto.' },
    ],
  },
  {
    id: 'tour-2',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Senderismo en la Sierra Madre',
    description: 'Descubre paisajes montañosos impresionantes y cascadas ocultas. Este tour te lleva a través de senderos desafiantes y vistas panorámicas, ideal para amantes de la naturaleza y la aventura. Incluye equipo de seguridad, guías expertos y campamentos en zonas designadas.',
    price: '$850 USD',
    duration: '5 días / 4 noches',
    includes: ['Transporte terrestre', 'Equipo de senderismo básico', 'Guía de montaña certificado', 'Comidas campestres', 'Permisos de acceso a parques naturales'],
    itinerary: [
      { day: 1, activity: 'Llegada al punto de encuentro, traslado a la base de la Sierra Madre y preparación para el campamento.' },
      { day: 2, activity: 'Senderismo a la Cascada Escondida y exploración de flora y fauna.' },
      { day: 3, activity: 'Ascenso al Pico del Águila con vistas panorámicas.' },
      { day: 4, activity: 'Visita a un pueblo mágico cercano y tarde de relajación.' },
      { day: 5, activity: 'Desayuno y regreso al punto de encuentro.' },
    ],
  },
  {
    id: 'tour-3',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Cultura y Sabor en Oaxaca',
    description: 'Sumérgete en la rica gastronomía y tradiciones de Oaxaca. Un viaje cultural que te llevará por mercados vibrantes, talleres de artesanía y degustaciones de mezcal. Conoce la historia de Monte Albán y disfruta de la calidez de su gente.',
    price: '$950 USD',
    duration: '6 días / 5 noches',
    includes: ['Transporte terrestre', 'Alojamiento en hoteles boutique', 'Desayunos y algunas comidas', 'Guía cultural', 'Visitas a mercados y talleres artesanales'],
    itinerary: [
      { day: 1, activity: 'Llegada a Oaxaca, traslado al hotel y cena de bienvenida.' },
      { day: 2, activity: 'Tour por el centro histórico, Santo Domingo y mercados.' },
      { day: 3, activity: 'Excursión a Monte Albán, Arbol del Tule y Teotitlán del Valle.' },
      { day: 4, activity: 'Clase de cocina oaxaqueña y degustación de mezcal.' },
      { day: 5, activity: 'Día libre para explorar o compras.' },
      { day: 6, activity: 'Desayuno y traslado al aeropuerto.' },
    ],
  },
];

const TourDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const tour = tourData.find((t) => t.id === id);

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
            <Link to="/">
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