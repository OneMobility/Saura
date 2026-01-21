"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, DollarSign } from 'lucide-react'; // Removed CalendarIcon
import { format, parse, isValid, parseISO, addDays } from 'date-fns'; // Added addDays
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
  num_double_rooms: number;
  num_triple_rooms: number;
  num_quad_rooms: number;
  num_courtesy_rooms: number;
  is_active: boolean;
  advance_payment: number;
  total_paid: number;
  // NEW: quote_end_date
  quote_end_date: string | null;
  // calculated fields
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
    quote_end_date: null, // Initialize new field
    total_quote_cost: 0,
    remaining_payment: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [dateInput, setDateInput] = useState<string>(''); 
  const loadedHotelIdRef = useRef<string | undefined>(undefined); // NEW: Ref to track if onHotelDataLoaded was called for this ID

  const calculateQuoteCosts = useCallback(() => {
    const totalCostDoubleRooms = formData.num_double_rooms * formData.cost_per_night_double * formData.num_nights_quoted;
    const totalCostTripleRooms = formData.num_triple_rooms * formData.cost_per_night_triple * formData.num_nights_quoted;
    const totalCostQuadRooms = formData.num_quad_rooms * formData.cost_per_night_quad * formData.num_nights_quoted;
    
    const totalContractedRoomsCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;

    const costOfCourtesyRooms = formData.num_courtesy_rooms * formData.cost_per_night_quad * formData.num_nights_quoted;

    const totalQuoteCost = totalContractedRoomsCost - costOfCourtesyRooms;
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
    formData.total_paid,
    formData.num_courtesy_rooms
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
          loadedHotelIdRef.current = undefined; // Reset ref on error
          return;
        }

        if (data) {
          const totalCostDoubleRooms = (data.num_double_rooms || 0) * data.cost_per_night_double * data.num_nights_quoted;
          const totalCostTripleRooms = (data.num_triple_rooms || 0) * data.cost_per_night_triple * data.num_nights_quoted;
          const totalCostQuadRooms = (data.num_quad_rooms || 0) * data.cost_per_night_quad * data.num_nights_quoted;
          const totalContractedRoomsCost = totalCostDoubleRooms + totalCostTripleRooms + totalCostQuadRooms;

          const costOfCourtesyRooms = (data.num_courtesy_rooms || 0) * data.cost_per_night_quad * data.num_nights_quoted;

          const totalQuoteCost = totalContractedRoomsCost - costOfCourtesyRooms;

          const loadedData = {
            ...data,
            num_double_rooms: data.num_double_rooms || 0,
            num_triple_rooms: data.num_triple_rooms || 0,
            num_quad_rooms: data.num_quad_rooms || 0,
            num_courtesy_rooms: data.num_courtesy_rooms || 0,
            total_quote_cost: totalQuoteCost,
            remaining_payment: totalQuoteCost - (data.total_paid || 0),
            quote_end_date: data.quote_end_date || null, // Load new field
          };
          setFormData(loadedData);
          setDateInput(data.quoted_date ? format(parseISO(data.quoted_date), 'dd/MM/yy') : '');
          
          // NEW: Only call onHotelDataLoaded if it hasn't been called for this specific hotelId yet
          if (loadedHotelIdRef.current !== hotelId) {
            onHotelDataLoaded?.(loadedData);
            loadedHotelIdRef.current = hotelId;
          }
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
          num_courtesy_rooms: 0,
          is_active: true,
          advance_payment: 0,
          total_paid: 0,
          quote_end_date: null, // Reset new field
          total_quote_cost: 0,
          remaining_payment: 0,
        });
        setDateInput('');
        loadedHotelIdRef.current = undefined; // Reset for new form
      }
      setLoadingInitialData(false);
    };

    fetchHotelData();
  }, [hotelId, onHotelDataLoaded]); // onHotelDataLoaded is still a dependency, but its invocation is guarded.

  useEffect(() => {
    calculateQuoteCosts();
  }, [calculateQuoteCosts]);

  useEffect(() => {
    if (formData.quoted_date) {
      setDateInput(format(parseISO(formData.quoted_date), 'dd/MM/yy'));
    } else {
      setDateInput('');
    }
  }, [formData.quoted_date]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => {
      const isNumeric = ['num_nights_quoted', 'cost_per_night_double', 'cost_per_night_triple', 'cost_per_night_quad', 'num_double_rooms', 'num_triple_rooms', 'num_quad_rooms', 'num_courtesy_rooms', 'advance_payment', 'total_paid'].includes(id);
      const newValue = isNumeric ? parseFloat(value) || 0 : value;
      
      const updatedData = { ...prev, [id]: newValue };

      // Recalculate quote_end_date if quoted_date or num_nights_quoted changes
      if (id === 'quoted_date' || id === 'num_nights_quoted') {
        const currentQuotedDate = id === 'quoted_date' ? newValue : prev.quoted_date;
        const currentNumNights = id === 'num_nights_quoted' ? newValue : prev.num_nights_quoted;

        if (currentQuotedDate && currentNumNights > 0) {
          const parsedDate = parseISO(currentQuotedDate as string);
          if (isValid(parsedDate)) {
            // End date is start date + num_nights_quoted
            const endDate = addDays(parsedDate, currentNumNights as number);
            updatedData.quote_end_date = format(endDate, 'yyyy-MM-dd');
          } else {
            updatedData.quote_end_date = null;
          }
        } else {
          updatedData.quote_end_date = null;
        }
      }

      return updatedData;
    });
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateInput(value);

    const parsedDate = parse(value, 'dd/MM/yy', new Date());
    
    if (isValid(parsedDate)) {
      const quoted_date = format(parsedDate, 'yyyy-MM-dd');
      
      // Calculate quote_end_date
      const numNights = formData.num_nights_quoted || 1;
      const endDate = addDays(parsedDate, numNights);
      const quote_end_date = format(endDate, 'yyyy-MM-dd');

      setFormData((prev) => ({ 
        ...prev, 
        quoted_date,
        quote_end_date,
      }));
    } else {
      setFormData((prev) => ({ ...prev, quoted_date: null, quote_end_date: null }));
    }
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
    if (formData.num_double_rooms < 0 || formData.num_triple_rooms < 0 || formData.num_quad_rooms < 0 || formData.num_courtesy_rooms < 0) {
      toast.error('El número de habitaciones no puede ser negativo.');
      setIsSubmitting(false);
      return;
    }
    if (formData.num_double_rooms === 0 && formData.num_triple_rooms === 0 && formData.num_quad_rooms === 0 && formData.num_courtesy_rooms === 0) {
      toast.error('Debes especificar al menos una habitación contratada o de coordinador.');
      setIsSubmitting(false);
      return;
    }

    // Final calculation of quote_end_date before saving
    let finalQuoteEndDate = formData.quote_end_date;
    if (formData.quoted_date && formData.num_nights_quoted > 0) {
      const parsedDate = parseISO(formData.quoted_date);
      if (isValid(parsedDate)) {
        finalQuoteEndDate = format(addDays(parsedDate, formData.num_nights_quoted), 'yyyy-MM-dd');
      }
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
      quote_end_date: finalQuoteEndDate, // Save the calculated end date
    };

    if (hotelId) {
      const { error } = await supabase
        .from('hotels')
        .update({
          ...dataToSave,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hotelId);

      if (error) {
        console.error('Error al actualizar la cotización del hotel:', error);
        toast.error('Error al actualizar la cotización del hotel.');
      } else {
        toast.success('Cotización de hotel actualizada con éxito.');
        onSave();
      }
    } else {
      const { error } = await supabase
        .from('hotels')
        .insert(dataToSave);

      if (error) {
        console.error('Error al crear la cotización del hotel:', error);
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

  const quoteEndDateDisplay = formData.quote_end_date ? format(parseISO(formData.quote_end_date), 'dd/MM/yy') : 'N/A';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{hotelId ? 'Editar Cotización de Hotel' : 'Añadir Nueva Cotización de Hotel'}</h2>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre del Hotel
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
              Fecha Inicio Cotización
            </Label>
            <div className="relative col-span-3">
              <Input
                id="quoted_date_input"
                type="text"
                value={dateInput}
                onChange={handleDateInputChange}
                placeholder="DD/MM/AA"
                className={cn(
                  "w-full justify-start text-left font-normal pr-10",
                  !formData.quoted_date && "text-muted-foreground"
                )}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_nights_quoted" className="text-right">
              Noches Cotizadas
            </Label>
            <Input
              id="num_nights_quoted"
              type="text" // Changed to text
              pattern="[0-9]*" // Pattern for integers
              value={formData.num_nights_quoted}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold">
              Fecha Fin Cotización
            </Label>
            <Input
              value={quoteEndDateDisplay}
              readOnly
              className="col-span-3 bg-gray-100 cursor-not-allowed"
            />
          </div>

          <h3 className="col-span-4 text-lg font-semibold mt-4">Costos por Noche (Cotizados)</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_double" className="text-right">
              Costo Doble (x{formData.capacity_double})
            </Label>
            <Input
              id="cost_per_night_double"
              type="text" // Changed to text
              pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
              value={formData.cost_per_night_double}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_triple" className="text-right">
              Costo Triple (x{formData.capacity_triple})
            </Label>
            <Input
              id="cost_per_night_triple"
              type="text" // Changed to text
              pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
              value={formData.cost_per_night_triple}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost_per_night_quad" className="text-right">
              Costo Cuádruple (x{formData.capacity_quad})
            </Label>
            <Input
              id="cost_per_night_quad"
              type="text" // Changed to text
              pattern="[0-9]*\.?[0-9]*" // Pattern for numbers with optional decimals
              value={formData.cost_per_night_quad}
              onChange={handleChange}
              className="col-span-3"
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
              type="text" // Changed to text
              pattern="[0-9]*" // Pattern for integers
              value={formData.num_double_rooms}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_triple_rooms" className="text-right">
              Hab. Triples
            </Label>
            <Input
              id="num_triple_rooms"
              type="text" // Changed to text
              pattern="[0-9]*" // Pattern for integers
              value={formData.num_triple_rooms}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_quad_rooms" className="text-right">
              Hab. Cuádruples
            </Label>
            <Input
              id="num_quad_rooms"
              type="text" // Changed to text
              pattern="[0-9]*" // Pattern for integers
              value={formData.num_quad_rooms}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="num_courtesy_rooms" className="text-right">
              Hab. Coordinadores
            </Label>
            <Input
              id="num_courtesy_rooms"
              type="text" // Changed to text
              pattern="[0-9]*" // Pattern for integers
              value={formData.num_courtesy_rooms}
              onChange={handleChange}
              className="col-span-3"
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
              <Label className="font-semibold">Costo Total de esta Cotización:</Label>
              <p>${formData.total_quote_cost.toFixed(2)}</p>
            </div>
            <div>
              <Label className="font-semibold">Pago Restante:</Label>
              <p>${formData.remaining_payment.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex justify-end mt-6 space-x-2">
            {hotelId && onRegisterPayment && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onRegisterPayment(formData as Hotel)}
                className="text-green-600 hover:bg-green-50"
              >
                <DollarSign className="mr-2 h-4 w-4" /> Registrar Abono
              </Button>
            )}
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