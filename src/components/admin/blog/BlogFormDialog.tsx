"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/RichTextEditor';
import { stripHtmlTags } from '@/utils/html';

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  full_content: string;
  video_url?: string | null;
  user_id?: string;
}

interface BlogFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: BlogPost | null;
}

const BlogFormDialog: React.FC<BlogFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    full_content: '',
    video_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        description: stripHtmlTags(initialData.description)
      });
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
    setFormData((prev) => {
      const updated = { ...prev, [id]: value };
      if (id === 'title') updated.slug = generateSlug(value);
      return updated;
    });
  };

  const handleRichTextChange = (content: string) => {
    setFormData((prev) => ({ ...prev, full_content: content }));
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
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
    const fileName = `${uuidv4()}-${file.name.replace(/\s/g, '_')}`;
    const { data, error } = await supabase.storage.from('tour-images').upload(`blog/${fileName}`, file);
    setIsUploadingImage(false);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(`blog/${fileName}`);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) { setIsSubmitting(false); return; }
      finalImageUrl = uploadedUrl;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const blogPostData = { ...formData, image_url: finalImageUrl, user_id: user?.id };

    const { error } = initialData?.id 
      ? await supabase.from('blog_posts').update({ ...blogPostData, updated_at: new Date().toISOString() }).eq('id', initialData.id)
      : await supabase.from('blog_posts').insert(blogPostData);

    if (error) toast.error('Error al guardar.');
    else { toast.success('Entrada guardada.'); onSave(); onClose(); }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Entrada de Blog' : 'Nueva Entrada'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Título</Label><Input id="title" value={formData.title} onChange={handleChange} required /></div>
          <div className="space-y-2"><Label>Slug (URL)</Label><Input id="slug" value={formData.slug} onChange={handleChange} required /></div>
          <div className="space-y-2"><Label>Resumen (Sin etiquetas HTML)</Label><Textarea id="description" value={formData.description} onChange={handleChange} placeholder="Breve texto para la tarjeta." required /></div>
          
          <div className="space-y-2">
            <Label>Imagen</Label>
            <Input type="file" accept="image/*" onChange={handleImageFileChange} />
            {imageUrlPreview && <img src={imageUrlPreview} className="w-48 h-32 object-cover rounded-md mt-2" />}
          </div>

          <div className="space-y-2"><Label>URL Video</Label><Input id="video_url" value={formData.video_url || ''} onChange={handleChange} /></div>
          
          <div className="space-y-2">
            <Label>Contenido Completo</Label>
            <RichTextEditor value={formData.full_content} onChange={handleRichTextChange} className="min-h-[200px]" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlogFormDialog;