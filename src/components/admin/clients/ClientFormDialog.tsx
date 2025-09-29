"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';

interface Client {
  id?: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  contract_number: string | null;
  tour_id: string | null;
  total_amount: number;
  advance_payment: number;
  total_paid: number;
  status: string;
  remaining_payment?: number; // Calculated field
}

interface TourOption {
  id: string;
  title: string;
}

interface ClientFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh client list
  initialData?: Client | null;
}

const ClientFormDialog: React.FC<ClientFormDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Client>({
    user_id: null,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    contract_number: '',
    tour_id: null,
    total_amount: 0,
    advance_payment: 0,
    total_paid: 0,
    status: 'pending',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tourOptions, setTourOptions] = useState<TourOption[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        phone: initialData.phone || '',
        address: initialData.address || '',
        contract_number: initialData.contract_number || '',
        tour_id: initialData.tour_id || null,
      });
    } else {
      setFormData({
        user_id: null,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        contract_number: '',
        tour_id: null,
        total_amount: 0,
        advance_payment: 0,
        total_paid: 0,
        status: 'pending',
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchTourOptions = async () => {
      const { data, error } = await supabase
        .from('tours')
        .select('id, title')
        .order('title', { ascending: true });

      if (error) {
        console.error('Error fetching tour options:', error);
        toast.error('Error al cargar las opciones de tours.');
      } else {
        setTourOptions(data || []);
      }
    };
    fetchTourOptions();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (id: keyof Client, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Por favor, rellena el nombre, apellido y correo electrónico del cliente.');
      setIsSubmitting(false);
      return;
    }

    if (formData.total_paid > formData.total_amount) {
      toast.error('El total pagado no puede ser mayor que el monto total del contrato.');
      setIsSubmitting(false);
      return;
    }

    const clientDataToSave = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone || null,
      address: formData.address || null,
      contract_number: formData.contract_number || null,
      tour_id: formData.tour_id || null,
      total_amount: formData.total_amount,
      advance_payment: formData.advance_payment,
      total_paid: formData.total_paid,
      status: formData.status,
    };

    if (initialData?.id) {
      // Update existing client
      const { error } = await supabase
        .from('clients')
        .update({ ...clientDataToSave, updated_at: new Date().toISOString() })
        .eq('id', initialData.id);

      if (error) {
        console.error('Error al actualizar el cliente:', error);
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
        console.error('Error al crear el cliente:', error);
        toast.error('Error al crear el cliente.');
      } else {
        toast.success('Cliente creado con éxito.');
        onSave();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  const remainingPayment = formData.total_amount - formData.total_paid;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Modifica los detalles del cliente.' : 'Rellena los campos para crear un nuevo cliente.'}
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
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
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
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="address" className="text-right pt-2">
              Dirección
            </Label>
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={handleChange}
              className="col-span-3 min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contract_number" className="text-right">
              Número de Contrato
            </Label>
            <Input
              id="contract_number"
              value={formData.contract_number || ''}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tour_id" className="text-right">
              Tour Asociado
            </Label>
            <Select value={formData.tour_id || ''} onValueChange={(value) => handleSelectChange('tour_id', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar Tour" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ninguno</SelectItem>
                {tourOptions.map((tour) => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <h3 className="col-span-4 text-lg font-semibold mt-4">Gestión de Pagos</h3>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="total_amount" className="text-right">
              Monto Total Contrato
            </Label>
            <Input
              id="total_amount"
              type="number"
              value={formData.total_amount}
              onChange={handleChange}
              className="col-span-3"
              min={0}
              step="0.01"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="advance_payment" className="text-right">
              Anticipo
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold">
              Pago Restante
            </Label>
            <Input
              value={remainingPayment.toFixed(2)}
              readOnly
              className="col-span-3 bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Estado
            </Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {initialData ? 'Guardar Cambios' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;