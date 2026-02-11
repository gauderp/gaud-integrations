import Fastify from 'fastify';
import { MetaWebhookService } from './services/meta/MetaWebhookService';
import { WhatsAppBusinessService } from './services/whatsapp/WhatsAppBusinessService';
import { WhatsAppUnofficialService } from './services/whatsapp/WhatsAppUnofficialService';
import { CrmAccountManager } from './services/crm/CrmAccountManager';
import { SyncService } from './services/crm/SyncService';
import { WebhookHandler } from './services/crm/WebhookHandler';
import { createMetaRoutes } from './routes/meta.routes';
import { createWhatsAppRoutes } from './routes/whatsapp.routes';
import { registerCrmRoutes } from './routes/crm.routes';

const fastify = Fastify({
  logger: true,
});

const metaService = new MetaWebhookService();
const whatsappBusinessService = new WhatsAppBusinessService();
const whatsappUnofficialService = new WhatsAppUnofficialService();

// CRM Services
const crmAccountManager = new CrmAccountManager();
const syncService = new SyncService(crmAccountManager);
const webhookHandler = new WebhookHandler(crmAccountManager, syncService);

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
  registerCrmRoutes(fastify, crmAccountManager, syncService, webhookHandler);
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
