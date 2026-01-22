"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, MapPin, User, Users, BusFront, ArrowLeft, CreditCard, AlertTriangle, MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import TourSeatMap from '@/components/TourSeatMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import ClientPaymentHistoryTable from '@/components/admin/clients/ClientPaymentHistoryTable';

const AdminClientFormPage = () => {
  const { id: clientIdFromParams } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: sessionLoading } = useSession();

  const [formData, setFormData] = useState<any>({
    first_name: '', last_name: '', email: '', phone: '', address: '',
    identification_number: '', contract_number: '', tour_id: null,
    companions: [], total_amount: 0, total_paid: 0, status: 'confirmed',
    contractor_age: null, is_transport_only: false, cancel_reason: ''
  });
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [refreshHistoryKey, setRefreshHistoryKey] = useState(0);
  const [availableTours, setAvailableTours] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [clientSelectedSeats, setClientSelectedSeats] = useState<number[]>([]);

  const fetchClientData = async () => {
    if (!clientIdFromParams) return;
    const { data: client, error } = await supabase.from('clients').select('*').eq('id', clientIdFromParams).single();
    if (client) {
      setFormData(client);
      const { data: seats } = await supabase.from('tour_seat_assignments').select('seat_number').eq('client_id', clientIdFromParams);
      if (seats) setClientSelectedSeats(seats.map(s => s.seat_number));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      const [toursRes, busesRes] = await Promise.all([
        supabase.from('tours').select('*').order('title', { ascending: true }),
        supabase.from('buses').select('*')
      ]);
      if (toursRes.data) setAvailableTours(toursRes.data);
      if (busesRes.data) setAvailableBuses(busesRes.data);
      if (clientIdFromParams) await fetchClientData();
      else setFormData((p:any) => ({...p, contract_number: uuidv4().substring(0, 8).toUpperCase()}));
      setIsLoadingData(false);
    };
    fetchData();
  }, [clientIdFromParams]);

  const selectedTour = useMemo(() => availableTours.find(t => t.id === formData.tour_id), [formData.tour_id, availableTours]);
  const currentBus = useMemo(() => selectedTour?.bus_id ? availableBuses.find(b => b.id === selectedTour.bus_id) : null, [selectedTour, availableBuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('clients').update(formData).eq('id', clientIdFromParams);
    if (!error) toast.success("Cambios guardados.");
  };

  if (sessionLoading || isLoadingData) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-rosa-mexicano h-12 w-12" /></div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle={clientIdFromParams ? "Ficha de Cliente" : "Nuevo Cliente"}>
           <Button variant="outline" asChild><Link to="/admin/clients"><ArrowLeft className="h-4 w-4 mr-2" /> Volver al Listado</Link></Button>
        </AdminHeader>

        <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {formData.status === 'cancelled' && (
                <AlertCircle className="absolute -left-12 h-10 w-10 text-red-600" />
              )}
              
              <Card className={cn("shadow-lg border-none", formData.status === 'cancelled' && "border-l-8 border-red-600")}>
                <CardHeader className="bg-gray-50 border-b flex flex-row justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-rosa-mexicano" /> Datos del Contrato #{formData.contract_number}
                  </CardTitle>
                  <Badge className={cn(
                    formData.status === 'completed' ? "bg-blue-600" : 
                    formData.status === 'confirmed' ? "bg-green-600" : 
                    formData.status === 'cancelled' ? "bg-red-600" : "bg-yellow-500"
                  )}>
                    {formData.status.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Titular</Label><p className="font-bold text-lg">{formData.first_name} {formData.last_name}</p></div>
                    <div className="space-y-1"><Label>WhatsApp</Label><p className="font-bold">{formData.phone}</p></div>
                  </div>
                  
                  {formData.status === 'cancelled' && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <Label className="text-red-900 font-black uppercase text-[10px] tracking-widest flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Notas / Motivo de Cancelación
                      </Label>
                      <Textarea 
                        className="mt-2 bg-white border-red-200" 
                        value={formData.cancel_reason} 
                        onChange={e => setFormData({...formData, cancel_reason: e.target.value})}
                        placeholder="Escribe el motivo aquí..."
                      />
                      <Button onClick={handleSubmit} size="sm" className="mt-2 bg-red-600">Guardar Nota</Button>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Label className="font-bold mb-4 block">Asignación de Asientos</Label>
                    <TourSeatMap 
                      tourId={formData.tour_id} busCapacity={selectedTour?.bus_capacity} courtesies={selectedTour?.courtesies} 
                      seatLayoutJson={currentBus?.seat_layout_json} onSeatsSelected={() => {}} 
                      initialSelectedSeats={clientSelectedSeats} readOnly 
                    />
                  </div>
                </CardContent>
              </Card>

              <ClientPaymentHistoryTable clientId={clientIdFromParams!} onPaymentsUpdated={fetchClientData} />
            </div>

            <div className="space-y-6">
              <Card className="bg-gray-900 text-white shadow-xl sticky top-8">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-white flex items-center gap-2"><CreditCard className="h-5 w-5 text-rosa-mexicano" /> Estado de Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between"><span>Costo Total:</span><span className="font-bold">${formData.total_amount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-green-400"><span>Abonado Real:</span><span className="font-bold">${formData.total_paid.toLocaleString()}</span></div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-gray-400">Pendiente:</span>
                    <span className="text-3xl font-black text-yellow-400">${(formData.total_amount - formData.total_paid).toLocaleString()}</span>
                  </div>
                  <Button variant="outline" className="w-full mt-4 text-gray-900 font-bold" onClick={() => window.print()}>Imprimir Ficha</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminClientFormPage;