import React from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useItinerary } from '../../hooks/useTrips';
import type { ItineraryItem } from '../../services/trips';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Itinerary'>;

interface Section {
  title: string;
  data: ItineraryItem[];
}

function groupByDay(items: ItineraryItem[]): Section[] {
  const grouped = new Map<number, ItineraryItem[]>();

  for (const item of items) {
    const day = item.day_number ?? 0;
    const existing = grouped.get(day) ?? [];
    existing.push(item);
    grouped.set(day, existing);
  }

  const sorted = Array.from(grouped.entries()).sort(([a], [b]) => a - b);

  return sorted.map(([day, data]) => ({
    title: day === 0 ? 'Unscheduled' : `Day ${day}`,
    data: data.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

function formatTime(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? '';
}

function ItemCard({ item }: { item: ItineraryItem }) {
  const timeStr = formatTime(item.start_time, item.end_time);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        ) : null}
      </View>
      {timeStr ? <Text style={styles.timeText}>{timeStr}</Text> : null}
      {item.location ? <Text style={styles.locationText}>{item.location}</Text> : null}
      {item.description ? (
        <Text style={styles.descText} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </View>
  );
}

export default function ItineraryScreen({ route, navigation }: Props) {
  const { tripId } = route.params as { tripId: string };
  const { data: items, isLoading, error, refetch, isRefetching } = useItinerary(tripId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load itinerary</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections = groupByDay(items ?? []);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ItemCard item={item} />}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        contentContainerStyle={
          sections.length === 0 ? styles.center : styles.list
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No itinerary items yet.</Text>
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddItineraryItem', { tripId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#7b1fa2',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 13,
    color: '#2196F3',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  descText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 30,
  },
});
