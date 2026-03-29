import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../shared/supabase.js';
import { eventBus } from '../../shared/event-bus.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../shared/errors.js';
import { TripRepository } from './repository.js';
import { TripEvents } from './events.js';
import { detectConflicts } from './conflict-detector.js';
import type {
  Trip,
  ItineraryItem,
  Conflict,
  CreateTripRequest,
  UpdateTripRequest,
  CreateItineraryItemRequest,
  UpdateItineraryItemRequest,
} from './types.js';

export class TripService {
  private repo: TripRepository;
  private adminRepo: TripRepository;

  constructor(userClient: SupabaseClient) {
    this.repo = new TripRepository(userClient);
    this.adminRepo = new TripRepository(supabaseAdmin);
  }

  // --- Trips ---

  async createTrip(
    userId: string,
    req: CreateTripRequest,
  ): Promise<Trip> {
    // Use admin client for the group+member creation (bypasses RLS bootstrap issue)
    const groupName = req.group_name ?? req.name;
    const groupId = await this.adminRepo.createGroup(groupName, userId);
    await this.adminRepo.addGroupAdmin(groupId, userId);

    const trip = await this.adminRepo.createTrip({
      group_id: groupId,
      name: req.name,
      description: req.description ?? null,
      destination: req.destination ?? null,
      start_date: req.start_date ?? null,
      end_date: req.end_date ?? null,
      currency: req.currency ?? 'USD',
      status: 'planning',
      created_by: userId,
    });

    await this.adminRepo.logActivity({
      trip_id: trip.id,
      user_id: userId,
      action: 'trip_created',
      entity_type: 'trip',
      entity_id: trip.id,
      metadata: { name: trip.name },
    });

    eventBus.emit(TripEvents.TRIP_CREATED, { trip, userId });
    return trip;
  }

  async getMyTrips(userId: string): Promise<Trip[]> {
    return this.repo.getTripsByUser(userId);
  }

  async getTripById(tripId: string): Promise<Trip> {
    const trip = await this.repo.getTripById(tripId);
    if (!trip) throw new NotFoundError('Trip', tripId);
    return trip;
  }

  async updateTrip(
    userId: string,
    tripId: string,
    req: UpdateTripRequest,
  ): Promise<Trip> {
    const trip = await this.repo.getTripById(tripId);
    if (!trip) throw new NotFoundError('Trip', tripId);

    const updated = await this.repo.updateTrip(tripId, req);

    await this.repo.logActivity({
      trip_id: tripId,
      user_id: userId,
      action: 'trip_updated',
      entity_type: 'trip',
      entity_id: tripId,
      metadata: { changes: Object.keys(req) },
    });

    eventBus.emit(TripEvents.TRIP_UPDATED, { trip: updated, userId });
    return updated;
  }

  // --- Itinerary ---

  async getItinerary(tripId: string): Promise<ItineraryItem[]> {
    // Verify trip access (RLS will enforce, but gives a better 404)
    await this.getTripById(tripId);
    return this.repo.getItinerary(tripId);
  }

  async addItineraryItem(
    userId: string,
    tripId: string,
    req: CreateItineraryItemRequest,
  ): Promise<{ item: ItineraryItem; conflicts: Conflict[] }> {
    await this.getTripById(tripId);

    const item = await this.repo.createItineraryItem({
      trip_id: tripId,
      title: req.title,
      description: req.description ?? null,
      category: req.category ?? null,
      location: req.location ?? null,
      start_time: req.start_time ?? null,
      end_time: req.end_time ?? null,
      sort_order: req.sort_order ?? 0,
      day_number: req.day_number ?? null,
      created_by: userId,
    });

    let conflicts: Conflict[] = [];
    if (item.start_time && item.end_time && item.day_number) {
      const sameDayItems = await this.repo.getItineraryItemsByDay(
        tripId,
        item.day_number,
      );
      conflicts = detectConflicts(sameDayItems, item.start_time, item.end_time, item.id);
    }

    await this.repo.logActivity({
      trip_id: tripId,
      user_id: userId,
      action: 'itinerary_item_added',
      entity_type: 'itinerary_item',
      entity_id: item.id,
      metadata: { title: item.title },
    });

    eventBus.emit(TripEvents.ITEM_ADDED, { item, userId });
    return { item, conflicts };
  }

  async updateItineraryItem(
    userId: string,
    tripId: string,
    itemId: string,
    req: UpdateItineraryItemRequest,
  ): Promise<{ item: ItineraryItem; conflicts: Conflict[] }> {
    const existing = await this.repo.getItineraryItem(itemId);
    if (!existing || existing.trip_id !== tripId) {
      throw new NotFoundError('Itinerary item', itemId);
    }

    const item = await this.repo.updateItineraryItem(itemId, req);

    let conflicts: Conflict[] = [];
    const startTime = item.start_time;
    const endTime = item.end_time;
    const dayNumber = item.day_number;

    if (startTime && endTime && dayNumber) {
      const sameDayItems = await this.repo.getItineraryItemsByDay(
        tripId,
        dayNumber,
      );
      conflicts = detectConflicts(sameDayItems, startTime, endTime, item.id);
    }

    await this.repo.logActivity({
      trip_id: tripId,
      user_id: userId,
      action: 'itinerary_item_updated',
      entity_type: 'itinerary_item',
      entity_id: item.id,
      metadata: { changes: Object.keys(req) },
    });

    eventBus.emit(TripEvents.ITEM_UPDATED, { item, userId });
    return { item, conflicts };
  }

  async deleteItineraryItem(
    userId: string,
    tripId: string,
    itemId: string,
  ): Promise<void> {
    const item = await this.repo.getItineraryItem(itemId);
    if (!item || item.trip_id !== tripId) {
      throw new NotFoundError('Itinerary item', itemId);
    }

    await this.repo.deleteItineraryItem(itemId);

    await this.repo.logActivity({
      trip_id: tripId,
      user_id: userId,
      action: 'itinerary_item_removed',
      entity_type: 'itinerary_item',
      entity_id: itemId,
      metadata: { title: item.title },
    });

    eventBus.emit(TripEvents.ITEM_REMOVED, { itemId, tripId, userId });
  }

  // --- Activity ---

  async getActivityLog(tripId: string, limit = 50, offset = 0) {
    await this.getTripById(tripId);
    return this.repo.getActivityLog(tripId, limit, offset);
  }
}
