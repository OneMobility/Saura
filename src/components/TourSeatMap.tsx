"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, Ban, CarFront, Toilet, LogIn } from 'lucide-react'; // Added LogIn icon
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { SeatLayout, SeatLayoutItem } from '@/types/shared'; // Import shared SeatLayout types

interface Seat {
  seat_number: number;
  status: 'available' | 'booked' | 'blocked' | 'courtesy';
  client_id: string | null; // Changed from user_id to client_id
  id?: string; // Optional for existing assignments
}

interface TourSeatMapProps {
  tourId: string;
  busCapacity: number;
  courtesies: number; // Renamed to Coordinadores
  seatLayoutJson: SeatLayout | null; // NEW: Prop para la disposición de asientos
  onSeatsSelected?: (selectedSeats: number[]) => void; // Callback for selected seats
  readOnly?: boolean; // If true, no interaction allowed (e.g., for public viewing without booking)
  adminMode?: boolean; // If true, admin can block/unblock seats
  currentClientId?: string | null; // NEW: Client ID for booking/editing
  initialSelectedSeats?: number[]; // NEW: For pre-selecting seats when editing a client or public selection
}

const TourSeatMap: React.FC<TourSeatMapProps> = ({
  tourId,
  busCapacity,
  courtesies, // Destructure new prop
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

      // Create a flat list of all potential seat numbers from the layout
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
        // Fallback to simple grid if no layout is provided (should not happen if bus has layout)
        for (let i = 1; i <= busCapacity; i++) {
          layoutSeatNumbers.push(i);
        }
      }

      // Populate allSeats, merging with existing assignments
      layoutSeatNumbers.forEach(seatNumber => {
        const existingAssignment = fetchedAssignments.find(s => s.seat_number === seatNumber);
        allSeats.push({
          seat_number: seatNumber,
          status: (existingAssignment?.status || 'available') as Seat['status'], // Cast status
          client_id: existingAssignment?.client_id || null,
          id: existingAssignment?.id,
        });
      });

      // Sort seats by number to ensure "first available" is consistent
      allSeats.sort((a, b) => a.seat_number - b.seat_number);

      // Apply courtesy logic: mark the first 'courtesies' available seats as 'courtesy'
      let courtesySeatsAssigned = 0;
      const updatedSeats = allSeats.map(seat => {
        // Only apply courtesy if it's currently 'available' and we still need to assign courtesies
        if (seat.status === 'available' && courtesySeatsAssigned < courtesies) { // Use 'courtesies' here
          courtesySeatsAssigned++;
          return { ...seat, status: 'courtesy' };
        }
        return seat;
      });
      
      setSeats(updatedSeats);
    }
    setLoading(false);
  }, [tourId, busCapacity, courtesies, seatLayoutJson]); // Added courtesies to dependencies

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Update selectedSeats when initialSelectedSeats prop changes (e.g., when editing a client or public selection changes)
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
      setIsUpdatingSeats(true);
      let newStatus: Seat['status'];
      let newClientId: string | null = null; // Admin blocking/courtesy doesn't assign to a client

      if (currentStatus === 'blocked' || currentStatus === 'courtesy') {
        newStatus = 'available'; // Admin can unblock or unmark courtesy
      } else if (currentStatus === 'available') {
        newStatus = 'blocked'; // Admin can block an available seat
      } else {
        // Booked seats cannot be changed by admin directly here
        toast.info('Este asiento ya está reservado por un cliente y no puede ser modificado directamente.');
        setIsUpdatingSeats(false);
        return;
      }

      const { error } = await supabase
        .from('tour_seat_assignments')
        .upsert({
          tour_id: tourId,
          seat_number: seatNumber,
          status: newStatus,
          client_id: newClientId,
          id: currentSeat.id, // Include ID if updating existing
        }, { onConflict: 'tour_id,seat_number' });

      if (error) {
        console.error('Error updating seat status (admin):', error);
        toast.error('Error al actualizar el estado del asiento.');
      } else {
        toast.success(`Asiento ${seatNumber} actualizado a ${newStatus}.`);
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
        toast.info('Este asiento es de coordinador.');
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

    if (itemType === 'aisle' || itemType === 'empty' || itemType === 'entry') { // Added 'entry'
      return "w-10 h-10 flex items-center justify-center text-muted-foreground"; // Transparent or subtle for non-seats
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
        return cn(baseClasses, "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90 cursor-pointer"); // Booked by this client, allow unselect
      }
      return cn(baseClasses, "bg-destructive text-destructive-foreground cursor-not-allowed"); // Booked by another
    }
    if (seat.status === 'blocked') {
      return cn(baseClasses, "bg-muted text-muted-foreground cursor-not-allowed", adminMode && "hover:bg-muted/80 cursor-pointer");
    }
    if (seat.status === 'courtesy') {
      return cn(baseClasses, "bg-purple-500 text-white cursor-not-allowed", adminMode && "hover:bg-purple-600 cursor-pointer");
    }
    if (isCurrentlySelected) {
      return cn(baseClasses, "bg-rosa-mexicano text-white hover:bg-rosa-mexicano/90 cursor-pointer");
    }
    // Default for 'available' seats
    return cn(baseClasses, "bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer");
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-muted-foreground">Cargando mapa de asientos...</p>
      </div>
    );
  }

  if (!seatLayoutJson || seatLayoutJson.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted text-center text-muted-foreground">
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
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-xl font-semibold mb-4 text-foreground">
        Mapa de Asientos ({busCapacity} asientos)
      </h3>
      {adminMode && isAdmin && (
        <p className="text-sm text-muted-foreground mb-4">
          Modo Administrador: Haz clic en un asiento bloqueado o de coordinador para liberarlo, o en uno disponible para bloquearlo.
        </p>
      )}
      {currentClientId && (
        <p className="text-sm text-muted-foreground mb-4">
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
                      disabled={isUpdatingSeats || (readOnly && !adminMode && !currentClientId) || (seat.status === 'booked' && seat.client_id !== currentClientId && !adminMode) || (seat.status === 'blocked' && !adminMode) || (seat.status === 'courtesy' && !adminMode)}
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
                  ) : item.type === 'entry' ? ( // Render 'entry' type
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
            <span className="w-5 h-5 bg-rosa-mexicano rounded-sm mr-2"></span> Seleccionado (o tuyo)
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-destructive rounded-sm mr-2"></span> Ocupado (otro cliente)
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-muted rounded-sm mr-2"></span> Bloqueado (Admin)
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 bg-purple-500 rounded-sm mr-2"></span> Coordinador
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

export default TourSeatMap;