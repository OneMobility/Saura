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

interface BusDestination {
  id?: string;
  name: string;
  description: string;
  image_url: string | null;
  order_index: number;
}

interface BusDestinationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh destination list
  initialData?: BusDestination | null;
}

const BusDestinationFormDialog: React.FC<BusDestinationFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<BusDestination>({
    name: '',
    description: '',
    image_url: null,
    order_index: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setImageUrlPreview(initialData.image_url || '');
    } else {
      setFormData({
        name: '',
        description: '',
        image_url: null,
        order_index: 0,
      });
      setImageFile(null);
      setImageUrlPreview('');
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [id]: id === 'order_index' ? parseFloat(value) || 0 : value 
    }));
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
    const filePath = `bus-destinations/${fileName}`;

    const { data, error } = await supabase.storage
      .from('tour-images') // Using the existing 'tour-images' bucket
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
      .from('tour-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.description) {
      toast.error('Por favor, rellena el nombre y la descripción del destino.');
      setIsSubmitting(false);
      return;
    }

    let finalImageUrl = formData.image_url;

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    } else if (imageUrlPreview === '' && formData.image_url) {
      finalImageUrl = null; // User cleared the image
    } else if (!formData.image_url && !initialData?.image_url) {
      toast.error('Por favor, sube una imagen para el destino.');
      setIsSubmitting(false);
      return;
    }

    const dataToSave = {
      name: formData.name,
      description: formData.description,
      image_url: finalImageUrl,
      order_index: formData.order_index,
    };

    if (initialData?.id) {
      const { error } = await supabase
        .from('bus_destinations')
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating bus destination:', error);
        toast.error('Error al actualizar el destino de autobús.');
      } else {
        toast.success('Destino de autobús actualizado con éxito.');
        onSave();
        onClose();
      }
    } else {
      const { data, error } = await supabase
        .from('bus_destinations')
        .insert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error('Error adding bus destination:', error);
        toast.error('Error al añadir el destino de autobús.');
      } else if (data) {
        toast.success('Destino de autobús añadido con éxito.');
        onSave();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Destino de Autobús' : 'Añadir Nuevo Destino de Autobús'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles del destino.' : 'Rellena los campos para añadir un nuevo destino de autobús.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="col-span-3 min-h-[100px]"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image_file" className="text-right">
              Imagen
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
                <p className="text-sm text-gray-500">Sube una imagen para el destino.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="order_index" className="text-right">
              Orden
            </Label>
            <Input
              id="order_index"
              type="text" // Changed to text
              pattern="[0-9]*" // Pattern for integers
              value={formData.order_index}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isUploadingImage ? 'Subiendo imagen...' : (initialData ? 'Guardar Cambios' : 'Añadir Destino')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusDestinationFormDialog;