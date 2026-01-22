"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Hotel, BusFront } from 'lucide-react';
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
  tourSellingPrices: { double: number; triple: number; quad: number; child: number };
  transportOnlyPrice?: number; // NEW
  advancePaymentPerPerson: number;
  agencySettings: any;
  initialSelectedSeats: number[];
}

const ClientBookingForm: React.FC<ClientBookingFormProps> = ({
  isOpen, onClose, tourId, tourTitle, tourSellingPrices, transportOnlyPrice = 0,
  advancePaymentPerPerson, agencySettings, initialSelectedSeats
}) => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: '', contractor_age: null as number | null,
    companions: [] as any[], is_transport_only: false, // NEW
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
      // CÁLCULO SOLO TRANSPORTE
      const total = totalPax * transportOnlyPrice;
      setTotalAmount(total);
      setRoomsCount(0);
      setBreakdown({ adults: totalPax, children: 0, details: [`${totalPax} Asiento(s) - Modalidad Solo Traslado`] });
    } else {
      // CÁLCULO ESTÁNDAR CON HABITACIONES
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
          details.push(`Hab. ${i+1}: 1 Adulto Solo (Paga total de 2 adultos en doble)`);
        } else if (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1) {
          calculatedTotal += (2 * tourSellingPrices.double);
          details.push(`Hab. ${i+1}: 1 Adulto + 1 Niño (Cobrados como 2 adultos en doble)`);
        } else {
          let occPrice = tourSellingPrices.quad;
          let label = "Cuádruple";
          if (paxInRoom === 3) { occPrice = tourSellingPrices.triple; label = "Triple"; }
          else if (paxInRoom === 2) { occPrice = tourSellingPrices.double; label = "Doble"; }
          calculatedTotal += (adultsInRoom * occPrice) + (childrenInRoom * tourSellingPrices.child);
          details.push(`Hab. ${i+1}: ${adultsInRoom} Ad. (${label}) + ${childrenInRoom} Niñ.`);
        }
        tempAdults -= adultsInRoom;
        tempChildren -= childrenInRoom;
      }
      setTotalAmount(calculatedTotal);
      setBreakdown({ adults: adultsCount, children: childrenCount, details });
    }

    const neededComps = totalPax - 1;
    if (neededComps !== formData.companions.length && neededComps >= 0) {
      setFormData(p => {
        let newComps = [...p.companions];
        if (neededComps > newComps.length) {
          const toAdd = neededComps - newComps.length;
          newComps = [...newComps, ...Array.from({ length: toAdd }, () => ({ id: uuidv4(), name: '', age: null }))];
        } else { newComps = newComps.slice(0, neededComps); }
        return { ...p, companions: newComps };
      });
    }
  }, [selectedSeats.length, formData.contractor_age, formData.companions.length, formData.is_transport_only, tourSellingPrices, transportOnlyPrice]);

  const handleSave = async () => {
    if (!formData.first_name || !formData.address) return toast.error("Datos incompletos.");
    setIsSubmitting(true);
    const contractNum = uuidv4().substring(0, 8).toUpperCase();
    
    await supabase.from('clients').insert({
      ...formData,
      contract_number: contractNum,
      tour_id: tourId,
      number_of_people: selectedSeats.length,
      total_amount: totalAmount,
      advance_payment: selectedSeats.length * advancePaymentPerPerson,
      status: 'pending',
      room_details: formData.is_transport_only ? { transport_only: true } : { rooms_count: roomsCount }
    });

    toast.success("¡Reserva realizada!");
    onClose();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detalles de Reserva: {tourTitle}</DialogTitle></DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1"><Label>Nombre</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
             <div className="space-y-1"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
          </div>
          
          {transportOnlyPrice > 0 && (
            <div className="flex items-center justify-between p-4 bg-rosa-mexicano/5 rounded-xl border border-rosa-mexicano/10">
              <div className="space-y-0.5">
                <Label className="text-base font-bold flex items-center gap-2"><BusFront className="h-4 w-4 text-rosa-mexicano" /> Modalidad: Solo Traslado</Label>
                <p className="text-xs text-muted-foreground">Activa esta opción si NO requieres hospedaje (${transportOnlyPrice} p/p).</p>
              </div>
              <Switch checked={formData.is_transport_only} onCheckedChange={val => setFormData({...formData, is_transport_only: val})} />
            </div>
          )}

          <div className="space-y-2"><Label>Dirección</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <div className="text-rosa-mexicano font-black uppercase text-xs tracking-widest flex items-center gap-2">
                  {formData.is_transport_only ? <BusFront className="h-4 w-4" /> : <Hotel className="h-4 w-4" />}
                  {formData.is_transport_only ? 'Servicio de Transporte' : 'Alojamiento'}
                </div>
                {!formData.is_transport_only && <Badge className="bg-rosa-mexicano">{roomsCount} {roomsCount === 1 ? 'Habitación' : 'Habitaciones'}</Badge>}
             </div>
             
             <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-1 border-b border-white/10 pb-3">
                  {breakdown.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 opacity-80 italic">
                      <div className="w-1 h-1 bg-rosa-mexicano rounded-full" /> {d}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-black text-xl pt-2">
                  <span className="text-gray-400 uppercase text-xs self-center">Total a Pagar:</span>
                  <span className="text-yellow-400 text-2xl">${totalAmount.toLocaleString()}</span>
                </div>
             </div>
          </div>

          <Button onClick={handleSave} disabled={isSubmitting} className="w-full bg-rosa-mexicano h-14 text-lg font-black rounded-xl">
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar y Reservar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;