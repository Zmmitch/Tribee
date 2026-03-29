import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTrip } from '../../hooks/useTrips';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'TripDashboard'>;

interface NavButtonProps {
  label: string;
  onPress: () => void;
}

function NavButton({ label, onPress }: NavButtonProps) {
  return (
    <TouchableOpacity style={styles.navButton} onPress={onPress}>
      <Text style={styles.navButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TripDashboardScreen({ route, navigation }: Props) {
  const { tripId } = route.params as { tripId: string };
  const { data: trip, isLoading, error } = useTrip(tripId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load trip details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.tripName}>{trip.name}</Text>
        {trip.destination ? (
          <Text style={styles.destination}>{trip.destination}</Text>
        ) : null}
        {(trip.start_date || trip.end_date) ? (
          <Text style={styles.dates}>
            {trip.start_date && trip.end_date
              ? `${trip.start_date} - ${trip.end_date}`
              : trip.start_date ?? trip.end_date}
          </Text>
        ) : null}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{trip.status ?? 'planning'}</Text>
        </View>
        {trip.description ? (
          <Text style={styles.description}>{trip.description}</Text>
        ) : null}
      </View>

      <View style={styles.navGrid}>
        <NavButton
          label="Itinerary"
          onPress={() => navigation.navigate('Itinerary', { tripId })}
        />
        <NavButton
          label="Polls"
          onPress={() => navigation.navigate('Polls', { tripId })}
        />
        <NavButton
          label="Expenses"
          onPress={() => navigation.navigate('Expenses', { tripId })}
        />
        <NavButton
          label="Vault"
          onPress={() => navigation.navigate('Vault', { tripId })}
        />
        <NavButton
          label="Members"
          onPress={() => navigation.navigate('Members', { tripId })}
        />
        <NavButton
          label="Activity"
          onPress={() => navigation.navigate('Itinerary', { tripId })}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tripName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  destination: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  dates: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  navButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
});
