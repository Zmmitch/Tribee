import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPolls,
  getPoll,
  createPoll,
  addOption,
  submitVote,
  updateVote,
  resolvePoll,
  CreatePollPayload,
  AddOptionPayload,
  VoteBallot,
} from '../services/voting';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  polls: (tripId: string) => ['trips', tripId, 'polls'] as const,
  poll: (tripId: string, id: string) => ['trips', tripId, 'polls', id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function usePolls(tripId: string) {
  return useQuery({
    queryKey: keys.polls(tripId),
    queryFn: () => listPolls(tripId),
  });
}

export function usePoll(tripId: string, pollId: string) {
  return useQuery({
    queryKey: keys.poll(tripId, pollId),
    queryFn: () => getPoll(tripId, pollId),
    enabled: !!pollId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreatePoll(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePollPayload) => createPoll(tripId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.polls(tripId) });
    },
  });
}

export function useAddOption(tripId: string, pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddOptionPayload) => addOption(tripId, pollId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.poll(tripId, pollId) });
    },
  });
}

export function useSubmitVote(tripId: string, pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ballot: VoteBallot) => submitVote(tripId, pollId, ballot),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.poll(tripId, pollId) });
    },
  });
}

export function useUpdateVote(tripId: string, pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ballot: VoteBallot) => updateVote(tripId, pollId, ballot),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.poll(tripId, pollId) });
    },
  });
}

export function useResolvePoll(tripId: string, pollId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => resolvePoll(tripId, pollId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.polls(tripId) });
      qc.invalidateQueries({ queryKey: keys.poll(tripId, pollId) });
    },
  });
}
