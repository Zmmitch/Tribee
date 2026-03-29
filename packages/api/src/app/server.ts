import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from './config/index.js';
import { AppError } from '../shared/errors.js';
import { identityRoutes } from '../modules/identity/routes.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(sensible);

app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }
  request.log.error(error);
  return reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
});

app.get('/health', async () => ({ status: 'ok' }));

await app.register(identityRoutes, { prefix: '/api/v1' });

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`Tribee API running on ${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export { app };
