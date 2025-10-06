"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BusRoute, BusRouteDestination, AvailableBus, RouteSegment } from '@/types/shared';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';

interface BusDestinationOption {
  id: string;
  name: string;
  order_index: number;
}

// Helper function to convert total minutes to "HH:MM" string
const minutesToHHMM = (totalMinutes: number | null): string => {
  if (totalMinutes === null || totalMinutes < 0) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper function to convert "HH:MM" string to total minutes
const hhmmToMinutes = (hhmm: string): number | null => {
  const parts = hhmm.split(':');
  if (parts.length === 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }
  return null;
};

const AdminBusRouteFormPage = () => {
  const { id: routeIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<BusRoute>({
    name: '',
    all_stops: [], // Now an array of destination IDs
    bus_id: null,
    is_active: true, // Re-added
  });
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]); // State for segments
  const [segmentDurationInputs, setSegmentDurationInputs] = useState<Record<string, string>>({}); // State for HH:MM duration inputs
  const [availableBuses, setAvailableBuses] = useState<AvailableBus[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<BusDestinationOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true); // This is the main loading state
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({}); // State for collapsible sections

  // Helper to get destination name from ID
  const getDestinationName = useCallback((id: string) => {
    return availableDestinations.find(d => d.id === id)?.name || 'Desconocido';
  }, [availableDestinations]);

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingInitialData(true); // Start loading

      // 1. Fetch dependencies (buses, destinations)
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

      // 2. If editing, fetch route data and its segments
      if (routeIdFromParams) {
        const { data, error } = await supabase
          .from('bus_routes')
          .select('*')
          .eq('id', routeIdFromParams)
          .single();

        if (error) {
          console.error('Error fetching route for editing:', error);
          toast.error('Error al cargar los datos de la ruta para editar.');
        } else if (data) {
          setFormData({
            ...data,
            all_stops: data.all_stops || [],
          });
          const { data: segmentsData, error: segmentsError } = await supabase
            .from('route_segments')
            .select('*')
            .eq('route_id', data.id)
            .order('created_at', { ascending: true });

          if (segmentsError) {
            console.error('Error fetching route segments for initial data:', segmentsError);
            toast.error('Error al cargar los segmentos de la ruta.');
          } else {
            setRouteSegments(segmentsData || []);
            const initialDurations: Record<string, string> = {};
            (segmentsData || []).forEach(segment => {
              if (segment.id) {
                initialDurations[segment.id] = minutesToHHMM(segment.duration_minutes);
              }
            });
            setSegmentDurationInputs(initialDurations);
          }
        }
      } else {
        // Reset form for new route
        setFormData({
          name: '',
          all_stops: [],
          bus_id: null,
          is_active: true,
        });
        setRouteSegments([]);
        setSegmentDurationInputs({});
      }
      setLoadingInitialData(false); // End loading
    };

    fetchData();
  }, [routeIdFromParams, user, isAdmin, navigate]); // Dependencies for this consolidated effect

  // Effect to update route segments when all_stops changes
  useEffect(() => {
    if (formData.all_stops.length < 2) {
      setRouteSegments([]);
      return;
    }

    const newSegmentsMap = new Map<string, RouteSegment>(); // Key: `${start_id}-${end_id}`
    const existingSegmentsMap = new Map<string, RouteSegment>();
    routeSegments.forEach(s => existingSegmentsMap.set(`${s.start_destination_id}-${s.end_destination_id}`, s));

    for (let i = 0; i < formData.all_stops.length; i++) {
      for (let j = i + 1; j < formData.all_stops.length; j++) {
        const start_destination_id = formData.all_stops[i];
        const end_destination_id = formData.all_stops[j];
        const key = `${start_destination_id}-${end_destination_id}`;

        const existingSegment = existingSegmentsMap.get(key);

        newSegmentsMap.set(key, existingSegment || {
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
    }
    // Sort segments for consistent display: first by start_destination_id order, then by end_destination_id order
    const sortedNewSegments = Array.from(newSegmentsMap.values()).sort((a, b) => {
      const startA = availableDestinations.findIndex(d => d.id === a.start_destination_id);
      const startB = availableDestinations.findIndex(d => d.id === b.start_destination_id);
      if (startA !== startB) return startA - startB;

      const endA = availableDestinations.findIndex(d => d.id === a.end_destination_id);
      const endB = availableDestinations.findIndex(d => d.id === b.end_destination_id);
      return endA - endB;
    });

    setRouteSegments(sortedNewSegments);
  }, [formData.all_stops, formData.id, availableDestinations, routeSegments]); // Added routeSegments to dependencies to ensure it reacts to changes in existing segments

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (id: keyof BusRoute, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [id]: value === 'none' ? null : value })); // Adjusted to handle 'none'
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
      all_stops: [...prev.all_stops, 'none'], // Changed initial value to 'none'
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
    setRouteSegments(prev => prev.map(segment => {
      if (segment.id === segmentId) {
        if (field === 'duration_minutes') {
          setSegmentDurationInputs(prevDurations => ({ ...prevDurations, [segmentId]: value }));
          const totalMinutes = hhmmToMinutes(value);
          return { ...segment, duration_minutes: totalMinutes };
        } else {
          // For other numeric fields, parse as float
          return { ...segment, [field]: parseFloat(value) || 0 };
        }
      }
      return segment;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.bus_id || formData.bus_id === 'none' || formData.all_stops.length < 2) { // Adjusted condition
      toast.error('Por favor, rellena el nombre de la ruta, asigna un autobús y define al menos dos paradas.');
      setIsSubmitting(false);
      return;
    }

    if (formData.all_stops.some(stopId => !stopId || stopId === 'none')) { // Adjusted condition
      toast.error('Por favor, selecciona un destino válido para cada parada.');
      setIsSubmitting(false);
      return;
    }

    if (routeSegments.some(s => s.adult_price <= 0)) {
      toast.error('El precio para adultos debe ser mayor que cero para todos los segmentos.');
      setIsSubmitting(false);
      return;
    }

    // Validate HH:MM format for duration_minutes
    for (const segment of routeSegments) {
      if (segment.id && segmentDurationInputs[segment.id]) {
        const durationString = segmentDurationInputs[segment.id];
        if (durationString && hhmmToMinutes(durationString) === null) {
          toast.error(`Formato de duración inválido para el segmento desde ${getDestinationName(segment.start_destination_id)} hasta ${getDestinationName(segment.end_destination_id)}. Usa HH:MM.`);
          setIsSubmitting(false);
          return;
        }
      }
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
        // Get current segments in DB for this route
        const { data: existingSegmentsInDb, error: fetchExistingError } = await supabase
          .from('route_segments')
          .select('id, start_destination_id, end_destination_id')
          .eq('route_id', currentRouteId);

        if (fetchExistingError) throw fetchExistingError;

        const existingSegmentIdsInDb = new Set(existingSegmentsInDb.map(s => s.id));
        const segmentsToUpsert = routeSegments.map(segment => ({
          ...segment,
          route_id: currentRouteId, // Ensure route_id is set for all segments
        }));
        const segmentsToKeepIds = new Set(segmentsToUpsert.map(s => s.id));

        // Identify segments to delete (those in DB but not in current form data)
        const segmentsToDelete = existingSegmentsInDb.filter(s => !segmentsToKeepIds.has(s.id));
        
        if (segmentsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('route_segments')
            .delete()
            .in('id', segmentsToDelete.map(s => s.id));
          if (deleteError) console.error('Error deleting old segments:', deleteError);
        }

        // Upsert new and updated segments
        const { error: upsertError } = await supabase
          .from('route_segments')
          .upsert(segmentsToUpsert, { onConflict: 'id' });

        if (upsertError) throw upsertError;
        toast.success('Segmentos de ruta actualizados con éxito.');
      }

      navigate('/admin/bus-tickets/routes'); // Redirect back to the list page
    } catch (error: any) {
      console.error('Error saving bus route and segments:', error);
      toast.error(`Error al guardar la ruta: ${error.message || 'Error desconocido.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading || loadingInitialData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario de ruta...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  // Group segments by start destination for easier editing
  const groupedSegments = routeSegments.reduce((acc, segment) => {
    const startName = getDestinationName(segment.start_destination_id);
    if (!acc[startName]) {
      acc[startName] = [];
    }
    acc[startName].push(segment);
    return acc;
  }, {} as Record<string, RouteSegment[]>);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={routeIdFromParams ? 'Editar Ruta de Autobús' : 'Crear Nueva Ruta de Autobús'} />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{routeIdFromParams ? 'Editar Ruta de Autobús' : 'Añadir Nueva Ruta de Autobús'}</h2>
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
                <Select value={formData.bus_id || 'none'} onValueChange={(value) => handleSelectChange('bus_id', value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar un autobús" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem> {/* Changed value to 'none' */}
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
                      value={stopId || 'none'} // Ensure value is 'none' if empty
                      onValueChange={(value) => handleAllStopsChange(index, value === 'none' ? '' : value)} // Handle 'none' back to empty string
                    >
                      <SelectTrigger className="flex-grow">
                        <SelectValue placeholder={`Parada ${index + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar Destino</SelectItem> {/* Changed value to 'none' */}
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
                  <h3 className="text-lg font-semibold mb-4">Configuración de Precios y Detalles por Segmento</h3>
                  {Object.keys(groupedSegments).map(startName => (
                    <Collapsible
                      key={startName}
                      open={openCollapsibles[startName]}
                      onOpenChange={(isOpen) => setOpenCollapsibles(prev => ({ ...prev, [startName]: isOpen }))}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-lg font-medium hover:bg-gray-100">
                          <span>Desde: {startName}</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        <div className="ml-4 border-l border-gray-200 pl-2 py-1 space-y-2">
                          {groupedSegments[startName].map((segment) => (
                            <div key={segment.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center p-3 border-b last:border-b-0 bg-white rounded-md shadow-sm">
                              <div className="md:col-span-2 flex items-center space-x-2">
                                <span className="font-medium">Hasta: {getDestinationName(segment.end_destination_id)}</span>
                              </div>
                              <div className="md:col-span-1">
                                <Label htmlFor={`adult_price_${segment.id}`} className="sr-only">Precio Adulto</Label>
                                <Input
                                  id={`adult_price_${segment.id}`}
                                  type="text" // Changed to text
                                  pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
                                  value={segment.adult_price}
                                  onChange={(e) => handleSegmentPriceChange(segment.id as string, 'adult_price', e.target.value)}
                                  placeholder="Precio Adulto"
                                  required
                                />
                              </div>
                              <div className="md:col-span-1">
                                <Label htmlFor={`child_price_${segment.id}`} className="sr-only">Precio Niño</Label>
                                <Input
                                  id={`child_price_${segment.id}`}
                                  type="text" // Changed to text
                                  pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
                                  value={segment.child_price}
                                  onChange={(e) => handleSegmentPriceChange(segment.id as string, 'child_price', e.target.value)}
                                  placeholder="Precio Niño"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <Label htmlFor={`duration_${segment.id}`} className="sr-only">Duración (HH:MM)</Label>
                                <Input
                                  id={`duration_${segment.id}`}
                                  type="text" // Changed to text
                                  pattern="[0-9]{1,2}:[0-9]{2}" // Pattern for HH:MM
                                  value={segmentDurationInputs[segment.id as string] || ''}
                                  onChange={(e) => handleSegmentPriceChange(segment.id as string, 'duration_minutes', e.target.value)}
                                  placeholder="HH:MM"
                                />
                              </div>
                              <div className="md:col-span-1">
                                <Label htmlFor={`distance_${segment.id}`} className="sr-only">Distancia (km)</Label>
                                <Input
                                  id={`distance_${segment.id}`}
                                  type="text" // Changed to text
                                  pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
                                  value={segment.distance_km || ''}
                                  onChange={(e) => handleSegmentPriceChange(segment.id as string, 'distance_km', e.target.value)}
                                  placeholder="Distancia (km)"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
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

              <div className="flex justify-end mt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {routeIdFromParams ? 'Guardar Cambios' : 'Añadir Ruta'}
                </Button>
              </div>
            </form>
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminBusRouteFormPage;