"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { Loader2 } from 'lucide-react'; // Import Loader2 for loading state
import { useEffect, useState } from 'react';

interface BlogPost {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  fullContent: string;
  video_url?: string | null; // NEW: Added video_url
}

// Helper function to get embed URL for YouTube/TikTok
const getEmbedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  // YouTube
  const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/);
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // TikTok
  const tiktokMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com)\/@(?:[\w.-]+)\/video\/(\d+)(?:\S+)?/);
  if (tiktokMatch && tiktokMatch[1]) {
    // TikTok embed requires a specific format, often with a script.
    // For simplicity, we'll use a generic embed URL if available, or just the direct link.
    // A more robust solution might involve fetching embed code from TikTok's oEmbed API.
    // For now, we'll use a simple iframe approach which might not always work perfectly without their script.
    return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}?lang=es-ES`;
  }

  return null;
};

const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogPost = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', id) // Fetch by slug
        .single();

      if (error) {
        console.error('Error fetching blog post:', error);
        setError('No se pudo cargar la entrada del blog.');
        setPost(null);
      } else if (data) {
        setPost({
          id: data.id,
          imageUrl: data.image_url,
          title: data.title,
          description: data.description,
          fullContent: data.full_content,
          video_url: data.video_url,
        });
      } else {
        setError('Entrada de blog no encontrada.');
        setPost(null);
      }
      setLoading(false);
    };

    if (id) {
      fetchBlogPost();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="mt-4 text-xl">Cargando entrada del blog...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
        <h1 className="text-4xl font-bold mb-4">Error</h1>
        <p className="text-xl mb-6">{error || 'Lo sentimos, la entrada de blog que buscas no existe.'}</p>
        <Button asChild className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
          <Link to="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Blog
          </Link>
        </Button>
      </div>
    );
  }

  const embedVideoUrl = getEmbedUrl(post.video_url);

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

          <div className="p-6 md:p-8 lg:p-10 prose prose-lg max-w-none">
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              {post.description}
            </p>

            {embedVideoUrl && (
              <div className="my-8">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
                  <iframe
                    src={embedVideoUrl}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
                    title="Embedded video"
                  ></iframe>
                </div>
              </div>
            )}

            <div dangerouslySetInnerHTML={{ __html: post.fullContent }} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPostPage;