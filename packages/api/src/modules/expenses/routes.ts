import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/auth-middleware.js';
import { createUserClient } from '../../shared/supabase.js';
import { ExpenseService } from './service.js';
import type {
  CreateExpenseRequest,
  UpdateExpenseRequest,
  UpdateSettlementRequest,
} from './types.js';

export async function expenseRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authGuard);

  // Helper: fetch trip to get group_id
  async function getTripGroupId(
    service: ExpenseService,
    tripId: string,
  ): Promise<string> {
    // We need the trip's group_id for settlement recalculation.
    // Use the user client via supabase to fetch the trip directly.
    const { createUserClient: _ } = await import('../../shared/supabase.js');
    const { supabaseAdmin } = await import('../../shared/supabase.js');
    const { data } = await supabaseAdmin
      .from('trips')
      .select('group_id')
      .eq('id', tripId)
      .single();
    return data?.group_id ?? '';
  }

  app.post<{ Params: { tripId: string }; Body: CreateExpenseRequest }>(
    '/trips/:tripId/expenses',
    async (request, reply) => {
      const service = new ExpenseService(
        createUserClient(request.accessToken),
      );
      const groupId = await getTripGroupId(service, request.params.tripId);
      const result = await service.createExpense(
        request.userId,
        request.params.tripId,
        groupId,
        request.body,
      );
      return reply.status(201).send(result);
    },
  );

  app.get<{ Params: { tripId: string } }>(
    '/trips/:tripId/expenses',
    async (request) => {
      const service = new ExpenseService(
        createUserClient(request.accessToken),
      );
      return service.getExpenses(request.params.tripId);
    },
  );

  app.get<{ Params: { tripId: string; id: string } }>(
    '/trips/:tripId/expenses/:id',
    async (request) => {
      const service = new ExpenseService(
        createUserClient(request.accessToken),
      );
      return service.getExpenseDetail(request.params.id);
    },
  );

  app.patch<{
    Params: { tripId: string; id: string };
    Body: UpdateExpenseRequest;
  }>('/trips/:tripId/expenses/:id', async (request) => {
    const service = new ExpenseService(
      createUserClient(request.accessToken),
    );
    const groupId = await getTripGroupId(service, request.params.tripId);
    return service.updateExpense(
      request.userId,
      request.params.id,
      request.params.tripId,
      groupId,
      request.body,
    );
  });

  app.delete<{ Params: { tripId: string; id: string } }>(
    '/trips/:tripId/expenses/:id',
    async (request, reply) => {
      const service = new ExpenseService(
        createUserClient(request.accessToken),
      );
      const groupId = await getTripGroupId(service, request.params.tripId);
      await service.deleteExpense(
        request.userId,
        request.params.id,
        request.params.tripId,
        groupId,
      );
      return reply.status(204).send();
    },
  );

  app.get<{ Params: { tripId: string } }>(
    '/trips/:tripId/balances',
    async (request) => {
      const service = new ExpenseService(
        createUserClient(request.accessToken),
      );
      return service.getBalances(request.params.tripId);
    },
  );

  app.get<{ Params: { tripId: string } }>(
    '/trips/:tripId/settlements',
    async (request) => {
      const service = new ExpenseService(
        createUserClient(request.accessToken),
      );
      return service.getSettlements(request.params.tripId);
    },
  );

  app.patch<{
    Params: { tripId: string; id: string };
    Body: UpdateSettlementRequest;
  }>('/trips/:tripId/settlements/:id', async (request) => {
    const service = new ExpenseService(
      createUserClient(request.accessToken),
    );
    return service.updateSettlement(
      request.userId,
      request.params.id,
      request.body,
    );
  });
}
