"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, Ban, CarFront, Toilet, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SeatLayout, SeatLayoutItem } from '@/types/shared';

interface BusSeat {
  seat_number: number;
  status: 'available' | 'booked';
  client_id: string | null;
  id?: string; // Optional for existing assignments
}

interface BusSeatMapProps {
  busId: string;
  busCapacity: number;
  scheduleId: string; // NEW: scheduleId to fetch specific assignments
  seatLayoutJson: SeatLayout | null;
  onSeatsSelected?: (selectedSeats: number[]) => void;
  readOnly?: boolean;
}

const BusSeatMap: React.FC<BusSeatMapProps> = ({
  busId,
  busCapacity,
  scheduleId,
  seatLayoutJson,
  onSeatsSelected,
  readOnly = false,
}) => {
  const [seats, setSeats] = useState<BusSeat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    if (!scheduleId) {
      console.warn('BusSeatMap: scheduleId no proporcionado, no se pueden cargar los asientos.');
      setSeats([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bus_seat_assignments')
      .select('*')
      .eq('schedule_id', scheduleId);

    if (error) {
      console.error('Error fetching bus seat assignments:', error);
      toast.error('Error al cargar las asignaciones de asientos del autobús.');
      setSeats([]);
    } else {
      const fetchedAssignments = data || [];
      const allSeats: BusSeat[] = [];

      const layoutSeatNumbers: number[] = [];
      if (seatLayoutJson) {
        seatLayoutJson.forEach(row => {
          row.forEach(item => {
            if (item.type === 'seat' && item.number !== undefined) {
              layoutSeatNumbers.push(item.number);
            }
          });
        });
      } else {
        // Fallback to simple grid if no layout is provided
        for (let i = 1; i <= busCapacity; i++) {
          layoutSeatNumbers.push(i);
        }
      }

      layoutSeatNumbers.forEach(seatNumber => {
        const existingAssignment = fetchedAssignments.find(s => s.seat_number === seatNumber);
        allSeats.push({
          seat_number: seatNumber,
          status: (existingAssignment?.status || 'available') as BusSeat['status'],
          client_id: existingAssignment?.client_id || null,
          id: existingAssignment?.id,
        });
      });
      
      allSeats.sort((a, b) => a.seat_number - b.seat_number);
      setSeats(allSeats);
    }
    setLoading(false);
  }, [scheduleId, busCapacity, seatLayoutJson]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  useEffect(() => {
    if (onSeatsSelected) {
      onSeatsSelected(selectedSeats);
    }
  }, [selectedSeats, onSeatsSelected]);

  const handleSeatClick = (seatNumber: number, currentStatus: BusSeat['status']) => {
    if (readOnly) return;

    if (currentStatus === 'booked') {
      toast.info('Este asiento ya está reservado.');
      return;
    }

    // Toggle selection for available seats
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        return prev.filter(s => s !== seatNumber);
      } else {
        return [...prev, seatNumber];
      }
    });
  };

  const getSeatClasses = (seat: BusSeat | null, itemType: SeatLayoutItem['type']) => {
    const baseClasses = "w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-colors duration-200";

    if (itemType === 'aisle' || itemType === 'empty' || itemType === 'entry') {
      return "w-10 h-10 flex items-center justify-center text-muted-foreground";
    }
    if (itemType === 'bathroom') {
      return cn(baseClasses, "bg-gray-300 text-gray-700 cursor-default");
    }
    if (itemType === 'driver') {
      return cn(baseClasses, "bg-gray-700 text-white cursor-default");
    }

    if (!seat) return cn(baseClasses, "bg-gray-200 text-gray-500 cursor-not-allowed");

    const isCurrentlySelected = selectedSeats.includes(seat.seat_number);

    if (seat.status === 'booked') {
      return cn(baseClasses, "bg-destructive text-destructive-foreground cursor-not-allowed");
    }
    if (isCurrentlySelected) {
      return cn(baseClasses, "bg-bus-primary text-bus-primary-foreground hover:bg-bus-primary/90 cursor-pointer");
    }
    // Default for 'available' seats
    return cn(baseClasses, "bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-bus-primary" />
        <p className="ml-4 text-muted-foreground">Cargando mapa de asientos...</p>
      </div>
    );
  }

  if (!seatLayoutJson || seatLayoutJson.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted text-center text-muted-foreground">
        <p>No hay una disposición de asientos definida para este autobús.</p>
      </div>
    );
  }

  const maxCols = seatLayoutJson.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-xl font-semibold mb-4 text-bus-foreground">
        Mapa de Asientos ({busCapacity} asientos)
      </h3>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}>
        {seatLayoutJson.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((item, colIndex) => {
              const seat = item.type === 'seat' ? seats.find(s => s.seat_number === item.number) : null;
              return (
                <div key={`${rowIndex}-${colIndex}`} className="flex items-center justify-center">
                  {item.type === 'seat' && seat ? (
                    <Button
                      className={getSeatClasses(seat, item.type)}
                      onClick={() => handleSeatClick(seat.seat_number, seat.status)}
                      disabled={seat.status === 'booked' || readOnly}
                    >
                      {item.number}
                    </Button>
                  ) : item.type === 'aisle' ? (
                    <div className={getSeatClasses(null, item.type)}></div>
                  ) : item.type === 'bathroom' ? (
                    <div className={getSeatClasses(null, item.type)} title="Baño">
                      <Toilet className="h-5 w-5" />
                    </div>
                  ) : item.type === 'driver' ? (
                    <div className={getSeatClasses(null, item.type)} title="Conductor">
                      <CarFront className="h-5 w-5" />
                    </div>
                  ) : item.type === 'entry' ? (
                    <div className={getSeatClasses(null, item.type)} title="Ascenso">
                      <LogIn className="h-5 w-5" />
                    </div>
                  ) : ( // empty type
                    <div className={getSeatClasses(null, item.type)}></div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-6 p-4 bg-background rounded-md shadow-sm">
        <h4 className="text-lg font-semibold mb-3">Leyenda:</h4>
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div className="flex items-center">
            <span className="w-5 h-5 bg-secondary rounded-sm mr-2"></span> Disponible
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-bus-primary rounded-sm mr-2"></span> Seleccionado
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-destructive rounded-sm mr-2"></span> Ocupado
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-gray-300 rounded-sm mr-2"></span> Baño
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-gray-700 rounded-sm mr-2"></span> Conductor
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-green-600 rounded-sm mr-2"></span> Ascenso
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusSeatMap;