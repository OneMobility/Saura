"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Landmark, Info, Save, CheckCircle2, UserCheck, MapPin } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { TourProviderService, SeatLayout } from '@/types/shared';
import { Badge } from '@/components/ui/badge';

interface BankAccount {
  id: string;
  bank_name: string;
  bank_clabe: string;
  bank_holder: string;
}

interface AgencySettings {
  payment_mode: 'test' | 'production';
  mp_public_key: string | null;
  mp_test_public_key: string | null;
  stripe_public_key: string | null;
  stripe_test_public_key: string | null;
  bank_accounts: BankAccount[];
  advance_payment_amount: number;
}

interface Companion {
  id: string;
  name: string;
  age: number | null;
}

interface ClientBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourImage: string;
  tourDescription: string;
  tourSellingPrices: { double: number; triple: number; quad: number; child: number };
  busDetails: { bus_id: string | null; bus_capacity: number; courtesies: number; seat_layout_json: SeatLayout | null };
  tourAvailableExtraServices: TourProviderService[];
  advancePaymentPerPerson: number;
  agencySettings: AgencySettings | null;
  initialSelectedSeats: number[];
}

const allocateRoomsForPeople = (totalPeople: number) => {
  let double = 0, triple = 0, quad = 0, remaining = totalPeople;
  if (remaining <= 0) return { double_rooms: 0, triple_rooms: 0, quad_rooms: 0 };
  quad = Math.floor(remaining / 4);
  remaining %= 4;
  if (remaining === 3) triple++;
  else if (remaining === 2) double++;
  else if (remaining === 1) { if (quad > 0) { quad--; triple++; double++; } else { double++; } }
  return { double_rooms: double, triple_rooms: triple, quad_rooms: quad };
};

const ClientBookingForm: React.FC<ClientBookingFormProps> = ({
  isOpen, onClose, tourId, tourTitle, tourSellingPrices, busDetails, 
  tourAvailableExtraServices, advancePaymentPerPerson, agencySettings,
  initialSelectedSeats
}) => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: '', contractor_age: null as number | null,
    companions: [] as Companion[], extra_services: [] as TourProviderService[],
  });
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelectedSeats);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roomDetails, setRoomDetails] = useState({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);
  
  // States for breakdown
  const [counts, setCounts] = useState({ adults: 0, children: 0 });

  useEffect(() => {
    if (isOpen) setSelectedSeats(initialSelectedSeats);
  }, [isOpen, initialSelectedSeats]);

  useEffect(() => {
    const totalNeeded = selectedSeats.length;
    const neededCompanions = totalNeeded - 1;
    setFormData(p => {
      let newComps = [...p.companions];
      if (neededCompanions > newComps.length) {
        const toAdd = neededCompanions - newComps.length;
        newComps = [...newComps, ...Array.from({ length: toAdd }, () => ({ id: uuidv4(), name: '', age: null }))];
      } else if (neededCompanions < newComps.length && neededCompanions >= 0) {
        newComps = newComps.slice(0, neededCompanions);
      }
      return { ...p, companions: newComps };
    });
  }, [selectedSeats.length]);

  useEffect(() => {
    // REGLA: 12 o menores son NIÑOS
    let adults = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
    let children = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
    
    formData.companions.forEach(c => { 
      (c.age === null || c.age > 12) ? adults++ : children++; 
    });
    
    setCounts({ adults, children });
    const rd = allocateRoomsForPeople(adults);
    setRoomDetails(rd);

    const total = (rd.double_rooms * tourSellingPrices.double * 2) +
                  (rd.triple_rooms * tourSellingPrices.triple * 3) +
                  (rd.quad_rooms * tourSellingPrices.quad * 4) +
                  (children * tourSellingPrices.child) +
                  formData.extra_services.reduce((s, x) => s + (x.selling_price_per_unit_snapshot * x.quantity), 0);
    setTotalAmount(total);
  }, [formData, tourSellingPrices]);

  const handlePayment = async (method: 'mercadopago' | 'stripe' | 'transferencia' | 'manual') => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.address) {
      toast.error('Nombre, Apellido, Email y Domicilio son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    try {
      const contractNum = uuidv4().substring(0, 8).toUpperCase();
      const advance = selectedSeats.length * advancePaymentPerPerson;

      const { data: newClient, error: clientErr } = await supabase.from('clients').insert({
        first_name: formData.first_name, last_name: formData.last_name,
        email: formData.email, phone: formData.phone, address: formData.address,
        identification_number: formData.identification_number,
        contract_number: contractNum, tour_id: tourId, number_of_people: selectedSeats.length,
        companions: formData.companions, extra_services: formData.extra_services,
        total_amount: totalAmount, advance_payment: advance, status: 'pending',
        contractor_age: formData.contractor_age, room_details: roomDetails
      }).select('id').single();

      if (clientErr) throw clientErr;

      await supabase.from('tour_seat_assignments').upsert(
        selectedSeats.map(s => ({ tour_id: tourId, seat_number: s, status: 'booked', client_id: newClient.id })),
        { onConflict: 'tour_id,seat_number' }
      );

      if (method === 'mercadopago') {
        const { data } = await supabase.functions.invoke('mercadopago-checkout', {
          body: { clientId: newClient.id, amount: advance, description: `Anticipo Tour: ${tourTitle}` }
        });
        window.location.href = data.init_point;
      } else if (method === 'stripe') {
        const { data } = await supabase.functions.invoke('stripe-checkout', {
          body: { clientId: newClient.id, amount: advance, description: `Anticipo Tour: ${tourTitle}`, contractNumber: contractNum }
        });
        window.location.href = data.url;
      } else if (method === 'transferencia') {
        setShowBankInfo(true);
      } else {
        onClose();
        toast.success("Reserva guardada.");
      }
    } catch (e: any) {
      toast.error('Error al procesar reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Finalizar Reserva: {tourTitle}</DialogTitle></DialogHeader>

        {!showBankInfo ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Nombre(s)</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Apellido(s)</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="space-y-1"><Label>WhatsApp</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              <div className="space-y-1"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
              <div className="space-y-1"><Label>Identificación</Label><Input value={formData.identification_number} onChange={e => setFormData({...formData, identification_number: e.target.value})} /></div>
              <div className="md:col-span-2 space-y-1"><Label>Domicilio Completo</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
            </div>

            {formData.companions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold border-b pb-1 text-sm uppercase text-gray-400">Acompañantes</h3>
                {formData.companions.map((c, idx) => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="md:col-span-2 space-y-1"><Label className="text-[10px]">Nombre Pasajero {idx + 2}</Label><Input value={c.name} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Edad</Label><Input type="number" value={c.age || ''} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, age: parseInt(e.target.value) || null} : x)})} /></div>
                  </div>
                ))}
              </div>
            )}

            {/* DESGLOSE DETALLADO */}
            <div className="bg-muted/40 p-4 rounded-xl border-2 border-dashed border-gray-200">
              <h4 className="text-xs font-black uppercase text-gray-500 mb-3 tracking-widest flex items-center gap-2">
                <Info className="h-3 w-3" /> Desglose de Precios
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pax Adultos ({counts.adults}):</span>
                  <div className="text-right">
                    {roomDetails.double_rooms > 0 && <div>{roomDetails.double_rooms} Hab. Doble x ${ (tourSellingPrices.double * 2).toLocaleString() }</div>}
                    {roomDetails.triple_rooms > 0 && <div>{roomDetails.triple_rooms} Hab. Triple x ${ (tourSellingPrices.triple * 3).toLocaleString() }</div>}
                    {roomDetails.quad_rooms > 0 && <div>{roomDetails.quad_rooms} Hab. Cuádruple x ${ (tourSellingPrices.quad * 4).toLocaleString() }</div>}
                  </div>
                </div>
                {counts.children > 0 && (
                  <div className="flex justify-between border-t pt-2">
                    <span>Pax Niños ({counts.children}):</span>
                    <span>{counts.children} x ${tourSellingPrices.child.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-rosa-mexicano border-t pt-2 text-base">
                  <span>TOTAL A PAGAR:</span>
                  <span>${totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-900 text-white rounded-xl flex justify-between items-center">
              <div><p className="text-[10px] uppercase font-bold opacity-60">Anticipo Hoy</p><h3 className="text-2xl font-black text-yellow-400">${(selectedSeats.length * advancePaymentPerPerson).toLocaleString()}</h3></div>
              <div className="text-right text-[10px] opacity-60 font-bold uppercase">{selectedSeats.length} lugares seleccionados</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasOnlineMP && <Button onClick={() => handlePayment('mercadopago')} disabled={isSubmitting} className="bg-[#009EE3] h-12 font-bold rounded-xl"><CreditCard className="mr-2 h-4 w-4" /> Mercado Pago</Button>}
              {hasOnlineStripe && <Button onClick={() => handlePayment('stripe')} disabled={isSubmitting} className="bg-[#635BFF] h-12 font-bold rounded-xl"><CreditCard className="mr-2 h-4 w-4" /> Tarjeta</Button>}
              {agencySettings?.bank_accounts.length ? <Button onClick={() => handlePayment('transferencia')} disabled={isSubmitting} variant="outline" className="border-green-600 text-green-700 h-12 font-bold rounded-xl"><Landmark className="mr-2 h-4 w-4" /> Transferencia</Button> : null}
              <Button onClick={() => handlePayment('manual')} disabled={isSubmitting} variant="outline" className="h-12 font-bold rounded-xl">Pagar después</Button>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center space-y-6">
             <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="h-10 w-10 text-green-600" /></div>
             <h2 className="text-2xl font-black">¡Reserva Registrada!</h2>
             <div className="bg-muted p-4 rounded-xl text-left">
               <p className="text-xs font-bold uppercase text-gray-400 mb-3">Cuentas Bancarias</p>
               {agencySettings?.bank_accounts.map(b => (
                 <div key={b.id} className="mb-3 p-3 bg-white rounded-lg border">
                   <p className="font-bold text-rosa-mexicano">{b.bank_name}</p>
                   <p className="font-mono text-lg">{b.bank_clabe}</p>
                   <p className="text-[10px] uppercase opacity-60">{b.bank_holder}</p>
                 </div>
               ))}
             </div>
             <Button onClick={onClose} className="w-full bg-green-600">Entendido</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;