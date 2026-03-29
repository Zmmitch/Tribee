import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useCreateDocument } from '../../hooks/useVault';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

const DOC_TYPES = ['passport', 'visa', 'ticket', 'booking', 'insurance', 'itinerary', 'other'];

export default function UploadDocScreen({ route, navigation }: Props) {
  const tripId: string = route.params?.tripId;
  const createMutation = useCreateDocument(tripId);

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('other');
  const [fileName, setFileName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    if (!fileName.trim()) {
      Alert.alert('Validation', 'File name is required');
      return;
    }

    createMutation.mutate(
      {
        title: title.trim(),
        doc_type: docType,
        file_name: fileName.trim(),
        expires_at: expiresAt.trim() || undefined,
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: (err) => Alert.alert('Error', (err as Error).message),
      },
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. My Passport"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Document Type</Text>
      <View style={styles.chipRow}>
        {DOC_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, docType === t && styles.chipActive]}
            onPress={() => setDocType(t)}
          >
            <Text style={[styles.chipText, docType === t && styles.chipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>File Name</Text>
      <TextInput
        style={styles.input}
        placeholder="passport_scan.pdf"
        value={fileName}
        onChangeText={setFileName}
      />

      <Text style={styles.label}>Expires At (optional, YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="2027-01-15"
        value={expiresAt}
        onChangeText={setExpiresAt}
      />

      <TouchableOpacity
        style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Upload Document</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  chipActive: { backgroundColor: '#4F46E5' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    marginTop: 32,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
