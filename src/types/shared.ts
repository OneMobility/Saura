export interface TourProviderService {
  id: string; // Unique ID for this entry in the tour's provider_details array
  provider_id: string; // References an ID from the 'providers' table
  quantity: number; // How many units of this service are needed for the tour
  cost_per_unit_snapshot: number; // Snapshot of cost at time of linking
  selling_price_per_unit_snapshot: number; // Snapshot of selling price at time of linking
  name_snapshot: string; // Snapshot of provider name
  service_type_snapshot: string; // Snapshot of service type
  unit_type_snapshot: string; // Snapshot of unit type
}

export interface AvailableProvider {
  id: string;
  name: string;
  service_type: string;
  cost_per_unit: number;
  unit_type: string;
  selling_price_per_unit: number;
  is_active: boolean;
}

// Definición de tipos para el layout de asientos (consolidado)
export type SeatLayoutItem = {
  type: 'seat' | 'aisle' | 'bathroom' | 'driver' | 'empty' | 'entry';
  number?: number; // Solo para asientos
};
export type SeatLayoutRow = SeatLayoutItem[];
export type SeatLayout = SeatLayoutRow[];

// NEW: Interface for BusRouteDestination (snapshot of bus_destinations)
export interface BusRouteDestination {
  id: string;
  name: string;
  order_index: number;
}

// NEW: Interface for BusRoute (updated structure)
export interface BusRoute {
  id?: string;
  name: string;
  all_stops: string[]; // Array of destination IDs in order
  bus_id: string | null;
  is_active: boolean; // Re-added
  created_at?: string;
  updated_at?: string;
}

// NEW: Interface for RouteSegment
export interface RouteSegment {
  id?: string;
  route_id: string;
  start_destination_id: string;
  end_destination_id: string;
  adult_price: number;
  child_price: number;
  duration_minutes: number | null;
  distance_km: number | null;
  created_at?: string;
  updated_at?: string;
}

// NEW: Interface for BusSchedule
export interface BusSchedule {
  id?: string;
  route_id: string;
  departure_time: string; // e.g., "14:30"
  day_of_week: number[]; // Array of numbers (0=Sun, 1=Mon, ..., 6=Sat)
  effective_date_start: string | null; // DATE string
  effective_date_end: string | null; // DATE string
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// NEW: Interface for AvailableBus (simplified for route linking)
export interface AvailableBus {
  id: string;
  name: string;
  total_capacity: number;
  rental_cost: number;
}