"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import BlogFormDialog from './BlogFormDialog'; // Import the form dialog

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  created_at: string;
  full_content: string; // Include full_content for editing
}

const BlogPostsTable = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const fetchBlogPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts:', error);
      toast.error('Error al cargar las entradas del blog.');
    } else {
      setBlogPosts(data || []);
    }
    setLoading(false);
  };

  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setIsEditDialogOpen(true);
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta entrada del blog?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting blog post:', error);
      toast.error('Error al eliminar la entrada del blog.');
    } else {
      toast.success('Entrada del blog eliminada con éxito.');
      fetchBlogPosts(); // Refresh the list
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando entradas del blog...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Entradas de Blog Existentes</h2>
      {blogPosts.length === 0 ? (
        <p className="text-gray-600">No hay entradas de blog configuradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Imagen</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blogPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{post.slug}</TableCell>
                  <TableCell className="line-clamp-2 max-w-[200px]">{post.description}</TableCell>
                  <TableCell>
                    <img src={post.image_url} alt={post.title} className="w-20 h-12 object-cover rounded-md" />
                  </TableCell>
                  <TableCell>{new Date(post.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditPost(post)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {selectedPost && (
        <BlogFormDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={fetchBlogPosts}
          initialData={selectedPost}
        />
      )}
    </div>
  );
};

export default BlogPostsTable;