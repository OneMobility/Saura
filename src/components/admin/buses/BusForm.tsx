"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, DollarSign } from 'lucide-react';
import SeatLayoutEditor from './SeatLayoutEditor';

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry';
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

interface Bus {
  id?: string;
  name: string;
  license_plate: string;
  rental_cost: number;
  total_capacity: number;
  seat_layout_json: SeatLayout | null;
  advance_payment: number;
  total_paid: number;
  remaining_payment: number;
}

interface BusFormProps {
  busId?: string;
  onSave: () => void;
  onBusDataLoaded?: (busData: Bus) => void;
  onRegisterPayment?: (busData: Bus) => void;
}

const BusForm: React.FC<BusFormProps> = ({ busId, onSave, onBusDataLoaded, onRegisterPayment }) => {
  const [formData, setFormData] = useState<Bus>({
    name: '',
    license_plate: '',
    rental_cost: 0,
    total_capacity: 0,
    seat_layout_json: null,
    advance_payment: 0,
    total_paid: 0,
    remaining_payment: 0,
  });
  const [currentSeatLayout, setCurrentSeatLayout] = useState<SeatLayout | null>(null);
  const [currentSeatCount, setCurrentSeatCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const loadedBusIdRef = useRef<string | undefined>(undefined); // NEW: Ref to track if onBusDataLoaded was called for this ID

  const calculatePayment = useCallback(() => {
    const remaining = formData.rental_cost - formData.total_paid;
    setFormData(prev => ({
      ...prev,
      remaining_payment: remaining,
    }));
  }, [formData.rental_cost, formData.total_paid]);

  useEffect(() => {
    const fetchBusData = async () => {
      if (busId) {
        setLoadingInitialData(true);
        const { data, error } = await supabase
          .from('buses')
          .select('id, name, license_plate, rental_cost, total_capacity, seat_layout_json, advance_payment, total_paid')
          .eq('id', busId)
          .single();

        if (error) {
          console.error('Error al obtener autobús para editar:', error);
          toast.error('Error al cargar los datos del autobús para editar.');
          setLoadingInitialData(false);
          loadedBusIdRef.current = undefined; // Reset ref on error
          return;
        }

        if (data) {
          const loadedData = {
            ...data,
            advance_payment: data.advance_payment || 0,
            total_paid: data.total_paid || 0,
            remaining_payment: (data.rental_cost || 0) - (data.total_paid || 0),
          };
          setFormData(loadedData);
          setCurrentSeatLayout(data.seat_layout_json);
          const count = data.seat_layout_json?.flat().filter(item => item.type === 'seat').length || 0;
          setCurrentSeatCount(count);
          
          // NEW: Only call onBusDataLoaded if it hasn't been called for this specific busId yet
          if (loadedBusIdRef.current !== busId) {
            onBusDataLoaded?.(loadedData);
            loadedBusIdRef.current = busId;
          }
        }
      } else {
        // Reset form for new bus
        setFormData({
          name: '',
          license_plate: '',
          rental_cost: 0,
          total_capacity: 0,
          seat_layout_json: null,
          advance_payment: 0,
          total_paid: 0,
          remaining_payment: 0,
        });
        setCurrentSeatLayout(null);
        setCurrentSeatCount(0);
        loadedBusIdRef.current = undefined; // Reset for new form
      }
      setLoadingInitialData(false);
    };

    fetchBusData();
  }, [busId, onBusDataLoaded]); // onBusDataLoaded is still a dependency, but its invocation is guarded.

  useEffect(() => {
    calculatePayment();
  }, [calculatePayment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: ['rental_cost', 'total_capacity', 'advance_payment', 'total_paid'].includes(id) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleLayoutChange = useCallback((layout: SeatLayout | null, seatCount: number) => {
    setCurrentSeatLayout(layout); // Update currentSeatLayout directly
    setCurrentSeatCount(seatCount);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name || !formData.license_plate) {
      toast.error('Por favor, rellena el nombre y las placas del autobús.');
      setIsSubmitting(false);
      return;
    }

    if (formData.rental_cost < 0) {
      toast.error('El costo de renta no puede ser negativo.');
      setIsSubmitting(false);
      return;
    }

    if (formData.total_capacity <= 0) {
      toast.error('La capacidad total de asientos debe ser mayor que 0.');
      setIsSubmitting(false);
      return;
    }

    if (!currentSeatLayout || currentSeatCount === 0) {
      toast.error('Por favor, define la disposición de asientos en el editor.');
      setIsSubmitting(false);
      return;
    }

    if (currentSeatCount !== formData.total_capacity) {
      toast.error(`La capacidad total de asientos (${formData.total_capacity}) no coincide con el número de asientos definidos en el layout (${currentSeatCount}).`);
      setIsSubmitting(false);
      return;
    }

    if (formData.total_paid < formData.advance_payment) {
      toast.error('El total pagado no puede ser menor que el anticipo.');
      setIsSubmitting(false);
      return;
    }

    const busDataToSave = {
      name: formData.name,
      license_plate: formData.license_plate,
      rental_cost: formData.rental_cost,
      total_capacity: formData.total_capacity,
      seat_layout_json: currentSeatLayout, // Aseguramos que se guarda el layout
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
    };

    if (busId) {
      const { error } = await supabase
        .from('buses')
        .update({ ...busDataToSave, updated_at: new Date().toISOString() })
        .eq('id', busId);

      if (error) {
        console.error('Error al actualizar el autobús:', error);
        toast.error('Error al actualizar el autobús.');
      } else {
        toast.success('Autobús actualizado con éxito.');
        onSave();
      }
    } else {
      const { error } = await supabase
        .from('buses')
        .insert(busDataToSave);

      if (error) {
        console.error('Error al crear el autobús:', error);
        toast.error('Error al crear el autobús.');
      } else {
        toast.success('Autobús creado con éxito.');
        onSave();
      }
    }
    setIsSubmitting(false);
  };

  if (loadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando formulario del autobús...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{busId ? 'Editar Autobús' : 'Añadir Nuevo Autobús'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Nombre/Identificación
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
          <Label htmlFor="license_plate" className="text-right">
            Placas/Código Interno
          </Label>
          <Input
            id="license_plate"
            value={formData.license_plate}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="rental_cost" className="text-right">
            Costo de Renta Total
          </Label>
          <Input
            id="rental_cost"
            type="text" // Changed to text
            pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
            value={formData.rental_cost}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="total_capacity" className="text-right">
            Capacidad Total de Asientos
          </Label>
          <Input
            id="total_capacity"
            type="text" // Changed to text
            pattern="[0-9]*" // Pattern for integers
            value={formData.total_capacity}
            onChange={handleChange}
            className="col-span-3"
            required
          />
        </div>
        
        <h3 className="col-span-4 text-lg font-semibold mt-4">Gestión de Pagos</h3>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="advance_payment" className="text-right">
            Anticipo Dado
          </Label>
          <Input
            id="advance_payment"
            type="text" // Changed to text
            pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
            value={formData.advance_payment}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="total_paid" className="text-right">
            Total Pagado
          </Label>
          <Input
            id="total_paid"
            type="text" // Changed to text
            pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
            value={formData.total_paid}
            onChange={handleChange}
            className="col-span-3"
          />
        </div>

        <div className="col-span-4 grid grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-md">
          <div>
            <Label className="font-semibold">Costo Total de Renta:</Label>
            <p>${formData.rental_cost.toFixed(2)}</p>
          </div>
          <div>
            <Label className="font-semibold">Pago Restante:</Label>
            <p>${formData.remaining_payment.toFixed(2)}</p>
          </div>
        </div>

        <div className="col-span-full mt-4">
          <Label className="text-lg font-semibold mb-2 block">Disposición de Asientos</Label>
          <SeatLayoutEditor
            initialLayout={currentSeatLayout}
            onLayoutChange={handleLayoutChange}
            totalCapacity={formData.total_capacity}
          />
        </div>

        <div className="flex justify-end mt-6 space-x-2">
          {busId && onRegisterPayment && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onRegisterPayment(formData as Bus)}
              className="text-green-600 hover:bg-green-50"
            >
              <DollarSign className="mr-2 h-4 w-4" /> Registrar Abono
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {busId ? 'Guardar Cambios' : 'Añadir Autobús'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BusForm;