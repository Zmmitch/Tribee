import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/auth-middleware.js';
import { createUserClient } from '../../shared/supabase.js';
import { IdentityService } from './service.js';
import type {
  SignupRequest,
  LoginRequest,
  MagicLinkRequest,
  UpdateProfileRequest,
  CreateInviteRequest,
  RedeemInviteRequest,
} from './types.js';

export async function identityRoutes(app: FastifyInstance): Promise<void> {
  // --- Public auth routes ---

  app.post<{ Body: SignupRequest }>('/auth/signup', async (request, reply) => {
    const service = new IdentityService(createUserClient(''));
    const result = await service.signup(request.body);
    return reply.status(201).send(result);
  });

  app.post<{ Body: LoginRequest }>('/auth/login', async (request) => {
    const service = new IdentityService(createUserClient(''));
    return service.login(request.body);
  });

  app.post<{ Body: MagicLinkRequest }>(
    '/auth/magic-link',
    async (request) => {
      const service = new IdentityService(createUserClient(''));
      return service.sendMagicLink(request.body);
    },
  );

  app.post<{ Body: { refresh_token: string } }>(
    '/auth/refresh',
    async (request) => {
      const service = new IdentityService(createUserClient(''));
      return service.refreshToken(request.body.refresh_token);
    },
  );

  // --- Protected routes ---

  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', authGuard);

    protectedApp.get('/profile', async (request) => {
      const service = new IdentityService(
        createUserClient(request.accessToken),
      );
      return service.getProfile(request.userId);
    });

    protectedApp.patch<{ Body: UpdateProfileRequest }>(
      '/profile',
      async (request) => {
        const service = new IdentityService(
          createUserClient(request.accessToken),
        );
        return service.updateProfile(request.userId, request.body);
      },
    );

    protectedApp.get('/groups', async (request) => {
      const service = new IdentityService(
        createUserClient(request.accessToken),
      );
      return service.getMyGroups(request.userId);
    });

    protectedApp.get<{ Params: { id: string } }>(
      '/groups/:id/members',
      async (request) => {
        const service = new IdentityService(
          createUserClient(request.accessToken),
        );
        return service.getGroupMembers(request.params.id, request.userId);
      },
    );

    protectedApp.post<{ Body: CreateInviteRequest }>(
      '/invites',
      async (request, reply) => {
        const service = new IdentityService(
          createUserClient(request.accessToken),
        );
        const result = await service.createInvite(
          request.userId,
          request.body,
        );
        return reply.status(201).send(result);
      },
    );

    protectedApp.post<{ Body: RedeemInviteRequest }>(
      '/invites/redeem',
      async (request) => {
        const service = new IdentityService(
          createUserClient(request.accessToken),
        );
        return service.redeemInvite(request.userId, request.body);
      },
    );
  });
}
