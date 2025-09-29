"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Tour {
  id?: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  full_content: string;
  duration: string;
  includes: string[];
  itinerary: { day: number; activity: string }[];
  bus_capacity: number;
  bus_cost: number;
  courtesies: number;
  hotel_details: { name: string; cost: number; capacity: number }[];
  provider_details: { name: string; service: string; cost: number }[];
  total_base_cost?: number;
  paying_clients_count?: number;
  cost_per_paying_person?: number;
  selling_price_per_person: number;
  user_id?: string;
}

interface TourFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: Tour | null;
}

const TourFormDialog: React.FC<TourFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Tour>({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    full_content: '',
    duration: '',
    includes: [],
    itinerary: [],
    bus_capacity: 0,
    bus_cost: 0,
    courtesies: 0,
    hotel_details: [],
    provider_details: [],
    selling_price_per_person: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        includes: initialData.includes || [],
        itinerary: initialData.itinerary || [],
        hotel_details: initialData.hotel_details || [],
        provider_details: initialData.provider_details || [],
      });
      setImageUrlPreview(initialData.image_url);
    } else {
      setFormData({
        title: '',
        slug: '',
        description: '',
        image_url: '',
        full_content: '',
        duration: '',
        includes: [],
        itinerary: [],
        bus_capacity: 0,
        bus_cost: 0,
        courtesies: 0,
        hotel_details: [],
        provider_details: [],
        selling_price_per_person: 0,
      });
      setImageFile(null);
      setImageUrlPreview('');
    }
  }, [initialData, isOpen]);

  const calculateCosts = useCallback(() => {
    const totalHotelCost = formData.hotel_details.reduce((sum, hotel) => sum + hotel.cost, 0);
    const totalProviderCost = formData.provider_details.reduce((sum, provider) => sum + provider.cost, 0);
    const totalBaseCost = formData.bus_cost + totalHotelCost + totalProviderCost;

    const payingClientsCount = formData.bus_capacity - formData.courtesies;
    const costPerPayingPerson = payingClientsCount > 0 ? totalBaseCost / payingClientsCount : 0;

    setFormData((prev) => ({
      ...prev,
      total_base_cost: totalBaseCost,
      paying_clients_count: payingClientsCount,
      cost_per_paying_person: costPerPayingPerson,
    }));
  }, [formData.bus_capacity, formData.bus_cost, formData.courtesies, formData.hotel_details, formData.provider_details]);

  useEffect(() => {
    calculateCosts();
  }, [calculateCosts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => {
      const newValue = type === 'number' ? parseFloat(value) : value;
      const updatedData = { ...prev, [id]: newValue };

      if (id === 'title') {
        updatedData.slug = generateSlug(value);
      }
      return updatedData;
    });
  };

  const handleNumberChange = (id: keyof Tour, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: parseFloat(value) || 0,
    }));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
    const filePath = `tour-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from('slideshow-images') // Reusing the existing bucket for simplicity
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
      .from('slideshow-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleArrayChange = (field: keyof Tour, index: number, value: string) => {
    setFormData((prev) => {
      const newArray = [...(prev[field] as string[])];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field: keyof Tour) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[]), ''],
    }));
  };

  const removeArrayItem = (field: keyof Tour, index: number) => {
    setFormData((prev) => {
      const newArray = [...(prev[field] as string[])];
      newArray.splice(index, 1);
      return { ...prev, [field]: newArray };
    });
  };

  const handleItineraryChange = (index: number, field: 'day' | 'activity', value: string) => {
    setFormData((prev) => {
      const newItinerary = [...prev.itinerary];
      if (field === 'day') {
        newItinerary[index] = { ...newItinerary[index], day: parseInt(value) || 0 };
      } else {
        newItinerary[index] = { ...newItinerary[index], activity: value };
      }
      return { ...prev, itinerary: newItinerary };
    });
  };

  const addItineraryItem = () => {
    setFormData((prev) => ({
      ...prev,
      itinerary: [...prev.itinerary, { day: prev.itinerary.length + 1, activity: '' }],
    }));
  };

  const removeItineraryItem = (index: number) => {
    setFormData((prev) => {
      const newItinerary = [...prev.itinerary];
      newItinerary.splice(index, 1);
      return { ...prev, itinerary: newItinerary.map((item, i) => ({ ...item, day: i + 1 })) };
    });
  };

  const handleHotelChange = (index: number, field: 'name' | 'cost' | 'capacity', value: string) => {
    setFormData((prev) => {
      const newHotels = [...prev.hotel_details];
      if (field === 'cost' || field === 'capacity') {
        newHotels[index] = { ...newHotels[index], [field]: parseFloat(value) || 0 };
      } else {
        newHotels[index] = { ...newHotels[index], [field]: value };
      }
      return { ...prev, hotel_details: newHotels };
    });
  };

  const addHotelItem = () => {
    setFormData((prev) => ({
      ...prev,
      hotel_details: [...prev.hotel_details, { name: '', cost: 0, capacity: 0 }],
    }));
  };

  const removeHotelItem = (index: number) => {
    setFormData((prev) => {
      const newHotels = [...prev.hotel_details];
      newHotels.splice(index, 1);
      return { ...prev, hotel_details: newHotels };
    });
  };

  const handleProviderChange = (index: number, field: 'name' | 'service' | 'cost', value: string) => {
    setFormData((prev) => {
      const newProviders = [...prev.provider_details];
      if (field === 'cost') {
        newProviders[index] = { ...newProviders[index], [field]: parseFloat(value) || 0 };
      } else {
        newProviders[index] = { ...newProviders[index], [field]: value };
      }
      return { ...prev, provider_details: newProviders };
    });
  };

  const addProviderItem = () => {
    setFormData((prev) => ({
      ...prev,
      provider_details: [...prev.provider_details, { name: '', service: '', cost: 0 }],
    }));
  };

  const removeProviderItem = (index: number) => {
    setFormData((prev) => {
      const newProviders = [...prev.provider_details];
      newProviders.splice(index, 1);
      return { ...prev, provider_details: newProviders };
    });
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
    } else if (!formData.image_url && !initialData?.image_url) {
      toast.error('Por favor, sube una imagen de portada.');
      setIsSubmitting(false);
      return;
    }

    if (formData.bus_capacity <= 0) {
      toast.error('La capacidad del autobús debe ser mayor que 0.');
      setIsSubmitting(false);
      return;
    }

    if (formData.courtesies >= formData.bus_capacity) {
      toast.error('El número de cortesías no puede ser igual o mayor que la capacidad del autobús.');
      setIsSubmitting(false);
      return;
    }

    if (formData.selling_price_per_person <= 0) {
      toast.error('El precio de venta por persona debe ser mayor que 0.');
      setIsSubmitting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debes iniciar sesión para crear o editar tours.');
      setIsSubmitting(false);
      return;
    }

    const tourDataToSave = {
      ...formData,
      image_url: finalImageUrl,
      user_id: user.id,
      // Ensure calculated fields are sent
      total_base_cost: formData.total_base_cost,
      paying_clients_count: formData.paying_clients_count,
      cost_per_paying_person: formData.cost_per_paying_person,
    };

    if (initialData?.id) {
      // Update existing tour
      const { error } = await supabase
        .from('tours')
        .update({ ...tourDataToSave, updated_at: new Date().toISOString() })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating tour:', error);
        toast.error('Error al actualizar el tour.');
      } else {
        toast.success('Tour actualizado con éxito.');
        onSave();
        onClose();
      }
    } else {
      // Insert new tour
      const { error } = await supabase
        .from('tours')
        .insert(tourDataToSave);

      if (error) {
        console.error('Error creating tour:', error);
        toast.error('Error al crear el tour.');
      } else {
        toast.success('Tour creado con éxito.');
        onSave();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Tour' : 'Crear Nuevo Tour'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles del tour.' : 'Rellena los campos para crear un nuevo tour.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Título</Label>
            <Input id="title" value={formData.title} onChange={handleChange} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="slug" className="text-right">Slug (URL)</Label>
            <Input id="slug" value={formData.slug} onChange={handleChange} className="col-span-3" placeholder="titulo-del-tour" required />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Descripción Corta</Label>
            <Textarea id="description" value={formData.description} onChange={handleChange} className="col-span-3" rows={3} required />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="full_content" className="text-right pt-2">Contenido Completo</Label>
            <Textarea id="full_content" value={formData.full_content} onChange={handleChange} className="col-span-3 min-h-[150px]" placeholder="Descripción detallada del tour. Puedes usar HTML básico." />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image_file" className="text-right">Imagen de Portada</Label>
            <div className="col-span-3 flex flex-col gap-2">
              <Input id="image_file" type="file" accept="image/*" onChange={handleImageFileChange} className="file:text-rosa-mexicano file:font-semibold file:border-0 file:bg-transparent file:mr-4" />
              {imageUrlPreview && (
                <div className="mt-2">
                  <img src={imageUrlPreview} alt="Vista previa" className="w-48 h-32 object-cover rounded-md" />
                </div>
              )}
              {!imageFile && !imageUrlPreview && (
                <p className="text-sm text-gray-500">Sube una imagen para la portada del tour.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duración</Label>
            <Input id="duration" value={formData.duration} onChange={handleChange} className="col-span-3" placeholder="Ej: 7 días / 6 noches" required />
          </div>

          {/* Includes */}
          <div className="space-y-2 col-span-4">
            <Label className="text-lg font-semibold">Qué Incluye</Label>
            {formData.includes.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) => handleArrayChange('includes', index, e.target.value)}
                  placeholder="Ej: Transporte aéreo y terrestre"
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => removeArrayItem('includes', index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addArrayItem('includes')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ítem
            </Button>
          </div>

          {/* Itinerary */}
          <div className="space-y-2 col-span-4">
            <Label className="text-lg font-semibold">Itinerario</Label>
            {formData.itinerary.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Label className="w-12">Día {item.day}:</Label>
                <Input
                  value={item.activity}
                  onChange={(e) => handleItineraryChange(index, 'activity', e.target.value)}
                  placeholder="Ej: Llegada a Cancún, traslado al hotel"
                  className="flex-grow"
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => removeItineraryItem(index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItineraryItem}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Día
            </Button>
          </div>

          {/* Cost & Capacity Details */}
          <h3 className="text-xl font-semibold col-span-4 mt-4">Detalles de Costos y Capacidad</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bus_capacity" className="text-right">Capacidad Autobús</Label>
            <Input id="bus_capacity" type="number" value={formData.bus_capacity} onChange={(e) => handleNumberChange('bus_capacity', e.target.value)} className="col-span-3" required min={1} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bus_cost" className="text-right">Costo Autobús</Label>
            <Input id="bus_cost" type="number" value={formData.bus_cost} onChange={(e) => handleNumberChange('bus_cost', e.target.value)} className="col-span-3" required min={0} step="0.01" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="courtesies" className="text-right">Cortesías</Label>
            <Input id="courtesies" type="number" value={formData.courtesies} onChange={(e) => handleNumberChange('courtesies', e.target.value)} className="col-span-3" required min={0} />
          </div>

          {/* Hotel Details */}
          <div className="space-y-2 col-span-4">
            <Label className="text-lg font-semibold">Hoteles Vinculados</Label>
            {formData.hotel_details.map((hotel, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={hotel.name}
                  onChange={(e) => handleHotelChange(index, 'name', e.target.value)}
                  placeholder="Nombre del Hotel"
                  className="w-1/3"
                />
                <Input
                  type="number"
                  value={hotel.cost}
                  onChange={(e) => handleHotelChange(index, 'cost', e.target.value)}
                  placeholder="Costo"
                  className="w-1/3"
                  min={0} step="0.01"
                />
                <Input
                  type="number"
                  value={hotel.capacity}
                  onChange={(e) => handleHotelChange(index, 'capacity', e.target.value)}
                  placeholder="Capacidad"
                  className="w-1/3"
                  min={0}
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => removeHotelItem(index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addHotelItem}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Hotel
            </Button>
          </div>

          {/* Provider Details */}
          <div className="space-y-2 col-span-4">
            <Label className="text-lg font-semibold">Proveedores</Label>
            {formData.provider_details.map((provider, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={provider.name}
                  onChange={(e) => handleProviderChange(index, 'name', e.target.value)}
                  placeholder="Nombre del Proveedor"
                  className="w-1/3"
                />
                <Input
                  value={provider.service}
                  onChange={(e) => handleProviderChange(index, 'service', e.target.value)}
                  placeholder="Servicio Contratado"
                  className="w-1/3"
                />
                <Input
                  type="number"
                  value={provider.cost}
                  onChange={(e) => handleProviderChange(index, 'cost', e.target.value)}
                  placeholder="Costo"
                  className="w-1/3"
                  min={0} step="0.01"
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => removeProviderItem(index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addProviderItem}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
            </Button>
          </div>

          {/* Calculated Costs */}
          <div className="col-span-4 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
            <div>
              <Label className="font-semibold">Costo Base Total:</Label>
              <p>${formData.total_base_cost?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <Label className="font-semibold">Clientes Pagantes:</Label>
              <p>{formData.paying_clients_count || 0}</p>
            </div>
            <div className="col-span-2">
              <Label className="font-semibold">Costo por Persona Pagante:</Label>
              <p>${formData.cost_per_paying_person?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          {/* Selling Price */}
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="selling_price_per_person" className="text-right font-bold text-lg">Precio de Venta por Persona</Label>
            <Input id="selling_price_per_person" type="number" value={formData.selling_price_per_person} onChange={(e) => handleNumberChange('selling_price_per_person', e.target.value)} className="col-span-3 text-lg font-bold" required min={0} step="0.01" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isUploadingImage ? 'Subiendo imagen...' : (initialData ? 'Guardar Cambios' : 'Crear Tour')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TourFormDialog;