import { SupabaseClient } from '@supabase/supabase-js';
import type { Trip, ItineraryItem, ActivityLogEntry } from './types.js';

export class TripRepository {
  constructor(private db: SupabaseClient) {}

  // --- Trips ---

  async createGroup(name: string, createdBy: string): Promise<string> {
    const { data, error } = await this.db
      .from('groups')
      .insert({ name, created_by: createdBy })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async addGroupAdmin(groupId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId, role: 'admin' });
    if (error) throw error;
  }

  async createTrip(
    trip: Omit<Trip, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<Trip> {
    const { data, error } = await this.db
      .from('trips')
      .insert(trip)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getTripsByUser(userId: string): Promise<Trip[]> {
    const { data, error } = await this.db
      .from('trips')
      .select(
        '*, groups!inner(group_members!inner(user_id))',
      )
      .eq('groups.group_members.user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(({ groups: _, ...trip }) => trip) as Trip[];
  }

  async getTripById(tripId: string): Promise<Trip | null> {
    const { data, error } = await this.db
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    if (error) return null;
    return data;
  }

  async updateTrip(
    tripId: string,
    updates: Partial<Omit<Trip, 'id' | 'group_id' | 'created_by' | 'created_at'>>,
  ): Promise<Trip> {
    const { data, error } = await this.db
      .from('trips')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Itinerary ---

  async getItinerary(tripId: string): Promise<ItineraryItem[]> {
    const { data, error } = await this.db
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getItineraryItemsByDay(
    tripId: string,
    dayNumber: number,
  ): Promise<ItineraryItem[]> {
    const { data, error } = await this.db
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .eq('day_number', dayNumber)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createItineraryItem(
    item: Omit<ItineraryItem, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ItineraryItem> {
    const { data, error } = await this.db
      .from('itinerary_items')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getItineraryItem(itemId: string): Promise<ItineraryItem | null> {
    const { data, error } = await this.db
      .from('itinerary_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (error) return null;
    return data;
  }

  async updateItineraryItem(
    itemId: string,
    updates: Partial<Omit<ItineraryItem, 'id' | 'trip_id' | 'created_by' | 'created_at'>>,
  ): Promise<ItineraryItem> {
    const { data, error } = await this.db
      .from('itinerary_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteItineraryItem(itemId: string): Promise<void> {
    const { error } = await this.db
      .from('itinerary_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
  }

  // --- Activity Log ---

  async logActivity(entry: Omit<ActivityLogEntry, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.db.from('activity_log').insert(entry);
    if (error) throw error;
  }

  async getActivityLog(
    tripId: string,
    limit = 50,
    offset = 0,
  ): Promise<ActivityLogEntry[]> {
    const { data, error } = await this.db
      .from('activity_log')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data ?? [];
  }
}
