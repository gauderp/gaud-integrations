import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WhatsAppBusinessService } from '../services/whatsapp/WhatsAppBusinessService';
import { WhatsAppUnofficialService } from '../services/whatsapp/WhatsAppUnofficialService';
import type { WhatsAppBusinessWebhookPayload } from '../models/whatsapp.types';

export async function createWhatsAppRoutes(
  fastify: FastifyInstance,
  businessService: WhatsAppBusinessService,
  unofficialService: WhatsAppUnofficialService
): Promise<void> {
  /**
   * WhatsApp Business webhook verification
   * GET /webhooks/whatsapp/business/verify
   */
  fastify.get(
    '/webhooks/whatsapp/business/verify',
    async (
      request: FastifyRequest<{
        Querystring: {
          'hub.mode': string;
          'hub.challenge': string;
          'hub.verify_token': string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const mode = request.query['hub.mode'];
      const challenge = request.query['hub.challenge'];
      const token = request.query['hub.verify_token'];
      const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test-token';

      if (mode === 'subscribe' && token === expectedToken) {
        fastify.log.info('WhatsApp Business webhook verified');
        return reply.code(200).send(challenge);
      }

      fastify.log.warn('WhatsApp Business webhook verification failed');
      return reply.code(401).send({ error: 'Invalid token' });
    }
  );

  /**
   * WhatsApp Business incoming messages webhook
   * POST /webhooks/whatsapp/business/messages/:accountId
   */
  fastify.post(
    '/webhooks/whatsapp/business/messages/:accountId',
    async (
      request: FastifyRequest<{
        Params: { accountId: string };
        Body: WhatsAppBusinessWebhookPayload;
      }>,
      reply: FastifyReply
    ) => {
      const { accountId } = request.params;

      try {
        const account = businessService.getAccount(accountId);
        if (!account) {
          return reply.code(404).send({ error: 'Account not found' });
        }

        const result = await businessService.processWebhookMessage(
          accountId,
          request.body
        );

        if (!result.success) {
          fastify.log.error({ errors: result.errors }, 'WhatsApp message processing failed');
          return reply.code(400).send(result);
        }

        fastify.log.info(
          `Processed ${result.messagesProcessed} WhatsApp Business messages for account ${accountId}`
        );
        return reply.code(200).send(result);
      } catch (error) {
        fastify.log.error(error, 'Error processing WhatsApp Business webhook');
        return reply
          .code(500)
          .send({ error: 'Internal server error', success: false });
      }
    }
  );

  /**
   * Get message by ID
   * GET /webhooks/whatsapp/business/messages/:accountId/:messageId
   */
  fastify.get(
    '/webhooks/whatsapp/business/messages/:accountId/:messageId',
    async (
      request: FastifyRequest<{
        Params: { accountId: string; messageId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { accountId, messageId } = request.params;

      const message = businessService.getMessage(accountId, messageId);
      if (!message) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      return reply.code(200).send(message);
    }
  );

  /**
   * List all WhatsApp Business accounts
   * GET /webhooks/whatsapp/business/accounts
   */
  fastify.get('/webhooks/whatsapp/business/accounts', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const accounts = businessService.getAllAccounts();
    return reply.code(200).send({ accounts, total: accounts.length });
  });

  /**
   * Register new WhatsApp Business account
   * POST /webhooks/whatsapp/business/accounts
   */
  fastify.post(
    '/webhooks/whatsapp/business/accounts',
    async (
      request: FastifyRequest<{
        Body: {
          displayName: string;
          phoneNumberId: string;
          accessToken: string;
          waBusinessAccountId: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { displayName, phoneNumberId, accessToken, waBusinessAccountId } =
          request.body;

        const account = businessService.registerAccount(
          displayName,
          phoneNumberId,
          accessToken,
          waBusinessAccountId
        );

        fastify.log.info(`Registered WhatsApp Business account: ${account.id}`);
        return reply.code(201).send(account);
      } catch (error) {
        fastify.log.error(error, 'Error registering WhatsApp Business account');
        return reply
          .code(500)
          .send({ error: 'Failed to register account', success: false });
      }
    }
  );

  /**
   * Register new WhatsApp Unofficial account
   * POST /webhooks/whatsapp/unofficial/accounts
   */
  fastify.post(
    '/webhooks/whatsapp/unofficial/accounts',
    async (
      request: FastifyRequest<{
        Body: {
          displayName: string;
          phoneNumber: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { displayName, phoneNumber } = request.body;

        const account = unofficialService.registerAccount(
          displayName,
          phoneNumber
        );

        fastify.log.info(`Registered WhatsApp Unofficial account: ${account.id}`);
        return reply.code(201).send(account);
      } catch (error) {
        fastify.log.error(error, 'Error registering WhatsApp Unofficial account');
        return reply
          .code(500)
          .send({ error: 'Failed to register account', success: false });
      }
    }
  );

  /**
   * Get WhatsApp Unofficial account
   * GET /webhooks/whatsapp/unofficial/accounts/:accountId
   */
  fastify.get(
    '/webhooks/whatsapp/unofficial/accounts/:accountId',
    async (
      request: FastifyRequest<{
        Params: { accountId: string };
      }>,
      reply: FastifyReply
    ) => {
      const account = unofficialService.getAccount(request.params.accountId);

      if (!account) {
        return reply.code(404).send({ error: 'Account not found' });
      }

      return reply.code(200).send(account);
    }
  );

  /**
   * Update WhatsApp Unofficial connection status
   * POST /webhooks/whatsapp/unofficial/accounts/:accountId/connection
   */
  fastify.post(
    '/webhooks/whatsapp/unofficial/accounts/:accountId/connection',
    async (
      request: FastifyRequest<{
        Params: { accountId: string };
        Body: {
          status: 'connected' | 'disconnected' | 'qr_code' | 'error';
          isConnected: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { accountId } = request.params;
      const { status, isConnected } = request.body;

      const success = unofficialService.updateConnectionStatus(
        accountId,
        status,
        isConnected
      );

      if (!success) {
        return reply.code(404).send({ error: 'Account not found' });
      }

      return reply.code(200).send({ success: true });
    }
  );

  /**
   * List all WhatsApp Unofficial accounts
   * GET /webhooks/whatsapp/unofficial/accounts
   */
  fastify.get('/webhooks/whatsapp/unofficial/accounts', async (
    _request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const accounts = unofficialService.getAllAccounts();
    return reply.code(200).send({ accounts, total: accounts.length });
  });
}
