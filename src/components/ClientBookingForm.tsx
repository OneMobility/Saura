"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, MessageSquare, CheckCircle2, Landmark, Info, PlusCircle, MinusCircle, Save, Copy } from 'lucide-react';
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
  isOpen, onClose, tourId, tourTitle, tourImage, tourDescription,
  tourSellingPrices, busDetails, tourAvailableExtraServices,
  advancePaymentPerPerson, agencySettings
}) => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: null as string | null, contractor_age: null as number | null,
    companions: [] as any[], extra_services: [] as TourProviderService[],
  });
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roomDetails, setRoomDetails] = useState({ double_rooms: 0, triple_rooms: 0, quad_rooms: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);

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
  }, [formData, tourSellingPrices, selectedSeats.length]);

  const handlePayment = async (method: 'mercadopago' | 'stripe' | 'transferencia' | 'manual') => {
    if (!formData.first_name || !formData.last_name || !formData.email) return toast.error('Rellena los campos obligatorios.');
    if (selectedSeats.length !== (1 + formData.companions.length)) return toast.error(`Selecciona ${1 + formData.companions.length} asientos.`);

    setIsSubmitting(true);
    try {
      const contractNum = uuidv4().substring(0, 8).toUpperCase();
      const advance = selectedSeats.length * advancePaymentPerPerson;

      const { data: newClient } = await supabase.from('clients').insert({
        first_name: formData.first_name, last_name: formData.last_name,
        email: formData.email, phone: formData.phone, address: formData.address,
        contract_number: contractNum, tour_id: tourId, number_of_people: selectedSeats.length,
        companions: formData.companions, extra_services: formData.extra_services,
        total_amount: totalAmount, advance_payment: advance, status: 'pending',
        contractor_age: formData.contractor_age, room_details: roomDetails
      }).select('id').single();

      if (!newClient) throw new Error("Error al crear cliente");

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
        toast.success(`Reserva guardada con el número: ${contractNum}. Procede con la transferencia.`);
      } else {
        toast.success(`¡Reserva exitosa! Número: ${contractNum}.`);
        onClose();
      }
    } catch (e) {
      toast.error('Error procesando reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles.`);
  };

  const hasOnlineMP = !!(agencySettings?.payment_mode === 'test' ? agencySettings?.mp_test_public_key : agencySettings?.mp_public_key);
  const hasOnlineStripe = !!(agencySettings?.payment_mode === 'test' ? agencySettings?.stripe_test_public_key : agencySettings?.stripe_public_key);
  const hasBanks = agencySettings?.bank_accounts && agencySettings.bank_accounts.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reservar Tour: {tourTitle}</DialogTitle>
          {agencySettings?.payment_mode === 'test' && (
            <Badge className="bg-yellow-400 text-black border-none w-fit">Modo de Pruebas Activo</Badge>
          )}
        </DialogHeader>

        {!showBankInfo ? (
          <form className="grid gap-6 py-4">
            <h3 className="text-lg font-bold border-b pb-2">Tus Datos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Nombre</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required /></div>
              <div className="space-y-1"><Label>Apellido</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            </div>

            <div className="pt-4">
              <h3 className="text-lg font-bold border-b pb-2 mb-4">Selección de Asientos</h3>
              <TourSeatMap tourId={tourId} busCapacity={busDetails.bus_capacity} courtesies={busDetails.courtesies} seatLayoutJson={busDetails.seat_layout_json} onSeatsSelected={setSelectedSeats} />
            </div>

            <div className="p-4 bg-rosa-mexicano text-white rounded-2xl flex justify-between items-center shadow-xl">
              <div>
                <p className="text-xs opacity-80 uppercase font-black">Total del Viaje</p>
                <h3 className="text-3xl font-black">${totalAmount.toLocaleString()}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80 uppercase font-black">Anticipo Necesario</p>
                <h3 className="text-3xl font-black text-yellow-400">${(selectedSeats.length * advancePaymentPerPerson).toLocaleString()}</h3>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-black text-gray-500 uppercase text-[10px] tracking-widest">Opciones de Pago</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {hasOnlineMP && (
                  <Button type="button" onClick={() => handlePayment('mercadopago')} disabled={isSubmitting} className="bg-blue-600 h-14 font-bold rounded-xl"><CreditCard className="mr-2 h-4 w-4" /> Mercado Pago</Button>
                )}
                {hasOnlineStripe && (
                  <Button type="button" onClick={() => handlePayment('stripe')} disabled={isSubmitting} className="bg-indigo-600 h-14 font-bold rounded-xl"><CreditCard className="mr-2 h-4 w-4" /> Stripe</Button>
                )}
                {hasBanks && (
                  <Button type="button" onClick={() => handlePayment('transferencia')} disabled={isSubmitting} className="border-2 border-green-600 text-green-700 h-14 font-bold rounded-xl hover:bg-green-50"><Landmark className="mr-2 h-4 w-4" /> Transferencia</Button>
                )}
                <Button type="button" onClick={() => handlePayment('manual')} disabled={isSubmitting} className="border-2 border-gray-300 text-gray-600 h-14 font-bold rounded-xl hover:bg-gray-50">Pago Manual</Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="bg-green-100 text-green-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black">Reserva Registrada</h2>
              <p className="text-muted-foreground">Por favor, realiza tu transferencia a cualquiera de las siguientes cuentas:</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {agencySettings?.bank_accounts.map(bank => (
                <div key={bank.id} className="p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xl font-black text-rosa-mexicano uppercase">{bank.bank_name}</h4>
                    <Badge variant="outline">Cuenta CLABE</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-gray-400">Titular</Label>
                      <p className="font-bold">{bank.bank_holder}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-gray-400">CLABE</Label>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-3 py-1 rounded border font-mono text-lg">{bank.bank_clabe}</code>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bank.bank_clabe, 'CLABE')}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200 flex gap-4">
              <Info className="h-6 w-6 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">
                Una vez realizada la transferencia, envía el comprobante por WhatsApp al <strong>844 404 1469</strong> junto con tu número de contrato para confirmar tu pago.
              </p>
            </div>

            <Button onClick={onClose} className="w-full h-14 bg-gray-900 text-white font-bold rounded-xl">Entendido, cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;