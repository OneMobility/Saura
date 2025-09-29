"use client";

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BlogCard from '@/components/BlogCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface BlogPost {
  id: string;
  image_url: string; // Changed to image_url to match Supabase column name
  title: string;
  description: string;
  slug: string; // Added slug for linking
}

const BlogPage = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, image_url, title, description, slug')
        .order('created_at', { ascending: false }); // Order by creation date, newest first

      if (error) {
        console.error('Error fetching blog posts for BlogPage:', error);
        setError('Error al cargar las entradas del blog.');
        setBlogPosts([]);
      } else {
        setBlogPosts(data || []);
      }
      setLoading(false);
    };

    fetchBlogPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-12 px-4 md:px-8 lg:px-16 bg-white flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="ml-4 text-gray-700 text-xl">Cargando entradas del blog...</p>
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
      <main className="flex-grow py-12 px-4 md:px-8 lg:px-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-12">
            Nuestro Blog de Viajes
          </h1>
          {blogPosts.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">No hay entradas de blog disponibles en este momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <BlogCard
                  key={post.id}
                  imageUrl={post.image_url}
                  title={post.title}
                  description={post.description}
                  blogId={post.slug} // Use slug for the link
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;