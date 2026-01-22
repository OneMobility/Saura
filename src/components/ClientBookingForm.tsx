"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Hotel, Bus, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { TourProviderService } from '@/types/shared';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface ClientBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourSellingPrices: { double: number; triple: number; quad: number; child: number; transport_only: number };
  advancePaymentPerPerson: number;
  agencySettings: any;
  initialSelectedSeats: number[];
}

const ClientBookingForm: React.FC<ClientBookingFormProps> = ({
  isOpen, onClose, tourId, tourTitle, tourSellingPrices, 
  advancePaymentPerPerson, agencySettings, initialSelectedSeats
}) => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: '', contractor_age: null as number | null,
    companions: [] as any[], is_transport_only: false
  });
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelectedSeats);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [breakdown, setBreakdown] = useState({ adults: 0, children: 0, details: [] as string[] });

  useEffect(() => {
    if (isOpen) setSelectedSeats(initialSelectedSeats);
  }, [isOpen, initialSelectedSeats]);

  useEffect(() => {
    const totalPax = selectedSeats.length;
    if (totalPax === 0) return;

    if (formData.is_transport_only) {
      const total = totalPax * (tourSellingPrices.transport_only || 0);
      setTotalAmount(total);
      setRoomsCount(0);
      setBreakdown({ adults: totalPax, children: 0, details: [`${totalPax} Pasajeros en modalidad SOLO TRASLADO`] });
    } else {
      const neededRooms = Math.ceil(totalPax / 4);
      setRoomsCount(neededRooms);
      
      let adultsCount = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
      let childrenCount = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
      formData.companions.forEach(c => { (c.age === null || c.age > 12) ? adultsCount++ : childrenCount++; });

      let tempAdults = adultsCount;
      let tempChildren = childrenCount;
      let calculatedTotal = 0;
      let details: string[] = [];

      for (let i = 0; i < neededRooms; i++) {
        const paxInRoom = Math.min(4, tempAdults + tempChildren);
        const adultsInRoom = Math.min(paxInRoom, tempAdults);
        const childrenInRoom = paxInRoom - adultsInRoom;

        if (paxInRoom === 1 && adultsInRoom === 1) {
          calculatedTotal += (2 * tourSellingPrices.double);
          details.push(`Hab. ${i+1}: Adulto Solo (Total Doble)`);
        } else if (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1) {
          calculatedTotal += (2 * tourSellingPrices.double);
          details.push(`Hab. ${i+1}: 1 Ad + 1 Niñ (Total Doble)`);
        } else {
          let occPrice = paxInRoom === 4 ? tourSellingPrices.quad : (paxInRoom === 3 ? tourSellingPrices.triple : tourSellingPrices.double);
          calculatedTotal += (adultsInRoom * occPrice) + (childrenInRoom * tourSellingPrices.child);
          details.push(`Hab. ${i+1}: Ocupación de ${paxInRoom} pax`);
        }
        tempAdults -= adultsInRoom;
        tempChildren -= childrenInRoom;
      }
      setTotalAmount(calculatedTotal);
      setBreakdown({ adults: adultsCount, children: childrenCount, details });
    }
  }, [selectedSeats.length, formData.contractor_age, formData.companions.length, formData.is_transport_only, tourSellingPrices]);

  const handleSave = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.from('clients').insert({
      ...formData,
      contract_number: uuidv4().substring(0, 8).toUpperCase(),
      tour_id: tourId,
      number_of_people: selectedSeats.length,
      total_amount: totalAmount,
      advance_payment: selectedSeats.length * advancePaymentPerPerson,
      status: 'pending',
      room_details: { rooms_count: roomsCount }
    });
    if (!error) { toast.success("Reserva realizada"); onClose(); }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva Reserva: {tourTitle}</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <Bus className="h-6 w-6 text-blue-600" />
              <div>
                <Label className="text-blue-900 font-bold">¿Solo requiere traslado redondo?</Label>
                <p className="text-[10px] text-blue-700">Sin hospedaje incluido. Precio especial por persona.</p>
              </div>
            </div>
            <Switch checked={formData.is_transport_only} onCheckedChange={val => setFormData({...formData, is_transport_only: val})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <Input placeholder="Nombre" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
             <Input placeholder="Edad" type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} />
          </div>
          <Textarea placeholder="Domicilio" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <span className="text-rosa-mexicano font-black text-xs uppercase tracking-widest">Resumen de Liquidación</span>
                <Badge variant="outline" className="text-white border-white/20">
                  {formData.is_transport_only ? 'MODALIDAD TRASLADO' : `${roomsCount} Habitaciones`}
                </Badge>
             </div>
             <div className="space-y-2 text-sm opacity-80 italic">
                {breakdown.details.map((d, i) => <p key={i}>- {d}</p>)}
             </div>
             <div className="flex justify-between font-black text-2xl pt-4 mt-4 border-t border-white/10">
                <span>TOTAL:</span>
                <span className="text-yellow-400">${totalAmount.toLocaleString()}</span>
             </div>
          </div>

          <Button onClick={handleSave} disabled={isSubmitting} className="w-full bg-rosa-mexicano h-14 text-lg font-black">
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Reserva'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;