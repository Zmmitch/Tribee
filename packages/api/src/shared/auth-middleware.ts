import { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from './supabase.js';
import { UnauthorizedError } from './errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    accessToken: string;
  }
}

export async function authGuard(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  request.userId = user.id;
  request.accessToken = token;
}
