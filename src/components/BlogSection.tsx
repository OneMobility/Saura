"use client";

import React, { useEffect, useState } from 'react';
import BlogCard from './BlogCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface BlogPost {
  id: string;
  image_url: string;
  title: string;
  description: string;
  slug: string;
}

const BlogSection = () => {
  const [latestBlogs, setLatestBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestBlogPosts = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, image_url, title, description, slug')
        .order('created_at', { ascending: false }) // Get newest posts
        .limit(4); // Limit to 4 latest posts for the home section

      if (error) {
        console.error('Error fetching latest blog posts:', error);
        setError('Error al cargar las últimas entradas del blog.');
        setLatestBlogs([]);
      } else {
        setLatestBlogs(data || []);
      }
      setLoading(false);
    };

    fetchLatestBlogPosts();
  }, []);

  if (loading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-rosa-mexicano flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="ml-4 text-white text-xl">Cargando últimas entradas...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-16 bg-rosa-mexicano text-center text-red-300">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">
          Nuestro Blog
        </h2>
        <p className="text-xl">{error}</p>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16 bg-rosa-mexicano">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-10">
          Nuestro Blog
        </h2>
        {latestBlogs.length === 0 ? (
          <p className="text-center text-white text-lg">No hay entradas de blog disponibles en este momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {latestBlogs.map((post) => (
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
    </section>
  );
};

export default BlogSection;