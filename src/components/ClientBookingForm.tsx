"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Hotel, Info, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { TourProviderService, SeatLayout } from '@/types/shared';
import { Badge } from '@/components/ui/badge';

interface ClientBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourSellingPrices: { double: number; triple: number; quad: number; child: number };
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
    companions: [] as any[], extra_services: [] as TourProviderService[],
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

    // 1. Una habitación cada 4 personas (1-4 = 1 hab, 5-8 = 2 habs, etc)
    const neededRooms = Math.ceil(totalPax / 4);
    setRoomsCount(neededRooms);

    // 2. Clasificar por edad (<= 12 es niño)
    let adultsCount = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
    let childrenCount = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
    formData.companions.forEach(c => { (c.age === null || c.age > 12) ? adultsCount++ : childrenCount++; });

    // 3. Motor de Cálculo por Ocupación
    let tempAdults = adultsCount;
    let tempChildren = childrenCount;
    let calculatedTotal = 0;
    let details: string[] = [];

    for (let i = 0; i < neededRooms; i++) {
      const paxInRoom = Math.min(4, tempAdults + tempChildren);
      const adultsInRoom = Math.min(paxInRoom, tempAdults);
      const childrenInRoom = paxInRoom - adultsInRoom;

      // REGLA: 1 Adulto + 1 Niño = 2 Adultos en Doble (Niños no aplican en dobles)
      if (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1) {
        calculatedTotal += (2 * tourSellingPrices.double);
        details.push(`Hab. ${i+1}: 1 Adulto + 1 Niño (Cobrados como 2 Adultos en Doble)`);
      } 
      // REGLA: Ocupación Triple
      else if (paxInRoom === 3) {
        calculatedTotal += (adultsInRoom * tourSellingPrices.triple) + (childrenInRoom * tourSellingPrices.child);
        details.push(`Hab. ${i+1}: ${adultsInRoom} Adulto(s) en Triple + ${childrenInRoom} Niño(s)`);
      }
      // REGLA: Ocupación Cuádruple
      else if (paxInRoom === 4) {
        calculatedTotal += (adultsInRoom * tourSellingPrices.quad) + (childrenInRoom * tourSellingPrices.child);
        details.push(`Hab. ${i+1}: ${adultsInRoom} Adulto(s) en Cuádruple + ${childrenInRoom} Niño(s)`);
      }
      // REGLA: Ocupación Doble (2 adultos) o Sencilla (usamos doble como base)
      else {
        calculatedTotal += (adultsInRoom * tourSellingPrices.double) + (childrenInRoom * tourSellingPrices.child);
        details.push(`Hab. ${i+1}: ${adultsInRoom} Adulto(s) en Doble/Sencilla`);
      }

      tempAdults -= adultsInRoom;
      tempChildren -= childrenInRoom;
    }

    setTotalAmount(calculatedTotal);
    setBreakdown({ adults: adultsCount, children: childrenCount, details });

    // Sincronizar campos de acompañantes
    const neededComps = totalPax - 1;
    if (neededComps !== formData.companions.length && neededComps >= 0) {
      setFormData(p => {
        let newComps = [...p.companions];
        if (neededComps > newComps.length) {
          const toAdd = neededComps - newComps.length;
          newComps = [...newComps, ...Array.from({ length: toAdd }, () => ({ id: uuidv4(), name: '', age: null }))];
        } else {
          newComps = newComps.slice(0, neededComps);
        }
        return { ...p, companions: newComps };
      });
    }
  }, [selectedSeats.length, formData.contractor_age, formData.companions.length, tourSellingPrices]);

  const handleSave = async () => {
    if (!formData.first_name || !formData.address) return toast.error("Faltan datos obligatorios.");
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
      room_details: { rooms_count: roomsCount }
    });

    toast.success("¡Reserva enviada exitosamente!");
    onClose();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Completar Reserva: {tourTitle}</DialogTitle></DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1"><Label>Nombre</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
             <div className="space-y-1"><Label>Edad del Titular</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
          </div>
          <div className="space-y-2"><Label>Domicilio Completo</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-rosa-mexicano font-black uppercase text-xs tracking-widest">
                  <Hotel className="h-4 w-4" /> Resumen de Alojamiento
                </div>
                <Badge className="bg-rosa-mexicano">{roomsCount} {roomsCount === 1 ? 'Habitación' : 'Habitaciones'}</Badge>
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
                  <span className="text-gray-400">TOTAL:</span>
                  <span className="text-yellow-400">${totalAmount.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-gray-500">* Nota: En habitaciones compartidas por solo 1 adulto y 1 niño, el menor se cobra como adulto para cubrir la tarifa de habitación doble.</p>
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