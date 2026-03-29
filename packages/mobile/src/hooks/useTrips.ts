import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tripsApi,
  CreateTripPayload,
  UpdateTripPayload,
  CreateItineraryItemPayload,
  UpdateItineraryItemPayload,
} from '../services/trips';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const tripKeys = {
  all: ['trips'] as const,
  detail: (id: string) => ['trips', id] as const,
  itinerary: (tripId: string) => ['trips', tripId, 'itinerary'] as const,
  activity: (tripId: string) => ['trips', tripId, 'activity'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: tripsApi.getTrips,
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => tripsApi.getTrip(id),
    enabled: !!id,
  });
}

export function useItinerary(tripId: string) {
  return useQuery({
    queryKey: tripKeys.itinerary(tripId),
    queryFn: () => tripsApi.getItinerary(tripId),
    enabled: !!tripId,
  });
}

export function useActivityLog(tripId: string) {
  return useQuery({
    queryKey: tripKeys.activity(tripId),
    queryFn: () => tripsApi.getActivityLog(tripId),
    enabled: !!tripId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTripPayload) => tripsApi.createTrip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTripPayload }) =>
      tripsApi.updateTrip(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(variables.id) });
    },
  });
}

export function useAddItineraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tripId,
      payload,
    }: {
      tripId: string;
      payload: CreateItineraryItemPayload;
    }) => tripsApi.addItineraryItem(tripId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tripKeys.itinerary(variables.tripId),
      });
    },
  });
}

export function useUpdateItineraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tripId,
      itemId,
      payload,
    }: {
      tripId: string;
      itemId: string;
      payload: UpdateItineraryItemPayload;
    }) => tripsApi.updateItineraryItem(tripId, itemId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tripKeys.itinerary(variables.tripId),
      });
    },
  });
}

export function useDeleteItineraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, itemId }: { tripId: string; itemId: string }) =>
      tripsApi.deleteItineraryItem(tripId, itemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tripKeys.itinerary(variables.tripId),
      });
    },
  });
}
