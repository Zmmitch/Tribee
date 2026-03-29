import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { usePoll, useSubmitVote, useUpdateVote, useResolvePoll } from '../../hooks/useVoting';
import type { PollOption } from '../../services/voting';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

export default function PollDetailScreen({ route }: Props) {
  const tripId: string = route.params?.tripId;
  const pollId: string = route.params?.pollId;

  const { data: poll, isLoading } = usePoll(tripId, pollId);
  const submitVoteMutation = useSubmitVote(tripId, pollId);
  const updateVoteMutation = useUpdateVote(tripId, pollId);
  const resolveMutation = useResolvePoll(tripId, pollId);

  const [rankings, setRankings] = useState<string[]>([]);

  const isOpen = poll?.status === 'open';
  const hasVoted = poll?.my_ballot && poll.my_ballot.length > 0;

  const toggleRanking = useCallback(
    (optionId: string) => {
      setRankings((prev) => {
        if (prev.includes(optionId)) {
          return prev.filter((id) => id !== optionId);
        }
        return [...prev, optionId];
      });
    },
    [],
  );

  const handleVote = () => {
    if (rankings.length === 0) {
      Alert.alert('Validation', 'Select at least one option');
      return;
    }

    const ballot = { rankings };
    const mutation = hasVoted ? updateVoteMutation : submitVoteMutation;

    mutation.mutate(ballot, {
      onSuccess: () => {
        Alert.alert('Success', hasVoted ? 'Vote updated' : 'Vote submitted');
        setRankings([]);
      },
      onError: (err) => Alert.alert('Error', (err as Error).message),
    });
  };

  const handleResolve = () => {
    Alert.alert('Resolve Poll', 'Close this poll and tally results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: () =>
          resolveMutation.mutate(undefined, {
            onError: (err) => Alert.alert('Error', (err as Error).message),
          }),
      },
    ]);
  };

  if (isLoading || !poll) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const sortedOptions = [...(poll.options ?? [])].sort(
    (a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0),
  );

  const maxVotes = Math.max(...sortedOptions.map((o) => o.vote_count ?? 0), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{poll.title}</Text>
      <Text style={styles.meta}>
        {poll.poll_type} &middot; {poll.status}
      </Text>
      {poll.deadline && (
        <Text style={styles.deadline}>
          Deadline: {new Date(poll.deadline).toLocaleDateString()}
        </Text>
      )}

      {isOpen && (
        <Text style={styles.sectionTitle}>
          Tap options in your preferred order (1st = best):
        </Text>
      )}

      {sortedOptions.map((option: PollOption) => {
        const rank = rankings.indexOf(option.id);
        const isSelected = rank >= 0;
        const barWidth = poll.status === 'resolved' ? ((option.vote_count ?? 0) / maxVotes) * 100 : 0;

        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionCard, isSelected && styles.optionSelected]}
            onPress={() => isOpen && toggleRanking(option.id)}
            disabled={!isOpen}
          >
            <View style={styles.optionTop}>
              {isSelected && <Text style={styles.rank}>#{rank + 1}</Text>}
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                {option.description ? (
                  <Text style={styles.optionDesc}>{option.description}</Text>
                ) : null}
              </View>
              {poll.status === 'resolved' && (
                <Text style={styles.voteCount}>{option.vote_count ?? 0}</Text>
              )}
            </View>
            {poll.status === 'resolved' && (
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${barWidth}%` }]} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {isOpen && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, (submitVoteMutation.isPending || updateVoteMutation.isPending) && styles.btnDisabled]}
            onPress={handleVote}
            disabled={submitVoteMutation.isPending || updateVoteMutation.isPending}
          >
            {submitVoteMutation.isPending || updateVoteMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {hasVoted ? 'Update Vote' : 'Submit Vote'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resolveBtn, resolveMutation.isPending && styles.btnDisabled]}
            onPress={handleResolve}
            disabled={resolveMutation.isPending}
          >
            <Text style={styles.resolveBtnText}>Resolve Poll</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  meta: { fontSize: 14, color: '#888', marginTop: 4 },
  deadline: { fontSize: 13, color: '#F59E0B', marginTop: 4 },
  sectionTitle: { fontSize: 14, color: '#555', marginTop: 20, marginBottom: 8 },
  optionCard: {
    padding: 14,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  optionTop: { flexDirection: 'row', alignItems: 'center' },
  rank: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
    marginRight: 10,
    minWidth: 28,
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  optionDesc: { fontSize: 12, color: '#777', marginTop: 2 },
  voteCount: { fontSize: 16, fontWeight: '700', color: '#333' },
  barBg: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: '#4F46E5', borderRadius: 3 },
  actions: { marginTop: 24 },
  btn: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resolveBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  resolveBtnText: { color: '#EF4444', fontWeight: '600' },
});
