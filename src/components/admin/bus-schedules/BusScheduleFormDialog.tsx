"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, CalendarIcon } from 'lucide-react';
import { BusSchedule, BusRoute } from '@/types/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface BusScheduleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh schedule list
  initialData?: BusSchedule | null;
}

const BusScheduleFormDialog: React.FC<BusScheduleFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<BusSchedule>({
    route_id: '',
    departure_time: '08:00',
    day_of_week: [],
    effective_date_start: null,
    effective_date_end: null,
    is_active: true,
  });
  const [availableRoutes, setAvailableRoutes] = useState<BusRoute[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDependencies, setLoadingDependencies] = useState(true);

  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    const fetchDependencies = async () => {
      setLoadingDependencies(true);
      const { data, error } = await supabase.from('bus_routes').select('id, name').eq('is_active', true).order('name', { ascending: true });

      if (error) {
        console.error('Error fetching active bus routes:', error);
        toast.error('Error al cargar las rutas de autobús activas.');
      } else {
        setAvailableRoutes(data || []);
      }
      setLoadingDependencies(false);
    };

    fetchDependencies();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setStartDateInput(initialData.effective_date_start ? format(parseISO(initialData.effective_date_start), 'dd/MM/yy', { locale: es }) : '');
      setEndDateInput(initialData.effective_date_end ? format(parseISO(initialData.effective_date_end), 'dd/MM/yy', { locale: es }) : '');
      setStartDate(initialData.effective_date_start ? parseISO(initialData.effective_date_start) : undefined);
      setEndDate(initialData.effective_date_end ? parseISO(initialData.effective_date_end) : undefined);
    } else {
      setFormData({
        route_id: '',
        departure_time: '08:00',
        day_of_week: [],
        effective_date_start: null,
        effective_date_end: null,
        is_active: true,
      });
      setStartDateInput('');
      setEndDateInput('');
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof BusSchedule, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };

  const handleDayOfWeekChange = (dayIndex: number, checked: boolean) => {
    setFormData((prev) => {
      const newDays = checked
        ? [...prev.day_of_week, dayIndex]
        : prev.day_of_week.filter((day) => day !== dayIndex);
      return { ...prev, day_of_week: newDays.sort((a, b) => a - b) };
    });
  };

  const handleStartDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartDateInput(value);
    const parsedDate = parse(value, 'dd/MM/yy', new Date(), { locale: es });
    if (isValid(parsedDate)) {
      setStartDate(parsedDate);
      setFormData((prev) => ({ ...prev, effective_date_start: format(parsedDate, 'yyyy-MM-dd') }));
    } else {
      setStartDate(undefined);
      setFormData((prev) => ({ ...prev, effective_date_start: null }));
    }
  };

  const handleEndDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndDateInput(value);
    const parsedDate = parse(value, 'dd/MM/yy', new Date(), { locale: es });
    if (isValid(parsedDate)) {
      setEndDate(parsedDate);
      setFormData((prev) => ({ ...prev, effective_date_end: format(parsedDate, 'yyyy-MM-dd') }));
    } else {
      setEndDate(undefined);
      setFormData((prev) => ({ ...prev, effective_date_end: null }));
    }
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    setStartDateInput(date ? format(date, 'dd/MM/yy', { locale: es }) : '');
    setFormData((prev) => ({ ...prev, effective_date_start: date ? format(date, 'yyyy-MM-dd') : null }));
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    setEndDateInput(date ? format(date, 'dd/MM/yy', { locale: es }) : '');
    setFormData((prev) => ({ ...prev, effective_date_end: date ? format(date, 'yyyy-MM-dd') : null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.route_id || !formData.departure_time || formData.day_of_week.length === 0) {
      toast.error('Por favor, rellena la ruta, la hora de salida y al menos un día de la semana.');
      setIsSubmitting(false);
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin.');
      setIsSubmitting(false);
      return;
    }

    const dataToSave = {
      route_id: formData.route_id,
      departure_time: formData.departure_time,
      day_of_week: formData.day_of_week,
      effective_date_start: formData.effective_date_start,
      effective_date_end: formData.effective_date_end,
      is_active: formData.is_active,
    };

    if (initialData?.id) {
      const { error } = await supabase
        .from('bus_schedules')
        .update({ ...dataToSave, updated_at: new Date().toISOString() })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating bus schedule:', error);
        toast.error('Error al actualizar el horario de autobús.');
      } else {
        toast.success('Horario de autobús actualizado con éxito.');
        onSave();
        onClose();
      }
    } else {
      const { error } = await supabase
        .from('bus_schedules')
        .insert(dataToSave);

      if (error) {
        console.error('Error adding bus schedule:', error);
        toast.error('Error al añadir el horario de autobús.');
      } else {
        toast.success('Horario de autobús añadido con éxito.');
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
            <DialogTitle>{initialData ? 'Editar Horario de Autobús' : 'Añadir Nuevo Horario de Autobús'}</DialogTitle>
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
          <DialogTitle>{initialData ? 'Editar Horario de Autobús' : 'Añadir Nuevo Horario de Autobús'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles del horario.' : 'Rellena los campos para añadir un nuevo horario de autobús.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="route_id" className="text-right">
              Ruta
            </Label>
            <Select value={formData.route_id} onValueChange={(value) => handleSelectChange('route_id', value)} required>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar una ruta" />
              </SelectTrigger>
              <SelectContent>
                {availableRoutes.map((route) => (
                  <SelectItem key={route.id} value={route.id as string}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="departure_time" className="text-right">
              Hora de Salida
            </Label>
            <Input
              id="departure_time"
              type="time"
              value={formData.departure_time}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Días de la Semana</Label>
            <div className="col-span-3 grid grid-cols-3 gap-2">
              {dayNames.map((day, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${index}`}
                    checked={formData.day_of_week.includes(index)}
                    onCheckedChange={(checked: boolean) => handleDayOfWeekChange(index, checked)}
                  />
                  <Label htmlFor={`day-${index}`}>{day}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="effective_date_start" className="text-right">
              Fecha Inicio
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yy", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateSelect}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <Input
              id="effective_date_start_input"
              type="text"
              value={startDateInput}
              onChange={handleStartDateInputChange}
              placeholder="DD/MM/AA"
              className="col-span-3 hidden"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="effective_date_end" className="text-right">
              Fecha Fin
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yy", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={handleEndDateSelect}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <Input
              id="effective_date_end_input"
              type="text"
              value={endDateInput}
              onChange={handleEndDateInputChange}
              placeholder="DD/MM/AA"
              className="col-span-3 hidden"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="is_active" className="text-right">
              Horario Activo
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
              {initialData ? 'Guardar Cambios' : 'Añadir Horario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusScheduleFormDialog;