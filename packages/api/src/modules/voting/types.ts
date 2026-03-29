export interface Poll {
  id: string;
  trip_id: string;
  title: string;
  poll_type: 'destination' | 'activity' | 'date' | 'custom';
  status: 'open' | 'resolved' | 'cancelled';
  deadline: string | null;
  resolved_option_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_by: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface Ballot {
  id: string;
  poll_id: string;
  user_id: string;
  submitted_at: string;
}

export interface BallotRanking {
  id: string;
  ballot_id: string;
  option_id: string;
  rank: number;
}

// --- Request types ---

export interface CreatePollRequest {
  title: string;
  poll_type: Poll['poll_type'];
  deadline?: string;
  budget_min?: number;
  budget_max?: number;
  options: { title: string; description?: string; metadata?: Record<string, unknown> }[];
}

export interface AddOptionRequest {
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitBallotRequest {
  /** option_id in ranked order: index 0 = first choice */
  rankings: string[];
}

// --- Response types ---

export interface PollDetail extends Poll {
  options: PollOption[];
  vote_count: number;
  my_ballot: { rankings: { option_id: string; rank: number }[] } | null;
}
