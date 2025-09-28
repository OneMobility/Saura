"use client";

import React from 'react';
import BlogCard from './BlogCard';

interface BlogPost {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  // link: string; // No longer needed, using id to construct link
}

const latestBlogs: BlogPost[] = [
  {
    id: 'guia-riviera-maya', // Use a descriptive ID for the URL
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Guía Completa para tu Primer Viaje a la Riviera Maya',
    description: 'Descubre los secretos mejor guardados de la Riviera Maya, desde las playas paradisíacas hasta las antiguas ruinas mayas. Prepárate para una aventura inolvidable con nuestros consejos de expertos.',
    // link: '#',
  },
  {
    id: 'sierra-madre-occidental',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: '10 Razones para Explorar la Sierra Madre Occidental',
    description: 'La Sierra Madre Occidental ofrece paisajes impresionantes, cascadas ocultas y una rica biodiversidad. Te damos 10 razones para que tu próxima aventura sea en este majestuoso lugar.',
    // link: '#',
  },
  {
    id: 'oaxaca-culinario-cultural',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Oaxaca: Un Viaje Culinario y Cultural Inolvidable',
    description: 'Sumérgete en la vibrante cultura y la exquisita gastronomía de Oaxaca. Desde sus mercados tradicionales hasta sus festivales coloridos, cada rincón es una experiencia para los sentidos.',
    // link: '#',
  },
  {
    id: 'viajar-con-ninos',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Consejos Esenciales para Viajar con Niños Pequeños',
    description: 'Viajar con niños puede ser un desafío, pero con la planificación adecuada, puede ser una experiencia maravillosa. Aquí te compartimos nuestros mejores consejos para unas vacaciones familiares sin estrés.',
    // link: '#',
  },
];

const BlogSection = () => {
  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-rosa-mexicano">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-10">
          Nuestro Blog
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {latestBlogs.map((post) => (
            <BlogCard
              key={post.id}
              imageUrl={post.imageUrl}
              title={post.title}
              description={post.description}
              blogId={post.id} // Pass the id as blogId
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;