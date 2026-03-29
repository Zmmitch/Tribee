import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/auth-middleware.js';
import { createUserClient } from '../../shared/supabase.js';
import { TripService } from './service.js';
import type {
  CreateTripRequest,
  UpdateTripRequest,
  CreateItineraryItemRequest,
  UpdateItineraryItemRequest,
} from './types.js';

export async function tripRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authGuard);

  // --- Trips ---

  app.post<{ Body: CreateTripRequest }>(
    '/trips',
    async (request, reply) => {
      const service = new TripService(createUserClient(request.accessToken));
      const trip = await service.createTrip(request.userId, request.body);
      return reply.status(201).send(trip);
    },
  );

  app.get('/trips', async (request) => {
    const service = new TripService(createUserClient(request.accessToken));
    return service.getMyTrips(request.userId);
  });

  app.get<{ Params: { id: string } }>(
    '/trips/:id',
    async (request) => {
      const service = new TripService(createUserClient(request.accessToken));
      return service.getTripById(request.params.id);
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateTripRequest }>(
    '/trips/:id',
    async (request) => {
      const service = new TripService(createUserClient(request.accessToken));
      return service.updateTrip(
        request.userId,
        request.params.id,
        request.body,
      );
    },
  );

  // --- Itinerary ---

  app.get<{ Params: { id: string } }>(
    '/trips/:id/itinerary',
    async (request) => {
      const service = new TripService(createUserClient(request.accessToken));
      return service.getItinerary(request.params.id);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateItineraryItemRequest }>(
    '/trips/:id/itinerary',
    async (request, reply) => {
      const service = new TripService(createUserClient(request.accessToken));
      const result = await service.addItineraryItem(
        request.userId,
        request.params.id,
        request.body,
      );
      return reply.status(201).send(result);
    },
  );

  app.patch<{
    Params: { tripId: string; id: string };
    Body: UpdateItineraryItemRequest;
  }>('/trips/:tripId/itinerary/:id', async (request) => {
    const service = new TripService(createUserClient(request.accessToken));
    return service.updateItineraryItem(
      request.userId,
      request.params.tripId,
      request.params.id,
      request.body,
    );
  });

  app.delete<{ Params: { tripId: string; id: string } }>(
    '/trips/:tripId/itinerary/:id',
    async (request, reply) => {
      const service = new TripService(createUserClient(request.accessToken));
      await service.deleteItineraryItem(
        request.userId,
        request.params.tripId,
        request.params.id,
      );
      return reply.status(204).send();
    },
  );

  // --- Activity Log ---

  app.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>('/trips/:id/activity', async (request) => {
    const service = new TripService(createUserClient(request.accessToken));
    const limit = parseInt(request.query.limit ?? '50', 10);
    const offset = parseInt(request.query.offset ?? '0', 10);
    return service.getActivityLog(request.params.id, limit, offset);
  });
}
