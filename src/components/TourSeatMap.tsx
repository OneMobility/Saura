"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, Ban, CarFront, Toilet } from 'lucide-react'; // Added CarFront and Toilet icons
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';

// Definición de tipos para el layout de asientos
type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty';
  number?: number; // Solo para asientos
};
type SeatLayoutRow = SeatLayoutItem[];
type SeatLayout = SeatLayoutRow[];

interface Seat {
  seat_number: number;
  status: 'available' | 'booked' | 'blocked' | 'courtesy';
  client_id: string | null; // Changed from user_id to client_id
  id?: string; // Optional for existing assignments
}

interface TourSeatMapProps {
  tourId: string;
  busCapacity: number;
  courtesies: number;
  seatLayoutJson: SeatLayout | null; // NEW: Prop para la disposición de asientos
  onSeatsSelected?: (selectedSeats: number[]) => void; // Callback for selected seats
  readOnly?: boolean; // If true, no interaction allowed (e.g., for public viewing without booking)
  adminMode?: boolean; // If true, admin can block/unblock seats
  currentClientId?: string | null; // NEW: Client ID for booking/editing
  initialSelectedSeats?: number[]; // NEW: For pre-selecting seats when editing a client
}

const TourSeatMap: React.FC<TourSeatMapProps> = ({
  tourId,
  busCapacity,
  courtesies,
  seatLayoutJson, // Destructure new prop
  onSeatsSelected,
  readOnly = false,
  adminMode = false,
  currentClientId = null, // Default to null
  initialSelectedSeats = [], // Default to empty array
}) => {
  const { user, isLoading: sessionLoading, isAdmin } = useSession();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelectedSeats);
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
      const fetchedAssignments = data || [];
      const allSeats: Seat[] = [];

      // If seatLayoutJson is provided, use it to determine seat numbers
      if (seatLayoutJson) {
        seatLayoutJson.forEach(row => {
          row.forEach(item => {
            if (item.type === 'seat' && item.number !== undefined) {
              const existingAssignment = fetchedAssignments.find(s => s.seat_number === item.number);
              allSeats.push(existingAssignment || { seat_number: item.number, status: 'available', client_id: null });
            }
          });
        });
      } else {
        // Fallback to simple grid if no layout is provided (should not happen if bus has layout)
        for (let i = 1; i <= busCapacity; i++) {
          const existingAssignment = fetchedAssignments.find(s => s.seat_number === i);
          allSeats.push(existingAssignment || { seat_number: i, status: 'available', client_id: null });
        }
      }
      setSeats(allSeats);
    }
    setLoading(false);
  }, [tourId, busCapacity, seatLayoutJson]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Update selectedSeats when initialSelectedSeats prop changes (e.g., when editing a client)
  useEffect(() => {
    setSelectedSeats(initialSelectedSeats);
  }, [initialSelectedSeats]);

  useEffect(() => {
    if (onSeatsSelected) {
      onSeatsSelected(selectedSeats);
    }
  }, [selectedSeats, onSeatsSelected]);

  const handleSeatClick = async (seatNumber: number, currentStatus: Seat['status'], assignedClientId: string | null) => {
    if (readOnly && !adminMode && !currentClientId) return; // No interaction for public read-only mode

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
          client_id: null, // Admin blocking doesn't assign to a client
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

    // Logic for client-specific selection (used in AdminClientFormPage)
    if (currentClientId) {
      // If the seat is already booked by THIS client, allow unselection
      if (currentStatus === 'booked' && assignedClientId === currentClientId) {
        setSelectedSeats(prev => prev.filter(s => s !== seatNumber));
        return;
      }
      // If the seat is available, or booked by another client, or blocked/courtesy, handle accordingly
      if (currentStatus === 'available') {
        setSelectedSeats(prev => [...prev, seatNumber]);
      } else if (currentStatus === 'booked' && assignedClientId !== currentClientId) {
        toast.info(`Este asiento ya está reservado por otro cliente.`);
      } else if (currentStatus === 'blocked') {
        toast.info('Este asiento está bloqueado por el administrador.');
      } else if (currentStatus === 'courtesy') {
        toast.info('Este asiento es de cortesía.');
      }
      return;
    }

    // Regular public user selection logic (if not adminMode and no currentClientId)
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

  const getSeatClasses = (seat: Seat | null, itemType: SeatLayoutItem['type']) => {
    const baseClasses = "w-10 h-10 flex items-center justify-center rounded-md text-sm font-semibold transition-colors duration-200";

    if (itemType === 'aisle' || itemType === 'empty') {
      return "w-10 h-10 flex items-center justify-center text-gray-500"; // Transparent or subtle for non-seats
    }
    if (itemType === 'bathroom') {
      return cn(baseClasses, "bg-gray-300 text-gray-700 cursor-default");
    }
    if (itemType === 'driver') {
      return cn(baseClasses, "bg-gray-700 text-white cursor-default");
    }

    // Only 'seat' type items proceed here
    if (!seat) return cn(baseClasses, "bg-gray-200 text-gray-500 cursor-not-allowed"); // Should not happen if logic is correct

    const isCurrentlySelected = selectedSeats.includes(seat.seat_number);

    if (seat.status === 'booked') {
      if (currentClientId && seat.client_id === currentClientId) {
        return cn(baseClasses, "bg-green-500 text-white hover:bg-green-600 cursor-pointer"); // Booked by this client, allow unselect
      }
      return cn(baseClasses, "bg-red-500 text-white cursor-not-allowed"); // Booked by another
    }
    if (seat.status === 'blocked') {
      return cn(baseClasses, "bg-gray-400 text-gray-700 cursor-not-allowed", adminMode && "hover:bg-gray-500 cursor-pointer");
    }
    if (seat.status === 'courtesy') {
      return cn(baseClasses, "bg-purple-500 text-white cursor-not-allowed");
    }
    if (isCurrentlySelected) {
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

  if (!seatLayoutJson || seatLayoutJson.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-600">
        <p>No hay una disposición de asientos definida para este autobús.</p>
        {adminMode && isAdmin && (
          <p className="text-sm mt-2">Por favor, define el layout en la sección de gestión de autobuses.</p>
        )}
      </div>
    );
  }

  // Determine the number of columns for the grid based on the widest row
  const maxCols = seatLayoutJson.reduce((max, row) => Math.max(max, row.length), 0);

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
      {currentClientId && (
        <p className="text-sm text-gray-600 mb-4">
          Modo Contrato: Selecciona los asientos para este cliente.
        </p>
      )}
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
                      onClick={() => handleSeatClick(seat.seat_number, seat.status, seat.client_id)}
                      disabled={isUpdatingSeats || (readOnly && !adminMode && !currentClientId) || (seat.status === 'booked' && seat.client_id !== currentClientId && !adminMode) || (seat.status === 'courtesy' && !adminMode) || (seat.status === 'blocked' && !adminMode)}
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
                  ) : ( // empty type
                    <div className={getSeatClasses(null, item.type)}></div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-6 p-4 bg-white rounded-md shadow-sm">
        <h4 className="text-lg font-semibold mb-3">Leyenda:</h4>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
          <div className="flex items-center">
            <span className="w-5 h-5 bg-blue-500 rounded-sm mr-2"></span> Disponible
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-green-500 rounded-sm mr-2"></span> Seleccionado (o tuyo)
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-red-500 rounded-sm mr-2"></span> Ocupado (otro cliente)
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-gray-400 rounded-sm mr-2"></span> Bloqueado (Admin)
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-purple-500 rounded-sm mr-2"></span> Cortesía
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-gray-300 rounded-sm mr-2"></span> Baño
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-gray-700 rounded-sm mr-2"></span> Conductor
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourSeatMap;