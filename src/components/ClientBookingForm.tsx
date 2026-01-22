"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Landmark, Info, PlusCircle, MinusCircle, Save, Copy, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import TourSeatMap from '@/components/TourSeatMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Sync initial seats when opening
  useEffect(() => {
    if (isOpen) setSelectedSeats(initialSelectedSeats);
  }, [isOpen, initialSelectedSeats]);

  // Handle companion count to match selected seats
  useEffect(() => {
    const totalNeeded = selectedSeats.length;
    const currentCompanions = formData.companions.length;
    const neededCompanions = totalNeeded - 1; // contractor + companions

    if (neededCompanions > currentCompanions) {
      const toAdd = neededCompanions - currentCompanions;
      setFormData(p => ({
        ...p,
        companions: [...p.companions, ...Array.from({ length: toAdd }, () => ({ id: uuidv4(), name: '', age: null }))]
      }));
    } else if (neededCompanions < currentCompanions && neededCompanions >= 0) {
      setFormData(p => ({
        ...p,
        companions: p.companions.slice(0, neededCompanions)
      }));
    }
  }, [selectedSeats.length]);

  useEffect(() => {
    let adults = (formData.contractor_age === null || formData.contractor_age >= 12) ? 1 : 0;
    let children = (formData.contractor_age !== null && formData.contractor_age < 12) ? 1 : 0;
    formData.companions.forEach(c => { (c.age === null || c.age >= 12) ? adults++ : children++; });
    
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
    if (!formData.first_name || !formData.last_name || !formData.email) return toast.error('Rellena los campos obligatorios.');
    if (selectedSeats.length === 0) return toast.error('Selecciona al menos un asiento.');

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

      if (clientErr || !newClient) throw new Error("Error");

      await supabase.from('tour_seat_assignments').insert(selectedSeats.map(s => ({
        tour_id: tourId, seat_number: s, status: 'booked', client_id: newClient.id
      })));

      if (method === 'mercadopago') {
        const { data } = await supabase.functions.invoke('mercadopago-checkout', {
          body: { clientId: newClient.id, amount: advance, description: `Anticipo Tour: ${tourTitle}` }
        });
        window.location.href = data.init_point;
      } else if (method === 'stripe') {
        const { data } = await supabase.functions.invoke('stripe-checkout', {
          body: { clientId: newClient.id, amount: advance, description: `Anticipo Tour: ${tourTitle}` }
        });
        window.location.href = data.url;
      } else if (method === 'transferencia') {
        setShowBankInfo(true);
        toast.success(`Contrato ${contractNum} guardado.`);
      } else {
        toast.success(`Reserva exitosa: ${contractNum}`);
        onClose();
      }
    } catch (e) {
      toast.error('Error al procesar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasOnlineMP = !!(agencySettings?.payment_mode === 'test' ? agencySettings?.mp_test_public_key : agencySettings?.mp_public_key);
  const hasOnlineStripe = !!(agencySettings?.payment_mode === 'test' ? agencySettings?.stripe_test_public_key : agencySettings?.stripe_public_key);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Reserva: {tourTitle}</DialogTitle>
          {agencySettings?.payment_mode === 'test' && <Badge className="bg-yellow-400 text-black w-fit">Modo Sandbox</Badge>}
        </DialogHeader>

        {!showBankInfo ? (
          <div className="space-y-8 py-4">
            <div className="p-4 bg-muted/50 rounded-xl border-l-4 border-rosa-mexicano">
              <h3 className="font-bold flex items-center gap-2"><Info className="h-4 w-4" /> Resumen de Selección</h3>
              <p className="text-sm">Asientos elegidos: <strong>{selectedSeats.join(', ')}</strong> ({selectedSeats.length} personas)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Nombre</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Apellido</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="space-y-1"><Label>WhatsApp</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            </div>

            {formData.companions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">Datos de Acompañantes</h3>
                {formData.companions.map((c, idx) => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg">
                    <div className="space-y-1"><Label className="text-xs">Nombre Pasajero {idx + 2}</Label><Input value={c.name} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} /></div>
                    <div className="space-y-1"><Label className="text-xs">Edad</Label><Input type="number" value={c.age || ''} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, age: parseInt(e.target.value) || null} : x)})} /></div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-bold">Ajustar Asientos (Opcional)</h3>
              <TourSeatMap tourId={tourId} busCapacity={busDetails.bus_capacity} courtesies={busDetails.courtesies} seatLayoutJson={busDetails.seat_layout_json} onSeatsSelected={setSelectedSeats} initialSelectedSeats={selectedSeats} />
            </div>

            <div className="p-6 bg-rosa-mexicano text-white rounded-2xl shadow-xl flex justify-between items-center">
              <div><p className="text-xs uppercase font-bold opacity-80">Total del Viaje</p><h3 className="text-3xl font-black">${totalAmount.toLocaleString()}</h3></div>
              <div className="text-right"><p className="text-xs uppercase font-bold opacity-80">Anticipo Hoy</p><h3 className="text-3xl font-black text-yellow-400">${(selectedSeats.length * advancePaymentPerPerson).toLocaleString()}</h3></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hasOnlineMP && <Button onClick={() => handlePayment('mercadopago')} disabled={isSubmitting} className="bg-blue-600 h-14 font-bold rounded-xl"><CreditCard className="mr-2 h-4 w-4" /> Mercado Pago</Button>}
              {hasOnlineStripe && <Button onClick={() => handlePayment('stripe')} disabled={isSubmitting} className="bg-indigo-600 h-14 font-bold rounded-xl"><CreditCard className="mr-2 h-4 w-4" /> Stripe</Button>}
              {agencySettings?.bank_accounts.length ? <Button onClick={() => handlePayment('transferencia')} disabled={isSubmitting} variant="outline" className="border-green-600 text-green-700 h-14 font-bold rounded-xl"><Landmark className="mr-2 h-4 w-4" /> Transferencia</Button> : null}
              <Button onClick={() => handlePayment('manual')} disabled={isSubmitting} variant="outline" className="h-14 font-bold rounded-xl">Pago Manual</Button>
            </div>
          </div>
        ) : (
          <div className="py-8 space-y-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-black">Reserva Registrada</h2>
            <div className="grid gap-4">
              {agencySettings?.bank_accounts.map(bank => (
                <div key={bank.id} className="p-4 border-2 border-dashed rounded-xl bg-gray-50">
                  <p className="font-bold text-rosa-mexicano">{bank.bank_name}</p>
                  <p className="text-lg font-mono">{bank.bank_clabe}</p>
                  <p className="text-xs text-muted-foreground">{bank.bank_holder}</p>
                </div>
              ))}
            </div>
            <Button onClick={onClose} className="w-full h-12 bg-gray-900 text-white">Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;