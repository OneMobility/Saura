"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, MapPin, Hotel, User, Mail, Phone, IdentificationCard, Users, BusFront, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<any>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    identification_number: '',
    contract_number: uuidv4().substring(0, 8).toUpperCase(),
    tour_id: null,
    companions: [],
    total_amount: 0,
    total_paid: 0,
    status: 'confirmed',
    contractor_age: null,
    is_transport_only: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);
  const [roomsCount, setRoomsCount] = useState(0);
  const [breakdownDetails, setBreakdownDetails] = useState<string[]>([]);

  useEffect(() => {
    const fetchDeps = async () => {
      const [toursRes, busesRes] = await Promise.all([
        supabase.from('tours').select('*').order('title', { ascending: true }),
        supabase.from('buses').select('*')
      ]);
      if (toursRes.data) setAvailableTours(toursRes.data);
      if (busesRes.data) setAvailableBuses(busesRes.data);
    };
    fetchDeps();
  }, []);

  const selectedTour = useMemo(() => 
    availableTours.find(t => t.id === formData.tour_id), 
    [formData.tour_id, availableTours]
  );

  const currentBus = useMemo(() => 
    selectedTour?.bus_id ? availableBuses.find(b => b.id === selectedTour.bus_id) : null, 
    [selectedTour, availableBuses]
  );

  // Lógica de Cálculo de Precios y Habitaciones
  useEffect(() => {
    if (!selectedTour) return;
    
    const totalPax = clientSelectedSeats.length;
    if (totalPax === 0) {
      setTotalAmount(0);
      setRoomsCount(0);
      setBreakdownDetails([]);
      return;
    }

    if (formData.is_transport_only) {
      // MODO: SOLO TRASLADO
      const price = selectedTour.transport_only_price || 0;
      const total = totalPax * price;
      setTotalAmount(total);
      setRoomsCount(0);
      setBreakdownDetails([`${totalPax} Pasajero(s) en Modalidad Solo Traslado ($${price} p/p)`]);
    } else {
      // MODO: ALOJAMIENTO INCLUIDO
      const neededRooms = Math.ceil(totalPax / 4);
      setRoomsCount(neededRooms);

      let adults = (formData.contractor_age === null || formData.contractor_age > 12) ? 1 : 0;
      let children = (formData.contractor_age !== null && formData.contractor_age <= 12) ? 1 : 0;
      formData.companions.forEach((c: any) => { 
        (c.age === null || c.age > 12) ? adults++ : children++; 
      });

      let tempAdults = adults;
      let tempChildren = children;
      let calculatedTotal = 0;
      let details: string[] = [];

      for (let i = 0; i < neededRooms; i++) {
        const paxInRoom = Math.min(4, tempAdults + tempChildren);
        const adultsInRoom = Math.min(paxInRoom, tempAdults);
        const childrenInRoom = paxInRoom - adultsInRoom;

        // REGLA: 1 Adulto Solo o 1 Adulto + 1 Niño pagan como 2 Adultos en Doble
        if ((paxInRoom === 1 && adultsInRoom === 1) || (paxInRoom === 2 && adultsInRoom === 1 && childrenInRoom === 1)) {
          calculatedTotal += (2 * selectedTour.selling_price_double_occupancy);
          details.push(`Hab. ${i+1}: Cargo base de Habitación Doble (2 pax)`);
        } else {
          let occPrice = selectedTour.selling_price_quad_occupancy;
          let label = "Cuádruple";
          if (paxInRoom === 3) { occPrice = selectedTour.selling_price_triple_occupancy; label = "Triple"; }
          else if (paxInRoom === 2) { occPrice = selectedTour.selling_price_double_occupancy; label = "Doble"; }

          calculatedTotal += (adultsInRoom * occPrice) + (childrenInRoom * selectedTour.selling_price_child);
          details.push(`Hab. ${i+1}: ${adultsInRoom} Ad. (${label}) + ${childrenInRoom} Niñ.`);
        }

        tempAdults -= adultsInRoom;
        tempChildren -= childrenInRoom;
      }

      setTotalAmount(calculatedTotal);
      setBreakdownDetails(details);
    }

    // Gestionar lista de acompañantes según asientos (total - 1 contratante)
    const neededComps = totalPax - 1;
    if (neededComps !== formData.companions.length && neededComps >= 0) {
      setFormData((p: any) => {
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
  }, [clientSelectedSeats.length, formData.contractor_age, formData.companions.length, formData.is_transport_only, selectedTour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tour_id) return toast.error("Selecciona un tour.");
    if (clientSelectedSeats.length === 0) return toast.error("Selecciona asientos.");
    if (!formData.first_name || !formData.email) return toast.error("Faltan datos del contratante.");

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('clients').insert({ 
        ...formData, 
        number_of_people: clientSelectedSeats.length,
        room_details: formData.is_transport_only ? { transport_only: true } : { rooms_count: roomsCount }
      }).select('id').single();

      if (error) throw error;

      if (data) {
        await supabase.from('tour_seat_assignments').insert(clientSelectedSeats.map(s => ({ 
          tour_id: formData.tour_id, 
          seat_number: s, 
          status: 'booked', 
          client_id: data.id 
        })));
      }

      toast.success("Reserva administrativa creada con éxito.");
      navigate('/admin/clients');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Registro Manual de Cliente">
           <Button variant="outline" asChild><Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Link></Button>
        </AdminHeader>

        <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Columna Izquierda: Datos y Selección */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-rosa-mexicano" /> Datos del Contratante</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre(s)</Label>
                    <Input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido(s)</Label>
                    <Input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo Electrónico</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono / WhatsApp</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Edad</Label>
                    <Input type="number" value={formData.contractor_age || ''} onChange={e => setFormData({...formData, contractor_age: parseInt(e.target.value) || null})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Identificación (INE/Pasaporte)</Label>
                    <Input value={formData.identification_number} onChange={e => setFormData({...formData, identification_number: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Dirección</Label>
                    <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-none">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-rosa-mexicano" /> Selección de Viaje y Asientos</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Destino / Tour</Label>
                    <Select value={formData.tour_id} onValueChange={v => setFormData({...formData, tour_id: v})}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Selecciona un tour activo" /></SelectTrigger>
                      <SelectContent>{availableTours.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {selectedTour && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-rosa-mexicano/5 rounded-xl border border-rosa-mexicano/10">
                        <div className="space-y-1">
                          <Label className="text-base font-bold flex items-center gap-2"><BusFront className="h-5 w-5 text-rosa-mexicano" /> Modalidad Solo Traslado</Label>
                          <p className="text-xs text-muted-foreground">Si se activa, no se cuentan habitaciones y se usa el precio de transporte.</p>
                        </div>
                        <Switch checked={formData.is_transport_only} onCheckedChange={val => setFormData({...formData, is_transport_only: val})} />
                      </div>

                      <div className="pt-4 border-t">
                        <Label className="mb-4 block font-bold">Asientos Seleccionados: {clientSelectedSeats.length}</Label>
                        <TourSeatMap 
                          tourId={selectedTour.id} 
                          busCapacity={selectedTour.bus_capacity} 
                          courtesies={selectedTour.courtesies} 
                          seatLayoutJson={currentBus?.seat_layout_json} 
                          onSeatsSelected={setClientSelectedSeats} 
                          initialSelectedSeats={clientSelectedSeats} 
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {formData.companions.length > 0 && (
                <Card className="shadow-lg border-none">
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-rosa-mexicano" /> Acompañantes</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {formData.companions.map((comp: any, idx: number) => (
                      <div key={comp.id} className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase font-bold">Nombre Completo</Label>
                          <Input 
                            value={comp.name} 
                            onChange={e => {
                              const newC = [...formData.companions];
                              newC[idx].name = e.target.value;
                              setFormData({...formData, companions: newC});
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold">Edad</Label>
                          <Input 
                            type="number" 
                            value={comp.age || ''} 
                            onChange={e => {
                              const newC = [...formData.companions];
                              newC[idx].age = parseInt(e.target.value) || null;
                              setFormData({...formData, companions: newC});
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Columna Derecha: Resumen Financiero */}
            <div className="space-y-6">
              <Card className="bg-gray-900 text-white shadow-xl sticky top-8">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-2"><Hotel className="h-5 w-5 text-rosa-mexicano" /> Resumen de Liquidación</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {!formData.is_transport_only ? (
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                      <span className="text-xs uppercase font-bold text-gray-400">Habitaciones</span>
                      <span className="text-3xl font-black text-rosa-mexicano">{roomsCount}</span>
                    </div>
                  ) : (
                    <div className="bg-rosa-mexicano/20 p-4 rounded-xl border border-rosa-mexicano/30 text-center">
                      <p className="text-xs font-black uppercase text-rosa-mexicano">MODALIDAD SOLO TRASLADO</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">Desglose de Cargos:</p>
                    {breakdownDetails.map((d, i) => (
                      <div key={i} className="text-[11px] opacity-80 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rosa-mexicano mt-1 shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-gray-400 uppercase">Monto Total:</span>
                      <span className="text-4xl font-black text-yellow-400">${formData.total_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !selectedTour} 
                    className="w-full bg-rosa-mexicano hover:bg-rosa-mexicano/90 h-14 text-lg font-black shadow-xl mt-4"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    Confirmar Contrato
                  </Button>
                </CardContent>
              </Card>
            </div>

          </form>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminClientFormPage;