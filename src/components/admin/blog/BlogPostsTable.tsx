"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import BlogFormDialog from './BlogFormDialog';
import { stripHtmlTags } from '@/utils/html';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  created_at: string;
  full_content: string;
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
    if (!window.confirm('¿Eliminar esta entrada?')) return;
    setLoading(true);
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) toast.error('Error al eliminar.');
    else { toast.success('Eliminada.'); fetchBlogPosts(); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Entradas de Blog Existentes</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Imagen</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogPosts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell className="max-w-[300px] truncate text-xs text-gray-500">
                  {stripHtmlTags(post.description)}
                </TableCell>
                <TableCell><img src={post.image_url} className="w-16 h-10 object-cover rounded" /></TableCell>
                <TableCell className="text-xs">{new Date(post.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditPost(post)} className="text-blue-600"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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