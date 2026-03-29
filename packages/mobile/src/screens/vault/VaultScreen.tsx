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
import { useDocuments, useDeleteDocument } from '../../hooks/useVault';
import type { Document } from '../../services/vault';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return diff > 0 && diff <= thirtyDays;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export default function VaultScreen({ route, navigation }: Props) {
  const tripId: string = route.params?.tripId;
  const { data: documents, isLoading, error } = useDocuments(tripId);
  const deleteMutation = useDeleteDocument(tripId);

  if (error) {
    Alert.alert('Error', (error as Error).message);
  }

  const handleDelete = (doc: Document) => {
    Alert.alert('Delete Document', `Delete "${doc.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(doc.id, {
            onError: (err) => Alert.alert('Error', (err as Error).message),
          }),
      },
    ]);
  };

  const renderItem = ({ item }: { item: Document }) => {
    const expiring = isExpiringSoon(item.expires_at);
    const expired = isExpired(item.expires_at);

    return (
      <TouchableOpacity
        style={styles.card}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>
              {item.doc_type} &middot; {item.file_name}
            </Text>
          </View>
          <View style={styles.badges}>
            {expired && (
              <View style={[styles.badge, styles.badgeExpired]}>
                <Text style={styles.badgeText}>Expired</Text>
              </View>
            )}
            {expiring && !expired && (
              <View style={[styles.badge, styles.badgeExpiring]}>
                <Text style={styles.badgeText}>Expiring</Text>
              </View>
            )}
          </View>
        </View>
        {item.expires_at && (
          <Text style={styles.expiryText}>
            Expires: {new Date(item.expires_at).toLocaleDateString()}
          </Text>
        )}
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
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No documents yet</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('UploadDoc', { tripId })}
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
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeExpiring: { backgroundColor: '#F59E0B' },
  badgeExpired: { backgroundColor: '#EF4444' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  expiryText: { fontSize: 12, color: '#999', marginTop: 6 },
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
