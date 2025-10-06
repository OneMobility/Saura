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
import { Loader2, Save, User, Bus, CalendarClock, MapPin } from 'lucide-react';
import { BusPassenger, BusRoute, BusSchedule, AvailableBus, SeatLayout } from '@/types/shared';
import { format, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import BusSeatMap from '@/components/bus-tickets/BusSeatMap'; // Reusing BusSeatMap

interface BusPassengerEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh passenger list
  passenger: BusPassenger | null;
  availableRoutes: BusRoute[];
  availableSchedules: BusSchedule[];
  availableBuses: AvailableBus[];
  availableDestinations: { id: string; name: string }[];
}

const BusPassengerEditDialog: React.FC<BusPassengerEditDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  passenger,
  availableRoutes,
  availableSchedules,
  availableBuses,
  availableDestinations,
}) => {
  const [formData, setFormData] = useState<BusPassenger | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number[]>([]);
  const [currentBusLayout, setCurrentBusLayout] = useState<SeatLayout | null>(null);
  const [currentBusCapacity, setCurrentBusCapacity] = useState(0);
  const [loadingBusDetails, setLoadingBusDetails] = useState(false);

  const getDestinationName = useCallback((id: string) => {
    return availableDestinations.find(d => d.id === id)?.name || 'Desconocido';
  }, [availableDestinations]);

  useEffect(() => {
    if (passenger) {
      setFormData({ ...passenger });
      setSelectedScheduleId(passenger.schedule_id);
      setSelectedSeatNumber([passenger.seat_number]); // Initialize with current seat
    } else {
      setFormData(null);
      setSelectedScheduleId(null);
      setSelectedSeatNumber([]);
    }
  }, [passenger, isOpen]);

  // Effect to load bus layout and capacity when selectedScheduleId changes
  useEffect(() => {
    const loadBusDetails = async () => {
      if (selectedScheduleId) {
        setLoadingBusDetails(true);
        const schedule = availableSchedules.find(s => s.id === selectedScheduleId);
        if (schedule) {
          const route = availableRoutes.find(r => r.id === schedule.route_id);
          if (route?.bus_id) {
            const bus = availableBuses.find(b => b.id === route.bus_id);
            if (bus) {
              setCurrentBusLayout(bus.seat_layout_json);
              setCurrentBusCapacity(bus.total_capacity);
            } else {
              setCurrentBusLayout(null);
              setCurrentBusCapacity(0);
              toast.error('Autobús no encontrado para la ruta seleccionada.');
            }
          } else {
            setCurrentBusLayout(null);
            setCurrentBusCapacity(0);
            toast.error('Ruta sin autobús asignado.');
          }
        } else {
          setCurrentBusLayout(null);
          setCurrentBusCapacity(0);
        }
        setLoadingBusDetails(false);
      } else {
        setCurrentBusLayout(null);
        setCurrentBusCapacity(0);
        setLoadingBusDetails(false);
      }
    };
    loadBusDetails();
  }, [selectedScheduleId, availableSchedules, availableRoutes, availableBuses]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [id]: type === 'number' ? parseFloat(value) || null : value,
      };
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => (prev ? { ...prev, is_contractor: checked } : null));
  };

  const handleScheduleSelect = (value: string) => {
    setSelectedScheduleId(value);
    setSelectedSeatNumber([]); // Clear selected seats when schedule changes
  };

  const handleSeatSelected = useCallback((seats: number[]) => {
    setSelectedSeatNumber(seats);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData || !passenger) {
      toast.error('Error: Datos del pasajero no disponibles.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.first_name || !formData.last_name) {
      toast.error('Por favor, rellena el nombre y apellido del pasajero.');
      setIsSubmitting(false);
      return;
    }

    if (formData.is_contractor && (!formData.email || !formData.phone)) {
      toast.error('El contratante debe tener email y teléfono.');
      setIsSubmitting(false);
      return;
    }

    if (!selectedScheduleId) {
      toast.error('Por favor, selecciona un horario para el pasajero.');
      setIsSubmitting(false);
      return;
    }

    if (selectedSeatNumber.length !== 1) {
      toast.error('Por favor, selecciona exactamente un asiento para el pasajero.');
      setIsSubmitting(false);
      return;
    }
    const newSeat = selectedSeatNumber[0];

    try {
      const oldScheduleId = passenger.schedule_id;
      const oldSeatNumber = passenger.seat_number;
      const newSchedule = availableSchedules.find(s => s.id === selectedScheduleId);
      const oldSchedule = availableSchedules.find(s => s.id === oldScheduleId);

      if (!newSchedule) {
        toast.error('Horario seleccionado no válido.');
        setIsSubmitting(false);
        return;
      }

      // 1. Update the bus_passengers record
      const { error: passengerUpdateError } = await supabase
        .from('bus_passengers')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          age: formData.age,
          identification_number: formData.identification_number,
          is_contractor: formData.is_contractor,
          email: formData.email,
          phone: formData.phone,
          schedule_id: selectedScheduleId,
          seat_number: newSeat,
          updated_at: new Date().toISOString(),
        })
        .eq('id', passenger.id);

      if (passengerUpdateError) {
        console.error('Error updating bus passenger:', passengerUpdateError);
        toast.error('Error al actualizar los datos del pasajero.');
        setIsSubmitting(false);
        return;
      }

      // 2. Handle seat assignments
      // Release old seat if different
      if (oldScheduleId !== selectedScheduleId || oldSeatNumber !== newSeat) {
        const { error: releaseError } = await supabase
          .from('bus_seat_assignments')
          .update({ status: 'available', client_id: null, schedule_id: null, updated_at: new Date().toISOString() })
          .eq('schedule_id', oldScheduleId)
          .eq('seat_number', oldSeatNumber);

        if (releaseError) {
          console.error('Error releasing old seat:', releaseError);
          toast.error('Error al liberar el asiento anterior.');
          // Continue, but log the error
        }
      }

      // Book new seat
      const { error: bookError } = await supabase
        .from('bus_seat_assignments')
        .upsert({
          schedule_id: selectedScheduleId,
          seat_number: newSeat,
          status: 'booked',
          client_id: formData.client_id,
          booked_at: new Date().toISOString(),
          created_at: new Date().toISOString(), // Ensure created_at is set for new entries
          updated_at: new Date().toISOString(),
        }, { onConflict: 'schedule_id,seat_number' });

      if (bookError) {
        console.error('Error booking new seat:', bookError);
        toast.error('Error al asignar el nuevo asiento. Puede que ya esté ocupado.');
        setIsSubmitting(false);
        return;
      }

      // 3. Recalculate client's total_amount if schedule/route changed
      if (oldScheduleId !== selectedScheduleId) {
        // Fetch old route segment prices
        const oldRoute = availableRoutes.find(r => r.id === oldSchedule?.route_id);
        const { data: oldSegments, error: oldSegmentsError } = oldRoute?.id ? await supabase
          .from('route_segments')
          .select('adult_price, child_price')
          .eq('route_id', oldRoute.id) : { data: [], error: null };
        if (oldSegmentsError) console.error('Error fetching old segments:', oldSegmentsError);
        const oldAdultPrice = (oldSegments || []).reduce((sum, s) => sum + s.adult_price, 0);
        const oldChildPrice = (oldSegments || []).reduce((sum, s) => sum + s.child_price, 0);

        // Fetch new route segment prices
        const newRoute = availableRoutes.find(r => r.id === newSchedule.route_id);
        const { data: newSegments, error: newSegmentsError } = newRoute?.id ? await supabase
          .from('route_segments')
          .select('adult_price, child_price')
          .eq('route_id', newRoute.id) : { data: [], error: null };
        if (newSegmentsError) console.error('Error fetching new segments:', newSegmentsError);
        const newAdultPrice = (newSegments || []).reduce((sum, s) => sum + s.adult_price, 0);
        const newChildPrice = (newSegments || []).reduce((sum, s) => sum + s.child_price, 0);

        // Determine if passenger is adult or child (based on age, default adult)
        const isPassengerAdult = formData.age === null || formData.age >= 12;
        const oldPassengerPrice = isPassengerAdult ? oldAdultPrice : oldChildPrice;
        const newPassengerPrice = isPassengerAdult ? newAdultPrice : newChildPrice;
        const priceDifference = newPassengerPrice - oldPassengerPrice;

        // Update client's total_amount
        const { data: clientData, error: clientFetchError } = await supabase
          .from('clients')
          .select('total_amount, total_paid, bus_route_id')
          .eq('id', formData.client_id)
          .single();

        if (clientFetchError || !clientData) {
          console.error('Error fetching client for total_amount update:', clientFetchError);
          toast.error('Error al actualizar el monto total del cliente.');
        } else {
          const updatedTotalAmount = clientData.total_amount + priceDifference;
          let updatedBusRouteId = clientData.bus_route_id;

          // If this passenger is the contractor and the route changed, update client's bus_route_id
          if (formData.is_contractor && newRoute?.id) {
            updatedBusRouteId = newRoute.id;
          }

          const { error: clientUpdateError } = await supabase
            .from('clients')
            .update({
              total_amount: updatedTotalAmount,
              bus_route_id: updatedBusRouteId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', formData.client_id);

          if (clientUpdateError) {
            console.error('Error updating client total_amount:', clientUpdateError);
            toast.error('Error al actualizar el monto total del cliente.');
          } else {
            toast.success('Monto total del cliente actualizado.');
          }
        }
      }

      toast.success('Pasajero de autobús actualizado con éxito.');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Unexpected error during passenger update:', error);
      toast.error(`Ocurrió un error inesperado: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!formData) {
    return null;
  }

  const currentSchedule = availableSchedules.find(s => s.id === selectedScheduleId);
  const currentRoute = currentSchedule ? availableRoutes.find(r => r.id === currentSchedule.route_id) : null;
  const filteredSchedules = availableSchedules.filter(s => {
    const today = new Date();
    const searchDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Only compare date part
    const scheduleStartDate = s.effective_date_start ? parseISO(s.effective_date_start) : null;
    const scheduleEndDate = s.effective_date_end ? parseISO(s.effective_date_end) : null;

    const isFutureOrCurrent = (!scheduleStartDate || searchDate <= scheduleStartDate) ||
                              (scheduleStartDate && scheduleEndDate && searchDate >= scheduleStartDate && searchDate <= scheduleEndDate);
    
    return isFutureOrCurrent;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pasajero de Autobús</DialogTitle>
          <DialogDescription>
            Modifica los detalles del pasajero, su asiento o su horario/ruta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">
              Nombre
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_name" className="text-right">
              Apellido
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="age" className="text-right">
              Edad (Opcional)
            </Label>
            <Input
              id="age"
              type="text"
              pattern="[0-9]*"
              value={formData.age || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="identification_number" className="text-right">
              Identificación (Opcional)
            </Label>
            <Input
              id="identification_number"
              value={formData.identification_number || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="is_contractor" className="text-right">
              Es Contratante
            </Label>
            <div className="col-span-3 flex items-center">
              <Switch
                id="is_contractor"
                checked={formData.is_contractor}
                onCheckedChange={handleSwitchChange}
              />
              <span className="ml-2 text-sm text-gray-600">
                {formData.is_contractor ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
          {formData.is_contractor && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="col-span-3"
                  required
                />
              </div>
            </>
          )}

          <h3 className="text-lg font-semibold mt-4 col-span-full">Detalles del Viaje</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="schedule_id" className="text-right">
              Horario / Ruta
            </Label>
            <Select value={selectedScheduleId || ''} onValueChange={handleScheduleSelect}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar Horario" />
              </SelectTrigger>
              <SelectContent>
                {filteredSchedules.map((schedule) => {
                  const route = availableRoutes.find(r => r.id === schedule.route_id);
                  const routeStops = route?.all_stops || [];
                  const originName = getDestinationName(routeStops[0]);
                  const destinationName = getDestinationName(routeStops[routeStops.length - 1]);
                  const scheduleDate = schedule.effective_date_start ? format(parseISO(schedule.effective_date_start), 'dd/MM/yy', { locale: es }) : 'N/A';
                  return (
                    <SelectItem key={schedule.id} value={schedule.id as string}>
                      {route?.name} ({originName} → {destinationName}) - {schedule.departure_time} ({scheduleDate})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedScheduleId && currentBusLayout && currentBusCapacity > 0 && (
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold mb-4">Selección de Asiento</h3>
              {loadingBusDetails ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-bus-primary" />
                  <p className="ml-4 text-muted-foreground">Cargando mapa de asientos...</p>
                </div>
              ) : (
                <BusSeatMap
                  busId={currentRoute?.bus_id || ''} // Pass the bus ID
                  busCapacity={currentBusCapacity}
                  scheduleId={selectedScheduleId}
                  seatLayoutJson={currentBusLayout}
                  onSeatsSelected={handleSeatSelected}
                  readOnly={false}
                  initialSelectedSeats={selectedSeatNumber} // Pass initial selected seat
                />
              )}
              {selectedSeatNumber.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Asiento seleccionado: {selectedSeatNumber[0]}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || loadingBusDetails || selectedSeatNumber.length !== 1}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusPassengerEditDialog;