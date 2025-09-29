"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Using Textarea for description if needed, though not in current schema
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Bus {
  id?: string;
  name: string;
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  seat_map_image_url: string | null;
}

interface BusFormProps {
  busId?: string; // Optional busId for editing existing buses
  onSave: () => void; // Callback to redirect after saving
}

const BusForm: React.FC<BusFormProps> = ({ busId, onSave }) => {
  const [formData, setFormData] = useState<Bus>({
    name: '',
    license_plate: '',
    rental_cost: 0,
    total_capacity: 0,
    seat_map_image_url: null,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  useEffect(() => {
    const fetchBusData = async () => {
      if (busId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('buses')
          .select('*')
          .eq('id', busId)
          .single();

        if (error) {
          console.error('Error al obtener autobús para editar:', error);
          toast.error('Error al cargar los datos del autobús para editar.');
          setLoadingInitialData(false);
          return;
        }

        if (data) {
          setFormData(data);
          setImageUrlPreview(data.seat_map_image_url || '');
        }
      } else {
        // Reset form for new bus
        setFormData({
          name: '',
          license_plate: '',
          rental_cost: 0,
          total_capacity: 0,
          seat_map_image_url: null,
        });
        setImageFile(null);
        setImageUrlPreview('');
      }
      setLoadingInitialData(false);
    };

    fetchBusData();
  }, [busId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrlPreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImageUrlPreview(formData.seat_map_image_url || '');
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `seat-maps/${fileName}`; // Store in a 'seat-maps' folder within the bucket

    const { data, error } = await supabase.storage
      .from('bus-seat-maps') // Use the new bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    setIsUploadingImage(false);

    if (error) {
      console.error('Error al subir la imagen:', error);
      toast.error('Error al subir la imagen del mapa de asientos.');
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('bus-seat-maps')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalImageUrl = formData.seat_map_image_url;

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    } else if (!formData.seat_map_image_url && !busId) { // Require image for new buses
      toast.error('Por favor, sube una imagen para el mapa de asientos.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.name || !formData.license_plate) {
      toast.error('Por favor, rellena el nombre y las placas del autobús.');
      setIsSubmitting(false);
      return;
    }

    if (formData.rental_cost < 0) {
      toast.error('El costo de renta no puede ser negativo.');
      setIsSubmitting(false);
      return;
    }

    if (formData.total_capacity <= 0) {
      toast.error('La capacidad total de asientos debe ser mayor que 0.');
      setIsSubmitting(false);
      return;
    }

    const busDataToSave = {
      name: formData.name,
      license_plate: formData.license_plate,
      rental_cost: formData.rental_cost,
      total_capacity: formData.total_capacity,
      seat_map_image_url: finalImageUrl,
    };

    if (busId) {
      // Update existing bus
      const { error } = await supabase
        .from('buses')
        .update({ ...busDataToSave, updated_at: new Date().toISOString() })
        .eq('id', busId);

      if (error) {
        console.error('Error al actualizar el autobús:', error);
        toast.error('Error al actualizar el autobús.');
      } else {
        toast.success('Autobús actualizado con éxito.');
        onSave();
      }
    } else {
      // Insert new bus
      const { error } = await supabase
        .from('buses')
        .insert(busDataToSave);

      if (error) {
        console.error('Error al crear el autobús:', error);
        toast.error('Error al crear el autobús.');
      } else {
        toast.success('Autobús creado con éxito.');
        onSave();
      }
    }
    setIsSubmitting(false);
  };

  if (loadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario del autobús...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{busId ? 'Editar Autobús' : 'Añadir Nuevo Autobús'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Nombre/Identificación
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="license_plate" className="text-right">
            Placas/Código Interno
          </Label>
          <Input
            id="license_plate"
            value={formData.license_plate}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="rental_cost" className="text-right">
            Costo de Renta Total
          </Label>
          <Input
            id="rental_cost"
            type="number"
            value={formData.rental_cost}
            onChange={handleChange}
            className="col-span-3"
            min={0}
            step="0.01"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="total_capacity" className="text-right">
            Capacidad Total de Asientos
          </Label>
          <Input
            id="total_capacity"
            type="number"
            value={formData.total_capacity}
            onChange={handleChange}
            className="col-span-3"
            min={1}
            required
          />
        </div>
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="seat_map_image_url" className="text-right">
            Imagen Mapa de Asientos
          </Label>
          <div className="col-span-3 flex flex-col gap-2">
            <Input
              id="seat_map_image_url"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="file:text-rosa-mexicano file:font-semibold file:border-0 file:bg-transparent file:mr-4"
            />
            {imageUrlPreview && (
              <div className="mt-2">
                <img src={imageUrlPreview} alt="Vista previa del mapa de asientos" className="w-48 h-32 object-cover rounded-md" />
              </div>
            )}
            {!imageFile && !imageUrlPreview && (
              <p className="text-sm text-gray-500">Sube una imagen para el mapa de asientos del autobús.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting || isUploadingImage}>
            {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isUploadingImage ? 'Subiendo imagen...' : (busId ? 'Guardar Cambios' : 'Añadir Autobús')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BusForm;