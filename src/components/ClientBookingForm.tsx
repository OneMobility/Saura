"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Landmark, Info, PlusCircle, MinusCircle, CheckCircle2, UserCheck, Armchair } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import TourSeatMap from '@/components/TourSeatMap';
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

  useEffect(() => {
    if (isOpen) setSelectedSeats(initialSelectedSeats);
  }, [isOpen, initialSelectedSeats]);

  // Sync companions with selected seats automatically if needed, 
  // but allow manual editing if the user adds/removes companions first.
  useEffect(() => {
    const totalNeeded = selectedSeats.length;
    const currentTotalPeople = 1 + formData.companions.length;
    
    if (totalNeeded > currentTotalPeople) {
      const toAdd = totalNeeded - currentTotalPeople;
      setFormData(p => ({
        ...p,
        companions: [...p.companions, ...Array.from({ length: toAdd }, () => ({ id: uuidv4(), name: '', age: null }))]
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
    if (!formData.first_name || !formData.last_name || !formData.email) return toast.error('Por favor, rellena los campos obligatorios del titular.');
    
    const totalPeople = 1 + formData.companions.length;
    if (selectedSeats.length !== totalPeople) {
      return toast.error(`Debes seleccionar exactamente ${totalPeople} asientos (actualmente: ${selectedSeats.length}).`);
    }

    setIsSubmitting(true);
    try {
      const contractNum = uuidv4().substring(0, 8).toUpperCase();
      const advance = selectedSeats.length * advancePaymentPerPerson;

      const { data: newClient, error: clientErr } = await supabase.from('clients').insert({
        first_name: formData.first_name, last_name: formData.last_name,
        email: formData.email, phone: formData.phone, address: formData.address,
        identification_number: formData.identification_number,
        contract_number: contractNum, tour_id: tourId, number_of_people: totalPeople,
        companions: formData.companions, extra_services: formData.extra_services,
        total_amount: totalAmount, advance_payment: advance, status: 'pending',
        contractor_age: formData.contractor_age, room_details: roomDetails
      }).select('id').single();

      if (clientErr || !newClient) throw new Error("Error al crear registro de cliente.");

      await supabase.from('tour_seat_assignments').insert(selectedSeats.map(s => ({
        tour_id: tourId, seat_number: s, status: 'booked', client_id: newClient.id
      })));

      if (method === 'mercadopago') {
        const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
          body: { clientId: newClient.id, amount: advance, description: `Anticipo Tour: ${tourTitle}` }
        });
        if (error) throw error;
        window.location.href = data.init_point;
      } else if (method === 'stripe') {
        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
          body: { clientId: newClient.id, amount: advance, description: `Anticipo Tour: ${tourTitle}` }
        });
        if (error) throw error;
        window.location.href = data.url;
      } else if (method === 'transferencia') {
        setShowBankInfo(true);
        toast.success(`Reserva ${contractNum} registrada con éxito.`);
      } else {
        toast.success(`¡Reserva exitosa! Número de contrato: ${contractNum}`);
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Ocurrió un error al procesar la reserva. Verifica tu conexión o las claves de pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCompanion = () => {
    setFormData(p => ({
      ...p,
      companions: [...p.companions, { id: uuidv4(), name: '', age: null }]
    }));
  };

  const removeCompanion = (id: string) => {
    setFormData(p => ({
      ...p,
      companions: p.companions.filter(c => c.id !== id)
    }));
  };

  const hasOnlineMP = !!(agencySettings?.payment_mode === 'test' ? agencySettings?.mp_test_public_key : agencySettings?.mp_public_key);
  const hasOnlineStripe = !!(agencySettings?.payment_mode === 'test' ? agencySettings?.stripe_test_public_key : agencySettings?.stripe_public_key);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-rosa-mexicano">Finalizar Reserva: {tourTitle}</DialogTitle>
          {agencySettings?.payment_mode === 'test' && (
            <Badge className="bg-yellow-400 text-black w-fit mt-1">Ambiente de Pruebas (Sandbox)</Badge>
          )}
        </DialogHeader>

        {!showBankInfo ? (
          <div className="space-y-8 py-4">
            {/* Titular */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <UserCheck className="h-5 w-5 text-rosa-mexicano" /> Datos del Titular
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Nombre(s) *</Label><Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} placeholder="Ej: Juan" /></div>
                <div className="space-y-1"><Label>Apellido(s) *</Label><Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} placeholder="Ej: Pérez" /></div>
                <div className="space-y-1"><Label>Email *</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" /></div>
                <div className="space-y-1"><Label>WhatsApp (10 dígitos) *</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="8441234567" /></div>
                <div className="space-y-1"><Label>Identificación (INE/Pasaporte)</Label><Input value={formData.identification_number} onChange={e => setFormData({...formData, identification_number: e.target.value})} placeholder="Opcional" /></div>
                <div className="space-y-1"><Label>Edad</Label><Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} placeholder="Ej: 25" /></div>
              </div>
            </div>

            {/* Acompañantes */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-rosa-mexicano" /> Acompañantes
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addCompanion} className="border-rosa-mexicano text-rosa-mexicano">
                  <PlusCircle className="h-4 w-4 mr-2" /> Añadir Acompañante
                </Button>
              </div>
              
              {formData.companions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No has añadido acompañantes todavía.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {formData.companions.map((c, idx) => (
                    <div key={c.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 items-end">
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Nombre Completo Pasajero {idx + 2}</Label>
                        <Input value={c.name} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, name: e.target.value} : x)})} />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="space-y-1 flex-grow">
                          <Label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Edad</Label>
                          <Input type="number" value={c.age || ''} onChange={e => setFormData({...formData, companions: formData.companions.map(x => x.id === c.id ? {...x, age: parseInt(e.target.value) || null} : x)})} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCompanion(c.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Asientos */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Armchair className="h-5 w-5 text-rosa-mexicano" /> Selección de Asientos
                </h3>
                <Badge variant="outline" className={cn(
                  "px-3 py-1",
                  selectedSeats.length === (1 + formData.companions.length) ? "border-green-500 text-green-600" : "border-red-400 text-red-500"
                )}>
                  {selectedSeats.length} de {1 + formData.companions.length} seleccionados
                </Badge>
              </div>
              <TourSeatMap 
                tourId={tourId} 
                busCapacity={busDetails.bus_capacity} 
                courtesies={busDetails.courtesies} 
                seatLayoutJson={busDetails.seat_layout_json} 
                onSeatsSelected={setSelectedSeats} 
                initialSelectedSeats={selectedSeats} 
              />
            </div>

            {/* Resumen de Pago */}
            <div className="p-6 bg-gray-900 text-white rounded-3xl shadow-2xl flex flex-wrap justify-between items-center border-b-8 border-rosa-mexicano gap-6">
              <div>
                <p className="text-xs uppercase font-black tracking-widest opacity-60 mb-1">Costo Total del Viaje</p>
                <h3 className="text-4xl font-black">${totalAmount.toLocaleString()}</h3>
                <p className="text-[10px] opacity-40 mt-1">* Sujeto a distribución de habitaciones automática</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase font-black tracking-widest text-rosa-mexicano mb-1">Anticipo Necesario</p>
                <h3 className="text-4xl font-black text-yellow-400">${(selectedSeats.length * advancePaymentPerPerson).toLocaleString()}</h3>
                <p className="text-[10px] opacity-60 mt-1">${advancePaymentPerPerson.toLocaleString()} x {selectedSeats.length} personas</p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-4">
              <Label className="text-center block font-black text-gray-400 uppercase text-xs tracking-widest">Elige cómo deseas pagar tu anticipo</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hasOnlineMP && (
                  <Button onClick={() => handlePayment('mercadopago')} disabled={isSubmitting} className="bg-[#009EE3] hover:bg-[#0086c3] h-14 font-black rounded-2xl text-white shadow-lg text-lg">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2 h-6 w-6" />}
                    Mercado Pago
                  </Button>
                )}
                {hasOnlineStripe && (
                  <Button onClick={() => handlePayment('stripe')} disabled={isSubmitting} className="bg-[#635BFF] hover:bg-[#5249d3] h-14 font-black rounded-2xl text-white shadow-lg text-lg">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2 h-6 w-6" />}
                    Pagar con Tarjeta
                  </Button>
                )}
                {agencySettings?.bank_accounts.length ? (
                  <Button onClick={() => handlePayment('transferencia')} disabled={isSubmitting} variant="outline" className="border-green-600 text-green-700 h-14 font-black rounded-2xl hover:bg-green-50 text-lg">
                    <Landmark className="mr-2 h-6 w-6" /> Transferencia
                  </Button>
                ) : null}
                <Button onClick={() => handlePayment('manual')} disabled={isSubmitting} variant="outline" className="h-14 font-bold rounded-2xl hover:bg-gray-100 text-gray-600 border-gray-200">
                  Reservar sin Pago Online
                </Button>
              </div>
              <p className="text-[10px] text-center text-gray-400 px-8">
                Al hacer clic en cualquier opción, aceptas nuestros términos de servicio y políticas de cancelación.
              </p>
            </div>
          </div>
        ) : (
          /* Pantalla de éxito con datos bancarios */
          <div className="py-12 space-y-8 text-center animate-in zoom-in-95 duration-500">
            <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-14 w-14 text-green-600" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">¡Casi listo!</h2>
              <p className="text-gray-500 mt-2 text-lg">Tu reserva temporal ha sido creada. Número de contrato:</p>
              <div className="bg-rosa-mexicano/10 text-rosa-mexicano font-black text-3xl py-3 px-8 rounded-2xl w-fit mx-auto mt-2 border border-rosa-mexicano/20">
                {formData.contract_number}
              </div>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-[2rem] border-2 border-dashed border-gray-200 max-w-md mx-auto">
              <p className="font-black mb-6 text-sm uppercase tracking-widest text-gray-400">Datos de Transferencia</p>
              <div className="space-y-4">
                {agencySettings?.bank_accounts.map(bank => (
                  <div key={bank.id} className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100 text-left relative group">
                    <p className="font-black text-rosa-mexicano text-lg leading-none mb-1">{bank.bank_name}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-3">{bank.bank_holder}</p>
                    <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl">
                      <p className="text-xl font-mono font-bold tracking-tighter">{bank.bank_clabe}</p>
                      <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(bank.bank_clabe); toast.success('¡CLABE copiada!'); }} className="text-rosa-mexicano hover:bg-white">
                        <Save className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-4 max-w-sm mx-auto">
              <Button onClick={() => window.open(`https://wa.me/528444041469?text=Hola, acabo de realizar la reserva ${formData.contract_number} para el tour ${tourTitle}. Adjunto mi comprobante de transferencia.`, '_blank')} className="bg-green-600 hover:bg-green-700 h-16 text-xl font-black rounded-2xl shadow-lg transition-transform active:scale-95">
                Enviar Comprobante por WhatsApp
              </Button>
              <Button onClick={onClose} variant="ghost" className="text-gray-400 font-bold hover:text-gray-600">
                Entendido, cerrar ventana
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientBookingForm;