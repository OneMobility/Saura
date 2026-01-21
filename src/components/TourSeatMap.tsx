"use client";

import React, { useState, useEffect, useCallback } from 'react';
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

  // Helper para validar si el ID es un UUID válido
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    
    // Si no es un UUID válido (como 'new-tour'), mostramos el layout vacío sin consultar
    if (!isValidUUID(tourId)) {
      const allSeats: Seat[] = [];
      const currentLayout = seatLayoutJson || [];
      
      if (currentLayout.length > 0) {
        currentLayout.forEach(row => {
          row.forEach(item => {
            if (item.type === 'seat' && item.number !== undefined) {
              allSeats.push({
                seat_number: item.number,
                status: 'available',
                client_id: null,
              });
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

      allSeats.sort((a, b) => a.seat_number - b.seat_number);

      let courtesySeatsAssigned = 0;
      const updatedSeats = allSeats.map(seat => {
        if (seat.status === 'available' && courtesySeatsAssigned < courtesies) {
          courtesySeatsAssigned++;
          return { ...seat, status: 'courtesy' };
        }
        return seat;
      });
      
      setSeats(updatedSeats);
    }
    setLoading(false);
  }, [tourId, busCapacity, courtesies, seatLayoutJson]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  useEffect(() => {
    setSelectedSeats(initialSelectedSeats);
  }, [initialSelectedSeats]);

  useEffect(() => {
    if (onSeatsSelected) {
      onSeatsSelected(selectedSeats);
    }
  }, [selectedSeats, onSeatsSelected]);

  const handleSeatClick = async (seatNumber: number, currentStatus: Seat['status'], assignedClientId: string | null) => {
    if (readOnly && !adminMode && !currentClientId) return;

    if (adminMode && isAdmin) {
      if (!isValidUUID(tourId)) {
        toast.error('Primero debes guardar el tour para poder bloquear asientos manualmente.');
        return;
      }

      setIsUpdatingSeats(true);
      let newStatus: Seat['status'];
      if (currentStatus === 'blocked' || currentStatus === 'courtesy') {
        newStatus = 'available';
      } else if (currentStatus === 'available') {
        newStatus = 'blocked';
      } else {
        toast.info('Este asiento ya está reservado por un cliente.');
        setIsUpdatingSeats(false);
        return;
      }

      const { error } = await supabase
        .from('tour_seat_assignments')
        .upsert({
          tour_id: tourId,
          seat_number: seatNumber,
          status: newStatus,
          client_id: null,
        }, { onConflict: 'tour_id,seat_number' });

      if (error) {
        toast.error('Error al actualizar el asiento.');
      } else {
        fetchSeats();
      }
      setIsUpdatingSeats(false);
      return;
    }

    if (currentClientId) {
      if (currentStatus === 'booked' && assignedClientId === currentClientId) {
        setSelectedSeats(prev => prev.filter(s => s !== seatNumber));
        return;
      }
      if (currentStatus === 'available') {
        setSelectedSeats(prev => [...prev, seatNumber]);
      }
      return;
    }

    if (currentStatus !== 'available') {
      toast.info('Este asiento no está disponible.');
      return;
    }

    setSelectedSeats(prev => 
      prev.includes(seatNumber) ? prev.filter(s => s !== seatNumber) : [...prev, seatNumber]
    );
  };

  const getSeatClasses = (seat: Seat | null, itemType: SeatLayoutItem['type']) => {
    const baseClasses = "w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-colors duration-200";

    if (['aisle', 'empty', 'entry'].includes(itemType)) {
      return "w-10 h-10 flex items-center justify-center text-muted-foreground";
    }
    if (itemType === 'bathroom') return cn(baseClasses, "bg-gray-300 text-gray-700 cursor-default");
    if (itemType === 'driver') return cn(baseClasses, "bg-gray-700 text-white cursor-default");

    if (!seat) return cn(baseClasses, "bg-gray-200 text-gray-500 cursor-not-allowed");

    const isCurrentlySelected = selectedSeats.includes(seat.seat_number);

    if (seat.status === 'booked') {
      if (currentClientId && seat.client_id === currentClientId) {
        return cn(baseClasses, "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90 cursor-pointer");
      }
      return cn(baseClasses, "bg-destructive text-destructive-foreground cursor-not-allowed");
    }
    if (seat.status === 'blocked') return cn(baseClasses, "bg-muted text-muted-foreground cursor-not-allowed", adminMode && "hover:bg-muted/80 cursor-pointer");
    if (seat.status === 'courtesy') return cn(baseClasses, "bg-purple-500 text-white cursor-not-allowed", adminMode && "hover:bg-purple-600 cursor-pointer");
    if (isCurrentlySelected) return cn(baseClasses, "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90 cursor-pointer");
    
    return cn(baseClasses, "bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer");
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const currentLayout = seatLayoutJson || [];
  if (currentLayout.length === 0) return null;

  const maxCols = currentLayout.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-xl font-semibold mb-4 text-foreground">
        Mapa de Asientos ({busCapacity} asientos)
      </h3>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}>
        {currentLayout.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((item, colIndex) => {
              const seat = item.type === 'seat' ? seats.find(s => s.seat_number === item.number) : null;
              return (
                <div key={`${rowIndex}-${colIndex}`} className="flex items-center justify-center">
                  {item.type === 'seat' && seat ? (
                    <Button
                      className={getSeatClasses(seat, item.type)}
                      onClick={() => handleSeatClick(seat.seat_number, seat.status, seat.client_id)}
                      disabled={isUpdatingSeats || (readOnly && !adminMode && !currentClientId)}
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
        <div className="flex items-center"><span className="w-5 h-5 bg-destructive rounded-sm mr-2" /> Ocupado</div>
        <div className="flex items-center"><span className="w-5 h-5 bg-purple-500 rounded-sm mr-2" /> Coordinador</div>
      </div>
    </div>
  );
};

export default TourSeatMap;