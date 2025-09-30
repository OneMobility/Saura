"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';

interface Provider {
  id?: string;
  name: string;
  service_type: string;
  cost_per_unit: number;
  unit_type: string;
  selling_price_per_unit: number;
  is_active: boolean;
}

interface ProviderFormProps {
  providerId?: string; // Optional providerId for editing existing providers
  onSave: () => void; // Callback to redirect after saving
}

const ProviderForm: React.FC<ProviderFormProps> = ({ providerId, onSave }) => {
  const [formData, setFormData] = useState<Provider>({
    name: '',
    service_type: '',
    cost_per_unit: 0,
    unit_type: 'person',
    selling_price_per_unit: 0,
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  useEffect(() => {
    const fetchProviderData = async () => {
      if (providerId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('providers')
          .select('*')
          .eq('id', providerId)
          .single();

        if (error) {
          console.error('Error fetching provider for editing:', error);
          toast.error('Error al cargar los datos del proveedor para editar.');
          setLoadingInitialData(false);
          return;
        }

        if (data) {
          setFormData(data);
        }
      } else {
        // Reset form for new provider
        setFormData({
          name: '',
          service_type: '',
          cost_per_unit: 0,
          unit_type: 'person',
          selling_price_per_unit: 0,
          is_active: true,
        });
      }
      setLoadingInitialData(false);
    };

    fetchProviderData();
  }, [providerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (id: keyof Provider, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.service_type) {
      toast.error('Por favor, rellena el nombre y el tipo de servicio del proveedor.');
      setIsSubmitting(false);
      return;
    }

    if (formData.cost_per_unit < 0 || formData.selling_price_per_unit < 0) {
      toast.error('Los costos y precios de venta no pueden ser negativos.');
      setIsSubmitting(false);
      return;
    }

    const dataToSave = {
      name: formData.name,
      service_type: formData.service_type,
      cost_per_unit: formData.cost_per_unit,
      unit_type: formData.unit_type,
      selling_price_per_unit: formData.selling_price_per_unit,
      is_active: formData.is_active,
    };

    if (providerId) {
      // Update existing provider
      const { error } = await supabase
        .from('providers')
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', providerId);

      if (error) {
        console.error('Error al actualizar el proveedor:', error);
        toast.error('Error al actualizar el proveedor.');
      } else {
        toast.success('Proveedor actualizado con éxito.');
        onSave();
      }
    } else {
      // Insert new provider
      const { error } = await supabase
        .from('providers')
        .insert(dataToSave);

      if (error) {
        console.error('Error al crear el proveedor:', error);
        toast.error('Error al crear el proveedor.');
      } else {
        toast.success('Proveedor creado con éxito.');
        onSave();
      }
    }
    setIsSubmitting(false);
  };

  if (loadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario del proveedor...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{providerId ? 'Editar Proveedor' : 'Añadir Nuevo Proveedor'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Nombre del Proveedor
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
          <Label htmlFor="service_type" className="text-right">
            Tipo de Servicio
          </Label>
          <Input
            id="service_type"
            value={formData.service_type}
            onChange={handleChange}
            className="col-span-3"
            placeholder="Ej: Lancha, Guía, Transporte Local, Actividad"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="cost_per_unit" className="text-right">
            Costo por Unidad (Agencia)
          </Label>
          <Input
            id="cost_per_unit"
            type="number"
            value={formData.cost_per_unit}
            onChange={handleChange}
            className="col-span-3"
            min={0}
            step="0.01"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="unit_type" className="text-right">
            Tipo de Unidad
          </Label>
          <Select value={formData.unit_type} onValueChange={(value) => handleSelectChange('unit_type', value)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Seleccionar tipo de unidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="person">Por Persona</SelectItem>
              <SelectItem value="group">Por Grupo</SelectItem>
              <SelectItem value="hour">Por Hora</SelectItem>
              <SelectItem value="day">Por Día</SelectItem>
              <SelectItem value="fixed">Fijo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="selling_price_per_unit" className="text-right">
            Precio Venta por Unidad (Cliente)
          </Label>
          <Input
            id="selling_price_per_unit"
            type="number"
            value={formData.selling_price_per_unit}
            onChange={handleChange}
            className="col-span-3"
            min={0}
            step="0.01"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4 mt-4">
          <Label htmlFor="is_active" className="text-right">
            Activo
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

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {providerId ? 'Guardar Cambios' : 'Añadir Proveedor'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProviderForm;