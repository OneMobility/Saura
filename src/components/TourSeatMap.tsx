"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';

interface Seat {
  seat_number: number;
  status: 'available' | 'booked' | 'blocked' | 'courtesy';
  user_id: string | null;
  id?: string; // Optional for existing assignments
}

interface TourSeatMapProps {
  tourId: string;
  busCapacity: number;
  courtesies: number;
  onSeatsSelected?: (selectedSeats: number[]) => void; // Callback for selected seats
  readOnly?: boolean; // If true, no interaction allowed (e.g., for public viewing without booking)
  adminMode?: boolean; // If true, admin can block/unblock seats
}

const TourSeatMap: React.FC<TourSeatMapProps> = ({
  tourId,
  busCapacity,
  courtesies,
  onSeatsSelected,
  readOnly = false,
  adminMode = false,
}) => {
  const { user, isLoading: sessionLoading, isAdmin } = useSession();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingSeats, setIsUpdatingSeats] = useState(false);

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tour_seat_assignments')
      .select('*')
      .eq('tour_id', tourId);

    if (error) {
      console.error('Error fetching seat assignments:', error);
      toast.error('Error al cargar las asignaciones de asientos.');
      setSeats([]);
    } else {
      const fetchedSeats = data || [];
      const allSeats: Seat[] = Array.from({ length: busCapacity }, (_, i) => {
        const seatNumber = i + 1;
        const existingSeat = fetchedSeats.find(s => s.seat_number === seatNumber);
        return existingSeat || { seat_number: seatNumber, status: 'available', user_id: null };
      });
      setSeats(allSeats);
    }
    setLoading(false);
  }, [tourId, busCapacity]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  useEffect(() => {
    if (onSeatsSelected) {
      onSeatsSelected(selectedSeats);
    }
  }, [selectedSeats, onSeatsSelected]);

  const handleSeatClick = async (seatNumber: number, currentStatus: Seat['status']) => {
    if (readOnly && !adminMode) return; // No interaction for public read-only mode

    const seatIndex = seats.findIndex(s => s.seat_number === seatNumber);
    if (seatIndex === -1) return;

    const currentSeat = seats[seatIndex];

    if (adminMode && isAdmin) {
      // Admin can toggle 'blocked' status
      setIsUpdatingSeats(true);
      const newStatus = currentStatus === 'blocked' ? 'available' : 'blocked';
      const { error } = await supabase
        .from('tour_seat_assignments')
        .upsert({
          tour_id: tourId,
          seat_number: seatNumber,
          status: newStatus,
          user_id: null, // Admin blocking doesn't assign to a user
          id: currentSeat.id, // Include ID if updating existing
        }, { onConflict: 'tour_id,seat_number' });

      if (error) {
        console.error('Error updating seat status (admin):', error);
        toast.error('Error al actualizar el estado del asiento.');
      } else {
        toast.success(`Asiento ${seatNumber} ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'}.`);
        fetchSeats(); // Re-fetch to update UI
      }
      setIsUpdatingSeats(false);
      return;
    }

    // Regular user selection logic (if not adminMode or not admin)
    if (currentStatus === 'booked' || currentStatus === 'blocked' || currentStatus === 'courtesy') {
      toast.info('Este asiento no está disponible.');
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

  const getSeatClasses = (seat: Seat) => {
    const isSelected = selectedSeats.includes(seat.seat_number);
    const baseClasses = "w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-colors duration-200";

    if (seat.status === 'booked') {
      return cn(baseClasses, "bg-red-500 text-white cursor-not-allowed");
    }
    if (seat.status === 'blocked') {
      return cn(baseClasses, "bg-gray-400 text-gray-700 cursor-not-allowed", adminMode && "hover:bg-gray-500 cursor-pointer");
    }
    if (seat.status === 'courtesy') {
      return cn(baseClasses, "bg-purple-500 text-white cursor-not-allowed");
    }
    if (isSelected) {
      return cn(baseClasses, "bg-green-500 text-white hover:bg-green-600 cursor-pointer");
    }
    return cn(baseClasses, "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer");
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando mapa de asientos...</p>
      </div>
    );
  }

  const numRows = Math.ceil(busCapacity / 4); // Example: 4 seats per row
  const seatsPerRow = 4;

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Mapa de Asientos ({busCapacity} asientos)
      </h3>
      {adminMode && isAdmin && (
        <p className="text-sm text-gray-600 mb-4">
          Modo Administrador: Haz clic en un asiento para bloquearlo/desbloquearlo.
        </p>
      )}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))` }}>
        {seats.map((seat) => (
          <Button
            key={seat.seat_number}
            className={getSeatClasses(seat)}
            onClick={() => handleSeatClick(seat.seat_number, seat.status)}
            disabled={isUpdatingSeats || (readOnly && !adminMode) || (seat.status === 'booked' && !adminMode) || (seat.status === 'courtesy' && !adminMode)}
          >
            {seat.seat_number}
          </Button>
        ))}
      </div>
      <div className="mt-6 p-4 bg-white rounded-md shadow-sm">
        <h4 className="text-lg font-semibold mb-3">Leyenda:</h4>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
          <div className="flex items-center">
            <span className="w-5 h-5 bg-blue-500 rounded-sm mr-2"></span> Disponible
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-green-500 rounded-sm mr-2"></span> Seleccionado
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-red-500 rounded-sm mr-2"></span> Ocupado
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-gray-400 rounded-sm mr-2"></span> Bloqueado (Admin)
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-purple-500 rounded-sm mr-2"></span> Cortesía
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourSeatMap;