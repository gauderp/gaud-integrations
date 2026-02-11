import Fastify from 'fastify';
import { MetaWebhookService } from './services/meta/MetaWebhookService';
import { WhatsAppBusinessService } from './services/whatsapp/WhatsAppBusinessService';
import { WhatsAppUnofficialService } from './services/whatsapp/WhatsAppUnofficialService';
import { createMetaRoutes } from './routes/meta.routes';
import { createWhatsAppRoutes } from './routes/whatsapp.routes';

const fastify = Fastify({
  logger: true,
});

const metaService = new MetaWebhookService();
const whatsappBusinessService = new WhatsAppBusinessService();
const whatsappUnofficialService = new WhatsAppUnofficialService();

fastify.get('/health', async (_request, _reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(async (fastify) => {
  await createMetaRoutes(fastify, metaService);
  await createWhatsAppRoutes(
    fastify,
    whatsappBusinessService,
    whatsappUnofficialService
  );
});

const start = async (): Promise<void> => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Server running on http://0.0.0.0:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
