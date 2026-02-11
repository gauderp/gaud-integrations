import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { MetaWebhookService } from '../../src/services/meta/MetaWebhookService';
import { createMetaRoutes } from '../../src/routes/meta.routes';

describe('Meta Routes', () => {
  let app: FastifyInstance;
  let metaService: MetaWebhookService;

  beforeEach(async () => {
    app = Fastify();
    metaService = new MetaWebhookService();

    // Register routes
    createMetaRoutes(app, metaService);

    await app.ready();
  });

  describe('POST /webhooks/meta/conversions', () => {
    it('should accept valid conversion webhook', async () => {
      const payload = {
        data: [
          {
            event_id: 'test-event-1',
            event_name: 'Contact',
            event_time: Math.floor(Date.now() / 1000),
            user_data: {
              em: 'test@example.com',
              ph: '1234567890',
            },
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/meta/conversions',
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
    });

    it('should reject invalid payload', async () => {
      const invalidPayload = {
        data: [
          {
            // Missing event_id
            event_name: 'Contact',
            event_time: Math.floor(Date.now() / 1000),
            user_data: {},
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/meta/conversions',
        payload: invalidPayload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should verify webhook signature', async () => {
      const payload = {
        data: [
          {
            event_id: 'test-event-2',
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            user_data: { em: 'test2@example.com' },
          },
        ],
      };

      const payloadString = JSON.stringify(payload);
      const signature = metaService.generateSignature(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/meta/conversions',
        headers: {
          'x-hub-signature-256': `sha256=${signature}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject invalid signature', async () => {
      const payload = {
        data: [
          {
            event_id: 'test-event-3',
            event_name: 'Contact',
            event_time: Math.floor(Date.now() / 1000),
            user_data: { em: 'test3@example.com' },
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/meta/conversions',
        headers: {
          'x-hub-signature-256': 'sha256=invalid_signature',
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /webhooks/meta/conversions/:eventId', () => {
    it('should retrieve stored conversion event', async () => {
      const payload = {
        data: [
          {
            event_id: 'test-event-retrieve',
            event_name: 'Contact',
            event_time: Math.floor(Date.now() / 1000),
            user_data: { em: 'test@example.com' },
          },
        ],
      };

      await app.inject({
        method: 'POST',
        url: '/webhooks/meta/conversions',
        payload,
      });

      const getResponse = await app.inject({
        method: 'GET',
        url: '/webhooks/meta/conversions/test-event-retrieve',
      });

      expect(getResponse.statusCode).toBe(200);
      const body = JSON.parse(getResponse.payload);
      expect(body.eventId).toBe('test-event-retrieve');
    });

    it('should return 404 for non-existent event', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/webhooks/meta/conversions/non-existent-event',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /webhooks/meta/verify', () => {
    it('should verify webhook subscription request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/meta/verify',
        query: {
          'hub.mode': 'subscribe',
          'hub.challenge': 'test-challenge-123',
          'hub.verify_token': process.env.WEBHOOK_VERIFY_TOKEN || 'test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.payload).toBe('test-challenge-123');
    });

    it('should reject invalid verification token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/meta/verify',
        query: {
          'hub.mode': 'subscribe',
          'hub.challenge': 'test-challenge-123',
          'hub.verify_token': 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
