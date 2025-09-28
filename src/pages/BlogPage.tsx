"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogCard from '@/components/BlogCard';

interface BlogPost {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  link: string;
}

// Datos de ejemplo para las entradas del blog (reutilizados de BlogSection)
const allBlogPosts: BlogPost[] = [
  {
    id: 'blog-1',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Guía Completa para tu Primer Viaje a la Riviera Maya',
    description: 'Descubre los secretos mejor guardados de la Riviera Maya, desde las playas paradisíacas hasta las antiguas ruinas mayas. Prepárate para una aventura inolvidable con nuestros consejos de expertos.',
    link: '#',
  },
  {
    id: 'blog-2',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: '10 Razones para Explorar la Sierra Madre Occidental',
    description: 'La Sierra Madre Occidental ofrece paisajes impresionantes, cascadas ocultas y una rica biodiversidad. Te damos 10 razones para que tu próxima aventura sea en este majestuoso lugar.',
    link: '#',
  },
  {
    id: 'blog-3',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Oaxaca: Un Viaje Culinario y Cultural Inolvidable',
    description: 'Sumérgete en la vibrante cultura y la exquisita gastronomía de Oaxaca. Desde sus mercados tradicionales hasta sus festivales coloridos, cada rincón es una experiencia para los sentidos.',
    link: '#',
  },
  {
    id: 'blog-4',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Consejos Esenciales para Viajar con Niños Pequeños',
    description: 'Viajar con niños puede ser un desafío, pero con la planificación adecuada, puede ser una experiencia maravillosa. Aquí te compartimos nuestros mejores consejos para unas vacaciones familiares sin estrés.',
    link: '#',
  },
  {
    id: 'blog-5',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Descubre la Magia de los Pueblos Mágicos de México',
    description: 'México está lleno de encanto y tradición. Explora sus Pueblos Mágicos, donde la historia, la cultura y la belleza natural se unen para ofrecerte experiencias únicas.',
    link: '#',
  },
  {
    id: 'blog-6',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Aventura Extrema: Rafting en los Ríos de Veracruz',
    description: 'Si buscas adrenalina, el rafting en los ríos de Veracruz es para ti. Prepárate para una emocionante aventura acuática rodeado de paisajes exuberantes.',
    link: '#',
  },
];

const BlogPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow py-12 px-4 md:px-8 lg:px-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12">
            Nuestro Blog de Viajes
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allBlogPosts.map((post) => (
              <BlogCard
                key={post.id}
                imageUrl={post.imageUrl}
                title={post.title}
                description={post.description}
                link={post.link}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;