import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTripPayload {
  name: string;
  description?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdateTripPayload {
  name?: string;
  description?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order: number | null;
  day_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItineraryItemPayload {
  title: string;
  description?: string;
  category?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: number;
  day_number?: number;
}

export interface UpdateItineraryItemPayload {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: number;
  day_number?: number;
}

export interface ActivityLogEntry {
  id: string;
  trip_id: string;
  user_id: string;
  action: string;
  details: unknown;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export const tripsApi = {
  createTrip: (payload: CreateTripPayload) =>
    api.post<Trip>('/trips', payload),

  getTrips: () =>
    api.get<Trip[]>('/trips'),

  getTrip: (id: string) =>
    api.get<Trip>(`/trips/${id}`),

  updateTrip: (id: string, payload: UpdateTripPayload) =>
    api.patch<Trip>(`/trips/${id}`, payload),

  getItinerary: (tripId: string) =>
    api.get<ItineraryItem[]>(`/trips/${tripId}/itinerary`),

  addItineraryItem: (tripId: string, payload: CreateItineraryItemPayload) =>
    api.post<ItineraryItem>(`/trips/${tripId}/itinerary`, payload),

  updateItineraryItem: (
    tripId: string,
    itemId: string,
    payload: UpdateItineraryItemPayload,
  ) => api.patch<ItineraryItem>(`/trips/${tripId}/itinerary/${itemId}`, payload),

  deleteItineraryItem: (tripId: string, itemId: string) =>
    api.delete<void>(`/trips/${tripId}/itinerary/${itemId}`),

  getActivityLog: (tripId: string) =>
    api.get<ActivityLogEntry[]>(`/trips/${tripId}/activity`),
};
