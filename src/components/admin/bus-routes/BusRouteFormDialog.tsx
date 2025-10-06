"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BusRoute, BusRouteDestination, AvailableBus } from '@/types/shared';

interface BusDestinationOption {
  id: string;
  name: string;
  order_index: number;
}

interface BusRouteFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh route list
  initialData?: BusRoute | null;
}

const BusRouteFormDialog: React.FC<BusRouteFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<BusRoute>({
    name: '',
    origin_destination_id: null, // NEW: Initialize origin_destination_id
    bus_id: null,
    destinations: [],
    adult_price_per_seat: 0, // NEW: Initialize adult price
    child_price_per_seat: 0, // NEW: Initialize child price
    is_active: true, // Keep for internal logic, but not exposed in form
  });
  const [availableBuses, setAvailableBuses] = useState<AvailableBus[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<BusDestinationOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDependencies, setLoadingDependencies] = useState(true);

  useEffect(() => {
    const fetchDependencies = async () => {
      setLoadingDependencies(true);
      const [busesRes, destinationsRes] = await Promise.all([
        supabase.from('buses').select('id, name, total_capacity, rental_cost').order('name', { ascending: true }),
        supabase.from('bus_destinations').select('id, name, order_index').order('order_index', { ascending: true }),
      ]);

      if (busesRes.error) {
        console.error('Error fetching buses:', busesRes.error);
        toast.error('Error al cargar los autobuses.');
      } else {
        setAvailableBuses(busesRes.data || []);
      }

      if (destinationsRes.error) {
        console.error('Error fetching destinations:', destinationsRes.error);
        toast.error('Error al cargar los destinos.');
      } else {
        setAvailableDestinations(destinationsRes.data || []);
      }
      setLoadingDependencies(false);
    };

    fetchDependencies();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        origin_destination_id: null,
        bus_id: null,
        destinations: [],
        adult_price_per_seat: 0,
        child_price_per_seat: 0,
        is_active: true,
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (id: keyof BusRoute, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleDestinationChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newDestinations = [...prev.destinations];
      const selectedDest = availableDestinations.find(d => d.id === value);
      if (selectedDest) {
        newDestinations[index] = {
          id: selectedDest.id,
          name: selectedDest.name,
          order_index: selectedDest.order_index,
        };
      }
      return { ...prev, destinations: newDestinations };
    });
  };

  const addDestination = () => {
    setFormData((prev) => ({
      ...prev,
      destinations: [...prev.destinations, { id: '', name: '', order_index: 0 }],
    }));
  };

  const removeDestination = (index: number) => {
    setFormData((prev) => {
      const newDestinations = [...prev.destinations];
      newDestinations.splice(index, 1);
      return { ...prev, destinations: newDestinations };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.bus_id || !formData.origin_destination_id || formData.destinations.length === 0 || formData.adult_price_per_seat <= 0) {
      toast.error('Por favor, rellena todos los campos obligatorios (Nombre, Autobús, Origen, Destinos, Precio Adulto).');
      setIsSubmitting(false);
      return;
    }

    if (formData.destinations.some(d => !d.id)) {
      toast.error('Por favor, selecciona un destino válido para cada entrada de destino.');
      setIsSubmitting(false);
      return;
    }

    const dataToSave = {
      name: formData.name,
      origin_destination_id: formData.origin_destination_id,
      bus_id: formData.bus_id,
      destinations: formData.destinations,
      adult_price_per_seat: formData.adult_price_per_seat,
      child_price_per_seat: formData.child_price_per_seat,
      is_active: formData.is_active, // Keep is_active for DB, even if not in form
    };

    if (initialData?.id) {
      const { error } = await supabase
        .from('bus_routes')
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating bus route:', error);
        toast.error('Error al actualizar la ruta de autobús.');
      } else {
        toast.success('Ruta de autobús actualizada con éxito.');
        onSave();
        onClose();
      }
    } else {
      const { error } = await supabase
        .from('bus_routes')
        .insert(dataToSave);

      if (error) {
        console.error('Error adding bus route:', error);
        toast.error('Error al añadir la ruta de autobús.');
      } else {
        toast.success('Ruta de autobús añadida con éxito.');
        onSave();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  if (loadingDependencies) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{initialData ? 'Editar Ruta de Autobús' : 'Añadir Nueva Ruta de Autobús'}</DialogTitle>
            <DialogDescription>Cargando dependencias...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Ruta de Autobús' : 'Añadir Nueva Ruta de Autobús'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles de la ruta.' : 'Rellena los campos para añadir una nueva ruta de autobús.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre de la Ruta
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
            <Label htmlFor="bus_id" className="text-right">
              Autobús Asignado
            </Label>
            <Select value={formData.bus_id || ''} onValueChange={(value) => handleSelectChange('bus_id', value)} required>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar un autobús" />
              </SelectTrigger>
              <SelectContent>
                {availableBuses.map((bus) => (
                  <SelectItem key={bus.id} value={bus.id}>
                    {bus.name} (Capacidad: {bus.total_capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="origin_destination_id" className="text-right">
              Origen
            </Label>
            <Select value={formData.origin_destination_id || ''} onValueChange={(value) => handleSelectChange('origin_destination_id', value)} required>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar destino de origen" />
              </SelectTrigger>
              <SelectContent>
                {availableDestinations.map((dest) => (
                  <SelectItem key={dest.id} value={dest.id}>
                    {dest.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-full">
            <Label className="text-lg font-semibold">Destinos (Paradas)</Label>
            {formData.destinations.map((dest, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={dest.id}
                  onValueChange={(value) => handleDestinationChange(index, value)}
                >
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder="Seleccionar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDestinations.map((availableDest) => (
                      <SelectItem key={availableDest.id} value={availableDest.id}>
                        {availableDest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeDestination(index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addDestination}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Destino
            </Button>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="adult_price_per_seat" className="text-right">
              Precio por Asiento (Adulto)
            </Label>
            <Input
              id="adult_price_per_seat"
              type="number"
              value={formData.adult_price_per_seat}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="child_price_per_seat" className="text-right">
              Precio por Asiento (Niño)
            </Label>
            <Input
              id="child_price_per_seat"
              type="number"
              value={formData.child_price_per_seat}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
            />
          </div>
          {/* Removed description, departure_time, arrival_time, is_active from form */}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {initialData ? 'Guardar Cambios' : 'Añadir Ruta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusRouteFormDialog;