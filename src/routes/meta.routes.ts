import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MetaWebhookService } from '../services/meta/MetaWebhookService';

export async function createMetaRoutes(
  fastify: FastifyInstance,
  metaService: MetaWebhookService
): Promise<void> {
  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'test-token';

  /**
   * Meta webhook verification endpoint
   * POST /webhooks/meta/verify
   */
  fastify.post('/webhooks/meta/verify', async (
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

    if (mode === 'subscribe' && token === verifyToken) {
      fastify.log.info('Webhook verified successfully');
      return reply.code(200).send(challenge);
    }

    fastify.log.warn('Webhook verification failed: invalid token');
    return reply.code(401).send({ error: 'Invalid token' });
  });

  /**
   * Meta conversion webhook endpoint
   * POST /webhooks/meta/conversions
   */
  fastify.post('/webhooks/meta/conversions', async (
    request: FastifyRequest<{
      Body: unknown;
      Headers: {
        'x-hub-signature-256'?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const signature = request.headers['x-hub-signature-256'];
    const payloadString = JSON.stringify(request.body);

    // Verify signature if provided
    if (signature) {
      const expectedSignature = `sha256=${metaService.generateSignature(
        payloadString
      )}`;

      if (signature !== expectedSignature) {
        fastify.log.warn('Invalid webhook signature');
        return reply
          .code(401)
          .send({ error: 'Invalid signature', success: false });
      }
    }

    try {
      const result = await metaService.processConversionEvent(request.body);

      if (!result.success) {
        fastify.log.error({ errors: result.errors }, 'Conversion processing failed');
        return reply.code(400).send(result);
      }

      fastify.log.info(`Processed ${result.processed} conversion events`);
      return reply.code(200).send(result);
    } catch (error) {
      fastify.log.error(error, 'Error processing conversion webhook');
      return reply
        .code(500)
        .send({ error: 'Internal server error', success: false });
    }
  });

  /**
   * Get conversion event by ID
   * GET /webhooks/meta/conversions/:eventId
   */
  fastify.get('/webhooks/meta/conversions/:eventId', async (
    request: FastifyRequest<{
      Params: {
        eventId: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const conversion = metaService.getConversionEvent(request.params.eventId);

    if (!conversion) {
      return reply.code(404).send({ error: 'Conversion not found' });
    }

    return reply.code(200).send(conversion);
  });
}
