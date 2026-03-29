import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/auth-middleware.js';
import { createUserClient, supabaseAdmin } from '../../shared/supabase.js';
import { VaultService } from './service.js';
import type { CreateDocumentRequest, ShareDocumentRequest } from './types.js';

export async function vaultRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authGuard);

  app.post<{ Params: { tripId: string }; Body: CreateDocumentRequest }>(
    '/trips/:tripId/documents',
    async (request, reply) => {
      const service = new VaultService(
        createUserClient(request.accessToken),
      );

      // Upload file to Supabase Storage using admin client
      // The client sends the file separately; here we receive metadata
      // and a pre-uploaded storage_path from the mobile client.
      const storagePath = `${request.params.tripId}/${request.userId}/${Date.now()}_${request.body.file_name}`;

      const doc = await service.uploadDocument(
        request.userId,
        request.params.tripId,
        storagePath,
        request.body,
      );
      return reply.status(201).send(doc);
    },
  );

  app.get<{
    Params: { tripId: string };
    Querystring: { expiring?: string };
  }>('/trips/:tripId/documents', async (request) => {
    const service = new VaultService(
      createUserClient(request.accessToken),
    );
    const expiringOnly = request.query.expiring === 'true';
    return service.getDocuments(request.params.tripId, expiringOnly);
  });

  app.get<{ Params: { tripId: string; id: string } }>(
    '/trips/:tripId/documents/:id',
    async (request) => {
      const service = new VaultService(
        createUserClient(request.accessToken),
      );
      return service.getDocumentDetail(request.params.id);
    },
  );

  app.delete<{ Params: { tripId: string; id: string } }>(
    '/trips/:tripId/documents/:id',
    async (request, reply) => {
      const service = new VaultService(
        createUserClient(request.accessToken),
      );
      await service.deleteDocument(request.userId, request.params.id);
      return reply.status(204).send();
    },
  );

  app.post<{
    Params: { tripId: string; id: string };
    Body: ShareDocumentRequest;
  }>('/trips/:tripId/documents/:id/share', async (request, reply) => {
    const service = new VaultService(
      createUserClient(request.accessToken),
    );
    const share = await service.shareDocument(
      request.userId,
      request.params.id,
      request.body,
    );
    return reply.status(201).send(share);
  });
}
