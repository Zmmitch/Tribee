export interface Trip {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  currency: string;
  status: 'planning' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  category: 'transport' | 'accommodation' | 'activity' | 'food' | 'other' | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  day_number: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  trip_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Conflict {
  item_id: string;
  title: string;
  start_time: string;
  end_time: string;
}

// --- Request types ---

export interface CreateTripRequest {
  name: string;
  description?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  currency?: string;
  group_name?: string;
}

export interface UpdateTripRequest {
  name?: string;
  description?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  status?: Trip['status'];
}

export interface CreateItineraryItemRequest {
  title: string;
  description?: string;
  category?: ItineraryItem['category'];
  location?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: number;
  day_number?: number;
}

export interface UpdateItineraryItemRequest {
  title?: string;
  description?: string;
  category?: ItineraryItem['category'];
  location?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: number;
  day_number?: number;
}
