import { SupabaseClient } from '@supabase/supabase-js';
import type { Poll, PollOption, Ballot, BallotRanking } from './types.js';

export class VotingRepository {
  constructor(private db: SupabaseClient) {}

  // --- Polls ---

  async createPoll(
    poll: Omit<Poll, 'id' | 'resolved_option_id' | 'created_at'>,
  ): Promise<Poll> {
    const { data, error } = await this.db
      .from('polls')
      .insert(poll)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getPollsByTrip(tripId: string): Promise<Poll[]> {
    const { data, error } = await this.db
      .from('polls')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async getPollById(pollId: string): Promise<Poll | null> {
    const { data, error } = await this.db
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .single();
    if (error) return null;
    return data;
  }

  async updatePoll(
    pollId: string,
    updates: Partial<Pick<Poll, 'status' | 'resolved_option_id'>>,
  ): Promise<Poll> {
    const { data, error } = await this.db
      .from('polls')
      .update(updates)
      .eq('id', pollId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Options ---

  async createOptions(
    options: Omit<PollOption, 'id' | 'created_at'>[],
  ): Promise<PollOption[]> {
    const { data, error } = await this.db
      .from('poll_options')
      .insert(options)
      .select();
    if (error) throw error;
    return data ?? [];
  }

  async getOptionsByPoll(pollId: string): Promise<PollOption[]> {
    const { data, error } = await this.db
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async addOption(
    option: Omit<PollOption, 'id' | 'created_at'>,
  ): Promise<PollOption> {
    const { data, error } = await this.db
      .from('poll_options')
      .insert(option)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Ballots ---

  async getBallotsByPoll(pollId: string): Promise<Ballot[]> {
    const { data, error } = await this.db
      .from('ballots')
      .select('*')
      .eq('poll_id', pollId);
    if (error) throw error;
    return data ?? [];
  }

  async getUserBallot(
    pollId: string,
    userId: string,
  ): Promise<Ballot | null> {
    const { data, error } = await this.db
      .from('ballots')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data;
  }

  async createBallot(pollId: string, userId: string): Promise<Ballot> {
    const { data, error } = await this.db
      .from('ballots')
      .insert({ poll_id: pollId, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Rankings ---

  async getRankingsByBallot(ballotId: string): Promise<BallotRanking[]> {
    const { data, error } = await this.db
      .from('ballot_rankings')
      .select('*')
      .eq('ballot_id', ballotId)
      .order('rank', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async getAllRankingsForPoll(
    pollId: string,
  ): Promise<{ ballot_id: string; rankings: BallotRanking[] }[]> {
    const ballots = await this.getBallotsByPoll(pollId);
    const result: { ballot_id: string; rankings: BallotRanking[] }[] = [];

    for (const ballot of ballots) {
      const rankings = await this.getRankingsByBallot(ballot.id);
      result.push({ ballot_id: ballot.id, rankings });
    }

    return result;
  }

  async upsertRankings(
    ballotId: string,
    rankings: { option_id: string; rank: number }[],
  ): Promise<void> {
    // Delete existing rankings, then insert new ones
    const { error: delError } = await this.db
      .from('ballot_rankings')
      .delete()
      .eq('ballot_id', ballotId);
    if (delError) throw delError;

    if (rankings.length > 0) {
      const rows = rankings.map((r) => ({
        ballot_id: ballotId,
        option_id: r.option_id,
        rank: r.rank,
      }));
      const { error } = await this.db
        .from('ballot_rankings')
        .insert(rows);
      if (error) throw error;
    }
  }
}
