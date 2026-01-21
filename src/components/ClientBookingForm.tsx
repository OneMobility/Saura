"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, PlusCircle, MinusCircle, CreditCard } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import TourSeatMap from '@/components/TourSeatMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TourProviderService, SeatLayout } from '@/types/shared';

interface Companion {
  id: string;
  name: string;
  age: number | null;
}

interface RoomDetails {
  double_rooms: number;
  triple_rooms: number;
  quad_rooms: number;
}

interface TourSellingPrices {
  double: number;
  triple: number;
  quad: number;
  child: number;
}

interface BusDetails {
  bus_id: string | null;
  bus_capacity: number;
  courtesies: number;
  seat_layout_json: SeatLayout | null;
}

interface ClientBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourImage: string;
  tourDescription: string;
  tourSellingPrices: TourSellingPrices;
  busDetails: BusDetails;
  tourAvailableExtraServices: TourProviderService[];
  initialSelectedSeats?: number[];
}

const allocateRoomsForPeople = (totalPeople: number): RoomDetails => {
  let double = 0;
  let triple = 0;
  let quad = 0;
  let remaining = totalPeople;
  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };
  quad = Math.floor(remaining / 4);
  remaining %= 4;
  if (remaining === 1) {
    if (quad > 0) { quad--; triple++; double++; } else { double++; }
  } else if (remaining === 2) { double++; } else if (remaining === 3) { triple++; }
  return { double_rooms: double, triple_rooms: triple, quad_rooms: quad };
};

const ClientBookingForm: React.FC<ClientBookingFormProps> = ({
  isOpen, onClose, tourId, tourTitle, tourImage, tourDescription,
  tourSellingPrices, busDetails, tourAvailableExtraServices, initialSelectedSeats = [],
}) => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: null as string | null, contractor_age: null as number | null,
    companions: [] as Companion[], extra_services: [] as TourProviderService[],
  });
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelectedSeats);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roomDetails, setRoomDetails] = useState<RoomDetails>({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);

  useEffect(() => {
    const fetchAdvance = async () => {
      const { data } = await supabase.from('agency_settings').select('advance_payment_amount').single();
      if (data) setAdvanceAmount(data.advance_payment_amount || 0);
    };
    fetchAdvance();
  }, []);

  useEffect(() => {
    let adults = 0;
    let children = 0;
    if (formData.contractor_age === null || formData.contractor_age >= 12) adults++; else children++;
    formData.companions.forEach(c => { if (c.age === null || c.age >= 12) adults++; else children++; });
    
    const rooms = allocateRoomsForPeople(adults);
    setRoomDetails(rooms);

    let amount = (rooms.double_rooms * tourSellingPrices.double * 2) +
                 (rooms.triple_rooms * tourSellingPrices.triple * 3) +
                 (rooms.quad_rooms * tourSellingPrices.quad * 4) +
                 (children * tourSellingPrices.child);

    amount += formData.extra_services.reduce((sum, s) => sum + (s.selling_price_per_unit_snapshot * s.quantity), 0);
    setTotalAmount(amount);
  }, [formData.contractor_age, formData.companions, tourSellingPrices, formData.extra_services]);

  const handleSubmit = async (e: React.FormEvent, withPayment: boolean = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const totalPeople = 1 + formData.companions.length;
    if (!formData.first_name || !formData.email) {
      toast.error('Nombre y Email son obligatorios.');
      setIsSubmitting(false);
      return;
    }

    if (selectedSeats.length !== totalPeople) {
      toast.error(`Selecciona ${totalPeople} asientos.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const contractNumber = uuidv4().substring(0, 8).toUpperCase();
      const clientData = {
        first_name: formData.first_name, last_name: formData.last_name,
        email: formData.email, phone: formData.phone, address: formData.address,
        identification_number: formData.identification_number, contract_number: contractNumber,
        tour_id: tourId, number_of_people: totalPeople, companions: formData.companions,
        extra_services: formData.extra_services, total_amount: totalAmount,
        advance_payment: 0, total_paid: 0, status: 'pending',
        contractor_age: formData.contractor_age, room_details: roomDetails,
      };

      const { data: newClient, error: clientError } = await supabase.from('clients').insert(clientData).select('id').single();
      if (clientError) throw clientError;

      const seatAssignments = selectedSeats.map(num => ({
        tour_id: tourId, seat_number: num, status: 'booked', client_id: newClient.id,
      }));
      await supabase.from('tour_seat_assignments').insert(seatAssignments);

      if (withPayment && advanceAmount > 0) {
        const totalToCharge = advanceAmount * totalPeople;
        const { data: mpData, error: mpError } = await supabase.functions.invoke('mercadopago-checkout', {
          body: { clientId: newClient.id, amount: totalToCharge, description: `Anticipo Tour: ${tourTitle}` }
        });
        if (mpError) throw mpError;
        window.location.href = mpData.init_point;
      } else {
        toast.success(`¡Reserva exitosa! Contrato: ${contractNumber}`);
        onClose();
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Ocurrió un error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAdvance = advanceAmount * (1 + formData.companions.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reservar: {tourTitle}</DialogTitle>
          <DialogDescription>Completa tus datos para confirmar tu lugar.</DialogDescription>
        </DialogHeader>
        <form className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>

          <div className="border-t pt-4">
             <Label className="text-lg font-bold">Resumen de Pago</Label>
             <div className="bg-gray-50 p-4 rounded-md mt-2 space-y-1">
               <p>Total del Tour: <span className="font-bold">${totalAmount.toFixed(2)}</span></p>
               {advanceAmount > 0 && (
                 <p className="text-rosa-mexicano font-semibold">Anticipo requerido: ${totalAdvance.toFixed(2)}</p>
               )}
             </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, false)} disabled={isSubmitting}>
              Reservar y pagar después
            </Button>
            {advanceAmount > 0 && (
              <Button type="button" onClick={(e) => handleSubmit(e, true)} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Pagar Anticipo con Mercado Pago
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;