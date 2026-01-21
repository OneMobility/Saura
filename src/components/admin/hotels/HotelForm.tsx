"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, DollarSign, CalendarIcon } from 'lucide-react'; 
import { format, parse, isValid, parseISO, addDays } from 'date-fns'; 
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; 
import { Calendar } from '@/components/ui/calendar'; 
import { useSearchParams } from 'react-router-dom';

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
  num_double_rooms: number;
  num_triple_rooms: number;
  num_quad_rooms: number;
  num_courtesy_rooms: number;
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
  quote_end_date: string | null;
  total_quote_cost: number;
  remaining_payment: number;
}

interface HotelFormProps {
  hotelId?: string;
  onSave: () => void;
  onHotelDataLoaded?: (hotelData: Hotel) => void;
  onRegisterPayment?: (hotelData: Hotel) => void;
}

const HotelForm: React.FC<HotelFormProps> = ({ hotelId, onSave, onHotelDataLoaded, onRegisterPayment }) => {
  const [searchParams] = useSearchParams();
  const cloneFromId = searchParams.get('cloneFrom');

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
    num_double_rooms: 0,
    num_triple_rooms: 0,
    num_quad_rooms: 0,
    num_courtesy_rooms: 0,
    is_active: true,
    advance_payment: 0,
    total_paid: 0,
    quote_end_date: null,
    total_quote_cost: 0,
    remaining_payment: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [dateInput, setDateInput] = useState<string>(''); 
  const [quotedDate, setQuotedDate] = useState<Date | undefined>(undefined);
  const loadedHotelIdRef = useRef<string | undefined>(undefined);

  const calculateQuoteCosts = useCallback(() => {
    const totalCostDoubleRooms = (formData.num_double_rooms || 0) * (formData.cost_per_night_double || 0) * (formData.num_nights_quoted || 0);
    const totalCostTripleRooms = (formData.num_triple_rooms || 0) * (formData.cost_per_night_triple || 0) * (formData.num_nights_quoted || 0);
    const totalCostQuadRooms = (formData.num_quad_rooms || 0) * (formData.cost_per_night_quad || 0) * (formData.num_nights_quoted || 0);
    const totalContractedRoomsCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;
    const costOfCourtesyRooms = (formData.num_courtesy_rooms || 0) * (formData.cost_per_night_quad || 0) * (formData.num_nights_quoted || 0);
    const totalQuoteCost = totalContractedRoomsCost - costOfCourtesyRooms;
    const remaining = totalQuoteCost - (formData.total_paid || 0);

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
    formData.total_paid,
    formData.num_courtesy_rooms
  ]);

  useEffect(() => {
    const fetchHotelData = async () => {
      const targetId = hotelId || cloneFromId;
      
      if (targetId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('hotels')
          .select('*')
          .eq('id', targetId)
          .single();

        if (error) {
          console.error('Error fetching hotel data:', error);
          toast.error('Error al cargar los datos.');
          setLoadingInitialData(false);
          return;
        }

        if (data) {
          const isCloning = !hotelId && !!cloneFromId;
          
          const loadedData = {
            ...data,
            id: isCloning ? undefined : data.id,
            advance_payment: isCloning ? 0 : (data.advance_payment || 0),
            total_paid: isCloning ? 0 : (data.total_paid || 0),
            quoted_date: isCloning ? null : data.quoted_date,
            quote_end_date: isCloning ? null : data.quote_end_date,
          };
          
          setFormData(loadedData);
          
          if (!isCloning && data.quoted_date) {
            const date = parseISO(data.quoted_date);
            setQuotedDate(date);
            setDateInput(format(date, 'dd/MM/yy'));
          }

          if (!isCloning && loadedHotelIdRef.current !== targetId) {
            onHotelDataLoaded?.(loadedData);
            loadedHotelIdRef.current = targetId;
          }
          
          if (isCloning) {
            toast.success('Datos base cargados para nueva cotización.');
          }
        }
      }
      setLoadingInitialData(false);
    };

    fetchHotelData();
  }, [hotelId, cloneFromId, onHotelDataLoaded]);

  useEffect(() => {
    calculateQuoteCosts();
  }, [calculateQuoteCosts]);

  useEffect(() => {
    const numNights = formData.num_nights_quoted || 1;
    if (quotedDate && numNights > 0) {
      const endDate = addDays(quotedDate, numNights);
      const quote_end_date = format(endDate, 'yyyy-MM-dd');
      setFormData(prev => ({
        ...prev,
        quote_end_date,
        quoted_date: format(quotedDate, 'yyyy-MM-dd'),
      }));
    } else {
      setFormData(prev => ({ ...prev, quote_end_date: null, quoted_date: null }));
    }
  }, [quotedDate, formData.num_nights_quoted]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => {
      const isNumeric = ['num_nights_quoted', 'cost_per_night_double', 'cost_per_night_triple', 'cost_per_night_quad', 'num_double_rooms', 'num_triple_rooms', 'num_quad_rooms', 'num_courtesy_rooms', 'advance_payment', 'total_paid'].includes(id);
      const newValue = isNumeric ? parseFloat(value) || 0 : value;
      return { ...prev, [id]: newValue };
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setQuotedDate(date);
    setDateInput(date ? format(date, 'dd/MM/yy') : '');
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.location || !formData.quoted_date) {
      toast.error('Por favor, rellena los campos obligatorios.');
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
      num_double_rooms: formData.num_double_rooms,
      num_triple_rooms: formData.num_triple_rooms,
      num_quad_rooms: formData.num_quad_rooms,
      num_courtesy_rooms: formData.num_courtesy_rooms,
      is_active: formData.is_active,
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
      quote_end_date: formData.quote_end_date,
    };

    if (hotelId) {
      const { error } = await supabase
        .from('hotels')
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', hotelId);

      if (error) {
        toast.error('Error al actualizar.');
      } else {
        toast.success('Cotización actualizada.');
        onSave();
      }
    } else {
      const { error } = await supabase.from('hotels').insert(dataToSave);
      if (error) {
        toast.error('Error al crear.');
      } else {
        toast.success('Nueva cotización creada.');
        onSave();
      }
    }
    setIsSubmitting(false);
  };

  if (loadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{hotelId ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre del Hotel</Label>
            <Input id="name" value={formData.name} onChange={handleChange} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">Ubicación</Label>
            <Input id="location" value={formData.location} onChange={handleChange} className="col-span-3" required />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quoted_date" className="text-right">Fecha Inicio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("col-span-3 justify-start text-left font-normal", !quotedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {quotedDate ? format(quotedDate, "dd/MM/yy", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={quotedDate} onSelect={handleDateSelect} initialFocus locale={es} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_nights_quoted" className="text-right">Noches</Label>
            <Input id="num_nights_quoted" type="text" pattern="[0-9]*" value={formData.num_nights_quoted} onChange={handleChange} className="col-span-3" required />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold">Fecha Fin</Label>
            <Input value={formData.quote_end_date ? format(parseISO(formData.quote_end_date), 'dd/MM/yy') : 'N/A'} readOnly className="col-span-3 bg-gray-100" />
          </div>

          <h3 className="col-span-4 text-lg font-semibold mt-4">Costos por Noche</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_double" className="text-right">Costo Doble</Label>
            <Input id="cost_per_night_double" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.cost_per_night_double} onChange={handleChange} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_triple" className="text-right">Costo Triple</Label>
            <Input id="cost_per_night_triple" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.cost_per_night_triple} onChange={handleChange} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_quad" className="text-right">Costo Cuádruple</Label>
            <Input id="cost_per_night_quad" type="text" pattern="[0-9]*\.?[0-9]*" value={formData.cost_per_night_quad} onChange={handleChange} className="col-span-3" required />
          </div>

          <h3 className="col-span-4 text-lg font-semibold mt-4">Habitaciones Contratadas</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 col-span-4">
            <div className="space-y-2">
              <Label htmlFor="num_double_rooms">Dobles</Label>
              <Input id="num_double_rooms" type="text" pattern="[0-9]*" value={formData.num_double_rooms} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_triple_rooms">Triples</Label>
              <Input id="num_triple_rooms" type="text" pattern="[0-9]*" value={formData.num_triple_rooms} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_quad_rooms">Cuádruples</Label>
              <Input id="num_quad_rooms" type="text" pattern="[0-9]*" value={formData.num_quad_rooms} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_courtesy_rooms">Coordinadores</Label>
              <Input id="num_courtesy_rooms" type="text" pattern="[0-9]*" value={formData.num_courtesy_rooms} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="is_active" className="text-right">Activo</Label>
            <div className="col-span-3 flex items-center">
              <Switch id="is_active" checked={formData.is_active} onCheckedChange={handleSwitchChange} />
              <span className="ml-2 text-sm text-gray-600">{formData.is_active ? 'Sí' : 'No'}</span>
            </div>
          </div>

          <div className="col-span-4 bg-gray-50 p-4 rounded-md flex justify-between items-center">
            <div>
              <Label className="font-semibold">Costo Total Cotización:</Label>
              <p className="text-xl font-bold">${(formData.total_quote_cost || 0).toFixed(2)}</p>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {hotelId ? 'Guardar Cambios' : 'Crear Cotización'}
            </Button>
          </div>
      </form>
    </div>
  );
};

export default HotelForm;