import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAddItineraryItem } from '../../hooks/useTrips';
import { ApiError } from '../../services/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'AddItineraryItem'>;

const CATEGORIES = [
  'transport',
  'accommodation',
  'food',
  'activity',
  'sightseeing',
  'shopping',
  'other',
];

export default function AddItineraryItemScreen({ route, navigation }: Props) {
  const { tripId } = route.params as { tripId: string };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dayNumber, setDayNumber] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const addItem = useAddItineraryItem();

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    setConflictWarning(null);

    const dayNum = dayNumber.trim() ? parseInt(dayNumber.trim(), 10) : undefined;

    addItem.mutate(
      {
        tripId,
        payload: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          category: category || undefined,
          location: location.trim() || undefined,
          start_time: startTime.trim() || undefined,
          end_time: endTime.trim() || undefined,
          day_number: Number.isNaN(dayNum) ? undefined : dayNum,
        },
      },
      {
        onSuccess: (data: any) => {
          if (data?.warning || data?.conflict) {
            setConflictWarning(
              data.warning ?? data.conflict ?? 'Possible schedule conflict.',
            );
          } else {
            navigation.goBack();
          }
        },
        onError: (err) => {
          if (err instanceof ApiError && err.data) {
            const errorData = err.data as Record<string, unknown>;
            if (errorData.conflict || errorData.warning) {
              setConflictWarning(
                String(errorData.conflict ?? errorData.warning),
              );
              return;
            }
          }
          Alert.alert('Error', err.message ?? 'Failed to add item.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {conflictWarning ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>{conflictWarning}</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.warningDismiss}>Dismiss and go back</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Visit the Eiffel Tower"
          autoFocus
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Details about this item"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                category === cat && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(category === cat ? '' : cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Champ de Mars, Paris"
        />

        <Text style={styles.label}>Start Time</Text>
        <TextInput
          style={styles.input}
          value={startTime}
          onChangeText={setStartTime}
          placeholder="HH:MM or YYYY-MM-DD HH:MM"
        />

        <Text style={styles.label}>End Time</Text>
        <TextInput
          style={styles.input}
          value={endTime}
          onChangeText={setEndTime}
          placeholder="HH:MM or YYYY-MM-DD HH:MM"
        />

        <Text style={styles.label}>Day Number</Text>
        <TextInput
          style={styles.input}
          value={dayNumber}
          onChangeText={setDayNumber}
          placeholder="1"
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[styles.button, addItem.isPending && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={addItem.isPending}
        >
          {addItem.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Item</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBanner: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ffb74d',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#e65100',
    marginBottom: 8,
  },
  warningDismiss: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
  },
});
