import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../packages/api/src/modules/trips/conflict-detector.js';
import type { ItineraryItem } from '../packages/api/src/modules/trips/types.js';

/**
 * Build a mock ItineraryItem with sensible defaults.
 * Only override the fields you care about per test.
 */
function buildItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: 'item-1',
    trip_id: 'trip-1',
    title: 'Default Activity',
    description: null,
    category: 'activity',
    location: null,
    start_time: null,
    end_time: null,
    sort_order: 0,
    day_number: 1,
    created_by: 'user-1',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

describe('detectConflicts', () => {
  const NEW_START = '2026-04-01T10:00:00Z';
  const NEW_END = '2026-04-01T12:00:00Z';

  describe('when there are no existing items', () => {
    it('should return an empty array', () => {
      const result = detectConflicts([], NEW_START, NEW_END);
      expect(result).toEqual([]);
    });
  });

  describe('when existing items do not overlap', () => {
    it('should return no conflicts for an item entirely before the new range', () => {
      const existing = [
        buildItem({
          id: 'before',
          title: 'Morning Yoga',
          start_time: '2026-04-01T07:00:00Z',
          end_time: '2026-04-01T08:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toEqual([]);
    });

    it('should return no conflicts for an item entirely after the new range', () => {
      const existing = [
        buildItem({
          id: 'after',
          title: 'Dinner',
          start_time: '2026-04-01T18:00:00Z',
          end_time: '2026-04-01T20:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toEqual([]);
    });
  });

  describe('when there is a full overlap with identical times', () => {
    it('should return a conflict for an item with the exact same start and end', () => {
      const existing = [
        buildItem({
          id: 'same-time',
          title: 'Museum Visit',
          start_time: NEW_START,
          end_time: NEW_END,
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        item_id: 'same-time',
        title: 'Museum Visit',
        start_time: NEW_START,
        end_time: NEW_END,
      });
    });
  });

  describe('when there is a partial overlap at the start', () => {
    it('should detect a conflict when the new item starts during an existing item', () => {
      const existing = [
        buildItem({
          id: 'overlap-start',
          title: 'City Tour',
          start_time: '2026-04-01T09:00:00Z',
          end_time: '2026-04-01T11:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(1);
      expect(result[0].item_id).toBe('overlap-start');
    });
  });

  describe('when there is a partial overlap at the end', () => {
    it('should detect a conflict when the new item ends during an existing item', () => {
      const existing = [
        buildItem({
          id: 'overlap-end',
          title: 'Lunch Reservation',
          start_time: '2026-04-01T11:00:00Z',
          end_time: '2026-04-01T13:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(1);
      expect(result[0].item_id).toBe('overlap-end');
    });
  });

  describe('when the new item fully contains an existing item', () => {
    it('should detect a conflict when the existing item is entirely within the new range', () => {
      const existing = [
        buildItem({
          id: 'contained',
          title: 'Quick Coffee',
          start_time: '2026-04-01T10:30:00Z',
          end_time: '2026-04-01T11:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(1);
      expect(result[0].item_id).toBe('contained');
    });
  });

  describe('when the existing item fully contains the new item', () => {
    it('should detect a conflict when the new range is entirely within an existing item', () => {
      const existing = [
        buildItem({
          id: 'container',
          title: 'All-Day Workshop',
          start_time: '2026-04-01T08:00:00Z',
          end_time: '2026-04-01T17:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(1);
      expect(result[0].item_id).toBe('container');
    });
  });

  describe('when items are adjacent but not overlapping', () => {
    it('should not detect a conflict when an existing item ends exactly when the new one starts', () => {
      const existing = [
        buildItem({
          id: 'adjacent-before',
          title: 'Breakfast',
          start_time: '2026-04-01T08:00:00Z',
          end_time: NEW_START, // ends at 10:00, new starts at 10:00
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toEqual([]);
    });

    it('should not detect a conflict when an existing item starts exactly when the new one ends', () => {
      const existing = [
        buildItem({
          id: 'adjacent-after',
          title: 'Lunch',
          start_time: NEW_END, // starts at 12:00, new ends at 12:00
          end_time: '2026-04-01T13:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toEqual([]);
    });
  });

  describe('when multiple items conflict', () => {
    it('should return all conflicting items', () => {
      const existing = [
        buildItem({
          id: 'conflict-1',
          title: 'Meeting A',
          start_time: '2026-04-01T09:30:00Z',
          end_time: '2026-04-01T10:30:00Z',
        }),
        buildItem({
          id: 'no-conflict',
          title: 'Evening Plans',
          start_time: '2026-04-01T19:00:00Z',
          end_time: '2026-04-01T21:00:00Z',
        }),
        buildItem({
          id: 'conflict-2',
          title: 'Meeting B',
          start_time: '2026-04-01T11:30:00Z',
          end_time: '2026-04-01T12:30:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(2);

      const conflictIds = result.map((c) => c.item_id);
      expect(conflictIds).toContain('conflict-1');
      expect(conflictIds).toContain('conflict-2');
      expect(conflictIds).not.toContain('no-conflict');
    });
  });

  describe('when excludeItemId is provided', () => {
    it('should not include the excluded item in results even if it overlaps', () => {
      const existing = [
        buildItem({
          id: 'excluded',
          title: 'Self',
          start_time: NEW_START,
          end_time: NEW_END,
        }),
        buildItem({
          id: 'other-conflict',
          title: 'Other Event',
          start_time: '2026-04-01T10:30:00Z',
          end_time: '2026-04-01T11:30:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END, 'excluded');
      expect(result).toHaveLength(1);
      expect(result[0].item_id).toBe('other-conflict');
    });

    it('should return no conflicts when the only overlapping item is excluded', () => {
      const existing = [
        buildItem({
          id: 'only-one',
          title: 'The Only Event',
          start_time: NEW_START,
          end_time: NEW_END,
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END, 'only-one');
      expect(result).toEqual([]);
    });
  });

  describe('when items are missing start or end times', () => {
    it('should skip items that have no start_time', () => {
      const existing = [
        buildItem({
          id: 'no-start',
          title: 'Flexible Event',
          start_time: null,
          end_time: '2026-04-01T11:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toEqual([]);
    });

    it('should skip items that have no end_time', () => {
      const existing = [
        buildItem({
          id: 'no-end',
          title: 'Open-Ended Event',
          start_time: '2026-04-01T10:30:00Z',
          end_time: null,
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toEqual([]);
    });

    it('should skip items that have neither start_time nor end_time', () => {
      const existing = [
        buildItem({
          id: 'no-times',
          title: 'Unscheduled Task',
          start_time: null,
          end_time: null,
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toEqual([]);
    });

    it('should still detect conflicts among items that do have times', () => {
      const existing = [
        buildItem({
          id: 'no-times',
          title: 'Unscheduled',
          start_time: null,
          end_time: null,
        }),
        buildItem({
          id: 'has-times',
          title: 'Scheduled Event',
          start_time: '2026-04-01T10:30:00Z',
          end_time: '2026-04-01T11:30:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(1);
      expect(result[0].item_id).toBe('has-times');
    });
  });

  describe('conflict return shape', () => {
    it('should return objects with item_id, title, start_time, and end_time', () => {
      const existing = [
        buildItem({
          id: 'shape-check',
          title: 'Shape Test Event',
          start_time: '2026-04-01T09:00:00Z',
          end_time: '2026-04-01T11:00:00Z',
        }),
      ];

      const result = detectConflicts(existing, NEW_START, NEW_END);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        item_id: 'shape-check',
        title: 'Shape Test Event',
        start_time: '2026-04-01T09:00:00Z',
        end_time: '2026-04-01T11:00:00Z',
      });
    });
  });
});
