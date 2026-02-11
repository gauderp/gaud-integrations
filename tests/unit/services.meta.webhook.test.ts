import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaWebhookService } from '../../src/services/meta/MetaWebhookService';

describe('MetaWebhookService', () => {
  let metaWebhookService: MetaWebhookService;

  beforeEach(() => {
    metaWebhookService = new MetaWebhookService();
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const payload = '{"test":"data"}';
      const signature = metaWebhookService.generateSignature(payload);

      const isValid = metaWebhookService.verifyWebhookSignature(
        payload,
        signature
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = '{"test":"data"}';
      const invalidSignature = 'invalid_signature';

      const isValid = metaWebhookService.verifyWebhookSignature(
        payload,
        invalidSignature
      );

      expect(isValid).toBe(false);
    });

    it('should be case-insensitive for signature comparison', () => {
      const payload = '{"test":"data"}';
      const signature = metaWebhookService.generateSignature(payload);

      const isValid = metaWebhookService.verifyWebhookSignature(
        payload,
        signature.toUpperCase()
      );

      expect(isValid).toBe(true);
    });
  });

  describe('processConversionEvent', () => {
    it('should process valid conversion event', async () => {
      const event = {
        data: [
          {
            event_id: 'test-event-1',
            event_name: 'Contact',
            event_time: Math.floor(Date.now() / 1000),
            user_data: {
              em: 'test@example.com',
              ph: '1234567890',
            },
            custom_data: {
              value: 100.0,
              currency: 'USD',
            },
          },
        ],
      };

      const result = await metaWebhookService.processConversionEvent(event);

      expect(result).toEqual({
        success: true,
        eventId: 'test-event-1',
        processed: 1,
      });
    });

    it('should validate required fields', async () => {
      const invalidEvent = {
        data: [
          {
            // Missing event_id
            event_name: 'Contact',
            event_time: Math.floor(Date.now() / 1000),
            user_data: {},
          },
        ],
      };

      const result = await metaWebhookService.processConversionEvent(
        invalidEvent
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle multiple events in batch', async () => {
      const event = {
        data: [
          {
            event_id: 'event-1',
            event_name: 'Contact',
            event_time: Math.floor(Date.now() / 1000),
            user_data: { em: 'test1@example.com' },
          },
          {
            event_id: 'event-2',
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            user_data: { em: 'test2@example.com' },
          },
        ],
      };

      const result = await metaWebhookService.processConversionEvent(event);

      expect(result.processed).toBe(2);
      expect(result.success).toBe(true);
    });
  });

  describe('extractUserData', () => {
    it('should extract and normalize user data', () => {
      const userData = {
        em: 'Test@Example.com',
        ph: '1 (234) 567-8900',
        fn: 'John',
        ln: 'Doe',
        ct: 'San Francisco',
        st: 'CA',
        zp: '94102',
        country: 'US',
      };

      const normalized = metaWebhookService.extractUserData(userData);

      expect(normalized.email).toBe('test@example.com');
      expect(normalized.phone).toBe('12345678900'); // Numbers only
      expect(normalized.firstName).toBe('john'); // Lowercase
      expect(normalized.lastName).toBe('doe');
      expect(normalized.city).toBe('san francisco');
      expect(normalized.state).toBe('ca');
      expect(normalized.zip).toBe('94102');
      expect(normalized.country).toBe('us');
    });

    it('should handle missing optional fields', () => {
      const userData = {
        em: 'test@example.com',
      };

      const normalized = metaWebhookService.extractUserData(userData);

      expect(normalized.email).toBe('test@example.com');
      expect(normalized.phone).toBeUndefined();
      expect(normalized.firstName).toBeUndefined();
    });
  });

  describe('validatePixelId', () => {
    it('should validate correct pixel id format', () => {
      const isValid = metaWebhookService.validatePixelId('123456789');

      expect(isValid).toBe(true);
    });

    it('should reject invalid pixel id format', () => {
      const isValid = metaWebhookService.validatePixelId('not-a-number');

      expect(isValid).toBe(false);
    });
  });
});
