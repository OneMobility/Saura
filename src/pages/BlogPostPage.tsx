"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Datos de ejemplo para las entradas del blog (reutilizados y extendidos)
const blogPostsData = [
  {
    id: 'guia-riviera-maya',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Guía Completa para tu Primer Viaje a la Riviera Maya',
    description: 'Descubre los secretos mejor guardados de la Riviera Maya, desde las playas paradisíacas hasta las antiguas ruinas mayas. Prepárate para una aventura inolvidable con nuestros consejos de expertos.',
    fullContent: `
      <p class="mb-4">La Riviera Maya es un destino que lo tiene todo: playas de arena blanca, aguas cristalinas, antiguas ruinas mayas y una vibrante vida nocturna. Si estás planeando tu primer viaje a este paraíso mexicano, esta guía te ayudará a aprovechar al máximo tu aventura.</p>
      <h3 class="text-2xl font-semibold mb-3">Explorando las Ruinas Mayas</h3>
      <p class="mb-4">No puedes visitar la Riviera Maya sin explorar sus impresionantes sitios arqueológicos. <strong>Chichén Itzá</strong>, una de las Nuevas Siete Maravillas del Mundo, es una visita obligada. Sus pirámides y templos te transportarán a la antigua civilización maya. Otro sitio fascinante es <strong>Tulum</strong>, con sus ruinas frente al mar Caribe, ofreciendo vistas espectaculares.</p>
      <h3 class="text-2xl font-semibold mb-3">Playas y Cenotes</h3>
      <p class="mb-4">Las playas de la Riviera Maya son famosas por su belleza. <strong>Playa del Carmen</strong> y <strong>Cancún</strong> ofrecen una mezcla de relajación y entretenimiento. Para una experiencia más natural, sumérgete en los <strong>cenotes</strong>, pozas de agua dulce subterráneas perfectas para nadar y hacer snorkel. El Cenote Ik Kil, cerca de Chichén Itzá, es particularmente popular.</p>
      <h3 class="text-2xl font-semibold mb-3">Gastronomía Local</h3>
      <p class="mb-4">La comida en la Riviera Maya es una delicia. Prueba los tacos de cochinita pibil, el pescado tikin xic y los mariscos frescos. No olvides acompañar tus comidas con un refrescante agua de horchata o jamaica.</p>
      <p>¡Esperamos que esta guía te sea útil para planificar tu viaje a la Riviera Maya!</p>
    `,
  },
  {
    id: 'sierra-madre-occidental',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: '10 Razones para Explorar la Sierra Madre Occidental',
    description: 'La Sierra Madre Occidental ofrece paisajes impresionantes, cascadas ocultas y una rica biodiversidad. Te damos 10 razones para que tu próxima aventura sea en este majestuoso lugar.',
    fullContent: `
      <p class="mb-4">La Sierra Madre Occidental es una cadena montañosa que atraviesa gran parte de México, ofreciendo una riqueza natural y cultural inigualable. Aquí te presentamos 10 razones por las que deberías considerarla para tu próxima aventura:</p>
      <ol class="list-decimal list-inside space-y-2 mb-4">
        <li><strong>Paisajes impresionantes:</strong> Desde cañones profundos hasta picos nevados.</li>
        <li><strong>Cascadas ocultas:</strong> Descubre joyas naturales perfectas para un chapuzón.</li>
        <li><strong>Biodiversidad única:</strong> Hogar de una gran variedad de flora y fauna.</li>
        <li><strong>Senderismo y aventura:</strong> Rutas para todos los niveles de experiencia.</li>
        <li><strong>Pueblos mágicos:</strong> Conoce la cultura y tradiciones locales.</li>
        <li><strong>Observación de aves:</strong> Un paraíso para los ornitólogos.</li>
        <li><strong>Clima agradable:</strong> Temperaturas frescas ideales para actividades al aire libre.</li>
        <li><strong>Gastronomía regional:</strong> Sabores auténticos que te encantarán.</li>
        <li><strong>Desconexión total:</strong> Un escape perfecto del bullicio de la ciudad.</li>
        <li><strong>Hospitalidad local:</strong> La calidez de su gente te hará sentir como en casa.</li>
      </ol>
      <p>¡Anímate a explorar la majestuosidad de la Sierra Madre Occidental!</p>
    `,
  },
  {
    id: 'oaxaca-culinario-cultural',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Oaxaca: Un Viaje Culinario y Cultural Inolvidable',
    description: 'Sumérgete en la vibrante cultura y la exquisita gastronomía de Oaxaca. Desde sus mercados tradicionales hasta sus festivales coloridos, cada rincón es una experiencia para los sentidos.',
    fullContent: `
      <p class="mb-4">Oaxaca es un estado que enamora a sus visitantes con su rica herencia cultural y su inigualable oferta gastronómica. Un viaje a Oaxaca es una inmersión profunda en las tradiciones mexicanas.</p>
      <h3 class="text-2xl font-semibold mb-3">La Capital Gastronómica de México</h3>
      <p class="mb-4">Conocida como la capital gastronómica de México, Oaxaca te invita a un festín de sabores. Prueba el mole negro, las tlayudas, el tasajo y, por supuesto, el mezcal. Visita el Mercado Benito Juárez para una experiencia culinaria auténtica.</p>
      <h3 class="text-2xl font-semibold mb-3">Arte y Artesanía</h3>
      <p class="mb-4">Los artesanos oaxaqueños son famosos por sus creaciones. Explora los talleres de alebrijes en San Antonio Arrazola, los textiles de Teotitlán del Valle y la cerámica de San Bartolo Coyotepec. Cada pieza cuenta una historia.</p>
      <h3 class="text-2xl font-semibold mb-3">Historia y Tradición</h3>
      <p class="mb-4">Descubre la grandeza de la civilización zapoteca en <strong>Monte Albán</strong>, una impresionante zona arqueológica. Pasea por el centro histórico de Oaxaca, declarado Patrimonio de la Humanidad, y admira su arquitectura colonial y sus iglesias barrocas.</p>
      <p>Oaxaca es un destino que te dejará recuerdos imborrables.</p>
    `,
  },
  {
    id: 'viajar-con-ninos',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Consejos Esenciales para Viajar con Niños Pequeños',
    description: 'Viajar con niños puede ser un desafío, pero con la planificación adecuada, puede ser una experiencia maravillosa. Aquí te compartimos nuestros mejores consejos para unas vacaciones familiares sin estrés.',
    fullContent: `
      <p class="mb-4">Viajar en familia es una de las experiencias más enriquecedoras, pero cuando hay niños pequeños, la planificación es clave. Aquí te dejamos algunos consejos esenciales para que tus vacaciones sean un éxito:</p>
      <h3 class="text-2xl font-semibold mb-3">Planificación Anticipada</h3>
      <p class="mb-4">Reserva vuelos y alojamientos con antelación, buscando opciones que ofrezcan comodidades para niños. Investiga destinos con actividades familiares y horarios flexibles.</p>
      <h3 class="text-2xl font-semibold mb-3">Empaque Inteligente</h3>
      <p class="mb-4">Lleva snacks, juguetes pequeños, libros y tabletas con juegos o películas para mantener a los niños entretenidos durante los trayectos. No olvides un botiquín básico y sus medicinas habituales.</p>
      <h3 class="text-2xl font-semibold mb-3">Flexibilidad y Paciencia</h3>
      <p class="mb-4">Los planes pueden cambiar con niños. Sé flexible con los itinerarios y ten paciencia. Permite tiempo para descansos y juegos inesperados. Recuerda que el objetivo es disfrutar juntos.</p>
      <p>Con estos consejos, tu viaje familiar será una aventura inolvidable.</p>
    `,
  },
  {
    id: 'pueblos-magicos-mexico',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Descubre la Magia de los Pueblos Mágicos de México',
    description: 'México está lleno de encanto y tradición. Explora sus Pueblos Mágicos, donde la historia, la cultura y la belleza natural se unen para ofrecerte experiencias únicas.',
    fullContent: `
      <p class="mb-4">Los Pueblos Mágicos de México son destinos que te transportan a un mundo de tradiciones, leyendas y belleza natural. Cada uno tiene una esencia única que lo hace especial.</p>
      <h3 class="text-2xl font-semibold mb-3">¿Qué son los Pueblos Mágicos?</h3>
      <p class="mb-4">Es un programa que reconoce a localidades que, a través de la historia, cultura y tradiciones, han conservado su autenticidad. Son lugares que te invitan a vivir la magia de México.</p>
      <h3 class="text-2xl font-semibold mb-3">Algunos Imperdibles</h3>
      <p class="mb-4">Desde <strong>San Cristóbal de las Casas</strong> en Chiapas con su ambiente bohemio, hasta <strong>Tepoztlán</strong> en Morelos con su misticismo y pirámide, o <strong>Valle de Bravo</strong> en el Estado de México, ideal para deportes acuáticos. Hay un Pueblo Mágico para cada gusto.</p>
      <p>¡Anímate a descubrir la magia de estos rincones de México!</p>
    `,
  },
  {
    id: 'rafting-veracruz',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Aventura Extrema: Rafting en los Ríos de Veracruz',
    description: 'Si buscas adrenalina, el rafting en los ríos de Veracruz es para ti. Prepárate para una emocionante aventura acuática rodeado de paisajes exuberantes.',
    fullContent: `
      <p class="mb-4">Para los amantes de la adrenalina y la naturaleza, el rafting en los ríos de Veracruz es una experiencia que no te puedes perder. Sus caudalosos ríos ofrecen rápidos emocionantes y paisajes exuberantes.</p>
      <h3 class="text-2xl font-semibold mb-3">Ríos para Todos los Niveles</h3>
      <p class="mb-4">Veracruz cuenta con ríos como el <strong>Río Pescados (Antigua)</strong> y el <strong>Río Filobobos</strong>, que ofrecen diferentes niveles de dificultad, desde principiantes hasta expertos. Siempre acompañado de guías certificados y con el equipo de seguridad necesario.</p>
      <h3 class="text-2xl font-semibold mb-3">Naturaleza y Aventura</h3>
      <p class="mb-4">Además de la emoción de los rápidos, disfrutarás de la impresionante vegetación tropical, la observación de aves y la posibilidad de explorar cascadas y pozas naturales. Es una aventura completa que combina deporte y ecoturismo.</p>
      <p>¡Prepárate para mojarte y vivir una experiencia inolvidable en Veracruz!</p>
    `,
  },
];

const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const post = blogPostsData.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
        <h1 className="text-4xl font-bold mb-4">Entrada de Blog no encontrada</h1>
        <p className="text-xl mb-6">Lo sentimos, la entrada de blog que buscas no existe.</p>
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Blog
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
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Blog
            </Link>
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="relative h-64 md:h-96 w-full">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-6">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                {post.title}
              </h1>
            </div>
          </div>

          <div className="p-6 md:p-8 lg:p-10 prose prose-lg max-w-none"> {/* Usamos 'prose' para estilos de contenido */}
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              {post.description}
            </p>
            <div dangerouslySetInnerHTML={{ __html: post.fullContent }} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPostPage;