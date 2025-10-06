"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BusRoute, BusRouteDestination, AvailableBus, RouteSegment } from '@/types/shared';

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
    all_stops: [], // Now an array of destination IDs
    bus_id: null,
    is_active: true, // Re-added
  });
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]); // State for segments
  const [availableBuses, setAvailableBuses] = useState<AvailableBus[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<BusDestinationOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDependencies, setLoadingDependencies] = useState(true);

  // Helper to get destination name from ID
  const getDestinationName = useCallback((id: string) => {
    return availableDestinations.find(d => d.id === id)?.name || 'Desconocido';
  }, [availableDestinations]);

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
      setFormData({
        ...initialData,
        all_stops: initialData.all_stops || [], // Ensure all_stops is an array
      });
      // Fetch existing segments for this route
      const fetchSegments = async () => {
        if (initialData.id) {
          const { data, error } = await supabase
            .from('route_segments')
            .select('*')
            .eq('route_id', initialData.id)
            .order('created_at', { ascending: true }); // Order by creation to maintain sequence

          if (error) {
            console.error('Error fetching route segments for initial data:', error);
            toast.error('Error al cargar los segmentos de la ruta.');
          } else {
            setRouteSegments(data || []);
          }
        }
      };
      fetchSegments();
    } else {
      setFormData({
        name: '',
        all_stops: [],
        bus_id: null,
        is_active: true,
      });
      setRouteSegments([]);
    }
  }, [initialData, isOpen]);

  // Effect to update route segments when all_stops changes
  useEffect(() => {
    if (formData.all_stops.length < 2) {
      setRouteSegments([]);
      return;
    }

    const newSegments: RouteSegment[] = [];
    for (let i = 0; i < formData.all_stops.length - 1; i++) {
      const start_destination_id = formData.all_stops[i];
      const end_destination_id = formData.all_stops[i + 1];

      // Try to find an existing segment for this pair
      const existingSegment = routeSegments.find(
        s => s.start_destination_id === start_destination_id && s.end_destination_id === end_destination_id
      );

      newSegments.push(existingSegment || {
        id: uuidv4(), // Assign a new UUID if it's a new segment
        route_id: formData.id || '', // Will be updated on save if new route
        start_destination_id,
        end_destination_id,
        adult_price: 0,
        child_price: 0,
        duration_minutes: null,
        distance_km: null,
      });
    }
    setRouteSegments(newSegments);
  }, [formData.all_stops, formData.id, routeSegments]); // Depend on routeSegments to preserve existing data

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

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const handleAllStopsChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newAllStops = [...prev.all_stops];
      newAllStops[index] = value;
      return { ...prev, all_stops: newAllStops };
    });
  };

  const addStop = () => {
    setFormData((prev) => ({
      ...prev,
      all_stops: [...prev.all_stops, ''],
    }));
  };

  const removeStop = (index: number) => {
    setFormData((prev) => {
      const newAllStops = [...prev.all_stops];
      newAllStops.splice(index, 1);
      return { ...prev, all_stops: newAllStops };
    });
  };

  const handleSegmentPriceChange = (segmentId: string, field: 'adult_price' | 'child_price' | 'duration_minutes' | 'distance_km', value: string) => {
    setRouteSegments(prev => prev.map(segment =>
      segment.id === segmentId
        ? { ...segment, [field]: parseFloat(value) || 0 }
        : segment
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.bus_id || formData.all_stops.length < 2) {
      toast.error('Por favor, rellena el nombre de la ruta, asigna un autobús y define al menos dos paradas.');
      setIsSubmitting(false);
      return;
    }

    if (formData.all_stops.some(stopId => !stopId)) {
      toast.error('Por favor, selecciona un destino válido para cada parada.');
      setIsSubmitting(false);
      return;
    }

    if (routeSegments.some(s => s.adult_price <= 0)) {
      toast.error('El precio para adultos debe ser mayor que cero para todos los segmentos.');
      setIsSubmitting(false);
      return;
    }

    let currentRouteId = formData.id;

    try {
      // 1. Save/Update the BusRoute
      const routeDataToSave = {
        name: formData.name,
        all_stops: formData.all_stops,
        bus_id: formData.bus_id,
        is_active: formData.is_active,
      };

      if (currentRouteId) {
        const { error } = await supabase
          .from('bus_routes')
          .update({ ...routeDataToSave, updated_at: new Date().toISOString() })
          .eq('id', currentRouteId);

        if (error) throw error;
        toast.success('Ruta de autobús actualizada con éxito.');
      } else {
        const { data, error } = await supabase
          .from('bus_routes')
          .insert(routeDataToSave)
          .select('id')
          .single();

        if (error) throw error;
        currentRouteId = data.id;
        toast.success('Ruta de autobús creada con éxito.');
      }

      // 2. Save/Update Route Segments
      if (currentRouteId) {
        // Delete old segments not present in newSegments
        const existingSegmentsForRoute = (await supabase.from('route_segments').select('id').eq('route_id', currentRouteId)).data || [];
        const existingSegmentIds = existingSegmentsForRoute.map(s => s.id);
        const segmentsToKeepIds = routeSegments.map(s => s.id);
        const segmentsToDelete = existingSegmentIds.filter(id => !segmentsToKeepIds.includes(id));
        
        if (segmentsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('route_segments')
            .delete()
            .in('id', segmentsToDelete);
          if (deleteError) console.error('Error deleting old segments:', deleteError);
        }

        // Upsert new and updated segments
        const segmentsToUpsert = routeSegments.map(segment => ({
          ...segment,
          route_id: currentRouteId, // Ensure route_id is set for all segments
        }));

        const { error: segmentsError } = await supabase
          .from('route_segments')
          .upsert(segmentsToUpsert, { onConflict: 'id' });

        if (segmentsError) throw segmentsError;
        toast.success('Segmentos de ruta actualizados con éxito.');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving bus route and segments:', error);
      toast.error(`Error al guardar la ruta: ${error.message || 'Error desconocido.'}`);
    } finally {
      setIsSubmitting(false);
    }
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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

          <div className="space-y-2 col-span-full">
            <Label className="text-lg font-semibold">Paradas de la Ruta (en orden)</Label>
            {formData.all_stops.map((stopId, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={stopId}
                  onValueChange={(value) => handleAllStopsChange(index, value)}
                >
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder={`Parada ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDestinations.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="destructive" size="icon" onClick={() => removeStop(index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addStop}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Parada
            </Button>
          </div>

          {formData.all_stops.length >= 2 && (
            <div className="space-y-4 col-span-full mt-6 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold">Configuración de Segmentos de Ruta</h3>
              {routeSegments.map((segment, index) => (
                <div key={segment.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center p-3 border-b last:border-b-0">
                  <div className="md:col-span-2 flex items-center space-x-2">
                    <span className="font-medium">{getDestinationName(segment.start_destination_id)}</span>
                    <ArrowRight className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{getDestinationName(segment.end_destination_id)}</span>
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor={`adult_price_${segment.id}`} className="sr-only">Precio Adulto</Label>
                    <Input
                      id={`adult_price_${segment.id}`}
                      type="number"
                      value={segment.adult_price}
                      onChange={(e) => handleSegmentPriceChange(segment.id as string, 'adult_price', e.target.value)}
                      placeholder="Precio Adulto"
                      min={0}
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor={`child_price_${segment.id}`} className="sr-only">Precio Niño</Label>
                    <Input
                      id={`child_price_${segment.id}`}
                      type="number"
                      value={segment.child_price}
                      onChange={(e) => handleSegmentPriceChange(segment.id as string, 'child_price', e.target.value)}
                      placeholder="Precio Niño"
                      min={0}
                      step="0.01"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor={`duration_${segment.id}`} className="sr-only">Duración (min)</Label>
                    <Input
                      id={`duration_${segment.id}`}
                      type="number"
                      value={segment.duration_minutes || ''}
                      onChange={(e) => handleSegmentPriceChange(segment.id as string, 'duration_minutes', e.target.value)}
                      placeholder="Duración (min)"
                      min={0}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor={`distance_${segment.id}`} className="sr-only">Distancia (km)</Label>
                    <Input
                      id={`distance_${segment.id}`}
                      type="number"
                      value={segment.distance_km || ''}
                      onChange={(e) => handleSegmentPriceChange(segment.id as string, 'distance_km', e.target.value)}
                      placeholder="Distancia (km)"
                      min={0}
                      step="0.1"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="is_active" className="text-right">
              Ruta Activa
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
              {initialData ? 'Guardar Cambios' : 'Añadir Ruta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusRouteFormDialog;