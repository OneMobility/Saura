"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, CarFront, Toilet, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { SeatLayout, SeatLayoutItem } from '@/types/shared';

interface Seat {
  seat_number: number;
  status: 'available' | 'booked' | 'blocked' | 'courtesy';
  client_id: string | null;
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
  initialSelectedSeats?: number[]; // La fuente de verdad viene de aquí
}

const TourSeatMap: React.FC<TourSeatMapProps> = ({
  tourId,
  busCapacity,
  seatLayoutJson,
  onSeatsSelected,
  readOnly = false,
  adminMode = false,
  currentClientId = null,
  initialSelectedSeats = [],
}) => {
  const { isAdmin } = useSession();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingSeats, setIsUpdatingSeats] = useState(false);

  const isValidUUID = (uuid: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  };

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    
    // Si es un tour nuevo que aún no se guarda, generamos asientos vacíos basados en el layout
    if (!isValidUUID(tourId)) {
      const allSeats: Seat[] = [];
      const currentLayout = seatLayoutJson || [];
      currentLayout.forEach(row => {
        row.forEach(item => {
          if (item.type === 'seat' && item.number !== undefined) {
            allSeats.push({ seat_number: item.number, status: 'available', client_id: null });
          }
        });
      });
      setSeats(allSeats.sort((a, b) => a.seat_number - b.seat_number));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tour_seat_assignments')
      .select('*')
      .eq('tour_id', tourId);

    if (error) {
      toast.error('Error al cargar disponibilidad.');
    } else {
      const fetchedAssignments = data || [];
      const allSeats: Seat[] = [];
      const currentLayout = seatLayoutJson || [];
      
      if (currentLayout.length > 0) {
        currentLayout.forEach(row => {
          row.forEach(item => {
            if (item.type === 'seat' && item.number !== undefined) {
              const existing = fetchedAssignments.find(s => s.seat_number === item.number);
              allSeats.push({
                seat_number: item.number,
                status: (existing?.status || 'available') as Seat['status'],
                client_id: existing?.client_id || null,
              });
            }
          });
        });
      }
      setSeats(allSeats.sort((a, b) => a.seat_number - b.seat_number));
    }
    setLoading(false);
  }, [tourId, seatLayoutJson]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const handleSeatClick = async (seatNumber: number, currentStatus: Seat['status'], assignedClientId: string | null) => {
    if (readOnly || !onSeatsSelected) return;

    // LÓGICA MODO ADMIN (Bloqueo persistente en BD)
    if (adminMode && isAdmin) {
      if (!isValidUUID(tourId)) {
        toast.error('Guarda el tour primero para bloquear asientos.');
        return;
      }
      setIsUpdatingSeats(true);
      const newStatus = (currentStatus === 'available') ? 'blocked' : 'available';
      if (currentStatus === 'booked') {
        toast.info('Asiento reservado por cliente.');
        setIsUpdatingSeats(false);
        return;
      }
      await supabase.from('tour_seat_assignments').upsert({
        tour_id: tourId, seat_number: seatNumber, status: newStatus, client_id: null
      }, { onConflict: 'tour_id,seat_number' });
      fetchSeats();
      setIsUpdatingSeats(false);
      return;
    }

    // LÓGICA DE SELECCIÓN (Formulario de reserva)
    
    // Si está ocupado por otro, no dejar tocar
    if (currentStatus === 'booked' && assignedClientId !== currentClientId) {
      toast.info('Asiento ocupado.');
      return;
    }

    // Toggle de selección comunicando directamente al padre
    const isSelected = initialSelectedSeats.includes(seatNumber);
    const newSelection = isSelected 
      ? initialSelectedSeats.filter(s => s !== seatNumber)
      : [...initialSelectedSeats, seatNumber];
    
    onSeatsSelected(newSelection);
  };

  const getSeatClasses = (seat: Seat | null, itemType: SeatLayoutItem['type']) => {
    const base = "w-10 h-10 flex items-center justify-center rounded-md text-sm font-bold transition-all duration-200";
    if (['aisle', 'empty', 'entry'].includes(itemType)) return "w-10 h-10";
    if (itemType === 'bathroom') return cn(base, "bg-gray-200 text-gray-400 cursor-default");
    if (itemType === 'driver') return cn(base, "bg-gray-800 text-white cursor-default");
    
    if (!seat) return cn(base, "bg-gray-100 cursor-not-allowed");

    const isSelected = initialSelectedSeats.includes(seat.seat_number);

    if (isSelected) return cn(base, "bg-rosa-mexicano text-white scale-110 shadow-lg z-10");
    if (seat.status === 'booked') return cn(base, "bg-red-100 text-red-400 cursor-not-allowed opacity-50");
    if (seat.status === 'blocked') return cn(base, "bg-gray-400 text-white cursor-pointer");
    if (seat.status === 'courtesy') return cn(base, "bg-purple-500 text-white cursor-pointer");
    
    return cn(base, "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer border border-gray-200");
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-rosa-mexicano" /></div>;

  const currentLayout = seatLayoutJson || [];
  const maxCols = currentLayout.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="p-4 border rounded-xl bg-gray-50/50">
      <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}>
        {currentLayout.map((row, rIdx) => (
          <React.Fragment key={rIdx}>
            {row.map((item, cIdx) => {
              const seat = item.type === 'seat' ? seats.find(s => s.seat_number === item.number) : null;
              return (
                <div key={`${rIdx}-${cIdx}`} className="flex justify-center">
                  {item.type === 'seat' ? (
                    <Button
                      type="button"
                      className={getSeatClasses(seat, 'seat')}
                      onClick={() => handleSeatClick(item.number!, seat?.status || 'available', seat?.client_id || null)}
                      disabled={isUpdatingSeats}
                      variant="ghost"
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
      <div className="flex flex-wrap gap-4 text-[10px] uppercase font-bold text-gray-400 justify-center border-t pt-4">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border rounded" /> Libre</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rosa-mexicano rounded" /> Seleccionado</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 rounded" /> Ocupado</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-400 rounded" /> Bloqueado</div>
      </div>
    </div>
  );
};

export default TourSeatMap;