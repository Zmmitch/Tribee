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
import { useCreatePoll } from '../../hooks/useVoting';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

const POLL_TYPES = ['single_choice', 'multi_choice', 'ranked', 'approval'];

interface OptionDraft {
  title: string;
  description: string;
}

export default function CreatePollScreen({ route, navigation }: Props) {
  const tripId: string = route.params?.tripId;
  const createMutation = useCreatePoll(tripId);

  const [title, setTitle] = useState('');
  const [pollType, setPollType] = useState('ranked');
  const [deadline, setDeadline] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>([
    { title: '', description: '' },
    { title: '', description: '' },
  ]);

  const updateOption = (index: number, field: keyof OptionDraft, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { title: '', description: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert('Minimum Options', 'A poll needs at least 2 options');
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }

    const validOptions = options.filter((o) => o.title.trim());
    if (validOptions.length < 2) {
      Alert.alert('Validation', 'At least 2 options are required');
      return;
    }

    createMutation.mutate(
      {
        title: title.trim(),
        poll_type: pollType,
        deadline: deadline.trim() || undefined,
        options: validOptions.map((o) => ({
          title: o.title.trim(),
          description: o.description.trim() || undefined,
        })),
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
        placeholder="What should we vote on?"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Poll Type</Text>
      <View style={styles.chipRow}>
        {POLL_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, pollType === t && styles.chipActive]}
            onPress={() => setPollType(t)}
          >
            <Text style={[styles.chipText, pollType === t && styles.chipTextActive]}>
              {t.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Deadline (optional, YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="2026-04-15"
        value={deadline}
        onChangeText={setDeadline}
      />

      <Text style={styles.label}>Options</Text>
      {options.map((opt, idx) => (
        <View key={idx} style={styles.optionRow}>
          <View style={styles.optionInputs}>
            <TextInput
              style={styles.input}
              placeholder={`Option ${idx + 1}`}
              value={opt.title}
              onChangeText={(v) => updateOption(idx, 'title', v)}
            />
            <TextInput
              style={[styles.input, styles.descInput]}
              placeholder="Description (optional)"
              value={opt.description}
              onChangeText={(v) => updateOption(idx, 'description', v)}
            />
          </View>
          <TouchableOpacity style={styles.removeBtn} onPress={() => removeOption(idx)}>
            <Text style={styles.removeBtnText}>X</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addOptionBtn} onPress={addOption}>
        <Text style={styles.addOptionText}>+ Add Option</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Create Poll</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
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
  optionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  optionInputs: { flex: 1, gap: 6 },
  descInput: { fontSize: 14 },
  removeBtn: {
    marginLeft: 8,
    marginTop: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  addOptionBtn: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addOptionText: { color: '#4F46E5', fontWeight: '600' },
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
