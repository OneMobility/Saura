"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';

interface HotelOption {
  id: string;
  name: string;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  is_active: boolean;
}

interface TourHotelDetail {
  id: string; // Unique ID for this entry in the tour's hotel_details array
  hotel_id: string;
  hotel_name: string; // For display purposes
  room_type: 'double' | 'triple' | 'quad';
  num_nights: number;
  cost_per_person_calculated: number; // Calculated cost per person for this hotel entry
}

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
  hotel_details: TourHotelDetail[]; // Updated type
  provider_details: { name: string; service: string; cost: number }[];
  total_base_cost?: number;
  paying_clients_count?: number;
  cost_per_paying_person?: number;
  selling_price_per_person: number;
  user_id?: string;
}

interface TourFormProps {
  tourId?: string; // Optional tourId for editing existing tours
  onSave: () => void; // Callback to redirect after saving
}

const TourForm: React.FC<TourFormProps> = ({ tourId, onSave }) => {
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
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [availableHotels, setAvailableHotels] = useState<HotelOption[]>([]);

  // Fetch available hotels
  useEffect(() => {
    const fetchAvailableHotels = async () => {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching available hotels:', error);
        toast.error('Error al cargar la lista de hoteles disponibles.');
      } else {
        setAvailableHotels(data || []);
      }
    };
    fetchAvailableHotels();
  }, []);

  useEffect(() => {
    const fetchTourData = async () => {
      if (tourId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('tours')
          .select('*')
          .eq('id', tourId)
          .single();

        if (error) {
          console.error('Error fetching tour for editing:', error);
          toast.error('Error al cargar los datos del tour para editar.');
          setLoadingInitialData(false);
          return;
        }

        if (data) {
          setFormData({
            ...data,
            includes: data.includes || [],
            itinerary: data.itinerary || [],
            hotel_details: data.hotel_details || [],
            provider_details: data.provider_details || [],
          });
          setImageUrlPreview(data.image_url);
        }
      } else {
        // Reset form for new tour
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
      setLoadingInitialData(false);
    };

    fetchTourData();
  }, [tourId]);

  const calculateCosts = useCallback(() => {
    const totalProviderCost = formData.provider_details.reduce((sum, provider) => sum + provider.cost, 0);
    
    // Calculate total hotel cost per person
    const totalHotelCostPerPerson = formData.hotel_details.reduce((sum, hotelDetail) => {
      const hotel = availableHotels.find(h => h.id === hotelDetail.hotel_id);
      if (!hotel) return sum;

      let costPerNight = 0;
      let capacity = 0;

      switch (hotelDetail.room_type) {
        case 'double':
          costPerNight = hotel.cost_per_night_double;
          capacity = hotel.capacity_double;
          break;
        case 'triple':
          costPerNight = hotel.cost_per_night_triple;
          capacity = hotel.capacity_triple;
          break;
        case 'quad':
          costPerNight = hotel.cost_per_night_quad;
          capacity = hotel.capacity_quad;
          break;
        default:
          break;
      }

      if (capacity === 0) return sum; // Avoid division by zero

      const costPerPerson = (costPerNight * hotelDetail.num_nights) / capacity;
      // Update the calculated cost in the hotel_details array
      setFormData(prev => ({
        ...prev,
        hotel_details: prev.hotel_details.map(hd => 
          hd.id === hotelDetail.id ? { ...hd, cost_per_person_calculated: costPerPerson } : hd
        )
      }));
      return sum + costPerPerson;
    }, 0);

    const totalBaseCost = formData.bus_cost + totalProviderCost + totalHotelCostPerPerson;

    const payingClientsCount = formData.bus_capacity - formData.courtesies;
    const costPerPayingPerson = payingClientsCount > 0 ? totalBaseCost / payingClientsCount : 0;

    setFormData((prev) => ({
      ...prev,
      total_base_cost: totalBaseCost,
      paying_clients_count: payingClientsCount,
      cost_per_paying_person: costPerPayingPerson,
    }));
  }, [formData.bus_capacity, formData.bus_cost, formData.courtesies, formData.provider_details, formData.hotel_details, availableHotels]);

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

  const handleTourHotelChange = (index: number, field: keyof TourHotelDetail, value: string | number) => {
    setFormData((prev) => {
      const newHotelDetails = [...prev.hotel_details];
      const currentDetail = newHotelDetails[index];

      if (field === 'hotel_id') {
        const selectedHotel = availableHotels.find(h => h.id === value);
        newHotelDetails[index] = {
          ...currentDetail,
          hotel_id: value as string,
          hotel_name: selectedHotel?.name || '',
        };
      } else if (field === 'num_nights') {
        newHotelDetails[index] = { ...currentDetail, num_nights: value as number };
      } else if (field === 'room_type') {
        newHotelDetails[index] = { ...currentDetail, room_type: value as 'double' | 'triple' | 'quad' };
      }
      return { ...prev, hotel_details: newHotelDetails };
    });
  };

  const addTourHotelItem = () => {
    setFormData((prev) => ({
      ...prev,
      hotel_details: [...prev.hotel_details, {
        id: uuidv4(), // Unique ID for this entry
        hotel_id: '',
        hotel_name: '',
        room_type: 'double',
        num_nights: 1,
        cost_per_person_calculated: 0,
      }],
    }));
  };

  const removeTourHotelItem = (idToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      hotel_details: prev.hotel_details.filter((detail) => detail.id !== idToRemove),
    }));
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
    } else if (!formData.image_url && !tourId) { // Only require image for new tours if not already present
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
      total_base_cost: formData.total_base_cost,
      paying_clients_count: formData.paying_clients_count,
      cost_per_paying_person: formData.cost_per_paying_person,
    };

    if (tourId) {
      // Update existing tour
      const { error } = await supabase
        .from('tours')
        .update({ ...tourDataToSave, updated_at: new Date().toISOString() })
        .eq('id', tourId);

      if (error) {
        console.error('Error updating tour:', error);
        toast.error('Error al actualizar el tour.');
      } else {
        toast.success('Tour actualizado con éxito.');
        onSave(); // Call onSave to redirect
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
        onSave(); // Call onSave to redirect
      }
    }
    setIsSubmitting(false);
  };

  if (loadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario del tour...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{tourId ? 'Editar Tour' : 'Crear Nuevo Tour'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-6 py-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="md:text-right">Título</Label>
          <Input id="title" value={formData.title} onChange={handleChange} className="md:col-span-3" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="slug" className="md:text-right">Slug (URL)</Label>
          <Input id="slug" value={formData.slug} onChange={handleChange} className="md:col-span-3" placeholder="titulo-del-tour" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
          <Label htmlFor="description" className="md:text-right pt-2">Descripción Corta</Label>
          <Textarea id="description" value={formData.description} onChange={handleChange} className="md:col-span-3" rows={3} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
          <Label htmlFor="full_content" className="md:text-right pt-2">Contenido Completo</Label>
          <Textarea id="full_content" value={formData.full_content} onChange={handleChange} className="md:col-span-3 min-h-[150px]" placeholder="Descripción detallada del tour. Puedes usar HTML básico." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="image_file" className="md:text-right">Imagen de Portada</Label>
          <div className="md:col-span-3 flex flex-col gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="duration" className="md:text-right">Duración</Label>
          <Input id="duration" value={formData.duration} onChange={handleChange} className="md:col-span-3" placeholder="Ej: 7 días / 6 noches" required />
        </div>

        {/* Includes */}
        <div className="space-y-2 col-span-full">
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
        <div className="space-y-2 col-span-full">
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
        <h3 className="text-xl font-semibold col-span-full mt-4">Detalles de Costos y Capacidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="bus_capacity" className="md:text-right">Capacidad Autobús</Label>
          <Input id="bus_capacity" type="number" value={formData.bus_capacity} onChange={(e) => handleNumberChange('bus_capacity', e.target.value)} className="md:col-span-3" required min={1} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="bus_cost" className="md:text-right">Costo Autobús</Label>
          <Input id="bus_cost" type="number" value={formData.bus_cost} onChange={(e) => handleNumberChange('bus_cost', e.target.value)} className="md:col-span-3" required min={0} step="0.01" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
          <Label htmlFor="courtesies" className="md:text-right">Cortesías</Label>
          <Input id="courtesies" type="number" value={formData.courtesies} onChange={(e) => handleNumberChange('courtesies', e.target.value)} className="md:col-span-3" required min={0} />
        </div>

        {/* Hotel Details */}
        <div className="space-y-2 col-span-full">
          <Label className="text-lg font-semibold">Hoteles Vinculados</Label>
          {formData.hotel_details.map((hotelDetail, index) => (
            <div key={hotelDetail.id} className="flex flex-col md:flex-row items-center gap-2 border p-2 rounded-md">
              <Select
                value={hotelDetail.hotel_id}
                onValueChange={(value) => handleTourHotelChange(index, 'hotel_id', value)}
              >
                <SelectTrigger className="w-full md:w-1/3">
                  <SelectValue placeholder="Seleccionar Hotel" />
                </SelectTrigger>
                <SelectContent>
                  {availableHotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={hotelDetail.room_type}
                onValueChange={(value) => handleTourHotelChange(index, 'room_type', value)}
              >
                <SelectTrigger className="w-full md:w-1/4">
                  <SelectValue placeholder="Tipo Habitación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="double">Doble (x2)</SelectItem>
                  <SelectItem value="triple">Triple (x3)</SelectItem>
                  <SelectItem value="quad">Cuádruple (x4)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={hotelDetail.num_nights}
                onChange={(e) => handleTourHotelChange(index, 'num_nights', parseFloat(e.target.value) || 0)}
                placeholder="Noches"
                className="w-full md:w-1/6"
                min={1}
              />
              <div className="w-full md:w-1/4 text-sm text-gray-700">
                Costo/persona: ${hotelDetail.cost_per_person_calculated.toFixed(2)}
              </div>
              <Button type="button" variant="destructive" size="icon" onClick={() => removeTourHotelItem(hotelDetail.id)}>
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addTourHotelItem}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Hotel al Tour
          </Button>
        </div>

        {/* Provider Details */}
        <div className="space-y-2 col-span-full">
          <Label className="text-lg font-semibold">Proveedores</Label>
          {formData.provider_details.map((provider, index) => (
            <div key={index} className="flex flex-col md:flex-row items-center gap-2">
              <Input
                value={provider.name}
                onChange={(e) => handleProviderChange(index, 'name', e.target.value)}
                placeholder="Nombre del Proveedor"
                className="w-full md:w-1/3"
              />
              <Input
                value={provider.service}
                onChange={(e) => handleProviderChange(index, 'service', e.target.value)}
                placeholder="Servicio Contratado"
                className="w-full md:w-1/3"
              />
              <Input
                type="number"
                value={provider.cost}
                onChange={(e) => handleProviderChange(index, 'cost', e.target.value)}
                placeholder="Costo"
                className="w-full md:w-1/3"
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
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
          <div>
            <Label className="font-semibold">Costo Base Total:</Label>
            <p>${formData.total_base_cost?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <Label className="font-semibold">Clientes Pagantes:</Label>
            <p>{formData.paying_clients_count || 0}</p>
          </div>
          <div className="md:col-span-2">
            <Label className="font-semibold">Costo por Persona Pagante:</Label>
            <p>${formData.cost_per_paying_person?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Selling Price */}
        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 mt-4">
          <Label htmlFor="selling_price_per_person" className="md:text-right font-bold text-lg">Precio de Venta por Persona</Label>
          <Input id="selling_price_per_person" type="number" value={formData.selling_price_per_person} onChange={(e) => handleNumberChange('selling_price_per_person', e.target.value)} className="md:col-span-3 text-lg font-bold" required min={0} step="0.01" />
        </div>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting || isUploadingImage}>
            {isSubmitting || isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isUploadingImage ? 'Subiendo imagen...' : (tourId ? 'Guardar Cambios' : 'Crear Tour')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TourForm;