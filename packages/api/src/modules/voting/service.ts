import { SupabaseClient } from '@supabase/supabase-js';
import { eventBus } from '../../shared/event-bus.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors.js';
import { VotingRepository } from './repository.js';
import { VotingEvents } from './events.js';
import { resolveRankedChoice } from './ranked-choice.js';
import type {
  Poll,
  PollDetail,
  CreatePollRequest,
  AddOptionRequest,
  SubmitBallotRequest,
} from './types.js';

export class VotingService {
  private repo: VotingRepository;

  constructor(userClient: SupabaseClient) {
    this.repo = new VotingRepository(userClient);
  }

  private assertPollOpen(poll: Poll): void {
    if (poll.status !== 'open') {
      throw new BadRequestError('Poll is not open');
    }
    if (poll.deadline && new Date(poll.deadline) < new Date()) {
      throw new BadRequestError('Poll deadline has passed');
    }
  }

  async createPoll(
    userId: string,
    tripId: string,
    req: CreatePollRequest,
  ): Promise<PollDetail> {
    if (req.options.length < 2) {
      throw new BadRequestError('Poll requires at least 2 options');
    }

    const poll = await this.repo.createPoll({
      trip_id: tripId,
      title: req.title,
      poll_type: req.poll_type,
      status: 'open',
      deadline: req.deadline ?? null,
      budget_min: req.budget_min ?? null,
      budget_max: req.budget_max ?? null,
      created_by: userId,
    });

    const options = await this.repo.createOptions(
      req.options.map((o) => ({
        poll_id: poll.id,
        title: o.title,
        description: o.description ?? null,
        metadata: o.metadata ?? {},
        created_by: userId,
      })),
    );

    eventBus.emit(VotingEvents.POLL_CREATED, { poll, userId });

    return {
      ...poll,
      options,
      vote_count: 0,
      my_ballot: null,
    };
  }

  async getPollsByTrip(tripId: string): Promise<Poll[]> {
    return this.repo.getPollsByTrip(tripId);
  }

  async getPollDetail(
    pollId: string,
    userId: string,
  ): Promise<PollDetail> {
    const poll = await this.repo.getPollById(pollId);
    if (!poll) throw new NotFoundError('Poll', pollId);

    const options = await this.repo.getOptionsByPoll(pollId);
    const ballots = await this.repo.getBallotsByPoll(pollId);
    const myBallot = await this.repo.getUserBallot(pollId, userId);

    let myRankings: { option_id: string; rank: number }[] | null = null;
    if (myBallot) {
      const rankings = await this.repo.getRankingsByBallot(myBallot.id);
      myRankings = rankings.map((r) => ({
        option_id: r.option_id,
        rank: r.rank,
      }));
    }

    return {
      ...poll,
      options,
      vote_count: ballots.length,
      my_ballot: myRankings ? { rankings: myRankings } : null,
    };
  }

  async addOption(
    userId: string,
    pollId: string,
    req: AddOptionRequest,
  ): Promise<PollDetail> {
    const poll = await this.repo.getPollById(pollId);
    if (!poll) throw new NotFoundError('Poll', pollId);
    this.assertPollOpen(poll);

    await this.repo.addOption({
      poll_id: pollId,
      title: req.title,
      description: req.description ?? null,
      metadata: req.metadata ?? {},
      created_by: userId,
    });

    eventBus.emit(VotingEvents.OPTION_ADDED, { pollId, userId });
    return this.getPollDetail(pollId, userId);
  }

  async submitVote(
    userId: string,
    pollId: string,
    req: SubmitBallotRequest,
  ): Promise<PollDetail> {
    const poll = await this.repo.getPollById(pollId);
    if (!poll) throw new NotFoundError('Poll', pollId);
    this.assertPollOpen(poll);

    // Check if user already voted
    const existing = await this.repo.getUserBallot(pollId, userId);
    if (existing) {
      throw new BadRequestError(
        'Already voted. Use PUT to update your ballot.',
      );
    }

    const ballot = await this.repo.createBallot(pollId, userId);
    const rankings = req.rankings.map((optionId, idx) => ({
      option_id: optionId,
      rank: idx + 1,
    }));
    await this.repo.upsertRankings(ballot.id, rankings);

    eventBus.emit(VotingEvents.VOTE_SUBMITTED, { pollId, userId });
    return this.getPollDetail(pollId, userId);
  }

  async updateVote(
    userId: string,
    pollId: string,
    req: SubmitBallotRequest,
  ): Promise<PollDetail> {
    const poll = await this.repo.getPollById(pollId);
    if (!poll) throw new NotFoundError('Poll', pollId);
    this.assertPollOpen(poll);

    const ballot = await this.repo.getUserBallot(pollId, userId);
    if (!ballot) {
      throw new BadRequestError('No existing ballot to update. Use POST first.');
    }

    const rankings = req.rankings.map((optionId, idx) => ({
      option_id: optionId,
      rank: idx + 1,
    }));
    await this.repo.upsertRankings(ballot.id, rankings);

    eventBus.emit(VotingEvents.VOTE_UPDATED, { pollId, userId });
    return this.getPollDetail(pollId, userId);
  }

  async resolvePoll(
    userId: string,
    pollId: string,
  ): Promise<PollDetail> {
    const poll = await this.repo.getPollById(pollId);
    if (!poll) throw new NotFoundError('Poll', pollId);
    if (poll.status !== 'open') {
      throw new BadRequestError('Poll is not open');
    }

    const options = await this.repo.getOptionsByPoll(pollId);
    const ballotData = await this.repo.getAllRankingsForPoll(pollId);

    const winnerId = resolveRankedChoice(
      ballotData.map((b) => ({
        rankings: b.rankings.map((r) => ({
          option_id: r.option_id,
          rank: r.rank,
        })),
      })),
      options.map((o) => o.id),
    );

    await this.repo.updatePoll(pollId, {
      status: 'resolved',
      resolved_option_id: winnerId,
    });

    eventBus.emit(VotingEvents.POLL_RESOLVED, {
      pollId,
      winnerId,
      userId,
    });

    return this.getPollDetail(pollId, userId);
  }
}
