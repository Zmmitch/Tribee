import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/auth-middleware.js';
import { createUserClient } from '../../shared/supabase.js';
import { VotingService } from './service.js';
import type {
  CreatePollRequest,
  AddOptionRequest,
  SubmitBallotRequest,
} from './types.js';

export async function votingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authGuard);

  app.post<{ Params: { tripId: string }; Body: CreatePollRequest }>(
    '/trips/:tripId/polls',
    async (request, reply) => {
      const service = new VotingService(
        createUserClient(request.accessToken),
      );
      const result = await service.createPoll(
        request.userId,
        request.params.tripId,
        request.body,
      );
      return reply.status(201).send(result);
    },
  );

  app.get<{ Params: { tripId: string } }>(
    '/trips/:tripId/polls',
    async (request) => {
      const service = new VotingService(
        createUserClient(request.accessToken),
      );
      return service.getPollsByTrip(request.params.tripId);
    },
  );

  app.get<{ Params: { tripId: string; id: string } }>(
    '/trips/:tripId/polls/:id',
    async (request) => {
      const service = new VotingService(
        createUserClient(request.accessToken),
      );
      return service.getPollDetail(request.params.id, request.userId);
    },
  );

  app.post<{ Params: { tripId: string; id: string }; Body: AddOptionRequest }>(
    '/trips/:tripId/polls/:id/options',
    async (request, reply) => {
      const service = new VotingService(
        createUserClient(request.accessToken),
      );
      const result = await service.addOption(
        request.userId,
        request.params.id,
        request.body,
      );
      return reply.status(201).send(result);
    },
  );

  app.post<{
    Params: { tripId: string; id: string };
    Body: SubmitBallotRequest;
  }>('/trips/:tripId/polls/:id/vote', async (request, reply) => {
    const service = new VotingService(
      createUserClient(request.accessToken),
    );
    const result = await service.submitVote(
      request.userId,
      request.params.id,
      request.body,
    );
    return reply.status(201).send(result);
  });

  app.put<{
    Params: { tripId: string; id: string };
    Body: SubmitBallotRequest;
  }>('/trips/:tripId/polls/:id/vote', async (request) => {
    const service = new VotingService(
      createUserClient(request.accessToken),
    );
    return service.updateVote(
      request.userId,
      request.params.id,
      request.body,
    );
  });

  app.post<{ Params: { tripId: string; id: string } }>(
    '/trips/:tripId/polls/:id/resolve',
    async (request) => {
      const service = new VotingService(
        createUserClient(request.accessToken),
      );
      return service.resolvePoll(request.userId, request.params.id);
    },
  );
}
