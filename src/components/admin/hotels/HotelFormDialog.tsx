"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';

interface Hotel {
  id?: string;
  name: string;
  location: string;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  is_active: boolean;
}

interface HotelFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh hotel list
  initialData?: Hotel | null;
}

const HotelFormDialog: React.FC<HotelFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Hotel>({
    name: '',
    location: '',
    cost_per_night_double: 0,
    cost_per_night_triple: 0,
    cost_per_night_quad: 0,
    capacity_double: 2, // Fixed capacity
    capacity_triple: 3, // Fixed capacity
    capacity_quad: 4,   // Fixed capacity
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        location: '',
        cost_per_night_double: 0,
        cost_per_night_triple: 0,
        cost_per_night_quad: 0,
        capacity_double: 2,
        capacity_triple: 3,
        capacity_quad: 4,
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

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.location) {
      toast.error('Por favor, rellena el nombre y la ubicación del hotel.');
      setIsSubmitting(false);
      return;
    }

    if (formData.cost_per_night_double < 0 || formData.cost_per_night_triple < 0 || formData.cost_per_night_quad < 0) {
      toast.error('Los costos por noche no pueden ser negativos.');
      setIsSubmitting(false);
      return;
    }

    if (initialData?.id) {
      // Update existing hotel
      const { error } = await supabase
        .from('hotels')
        .update({
          name: formData.name,
          location: formData.location,
          cost_per_night_double: formData.cost_per_night_double,
          cost_per_night_triple: formData.cost_per_night_triple,
          cost_per_night_quad: formData.cost_per_night_quad,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating hotel:', error);
        toast.error('Error al actualizar el hotel.');
      } else {
        toast.success('Hotel actualizado con éxito.');
        onSave();
        onClose();
      }
    } else {
      // Insert new hotel
      const { error } = await supabase
        .from('hotels')
        .insert({
          name: formData.name,
          location: formData.location,
          cost_per_night_double: formData.cost_per_night_double,
          cost_per_night_triple: formData.cost_per_night_triple,
          cost_per_night_quad: formData.cost_per_night_quad,
          capacity_double: formData.capacity_double,
          capacity_triple: formData.capacity_triple,
          capacity_quad: formData.capacity_quad,
          is_active: formData.is_active,
        });

      if (error) {
        console.error('Error creating hotel:', error);
        toast.error('Error al crear el hotel.');
      } else {
        toast.success('Hotel creado con éxito.');
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
          <DialogTitle>{initialData ? 'Editar Hotel' : 'Añadir Nuevo Hotel'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles del hotel.' : 'Rellena los campos para añadir un nuevo hotel.'}
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Ubicación
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>

          <h3 className="col-span-4 text-lg font-semibold mt-4">Costos por Noche y Capacidad</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_double" className="text-right">
              Costo Doble (x{formData.capacity_double})
            </Label>
            <Input
              id="cost_per_night_double"
              type="number"
              value={formData.cost_per_night_double}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_triple" className="text-right">
              Costo Triple (x{formData.capacity_triple})
            </Label>
            <Input
              id="cost_per_night_triple"
              type="number"
              value={formData.cost_per_night_triple}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_quad" className="text-right">
              Costo Cuádruple (x{formData.capacity_quad})
            </Label>
            <Input
              id="cost_per_night_quad"
              type="number"
              value={formData.cost_per_night_quad}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="is_active" className="text-right">
              Activo para Tours
            </Label>
            <div className="col-span-3 flex items-center">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={handleSwitchChange}
              />
              <span className="ml-2 text-sm text-gray-600">
                {formData.is_active ? 'Sí' : 'No'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {initialData ? 'Guardar Cambios' : 'Añadir Hotel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HotelFormDialog;