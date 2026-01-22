"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, CarFront, Toilet, LogIn, Crown } from 'lucide-react';
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
  const { isAdmin } = useSession();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingSeats, setIsUpdatingSeats] = useState(false);

  const isValidUUID = (uuid: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  };

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    
    let fetchedAssignments: any[] = [];
    if (isValidUUID(tourId)) {
      const { data, error } = await supabase
        .from('tour_seat_assignments')
        .select('*')
        .eq('tour_id', tourId);
      
      if (!error) fetchedAssignments = data || [];
      else toast.error('Error al cargar disponibilidad.');
    }

    const currentLayout = seatLayoutJson || [];
    const seatNumbers: number[] = [];
    
    // 1. Extraer todos los números de asiento físicos presentes en el layout
    currentLayout.forEach(row => {
      row.forEach(item => {
        if (item.type === 'seat' && item.number !== undefined) {
          seatNumbers.push(item.number);
        }
      });
    });
    
    // Ordenar numéricamente para la lógica de asignación
    seatNumbers.sort((a, b) => a - b);

    // 2. Mapear estados base (vendidos o bloqueados)
    const baseSeats = seatNumbers.map(num => {
      const dbEntry = fetchedAssignments.find(s => s.seat_number === num);
      return {
        seat_number: num,
        status: (dbEntry?.status || 'available') as Seat['status'],
        client_id: dbEntry?.client_id || null
      };
    });

    // 3. Aplicar lógica de cortesías sobre los asientos NO vendidos
    let courtesyCount = 0;
    const finalSeats = baseSeats.map(s => {
      // Si ya está vendido a un cliente, se queda como 'booked'
      if (s.status === 'booked') return s;

      // Si aún necesitamos cortesías, este asiento disponible se convierte en cortesía
      if (courtesyCount < courtesies) {
        courtesyCount++;
        return { ...s, status: 'courtesy' as const };
      }

      return s;
    });

    setSeats(finalSeats);
    setLoading(false);
  }, [tourId, seatLayoutJson, courtesies]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const handleSeatClick = async (seatNumber: number, currentStatus: Seat['status'], assignedClientId: string | null) => {
    if (readOnly || !onSeatsSelected) return;

    if (adminMode && isAdmin) {
      if (!isValidUUID(tourId)) {
        toast.error('Guarda el tour primero para bloquear asientos.');
        return;
      }
      if (currentStatus === 'booked') {
        toast.info('Asiento reservado por cliente.');
        return;
      }
      if (currentStatus === 'courtesy') {
        toast.info('Asiento reservado para Coordinadores por sistema.');
        return;
      }

      setIsUpdatingSeats(true);
      const newStatus = (currentStatus === 'available') ? 'blocked' : 'available';
      
      await supabase.from('tour_seat_assignments').upsert({
        tour_id: tourId, seat_number: seatNumber, status: newStatus, client_id: null
      }, { onConflict: 'tour_id,seat_number' });
      
      fetchSeats();
      setIsUpdatingSeats(false);
      return;
    }

    // Lógica de Selección de Cliente
    if (currentStatus === 'booked' && assignedClientId !== currentClientId) {
      toast.info('Asiento ya reservado.');
      return;
    }
    if (currentStatus === 'blocked' || currentStatus === 'courtesy') {
      toast.info('Este asiento no está disponible para venta.');
      return;
    }

    const isSelected = initialSelectedSeats.includes(seatNumber);
    const newSelection = isSelected 
      ? initialSelectedSeats.filter(s => s !== seatNumber)
      : [...initialSelectedSeats, seatNumber];
    
    onSeatsSelected(newSelection);
  };

  const getSeatClasses = (seat: Seat | null, itemType: SeatLayoutItem['type']) => {
    const base = "w-10 h-10 flex items-center justify-center rounded-md text-sm font-bold transition-all duration-200 relative";
    if (['aisle', 'empty', 'entry'].includes(itemType)) return "w-10 h-10";
    if (itemType === 'bathroom') return cn(base, "bg-gray-200 text-gray-400 cursor-default");
    if (itemType === 'driver') return cn(base, "bg-gray-800 text-white cursor-default");
    
    if (!seat) return cn(base, "bg-gray-100 cursor-not-allowed");

    const isSelected = initialSelectedSeats.includes(seat.seat_number);

    if (isSelected) return cn(base, "bg-rosa-mexicano text-white scale-110 shadow-lg z-10");
    if (seat.status === 'booked') return cn(base, "bg-red-100 text-red-400 cursor-not-allowed opacity-50");
    if (seat.status === 'blocked') return cn(base, "bg-gray-400 text-white cursor-pointer hover:bg-gray-500");
    if (seat.status === 'courtesy') return cn(base, "bg-yellow-100 text-yellow-700 cursor-not-allowed border-2 border-yellow-400");
    
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
              const isCourtesy = seat?.status === 'courtesy';
              return (
                <div key={`${rIdx}-${cIdx}`} className="flex justify-center">
                  {item.type === 'seat' ? (
                    <Button
                      type="button"
                      className={getSeatClasses(seat, 'seat')}
                      onClick={() => handleSeatClick(item.number!, seat?.status || 'available', seat?.client_id || null)}
                      disabled={isUpdatingSeats}
                      variant="ghost"
                      title={isCourtesy ? "Espacio de Coordinador" : ""}
                    >
                      {isCourtesy ? <Crown className="h-4 w-4 absolute -top-1 -right-1 text-yellow-600" /> : null}
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
      <div className="flex flex-wrap gap-4 text-[10px] uppercase font-black text-gray-400 justify-center border-t pt-4 tracking-tighter">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border rounded" /> Libre</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rosa-mexicano rounded" /> Seleccionado</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 rounded" /> Vendido</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-400 rounded" /> Bloqueado</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border-yellow-400 border rounded" /> Coordinador</div>
      </div>
    </div>
  );
};

export default TourSeatMap;