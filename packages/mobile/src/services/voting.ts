import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PollOption {
  id: string;
  title: string;
  description?: string;
  vote_count?: number;
}

export interface Poll {
  id: string;
  trip_id: string;
  title: string;
  poll_type: string;
  deadline: string | null;
  status: 'open' | 'resolved';
  created_by: string;
  created_at: string;
  updated_at: string;
  options?: PollOption[];
  my_ballot?: string[];
  winner_option_id?: string | null;
}

export interface CreatePollPayload {
  title: string;
  poll_type: string;
  deadline?: string;
  options: { title: string; description?: string }[];
}

export interface AddOptionPayload {
  title: string;
  description?: string;
}

export interface VoteBallot {
  rankings: string[];
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export function createPoll(tripId: string, payload: CreatePollPayload) {
  return api.post<Poll>(`/trips/${tripId}/polls`, payload);
}

export function listPolls(tripId: string) {
  return api.get<Poll[]>(`/trips/${tripId}/polls`);
}

export function getPoll(tripId: string, pollId: string) {
  return api.get<Poll>(`/trips/${tripId}/polls/${pollId}`);
}

export function addOption(tripId: string, pollId: string, payload: AddOptionPayload) {
  return api.post<PollOption>(`/trips/${tripId}/polls/${pollId}/options`, payload);
}

export function submitVote(tripId: string, pollId: string, ballot: VoteBallot) {
  return api.post<void>(`/trips/${tripId}/polls/${pollId}/vote`, ballot);
}

export function updateVote(tripId: string, pollId: string, ballot: VoteBallot) {
  return api.patch<void>(`/trips/${tripId}/polls/${pollId}/vote`, ballot);
}

export function resolvePoll(tripId: string, pollId: string) {
  return api.post<Poll>(`/trips/${tripId}/polls/${pollId}/resolve`);
}
