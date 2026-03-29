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
import { useExpenses, useBalances, useDeleteExpense } from '../../hooks/useExpenses';
import type { Expense } from '../../services/expenses';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

export default function ExpensesScreen({ route, navigation }: Props) {
  const tripId: string = route.params?.tripId;
  const { data: expenses, isLoading, error } = useExpenses(tripId);
  const { data: balances } = useBalances(tripId);
  const deleteMutation = useDeleteExpense(tripId);

  const totalSpent = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  const handleDelete = (expense: Expense) => {
    Alert.alert('Delete Expense', `Delete "${expense.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(expense.id, {
            onError: (err) => Alert.alert('Error', (err as Error).message),
          }),
      },
    ]);
  };

  if (error) {
    Alert.alert('Error', (error as Error).message);
  }

  const renderItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={styles.card}
      onLongPress={() => handleDelete(item)}
      onPress={() => {}}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.category ? (
            <Text style={styles.cardSub}>{item.category}</Text>
          ) : null}
        </View>
        <Text style={styles.cardAmount}>${item.amount.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total Spent</Text>
        <Text style={styles.summaryValue}>${totalSpent.toFixed(2)}</Text>
      </View>

      {balances && balances.length > 0 && (
        <TouchableOpacity
          style={styles.settlementsBtn}
          onPress={() => navigation.navigate('Settlements', { tripId })}
        >
          <Text style={styles.settlementsBtnText}>View Settlements</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No expenses yet</Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { tripId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  summary: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 32, fontWeight: '700', marginTop: 4 },
  settlementsBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  settlementsBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
  loader: { marginTop: 40 },
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
  cardAmount: { fontSize: 18, fontWeight: '700' },
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
