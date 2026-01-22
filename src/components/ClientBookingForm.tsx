"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Landmark, Info, Save, CheckCircle2, UserCheck, MapPin, Hotel } from 'lucide-react';
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
  const [showBankInfo, setShowBankInfo] = useState(false);
  
  const [breakdown, setBreakdown] = useState({ adults: 0, children: 0, text: '' });

  useEffect(() => {
    if (isOpen) setSelectedSeats(initialSelectedSeats);
  }, [isOpen, initialSelectedSeats]);

  useEffect(() => {
    const totalPeople = selectedSeats.length;
    // 1 habitación por cada 4 personas
    setRoomsCount(Math.ceil(totalPeople / 4));

    let adults = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
    let children = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
    formData.companions.forEach(c => { (c.age === null || c.age > 12) ? adults++ : children++; });

    let total = 0;
    let text = "";

    // APLICACIÓN DE REGLAS ESPECIALES
    if (adults === 1 && children === 1) {
      // 1 Adulto + 1 Niño = 2 Adultos en Doble
      total = 2 * tourSellingPrices.double;
      text = "Promoción: 2 Adultos en Hab. Doble";
    } else if (adults === 1 && (children === 2 || children === 3)) {
      // 1 Adulto + 2 o 3 Niños = 4 Adultos en Cuádruple
      total = 4 * tourSellingPrices.quad;
      text = "Promoción: Tarifa Hab. Cuádruple Completa";
    } else {
      // Lógica Estándar
      // Por simplicidad en el front, usamos una distribución básica basada en adultos
      const double = Math.floor(adults / 2);
      const remaining = adults % 2;
      total = (adults * tourSellingPrices.double) + (children * tourSellingPrices.child);
      text = `${adults} Adultos + ${children} Niños`;
    }

    setTotalAmount(total);
    setBreakdown({ adults, children, text });

    // Ajustar acompañantes
    const neededComps = totalPeople - 1;
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
    if (!formData.first_name || !formData.address) return toast.error("Faltan datos.");
    setIsSubmitting(true);
    const contractNum = uuidv4().substring(0, 8).toUpperCase();
    
    await supabase.from('clients').insert({
      ...formData,
      contract_number: contractNum,
      tour_id: tourId,
      number_of_people: selectedSeats.length,
      total_amount: totalAmount,
      advance_payment: selectedSeats.length * advancePaymentPerPerson,
      status: 'pending'
    });

    toast.success("Reserva enviada.");
    onClose();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Completar Reserva</DialogTitle></DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1"><Label>Nombre</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
             <div className="space-y-1"><Label>Edad del Titular</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
          </div>
          
          <div className="space-y-2"><Label>Domicilio</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>

          {/* DESGLOSE DE HABITACIÓN */}
          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-rosa-mexicano font-black uppercase text-xs tracking-widest">
                  <Hotel className="h-4 w-4" /> Distribución
                </div>
                <Badge className="bg-rosa-mexicano">{roomsCount} {roomsCount === 1 ? 'Habitación' : 'Habitaciones'}</Badge>
             </div>
             
             <div className="space-y-2 text-sm">
                <div className="flex justify-between opacity-80">
                  <span>Pax Totales:</span>
                  <span>{selectedSeats.length} ({breakdown.adults} Ad / {breakdown.children} Niñ)</span>
                </div>
                <div className="flex justify-between font-bold border-t border-white/10 pt-2 text-lg">
                  <span>TOTAL:</span>
                  <span className="text-yellow-400">${totalAmount.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-gray-400 italic mt-2">* {breakdown.text}</p>
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