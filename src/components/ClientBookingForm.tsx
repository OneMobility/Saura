"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Hotel, BusFront, CreditCard, Save, Info, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface ClientBookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  tourId: string;
  tourTitle: string;
  tourSellingPrices: { double: number; triple: number; quad: number; child: number };
  transportOnlyPrice?: number;
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
    companions: [] as any[], is_transport_only: false,
  });
  
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelectedSeats);
  const [totalAmount, setTotalAmount] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [contractNumber, setContractNumber] = useState('');
  const [breakdown, setBreakdown] = useState({ adults: 0, children: 0, details: [] as string[] });

  useEffect(() => {
    if (isOpen) setSelectedSeats(initialSelectedSeats);
  }, [isOpen, initialSelectedSeats]);

  useEffect(() => {
    const totalPax = selectedSeats.length;
    if (totalPax === 0) return;

    if (formData.is_transport_only) {
      const total = totalPax * transportOnlyPrice;
      setTotalAmount(total);
      setRoomsCount(0);
      setBreakdown({ adults: totalPax, children: 0, details: [`${totalPax} Pax en Solo Traslado ($${transportOnlyPrice} c/u)`] });
    } else {
      const neededRooms = Math.ceil(totalPax / 4);
      setRoomsCount(neededRooms);

      let adultsCount = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
      let childrenCount = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
      
      formData.companions.forEach(c => { 
        if (c.age !== null && c.age <= 12) {
          childrenCount++;
        } else {
          adultsCount++;
        }
      });

      let tempAdults = adultsCount;
      let tempChildren = childrenCount;
      let calculatedTotal = 0;
      let details: string[] = [];

      for (let i = 0; i < neededRooms; i++) {
        const paxInRoom = Math.min(4, tempAdults + tempChildren);
        const adultsInRoom = Math.min(paxInRoom, tempAdults);
        const childrenInRoom = paxInRoom - adultsInRoom;

        if ((paxInRoom === 1 && adultsInRoom === 1) || (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1)) {
          const price = tourSellingPrices.double;
          calculatedTotal += (2 * price);
          details.push(`Hab. ${i+1}: Cargo base Doble (2 Adultos x $${price})`);
        } else {
          let occPrice = tourSellingPrices.quad;
          let label = "Cuádruple";
          if (paxInRoom === 3) { occPrice = tourSellingPrices.triple; label = "Triple"; }
          else if (paxInRoom === 2) { occPrice = tourSellingPrices.double; label = "Doble"; }

          if (adultsInRoom > 0) {
            calculatedTotal += (adultsInRoom * occPrice);
            details.push(`Hab. ${i+1}: ${adultsInRoom} Adulto(s) en ${label} ($${occPrice} c/u)`);
          }
          if (childrenInRoom > 0) {
            calculatedTotal += (childrenInRoom * tourSellingPrices.child);
            details.push(`Hab. ${i+1}: ${childrenInRoom} Niño(s) ($${tourSellingPrices.child} c/u)`);
          }
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
  }, [
    selectedSeats.length, 
    formData.contractor_age, 
    formData.companions,
    formData.is_transport_only, 
    tourSellingPrices, 
    transportOnlyPrice
  ]);

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone) return toast.error("Por favor completa tus datos de contacto.");
    
    setIsSubmitting(true);
    const contractNum = uuidv4().substring(0, 8).toUpperCase();
    
    const { data, error } = await supabase.from('clients').insert({
      ...formData,
      contract_number: contractNum,
      tour_id: tourId,
      number_of_people: selectedSeats.length,
      total_amount: totalAmount,
      advance_payment: selectedSeats.length * advancePaymentPerPerson,
      status: 'pending',
      room_details: formData.is_transport_only ? { transport_only: true } : { rooms_count: roomsCount }
    }).select('id').single();

    if (error) {
      toast.error("Error al registrar reserva.");
      setIsSubmitting(false);
      return;
    }

    if (data) {
      await supabase.from('tour_seat_assignments').insert(selectedSeats.map(s => ({
        tour_id: tourId, seat_number: s, status: 'booked', client_id: data.id
      })));
      
      setCreatedClientId(data.id);
      setContractNumber(contractNum);
      setStep('payment');
    }
    setIsSubmitting(false);
  };

  const handleOnlinePayment = async (method: 'mercadopago' | 'stripe') => {
    if (!createdClientId) return;
    setIsPaying(true);
    try {
      const amountToPay = selectedSeats.length * advancePaymentPerPerson;
      const functionName = method === 'mercadopago' ? 'mercadopago-checkout' : 'stripe-checkout';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          clientId: createdClientId, 
          amount: amountToPay, 
          description: `Anticipo Tour: ${tourTitle}`,
          contractNumber: contractNumber
        }
      });
      if (error) throw error;
      window.location.href = method === 'mercadopago' ? data.init_point : data.url;
    } catch (error) {
      toast.error('Error al iniciar el pago.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-rosa-mexicano">{step === 'info' ? `Reservar: ${tourTitle}` : '¡Reserva Registrada!'}</DialogTitle>
        </DialogHeader>
        
        {step === 'info' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1"><Label>Nombre(s)</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
               <div className="space-y-1"><Label>Apellidos</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
               <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
               <div className="space-y-1"><Label>WhatsApp</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Edad del Titular</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} /></div>
              <div className="space-y-1"><Label>Identificación (INE/Pasaporte)</Label><Input value={formData.identification_number} onChange={e => setFormData({...formData, identification_number: e.target.value})} /></div>
            </div>

            {transportOnlyPrice > 0 && (
              <div className="flex items-center justify-between p-4 bg-rosa-mexicano/5 rounded-xl border border-rosa-mexicano/10">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold flex items-center gap-2"><BusFront className="h-4 w-4 text-rosa-mexicano" /> Solo Traslado</Label>
                  <p className="text-xs text-muted-foreground">Marca esta casilla si NO necesitas hospedaje (${transportOnlyPrice} p/p).</p>
                </div>
                <Switch checked={formData.is_transport_only} onCheckedChange={val => setFormData({...formData, is_transport_only: val})} />
              </div>
            )}

            <div className="space-y-2"><Label>Dirección (Ciudad/Estado)</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>

            {formData.companions.length > 0 && (
              <div className="space-y-3">
                <Label className="font-bold">Datos de Acompañantes</Label>
                {formData.companions.map((comp: any, idx: number) => (
                  <div key={comp.id} className="grid grid-cols-3 gap-2">
                    <Input className="col-span-2" placeholder="Nombre completo" value={comp.name} onChange={e => {
                      const newC = [...formData.companions]; newC[idx].name = e.target.value; setFormData({...formData, companions: newC});
                    }} />
                    <Input type="number" placeholder="Edad" value={comp.age || ''} onChange={e => {
                      const newC = [...formData.companions]; newC[idx].age = parseInt(e.target.value) || null; setFormData({...formData, companions: newC});
                    }} />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl">
               <div className="flex justify-between items-center mb-4">
                  <div className="text-rosa-mexicano font-black uppercase text-xs tracking-widest flex items-center gap-2">
                    {formData.is_transport_only ? <BusFront className="h-4 w-4" /> : <Hotel className="h-4 w-4" />}
                    {formData.is_transport_only ? 'Servicio de Transporte' : 'Liquidación con Alojamiento'}
                  </div>
                  {!formData.is_transport_only && <Badge className="bg-rosa-mexicano">{roomsCount} {roomsCount === 1 ? 'Habitación' : 'Habitaciones'}</Badge>}
               </div>
               
               <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 gap-1 border-b border-white/10 pb-3">
                    {breakdown.details.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 opacity-80 italic">
                        <div className="w-1.5 h-1.5 bg-rosa-mexicano rounded-full mt-1.5 shrink-0" /> 
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-black text-xl pt-2">
                    <span className="text-gray-400 uppercase text-xs self-center">Monto Total del Contrato:</span>
                    <span className="text-yellow-400 text-2xl">${totalAmount.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <Button onClick={handleSave} disabled={isSubmitting} className="w-full bg-rosa-mexicano h-14 text-lg font-black rounded-xl">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
              Registrar Reserva y Ver Pagos
            </Button>
          </div>
        ) : (
          <div className="space-y-8 py-4">
            <div className="text-center space-y-2">
              <p className="text-gray-600 font-bold">Tu número de contrato es:</p>
              <h4 className="text-4xl font-black text-rosa-mexicano tracking-tighter">{contractNumber}</h4>
              <p className="text-sm opacity-70">Hemos guardado tu lugar. Para confirmar tu reserva, realiza el pago de tu anticipo:</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 items-start">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold">Recordatorio importante:</p>
                <p>Puedes abonar de forma <strong>semanal o quincenal</strong>. El viaje debe estar liquidado al 100% antes de abordar. ¡Le daremos seguimiento a tu aventura!</p>
              </div>
            </div>

            <div className="bg-rosa-mexicano/5 p-6 rounded-3xl border-2 border-dashed border-rosa-mexicano/20 text-center">
              <p className="text-xs uppercase font-black text-gray-400 mb-2">Total del Anticipo ({selectedSeats.length} pax)</p>
              <h3 className="text-5xl font-black text-rosa-mexicano">${(selectedSeats.length * advancePaymentPerPerson).toLocaleString()}</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {agencySettings?.mp_public_key && (
                <Button onClick={() => handleOnlinePayment('mercadopago')} disabled={isPaying} className="bg-blue-600 hover:bg-blue-700 h-16 text-lg font-bold gap-3 rounded-2xl">
                  {isPaying ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  Pagar con Mercado Pago
                </Button>
              )}
              {agencySettings?.stripe_public_key && (
                <Button onClick={() => handleOnlinePayment('stripe')} disabled={isPaying} className="bg-indigo-600 hover:bg-indigo-700 h-16 text-lg font-bold gap-3 rounded-2xl">
                  {isPaying ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  Pagar con Tarjeta (Stripe)
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="h-14 border-gray-200 text-gray-500 rounded-2xl">
                Pagar después / Transferencia
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;