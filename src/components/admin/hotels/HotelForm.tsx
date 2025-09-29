"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Hotel {
  id?: string;
  name: string;
  location: string;
  quoted_date: string | null;
  num_nights_quoted: number;
  cost_per_night_double: number;
  cost_per_night_triple: number;
  cost_per_night_quad: number;
  capacity_double: number;
  capacity_triple: number;
  capacity_quad: number;
  num_double_rooms: number; // NEW
  num_triple_rooms: number; // NEW
  num_quad_rooms: number; // NEW
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
  // calculated fields
  total_quote_cost: number; // Calculated total cost for this quote (all rooms)
  remaining_payment: number; // Calculated remaining payment
}

interface HotelFormProps {
  hotelId?: string; // Optional hotelId for editing existing hotels
  onSave: () => void; // Callback to redirect after saving
}

const HotelForm: React.FC<HotelFormProps> = ({ hotelId, onSave }) => {
  const [formData, setFormData] = useState<Hotel>({
    name: '',
    location: '',
    quoted_date: null,
    num_nights_quoted: 1,
    cost_per_night_double: 0,
    cost_per_night_triple: 0,
    cost_per_night_quad: 0,
    capacity_double: 2,
    capacity_triple: 3,
    capacity_quad: 4,
    num_double_rooms: 0, // Initialize new fields
    num_triple_rooms: 0, // Initialize new fields
    num_quad_rooms: 0, // Initialize new fields
    is_active: true,
    advance_payment: 0,
    total_paid: 0,
    total_quote_cost: 0,
    remaining_payment: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const calculateQuoteCosts = useCallback(() => {
    const totalCostDoubleRooms = formData.num_double_rooms * formData.cost_per_night_double * formData.num_nights_quoted;
    const totalCostTripleRooms = formData.num_triple_rooms * formData.cost_per_night_triple * formData.num_nights_quoted;
    const totalCostQuadRooms = formData.num_quad_rooms * formData.cost_per_night_quad * formData.num_nights_quoted;
    
    const totalQuoteCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;
    const remaining = totalQuoteCost - formData.total_paid;

    setFormData(prev => ({
      ...prev,
      total_quote_cost: totalQuoteCost,
      remaining_payment: remaining,
    }));
  }, [
    formData.num_double_rooms,
    formData.cost_per_night_double,
    formData.num_triple_rooms,
    formData.cost_per_night_triple,
    formData.num_quad_rooms,
    formData.cost_per_night_quad,
    formData.num_nights_quoted,
    formData.total_paid
  ]);

  useEffect(() => {
    const fetchHotelData = async () => {
      if (hotelId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('hotels')
          .select('*')
          .eq('id', hotelId)
          .single();

        if (error) {
          console.error('Error fetching hotel for editing:', error);
          toast.error('Error al cargar los datos de la cotización del hotel para editar.');
          setLoadingInitialData(false);
          return;
        }

        if (data) {
          const totalCostDoubleRooms = data.num_double_rooms * data.cost_per_night_double * data.num_nights_quoted;
          const totalCostTripleRooms = data.num_triple_rooms * data.cost_per_night_triple * data.num_nights_quoted;
          const totalCostQuadRooms = data.num_quad_rooms * data.cost_per_night_quad * data.num_nights_quoted;
          const totalQuoteCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;

          setFormData({
            ...data,
            num_double_rooms: data.num_double_rooms || 0,
            num_triple_rooms: data.num_triple_rooms || 0,
            num_quad_rooms: data.num_quad_rooms || 0,
            total_quote_cost: totalQuoteCost,
            remaining_payment: totalQuoteCost - data.total_paid,
          });
        }
      } else {
        // Reset form for new hotel
        setFormData({
          name: '',
          location: '',
          quoted_date: null,
          num_nights_quoted: 1,
          cost_per_night_double: 0,
          cost_per_night_triple: 0,
          cost_per_night_quad: 0,
          capacity_double: 2,
          capacity_triple: 3,
          capacity_quad: 4,
          num_double_rooms: 0,
          num_triple_rooms: 0,
          num_quad_rooms: 0,
          is_active: true,
          advance_payment: 0,
          total_paid: 0,
          total_quote_cost: 0,
          remaining_payment: 0,
        });
      }
      setLoadingInitialData(false);
    };

    fetchHotelData();
  }, [hotelId]);

  useEffect(() => {
    calculateQuoteCosts();
  }, [calculateQuoteCosts]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData((prev) => ({ ...prev, quoted_date: date ? format(date, 'yyyy-MM-dd') : null }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.location || !formData.quoted_date) {
      toast.error('Por favor, rellena el nombre, la ubicación y la fecha cotizada del hotel.');
      setIsSubmitting(false);
      return;
    }

    if (formData.cost_per_night_double < 0 || formData.cost_per_night_triple < 0 || formData.cost_per_night_quad < 0) {
      toast.error('Los costos por noche no pueden ser negativos.');
      setIsSubmitting(false);
      return;
    }
    if (formData.num_nights_quoted <= 0) {
      toast.error('El número de noches debe ser mayor que 0.');
      setIsSubmitting(false);
      return;
    }
    if (formData.total_paid < formData.advance_payment) {
      toast.error('El total pagado no puede ser menor que el anticipo.');
      setIsSubmitting(false);
      return;
    }
    if (formData.num_double_rooms < 0 || formData.num_triple_rooms < 0 || formData.num_quad_rooms < 0) {
      toast.error('El número de habitaciones no puede ser negativo.');
      setIsSubmitting(false);
      return;
    }
    if (formData.num_double_rooms === 0 && formData.num_triple_rooms === 0 && formData.num_quad_rooms === 0) {
      toast.error('Debes especificar al menos una habitación contratada.');
      setIsSubmitting(false);
      return;
    }


    const dataToSave = {
      name: formData.name,
      location: formData.location,
      quoted_date: formData.quoted_date,
      num_nights_quoted: formData.num_nights_quoted,
      cost_per_night_double: formData.cost_per_night_double,
      cost_per_night_triple: formData.cost_per_night_triple,
      cost_per_night_quad: formData.cost_per_night_quad,
      capacity_double: formData.capacity_double,
      capacity_triple: formData.capacity_triple,
      capacity_quad: formData.capacity_quad,
      num_double_rooms: formData.num_double_rooms, // NEW
      num_triple_rooms: formData.num_triple_rooms, // NEW
      num_quad_rooms: formData.num_quad_rooms, // NEW
      is_active: formData.is_active,
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
    };

    if (hotelId) {
      // Update existing hotel quote
      const { error } = await supabase
        .from('hotels')
        .update({
          ...dataToSave,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hotelId);

      if (error) {
        console.error('Error updating hotel quote:', error);
        toast.error('Error al actualizar la cotización del hotel.');
      } else {
        toast.success('Cotización de hotel actualizada con éxito.');
        onSave();
      }
    } else {
      // Insert new hotel quote
      const { error } = await supabase
        .from('hotels')
        .insert(dataToSave);

      if (error) {
        console.error('Error creating hotel quote:', error);
        toast.error('Error al crear la cotización del hotel.');
      } else {
        toast.success('Cotización de hotel creada con éxito.');
        onSave();
      }
    }
    setIsSubmitting(false);
  };

  if (loadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario del hotel...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{hotelId ? 'Editar Cotización de Hotel' : 'Añadir Nueva Cotización de Hotel'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre Hotel
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quoted_date" className="text-right">
              Fecha Cotizada
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal col-span-3",
                    !formData.quoted_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.quoted_date ? format(new Date(formData.quoted_date), "PPP") : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.quoted_date ? new Date(formData.quoted_date) : undefined}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_nights_quoted" className="text-right">
              Noches Cotizadas
            </Label>
            <Input
              id="num_nights_quoted"
              type="number"
              value={formData.num_nights_quoted}
              onChange={handleChange}
              className="col-span-3"
              min={1}
              required
            />
          </div>

          <h3 className="col-span-4 text-lg font-semibold mt-4">Costos por Noche (Cotizados)</h3>
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

          <h3 className="col-span-4 text-lg font-semibold mt-4">Habitaciones Contratadas para esta Cotización</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_double_rooms" className="text-right">
              Hab. Dobles
            </Label>
            <Input
              id="num_double_rooms"
              type="number"
              value={formData.num_double_rooms}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_triple_rooms" className="text-right">
              Hab. Triples
            </Label>
            <Input
              id="num_triple_rooms"
              type="number"
              value={formData.num_triple_rooms}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_quad_rooms" className="text-right">
              Hab. Cuádruples
            </Label>
            <Input
              id="num_quad_rooms"
              type="number"
              value={formData.num_quad_rooms}
              onChange={handleChange}
              className="col-span-3"
              min={0}
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

          <h3 className="col-span-4 text-lg font-semibold mt-4">Gestión de Pagos</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="advance_payment" className="text-right">
              Anticipo Dado
            </Label>
            <Input
              id="advance_payment"
              type="number"
              value={formData.advance_payment}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="total_paid" className="text-right">
              Total Pagado
            </Label>
            <Input
              id="total_paid"
              type="number"
              value={formData.total_paid}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
            />
          </div>

          <div className="col-span-4 grid grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-md">
            <div>
              <Label className="font-semibold">Costo Total de esta Cotización:</Label>
              <p>${formData.total_quote_cost.toFixed(2)}</p>
            </div>
            <div>
              <Label className="font-semibold">Pago Restante:</Label>
              <p>${formData.remaining_payment.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {hotelId ? 'Guardar Cambios' : 'Añadir Cotización'}
            </Button>
          </div>
        </form>
    </div>
  );
};

export default HotelForm;