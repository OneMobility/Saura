"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, QrCode, CheckCircle2, XCircle, Scan, User, Bus, Clock, CalendarDays, MapPin, Camera } from 'lucide-react'; // Added Camera icon
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { QrReader } from 'react-qr-reader'; // Import QrReader

interface PassengerDetails {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  seat_number: number;
  boarding_status: 'pending' | 'boarded' | 'not_boarded';
  contract_number: string;
  route_name: string;
  origin_name: string;
  destination_name: string;
  departure_time: string;
  schedule_date: string;
}

const AdminBusTicketValidationPage = () => {
  const { user, isAdmin, isLoading: sessionLoading, session } = useSession();
  const navigate = useNavigate();

  const [qrInput, setQrInput] = useState('');
  const [passengerDetails, setPassengerDetails] = useState<PassengerDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false); // NEW: State to control camera scanner

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, sessionLoading, navigate]);

  const fetchPassengerDetails = async () => {
    setLoading(true);
    setPassengerDetails(null);
    setValidationError(null);
    setIsScanning(false); // Stop scanning when fetching details

    if (!qrInput.trim()) {
      setValidationError('Por favor, introduce el ID del QR o escanea un código.');
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
      setLoading(false);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionName = 'validate-bus-ticket';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'get_passenger_details', qrData: qrInput.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Edge Function:', errorData);
        setValidationError(errorData.error || 'Error desconocido al obtener detalles del pasajero.');
        toast.error(errorData.error || 'Error al obtener detalles del pasajero.');
      } else {
        const data = await response.json();
        setPassengerDetails(data.passenger);
        toast.success('Detalles del pasajero cargados.');
      }
    } catch (err: any) {
      console.error('Unexpected error fetching passenger details:', err);
      setValidationError(`Error inesperado: ${err.message}`);
      toast.error(`Error inesperado: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateBoardingStatus = async (status: 'boarded' | 'not_boarded') => {
    if (!passengerDetails) return;

    setIsUpdatingStatus(true);

    if (!session?.access_token) {
      toast.error('No estás autenticado. Por favor, inicia sesión de nuevo.');
      setIsUpdatingStatus(false);
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionName = 'validate-bus-ticket';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'update_boarding_status', passengerId: passengerDetails.id, newStatus: status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Edge Function:', errorData);
        toast.error(errorData.error || 'Error desconocido al actualizar el estado de abordaje.');
      } else {
        const data = await response.json();
        setPassengerDetails(prev => prev ? { ...prev, boarding_status: data.passenger.boarding_status } : null);
        toast.success(`Estado de abordaje actualizado a "${status}".`);
      }
    } catch (err: any) {
      console.error('Unexpected error updating boarding status:', err);
      toast.error(`Error inesperado: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleScanResult = (result: any, error: any) => {
    if (result) {
      setQrInput(result.text);
      setIsScanning(false); // Stop scanning after a successful scan
      fetchPassengerDetails(); // Automatically fetch details
    }
    if (error) {
      // console.error(error); // Log errors but don't show toast for every minor camera glitch
    }
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <AdminSidebar />
        <div className="flex flex-col flex-grow items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
          <p className="mt-4 text-gray-700">Cargando página de validación...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'boarded': return 'text-green-600';
      case 'not_boarded': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Validación de Boletos de Autobús" />
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <Card className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Validar Boleto</CardTitle>
              <CardDescription>Escanea el código QR del boleto o introduce el ID manualmente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Introduce el ID del QR (ej: passengerId_scheduleId_seatNumber)"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="flex-grow"
                  disabled={loading || isScanning}
                />
                <Button onClick={fetchPassengerDetails} disabled={loading || isScanning}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                  <span className="ml-2">Buscar</span>
                </Button>
                <Button onClick={() => setIsScanning(prev => !prev)} variant="outline" className="text-blue-600 hover:bg-blue-50">
                  {isScanning ? <XCircle className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  <span className="ml-2">{isScanning ? 'Detener Escáner' : 'Escanear QR'}</span>
                </Button>
              </div>

              {isScanning && (
                <div className="relative w-full h-64 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center">
                  <QrReader
                    onResult={handleScanResult}
                    constraints={{ facingMode: 'environment' }} // Use rear camera
                    scanDelay={300}
                    videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    containerStyle={{ width: '100%', height: '100%', padding: 0 }}
                  />
                  <p className="absolute bottom-2 text-sm text-gray-700 bg-white/70 px-2 py-1 rounded-md">
                    Apuntando la cámara al código QR...
                  </p>
                </div>
              )}

              {validationError && (
                <div className="text-red-600 text-center p-3 bg-red-50 rounded-md">
                  <p className="font-medium">{validationError}</p>
                </div>
              )}

              {passengerDetails && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">Detalles del Pasajero</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p><User className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Nombre:</span> {passengerDetails.first_name} {passengerDetails.last_name}</p>
                    <p><User className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Edad:</span> {passengerDetails.age !== null ? passengerDetails.age : 'N/A'}</p>
                    <p><QrCode className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Contrato:</span> {passengerDetails.contract_number}</p>
                    <p><Bus className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Asiento:</span> {passengerDetails.seat_number}</p>
                    <p><MapPin className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Ruta:</span> {passengerDetails.route_name}</p>
                    <p><Clock className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Salida:</span> {passengerDetails.departure_time}</p>
                    <p><CalendarDays className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Fecha:</span> {format(parseISO(passengerDetails.schedule_date), 'dd/MM/yyyy', { locale: es })}</p>
                    <p className="md:col-span-2"><MapPin className="inline-block h-4 w-4 mr-2 text-gray-500" /> <span className="font-medium">Origen/Destino:</span> {passengerDetails.origin_name} → {passengerDetails.destination_name}</p>
                  </div>
                  <div className="mt-4 p-3 border rounded-md flex items-center justify-between">
                    <p className="text-lg font-bold">
                      Estado de Abordaje: <span className={getStatusColor(passengerDetails.boarding_status)}>{passengerDetails.boarding_status.replace('_', ' ').toUpperCase()}</span>
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => updateBoardingStatus('boarded')}
                        disabled={isUpdatingStatus || passengerDetails.boarding_status === 'boarded'}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span className="ml-2">Abordó</span>
                      </Button>
                      <Button
                        onClick={() => updateBoardingStatus('not_boarded')}
                        disabled={isUpdatingStatus || passengerDetails.boarding_status === 'not_boarded'}
                        variant="destructive"
                      >
                        {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        <span className="ml-2">No Abordó</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminBusTicketValidationPage;