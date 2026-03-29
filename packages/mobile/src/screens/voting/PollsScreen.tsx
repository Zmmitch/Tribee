import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { usePolls } from '../../hooks/useVoting';
import type { Poll } from '../../services/voting';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

export default function PollsScreen({ route, navigation }: Props) {
  const tripId: string = route.params?.tripId;
  const { data: polls, isLoading, error } = usePolls(tripId);

  if (error) {
    Alert.alert('Error', (error as Error).message);
  }

  const openPolls = polls?.filter((p) => p.status === 'open') ?? [];
  const resolvedPolls = polls?.filter((p) => p.status === 'resolved') ?? [];

  const renderItem = ({ item }: { item: Poll }) => {
    const isOpen = item.status === 'open';
    const deadlineText = item.deadline
      ? `Due ${new Date(item.deadline).toLocaleDateString()}`
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('PollDetail', { tripId, pollId: item.id })
        }
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.poll_type}</Text>
            {deadlineText && <Text style={styles.deadline}>{deadlineText}</Text>}
          </View>
          <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeResolved]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={[...openPolls, ...resolvedPolls]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          openPolls.length > 0 && resolvedPolls.length > 0 ? null : undefined
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No polls yet</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePoll', { tripId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  deadline: { fontSize: 12, color: '#F59E0B', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeOpen: { backgroundColor: '#3B82F6' },
  badgeResolved: { backgroundColor: '#10B981' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
