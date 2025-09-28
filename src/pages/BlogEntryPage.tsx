"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Datos de ejemplo para entradas de blog
const blogPostsData = [
  {
    id: 'blog-1',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Guía Completa para tu Primer Viaje a la Riviera Maya',
    author: 'Saura Tours',
    date: '15 de Octubre, 2023',
    content: `
      <p>La Riviera Maya es un destino de ensueño que combina playas de arena blanca, aguas turquesas y una rica historia maya. Si estás planeando tu primer viaje a este paraíso mexicano, esta guía te ayudará a aprovechar al máximo tu aventura.</p>
      <h3 class="text-2xl font-semibold mt-6 mb-3">Qué hacer en la Riviera Maya:</h3>
      <ul class="list-disc list-inside space-y-2">
        <li><strong>Explorar las Ruinas Mayas:</strong> Visita Chichén Itzá, Tulum y Cobá para maravillarte con la arquitectura antigua y aprender sobre la fascinante civilización maya.</li>
        <li><strong>Nadar en Cenotes:</strong> Sumérgete en las aguas cristalinas de los cenotes, pozas naturales subterráneas que son únicas en la región.</li>
        <li><strong>Relajarse en la Playa:</strong> Disfruta del sol y la arena en playas icónicas como Playa del Carmen, Akumal o la Isla Holbox.</li>
        <li><strong>Actividades Acuáticas:</strong> Practica snorkel o buceo en el Gran Arrecife Maya, el segundo arrecife de coral más grande del mundo.</li>
      </ul>
      <h3 class="text-2xl font-semibold mt-6 mb-3">Consejos para tu viaje:</h3>
      <ul class="list-disc list-inside space-y-2">
        <li><strong>Protector Solar Biodegradable:</strong> Ayuda a proteger los ecosistemas marinos y de cenotes.</li>
        <li><strong>Hidratación:</strong> El clima puede ser cálido y húmedo, así que bebe mucha agua.</li>
        <li><strong>Moneda Local:</strong> Aunque aceptan dólares, pagar en pesos mexicanos puede ser más ventajoso.</li>
      </ul>
      <p class="mt-6">¡Prepárate para una experiencia inolvidable en la Riviera Maya con Saura Tours!</p>
    `,
  },
  {
    id: 'blog-2',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: '10 Razones para Explorar la Sierra Madre Occidental',
    author: 'Saura Tours',
    date: '20 de Septiembre, 2023',
    content: `
      <p>La Sierra Madre Occidental es una cadena montañosa majestuosa que atraviesa gran parte de México, ofreciendo paisajes espectaculares y una biodiversidad asombrosa. Aquí te damos 10 razones por las que deberías considerar este destino para tu próxima aventura.</p>
      <h3 class="text-2xl font-semibold mt-6 mb-3">Por qué visitar la Sierra Madre:</h3>
      <ol class="list-decimal list-inside space-y-2">
        <li><strong>Cañones Impresionantes:</strong> Hogar de la Barranca del Cobre, más grande y profunda que el Gran Cañón.</li>
        <li><strong>Pueblos Mágicos:</strong> Descubre la riqueza cultural en pueblos como Creel o Batopilas.</li>
        <li><strong>Senderismo y Aventura:</strong> Rutas para todos los niveles, desde caminatas suaves hasta expediciones desafiantes.</li>
        <li><strong>Cascadas Escondidas:</strong> Encuentra oasis de agua dulce en medio de la montaña.</li>
        <li><strong>Flora y Fauna Única:</strong> Un paraíso para los amantes de la naturaleza y el avistamiento de aves.</li>
        <li><strong>Cultura Rarámuri:</strong> Conoce a la comunidad indígena Rarámuri y sus tradiciones ancestrales.</li>
        <li><strong>Tren Chepe:</strong> Disfruta de uno de los viajes en tren más espectaculares del mundo.</li>
        <li><strong>Gastronomía Regional:</strong> Prueba platillos auténticos y sabores únicos de la sierra.</li>
        <li><strong>Cielos Estrellados:</strong> Lejos de la contaminación lumínica, ideal para la observación astronómica.</li>
        <li><strong>Desconexión Total:</strong> Un lugar perfecto para escapar del bullicio y reconectar con la naturaleza.</li>
      </ol>
      <p class="mt-6">¡La Sierra Madre Occidental te espera con aventuras que te dejarán sin aliento!</p>
    `,
  },
  {
    id: 'blog-3',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Oaxaca: Un Viaje Culinario y Cultural Inolvidable',
    author: 'Saura Tours',
    date: '5 de Agosto, 2023',
    content: `
      <p>Oaxaca es un estado que enamora a sus visitantes con su vibrante cultura, su exquisita gastronomía y su gente cálida. Un viaje a Oaxaca es una inmersión profunda en las raíces de México.</p>
      <h3 class="text-2xl font-semibold mt-6 mb-3">Lo que no te puedes perder en Oaxaca:</h3>
      <ul class="list-disc list-inside space-y-2">
        <li><strong>Gastronomía:</strong> Prueba el mole, las tlayudas, el chocolate y el mezcal. ¡Un festín para el paladar!</li>
        <li><strong>Mercados Tradicionales:</strong> Visita el Mercado Benito Juárez o el Mercado 20 de Noviembre para una experiencia sensorial completa.</li>
        <li><strong>Sitios Arqueológicos:</strong> Explora Monte Albán, una impresionante ciudad zapoteca con vistas panorámicas.</li>
        <li><strong>Artesanía:</strong> Descubre los alebrijes, el barro negro y los textiles de Teotitlán del Valle.</li>
        <li><strong>Festivales:</strong> Si tu visita coincide con la Guelaguetza o el Día de Muertos, vivirás una experiencia mágica.</li>
      </ul>
      <p class="mt-6">Oaxaca es un destino que te dejará recuerdos imborrables y ganas de volver.</p>
    `,
  },
  {
    id: 'blog-4',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Consejos Esenciales para Viajar con Niños Pequeños',
    author: 'Saura Tours',
    date: '10 de Julio, 2023',
    content: `
      <p>Viajar con niños pequeños puede ser una experiencia enriquecedora y divertida, pero requiere una planificación cuidadosa. Aquí te compartimos algunos consejos esenciales para que tus vacaciones familiares sean un éxito.</p>
      <h3 class="text-2xl font-semibold mt-6 mb-3">Planificación y Preparación:</h3>
      <ul class="list-disc list-inside space-y-2">
        <li><strong>Elige Destinos Amigables:</strong> Opta por lugares con actividades para niños, parques y alojamientos con servicios familiares.</li>
        <li><strong>Empaca con Inteligencia:</strong> Lleva suficientes pañales, toallitas, snacks, juguetes y ropa extra. No olvides un botiquín básico.</li>
        <li><strong>Horarios Flexibles:</strong> Intenta mantener las rutinas de sueño y alimentación de tus hijos, pero sé flexible.</li>
        <li><strong>Entretenimiento en el Viaje:</strong> Libros, tabletas con juegos o películas, y juguetes pequeños pueden ser salvadores durante los trayectos.</li>
        <li><strong>Seguridad:</strong> Asegúrate de que los niños usen cinturones de seguridad o sillas de coche adecuadas. En destinos, supervisa siempre.</li>
      </ul>
      <h3 class="text-2xl font-semibold mt-6 mb-3">Durante el Viaje:</h3>
      <ul class="list-disc list-inside space-y-2">
        <li><strong>Descansos Frecuentes:</strong> Si viajas en coche, haz paradas regulares para que los niños puedan estirarse y jugar.</li>
        <li><strong>Snacks y Agua:</strong> Ten siempre a mano bebidas y aperitivos saludables para evitar el mal humor por hambre.</li>
      </ul>
      <p class="mt-6">Con un poco de preparación, viajar con tus pequeños puede ser una de las mejores experiencias familiares.</p>
    `,
  },
];

const BlogEntryPage = () => {
  const { id } = useParams<{ id: string }>();
  const post = blogPostsData.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Entrada de blog no encontrada</h1>
        <p className="text-lg text-gray-600 mb-6">Lo sentimos, la entrada de blog que buscas no existe.</p>
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-[300px] md:h-[400px] overflow-hidden">
        <img
          src={post.imageUrl}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <h1 className="text-3xl md:text-5xl font-bold text-white text-center">
            {post.title}
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
              Volver al Blog
            </span>
          </Link>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8 mb-8 prose prose-lg max-w-none">
          <p className="text-gray-600 text-sm mb-2">
            Por <span className="font-semibold">{post.author}</span> el {post.date}
          </p>
          <div
            className="text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </div>
    </div>
  );
};

export default BlogEntryPage;