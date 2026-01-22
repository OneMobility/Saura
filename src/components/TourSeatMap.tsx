"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, Ban, CarFront, Toilet, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { SeatLayout, SeatLayoutItem } from '@/types/shared';

interface Seat {
  seat_number: number;
  status: 'available' | 'booked' | 'blocked' | 'courtesy';
  client_id: string | null;
  id?: string;
}

interface TourSeatMapProps {
  tourId: string;
  busCapacity: number;
  courtesies: number;
  seatLayoutJson: SeatLayout | null;
  onSeatsSelected?: (selectedSeats: number[]) => void;
  readOnly?: boolean;
  adminMode?: boolean;
  currentClientId?: string | null;
  initialSelectedSeats?: number[];
}

const TourSeatMap: React.FC<TourSeatMapProps> = ({
  tourId,
  busCapacity,
  courtesies,
  seatLayoutJson,
  onSeatsSelected,
  readOnly = false,
  adminMode = false,
  currentClientId = null,
  initialSelectedSeats = [],
}) => {
  const { user, isLoading: sessionLoading, isAdmin } = useSession();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelectedSeats);
  const [loading, setLoading] = useState(true);
  const [isUpdatingSeats, setIsUpdatingSeats] = useState(false);
  
  // Ref para evitar bucles infinitos en la sincronización de estados
  const lastEmittedSeats = useRef<string>("");

  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    
    if (!isValidUUID(tourId)) {
      const allSeats: Seat[] = [];
      const currentLayout = seatLayoutJson || [];
      if (currentLayout.length > 0) {
        currentLayout.forEach(row => {
          row.forEach(item => {
            if (item.type === 'seat' && item.number !== undefined) {
              allSeats.push({ seat_number: item.number, status: 'available', client_id: null });
            }
          });
        });
      }
      setSeats(allSeats.sort((a, b) => a.seat_number - b.seat_number));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tour_seat_assignments')
      .select('*')
      .eq('tour_id', tourId);

    if (error) {
      console.error('Error fetching seat assignments:', error);
      toast.error('Error al cargar las asignaciones de asientos.');
      setSeats([]);
    } else {
      const fetchedAssignments = data || [];
      const allSeats: Seat[] = [];
      const currentLayout = seatLayoutJson || [];
      
      if (currentLayout.length > 0) {
        currentLayout.forEach(row => {
          row.forEach(item => {
            if (item.type === 'seat' && item.number !== undefined) {
              const existingAssignment = fetchedAssignments.find(s => s.seat_number === item.number);
              allSeats.push({
                seat_number: item.number,
                status: (existingAssignment?.status || 'available') as Seat['status'],
                client_id: existingAssignment?.client_id || null,
                id: existingAssignment?.id,
              });
            }
          });
        });
      } else {
        for (let i = 1; i <= busCapacity; i++) {
          const existingAssignment = fetchedAssignments.find(s => s.seat_number === i);
          allSeats.push({
            seat_number: i,
            status: (existingAssignment?.status || 'available') as Seat['status'],
            client_id: existingAssignment?.client_id || null,
            id: existingAssignment?.id,
          });
        }
      }
      setSeats(allSeats.sort((a, b) => a.seat_number - b.seat_number));
    }
    setLoading(false);
  }, [tourId, busCapacity, seatLayoutJson]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Sincronizar hacia afuera (padre) cuando cambian localmente
  useEffect(() => {
    const serialized = JSON.stringify(selectedSeats.sort());
    if (onSeatsSelected && serialized !== lastEmittedSeats.current) {
      lastEmittedSeats.current = serialized;
      onSeatsSelected(selectedSeats);
    }
  }, [selectedSeats, onSeatsSelected]);

  // Sincronizar hacia adentro (local) solo si el padre cambia y es diferente a lo que emitimos
  useEffect(() => {
    const serialized = JSON.stringify(initialSelectedSeats.sort());
    if (serialized !== lastEmittedSeats.current) {
      setSelectedSeats(initialSelectedSeats);
      lastEmittedSeats.current = serialized;
    }
  }, [initialSelectedSeats]);

  const handleSeatClick = async (seatNumber: number, currentStatus: Seat['status'], assignedClientId: string | null) => {
    if (readOnly) return;

    // MODO ADMIN: Bloquear/Desbloquear asientos (En el formulario de Tour)
    if (adminMode && isAdmin) {
      if (!isValidUUID(tourId)) {
        toast.error('Primero debes guardar el tour para poder gestionar asientos individualmente.');
        return;
      }
      setIsUpdatingSeats(true);
      let newStatus: Seat['status'] = (currentStatus === 'available') ? 'blocked' : 'available';
      if (currentStatus === 'booked') {
        toast.info('Este asiento está reservado por un cliente.');
        setIsUpdatingSeats(false);
        return;
      }
      const { error } = await supabase.from('tour_seat_assignments').upsert({
        tour_id: tourId, seat_number: seatNumber, status: newStatus, client_id: null
      }, { onConflict: 'tour_id,seat_number' });
      if (!error) fetchSeats();
      setIsUpdatingSeats(false);
      return;
    }

    // MODO SELECCIÓN (Formulario de Reserva / Cliente)
    
    // 1. Si el asiento está ocupado por OTRA persona
    if (currentStatus === 'booked' && assignedClientId !== currentClientId) {
      toast.info('Asiento ocupado por otro cliente.');
      return;
    }

    // 2. Si el asiento está ocupado por MÍ (para deseleccionarlo en edición)
    if (currentStatus === 'booked' && assignedClientId === currentClientId && currentClientId) {
      setSelectedSeats(prev => 
        prev.includes(seatNumber) ? prev.filter(s => s !== seatNumber) : [...prev, seatNumber]
      );
      return;
    }

    // 3. Caso normal: Seleccionar asiento disponible (o bloqueado si soy Admin)
    const isAvailableToSelect = currentStatus === 'available' || (isAdmin && currentStatus !== 'booked');
    
    if (isAvailableToSelect) {
      setSelectedSeats(prev => 
        prev.includes(seatNumber) ? prev.filter(s => s !== seatNumber) : [...prev, seatNumber]
      );
    } else {
      toast.info('Este asiento no está disponible.');
    }
  };

  const getSeatClasses = (seat: Seat | null, itemType: SeatLayoutItem['type']) => {
    const baseClasses = "w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-colors duration-200";
    if (['aisle', 'empty', 'entry'].includes(itemType)) return "w-10 h-10 flex items-center justify-center text-muted-foreground";
    if (itemType === 'bathroom') return cn(baseClasses, "bg-gray-300 text-gray-700 cursor-default");
    if (itemType === 'driver') return cn(baseClasses, "bg-gray-700 text-white cursor-default");
    if (!seat) return cn(baseClasses, "bg-gray-200 text-gray-500 cursor-not-allowed");

    const isCurrentlySelected = selectedSeats.includes(seat.seat_number);

    // Prioridad visual a la selección actual del formulario
    if (isCurrentlySelected) return cn(baseClasses, "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90 cursor-pointer scale-110 shadow-md z-10");

    if (seat.status === 'booked') {
      return cn(baseClasses, "bg-destructive text-destructive-foreground cursor-not-allowed opacity-50");
    }
    if (seat.status === 'blocked') return cn(baseClasses, "bg-gray-400 text-white", isAdmin ? "cursor-pointer hover:bg-gray-500" : "cursor-not-allowed opacity-50");
    if (seat.status === 'courtesy') return cn(baseClasses, "bg-purple-500 text-white", isAdmin ? "cursor-pointer hover:bg-purple-600" : "cursor-not-allowed opacity-50");
    
    return cn(baseClasses, "bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer");
  };

  if (loading || sessionLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  const currentLayout = seatLayoutJson || [];
  const maxCols = currentLayout.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-xl font-semibold mb-4 text-foreground">Mapa de Asientos ({busCapacity} asientos)</h3>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}>
        {currentLayout.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((item, colIndex) => {
              const seat = item.type === 'seat' ? seats.find(s => s.seat_number === item.number) : null;
              return (
                <div key={`${rowIndex}-${colIndex}`} className="flex items-center justify-center">
                  {item.type === 'seat' && (seat || item.number) ? (
                    <Button
                      className={getSeatClasses(seat, item.type)}
                      onClick={() => handleSeatClick(item.number!, seat?.status || 'available', seat?.client_id || null)}
                      disabled={isUpdatingSeats}
                      type="button"
                    >
                      {item.number}
                    </Button>
                  ) : (
                    <div className={getSeatClasses(null, item.type)}>
                      {item.type === 'bathroom' && <Toilet className="h-5 w-5" />}
                      {item.type === 'driver' && <CarFront className="h-5 w-5" />}
                      {item.type === 'entry' && <LogIn className="h-5 w-5" />}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-6 p-4 bg-background rounded-md shadow-sm grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center"><span className="w-5 h-5 bg-secondary rounded-sm mr-2" /> Disponible</div>
        <div className="flex items-center"><span className="w-5 h-5 bg-rosa-mexicano rounded-sm mr-2" /> Seleccionado</div>
        <div className="flex items-center"><span className="w-5 h-5 bg-destructive rounded-sm mr-2 opacity-50" /> Ocupado</div>
        <div className="flex items-center"><span className="w-5 h-5 bg-gray-400 rounded-sm mr-2" /> Bloqueado / Cortesía</div>
      </div>
    </div>
  );
};

export default TourSeatMap;