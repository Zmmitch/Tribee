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
import { useSettlements, useUpdateSettlement } from '../../hooks/useExpenses';
import type { Settlement } from '../../services/expenses';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  paid: '#3B82F6',
  confirmed: '#10B981',
};

export default function SettlementsScreen({ route }: Props) {
  const tripId: string = route.params?.tripId;
  const { data: settlements, isLoading, error } = useSettlements(tripId);
  const updateMutation = useUpdateSettlement(tripId);

  if (error) {
    Alert.alert('Error', (error as Error).message);
  }

  const handleAction = (settlement: Settlement) => {
    if (settlement.status === 'pending') {
      Alert.alert('Mark as Paid', `Confirm payment of $${settlement.amount.toFixed(2)}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: () =>
            updateMutation.mutate(
              { id: settlement.id, status: 'paid' },
              { onError: (err) => Alert.alert('Error', (err as Error).message) },
            ),
        },
      ]);
    } else if (settlement.status === 'paid') {
      Alert.alert('Confirm Receipt', 'Confirm you received this payment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            updateMutation.mutate(
              { id: settlement.id, status: 'confirmed' },
              { onError: (err) => Alert.alert('Error', (err as Error).message) },
            ),
        },
      ]);
    }
  };

  const renderItem = ({ item }: { item: Settlement }) => {
    const statusColor = STATUS_COLORS[item.status] ?? '#999';
    const actionLabel =
      item.status === 'pending'
        ? 'Mark Paid'
        : item.status === 'paid'
          ? 'Confirm'
          : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.userIds}>
              {item.from_user_id.slice(0, 8)} owes {item.to_user_id.slice(0, 8)}
            </Text>
            <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        {actionLabel && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleAction(item)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text style={styles.actionText}>{actionLabel}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
        data={settlements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No settlements</Text>
        }
      />
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
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  userIds: { fontSize: 14, color: '#555' },
  amount: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  actionBtn: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4F46E5',
    alignItems: 'center',
  },
  actionText: { color: '#4F46E5', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
