"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  full_content: string;
  video_url?: string | null; // NEW: Added video_url
  user_id?: string;
}

interface BlogFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh blog list
  initialData?: BlogPost | null;
}

const BlogFormDialog: React.FC<BlogFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    full_content: '',
    video_url: '', // Initialize video_url
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setImageUrlPreview(initialData.image_url);
    } else {
      setFormData({
        title: '',
        slug: '',
        description: '',
        image_url: '',
        full_content: '',
        video_url: '',
      });
      setImageFile(null);
      setImageUrlPreview('');
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (id === 'title') {
      setFormData((prev) => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with single dash
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrlPreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImageUrlPreview(formData.image_url || '');
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `blog-images/${fileName}`; // Store in a 'blog-images' folder within the bucket

    const { data, error } = await supabase.storage
      .from('tour-images') // Changed to 'tour-images' bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    setIsUploadingImage(false);

    if (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen.');
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('tour-images') // Changed to 'tour-images' bucket
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalImageUrl = formData.image_url;

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    } else if (!formData.image_url && !initialData?.image_url) { // Ensure image is present for new posts or if it was cleared
      toast.error('Por favor, sube una imagen de portada.');
      setIsSubmitting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debes iniciar sesión para crear o editar entradas de blog.');
      setIsSubmitting(false);
      return;
    }

    const blogPostData = {
      title: formData.title,
      slug: formData.slug,
      description: formData.description,
      image_url: finalImageUrl,
      full_content: formData.full_content,
      video_url: formData.video_url || null, // Save video_url
      user_id: user.id,
    };

    if (initialData?.id) {
      // Update existing blog post
      const { error } = await supabase
        .from('blog_posts')
        .update({ ...blogPostData, updated_at: new Date().toISOString() })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating blog post:', error);
        toast.error('Error al actualizar la entrada del blog.');
      } else {
        toast.success('Entrada del blog actualizada con éxito.');
        onSave();
        onClose();
      }
    } else {
      // Insert new blog post
      const { error } = await supabase
        .from('blog_posts')
        .insert(blogPostData);

      if (error) {
        console.error('Error creating blog post:', error);
        toast.error('Error al crear la entrada del blog.');
      } else {
        toast.success('Entrada del blog creada con éxito.');
        onSave();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Entrada de Blog' : 'Crear Nueva Entrada de Blog'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles de la entrada del blog.' : 'Rellena los campos para crear una nueva entrada de blog.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Título
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="slug" className="text-right">
              Slug (URL)
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={handleChange}
              className="col-span-3"
              placeholder="titulo-de-la-entrada"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descripción Corta
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="col-span-3"
              rows={3}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image_file" className="text-right">
              Imagen de Portada
            </Label>
            <div className="col-span-3 flex flex-col gap-2">
              <Input
                id="image_file"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="file:text-rosa-mexicano file:font-semibold file:border-0 file:bg-transparent file:mr-4"
              />
              {imageUrlPreview && (
                <div className="mt-2">
                  <img src={imageUrlPreview} alt="Vista previa" className="w-48 h-32 object-cover rounded-md" />
                </div>
              )}
              {!imageFile && !imageUrlPreview && (
                <p className="text-sm text-gray-500">Sube una imagen para la portada del blog.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="video_url" className="text-right">
              URL de Video (YouTube/TikTok)
            </Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url || ''}
              onChange={handleChange}
              className="col-span-3"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="full_content" className="text-right pt-2">
              Contenido Completo
            </Label>
            <Textarea
              id="full_content"
              value={formData.full_content}
              onChange={handleChange}
              className="col-span-3 min-h-[200px]"
              placeholder="Escribe el contenido completo de tu entrada de blog aquí. Puedes usar HTML básico."
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isUploadingImage ? 'Subiendo imagen...' : (initialData ? 'Guardar Cambios' : 'Crear Entrada')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlogFormDialog;