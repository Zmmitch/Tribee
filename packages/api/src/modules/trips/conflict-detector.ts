import type { ItineraryItem, Conflict } from './types.js';

/**
 * Finds itinerary items that overlap in time with the given time range.
 * Only checks items on the same day_number.
 * Returns overlapping items as warnings (not blockers).
 */
export function detectConflicts(
  existing: ItineraryItem[],
  startTime: string,
  endTime: string,
  excludeItemId?: string,
): Conflict[] {
  const newStart = new Date(startTime).getTime();
  const newEnd = new Date(endTime).getTime();

  return existing
    .filter((item) => {
      if (item.id === excludeItemId) return false;
      if (!item.start_time || !item.end_time) return false;

      const existingStart = new Date(item.start_time).getTime();
      const existingEnd = new Date(item.end_time).getTime();

      return existingStart < newEnd && existingEnd > newStart;
    })
    .map((item) => ({
      item_id: item.id,
      title: item.title,
      start_time: item.start_time!,
      end_time: item.end_time!,
    }));
}
