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