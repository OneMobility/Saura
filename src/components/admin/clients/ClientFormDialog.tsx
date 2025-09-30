"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // For generating contract numbers

interface Companion {
  id: string;
  name: string;
}

interface Client {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  contract_number: string;
  tour_id: string | null;
  number_of_people: number;
  occupancy_type: 'double' | 'triple' | 'quad';
  companions: Companion[];
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  remaining_payment?: number; // Calculated field
}

interface Tour {
  id: string;
  title: string;
  selling_price_double_occupancy: number;
  selling_price_triple_occupancy: number;
  selling_price_quad_occupancy: number;
}

interface ClientFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh client list
  initialData?: Client | null;
}

const ClientFormDialog: React.FC<ClientFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Client>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    contract_number: uuidv4().substring(0, 8).toUpperCase(), // Generate a short UUID for contract
    tour_id: null,
    number_of_people: 1,
    occupancy_type: 'double',
    companions: [],
    total_amount: 0,
    advance_payment: 0,
    total_paid: 0,
    status: 'pending',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [selectedTourPrices, setSelectedTourPrices] = useState<Tour | null>(null);

  useEffect(() => {
    const fetchTours = async () => {
      const { data, error } = await supabase
        .from('tours')
        .select('id, title, selling_price_double_occupancy, selling_price_triple_occupancy, selling_price_quad_occupancy')
        .order('title', { ascending: true });

      if (error) {
        console.error('Error fetching tours:', error);
        toast.error('Error al cargar la lista de tours.');
      } else {
        setAvailableTours(data || []);
      }
    };
    fetchTours();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        companions: initialData.companions || [],
        contract_number: initialData.contract_number || uuidv4().substring(0, 8).toUpperCase(),
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        contract_number: uuidv4().substring(0, 8).toUpperCase(),
        tour_id: null,
        number_of_people: 1,
        occupancy_type: 'double',
        companions: [],
        total_amount: 0,
        advance_payment: 0,
        total_paid: 0,
        status: 'pending',
      });
    }
  }, [initialData, isOpen]);

  // Effect to update selectedTourPrices when formData.tour_id changes
  useEffect(() => {
    if (formData.tour_id) {
      const tour = availableTours.find(t => t.id === formData.tour_id);
      setSelectedTourPrices(tour || null);
    } else {
      setSelectedTourPrices(null);
    }
  }, [formData.tour_id, availableTours]);

  // Effect to calculate total_amount and number_of_people
  useEffect(() => {
    const numPeople = 1 + formData.companions.length;
    let pricePerPerson = 0;

    if (selectedTourPrices) {
      switch (formData.occupancy_type) {
        case 'double':
          pricePerPerson = selectedTourPrices.selling_price_double_occupancy;
          break;
        case 'triple':
          pricePerPerson = selectedTourPrices.selling_price_triple_occupancy;
          break;
        case 'quad':
          pricePerPerson = selectedTourPrices.selling_price_quad_occupancy;
          break;
        default:
          pricePerPerson = 0;
      }
    }
    const calculatedTotalAmount = numPeople * pricePerPerson;

    setFormData(prev => ({
      ...prev,
      number_of_people: numPeople,
      total_amount: calculatedTotalAmount,
      remaining_payment: calculatedTotalAmount - prev.total_paid,
    }));
  }, [formData.companions.length, formData.occupancy_type, formData.total_paid, selectedTourPrices]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (id: keyof Client, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: parseFloat(value) || 0,
    }));
  };

  const handleSelectChange = (id: keyof Client, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCompanionChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      companions: prev.companions.map(c => c.id === id ? { ...c, name: value } : c),
    }));
  };

  const addCompanion = () => {
    setFormData((prev) => ({
      ...prev,
      companions: [...prev.companions, { id: uuidv4(), name: '' }],
    }));
  };

  const removeCompanion = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      companions: prev.companions.filter(c => c.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.tour_id) {
      toast.error('Por favor, rellena los campos obligatorios (Nombre, Apellido, Email, Tour).');
      setIsSubmitting(false);
      return;
    }

    if (formData.total_paid < formData.advance_payment) {
      toast.error('El total pagado no puede ser menor que el anticipo.');
      setIsSubmitting(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debes iniciar sesión para gestionar clientes.');
      setIsSubmitting(false);
      return;
    }

    const clientDataToSave = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone || null,
      address: formData.address || null,
      contract_number: formData.contract_number,
      tour_id: formData.tour_id,
      number_of_people: formData.number_of_people,
      occupancy_type: formData.occupancy_type,
      companions: formData.companions,
      total_amount: formData.total_amount,
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
      status: formData.status,
      user_id: user.id, // Link to the admin user who created/updated it
    };

    if (initialData?.id) {
      // Update existing client
      const { error } = await supabase
        .from('clients')
        .update({ ...clientDataToSave, updated_at: new Date().toISOString() })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error updating client:', error);
        toast.error('Error al actualizar el cliente.');
      } else {
        toast.success('Cliente actualizado con éxito.');
        onSave();
        onClose();
      }
    } else {
      // Insert new client
      const { error } = await supabase
        .from('clients')
        .insert(clientDataToSave);

      if (error) {
        console.error('Error creating client:', error);
        toast.error('Error al crear el cliente.');
      } else {
        toast.success('Cliente creado con éxito.');
        onSave();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles del cliente y su contrato.' : 'Rellena los campos para registrar un nuevo cliente y su reserva.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Client Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombre</Label>
              <Input id="first_name" value={formData.first_name} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="last_name">Apellido</Label>
              <Input id="last_name" value={formData.last_name} onChange={handleChange} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={formData.phone} onChange={handleChange} />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Dirección</Label>
            <Textarea id="address" value={formData.address} onChange={handleChange} rows={2} />
          </div>

          {/* Contract and Tour Info */}
          <h3 className="text-lg font-semibold mt-4">Detalles del Contrato y Tour</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contract_number">Número de Contrato</Label>
              <Input id="contract_number" value={formData.contract_number} readOnly className="bg-gray-100 cursor-not-allowed" />
            </div>
            <div>
              <Label htmlFor="tour_id">Tour Asociado</Label>
              <Select value={formData.tour_id || ''} onValueChange={(value) => handleSelectChange('tour_id', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Tour" />
                </SelectTrigger>
                <SelectContent>
                  {availableTours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Occupancy and Companions */}
          <h3 className="text-lg font-semibold mt-4">Ocupación y Acompañantes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="occupancy_type">Tipo de Ocupación</Label>
              <Select value={formData.occupancy_type} onValueChange={(value) => handleSelectChange('occupancy_type', value as 'double' | 'triple' | 'quad')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Ocupación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="double">Doble</SelectItem>
                  <SelectItem value="triple">Triple</SelectItem>
                  <SelectItem value="quad">Cuádruple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="number_of_people">Número Total de Personas</Label>
              <Input id="number_of_people" type="number" value={formData.number_of_people} readOnly className="bg-gray-100 cursor-not-allowed" />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Label className="font-semibold">Acompañantes</Label>
            {formData.companions.map((companion) => (
              <div key={companion.id} className="flex items-center gap-2">
                <Input
                  value={companion.name}
                  onChange={(e) => handleCompanionChange(companion.id, e.target.value)}
                  placeholder="Nombre del acompañante"
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => removeCompanion(companion.id)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addCompanion}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Acompañante
            </Button>
          </div>

          {/* Payment Details */}
          <h3 className="text-lg font-semibold mt-4">Detalles de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_amount">Monto Total del Contrato</Label>
              <Input id="total_amount" type="number" value={formData.total_amount.toFixed(2)} readOnly className="bg-gray-100 cursor-not-allowed font-bold" />
            </div>
            <div>
              <Label htmlFor="advance_payment">Anticipo</Label>
              <Input id="advance_payment" type="number" value={formData.advance_payment} onChange={(e) => handleNumberChange('advance_payment', e.target.value)} min={0} step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_paid">Total Pagado</Label>
              <Input id="total_paid" type="number" value={formData.total_paid} onChange={(e) => handleNumberChange('total_paid', e.target.value)} min={0} step="0.01" />
            </div>
            <div>
              <Label htmlFor="remaining_payment">Falta por Pagar</Label>
              <Input id="remaining_payment" type="number" value={(formData.total_amount - formData.total_paid).toFixed(2)} readOnly className="bg-gray-100 cursor-not-allowed font-bold text-red-600" />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Estado del Contrato</Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {initialData ? 'Guardar Cambios' : 'Añadir Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;