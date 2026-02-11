import { describe, it, expect, beforeEach } from 'vitest';
import { WhatsAppBusinessService } from '../../src/services/whatsapp/WhatsAppBusinessService';
import type { WhatsAppBusinessWebhookPayload } from '../../src/models/whatsapp.types';

describe('WhatsAppBusinessService', () => {
  let service: WhatsAppBusinessService;
  let testAccountId: string;
  const testAccessToken = 'test-token-abc';
  const testPhoneNumberId = '1234567890';

  beforeEach(() => {
    service = new WhatsAppBusinessService();
    const account = service.registerAccount(
      'Test Account',
      testPhoneNumberId,
      testAccessToken,
      'wa-business-id'
    );
    testAccountId = account.id;
  });

  describe('registerAccount', () => {
    it('should register a new business account', () => {
      const account = service.registerAccount(
        'New Account',
        '9876543210',
        'new-token',
        'wa-biz-id'
      );

      expect(account.id).toBeDefined();
      expect(account.displayName).toBe('New Account');
      expect(account.type).toBe('business');
      expect(account.isActive).toBe(true);
    });

    it('should generate unique account IDs', () => {
      const account1 = service.registerAccount(
        'Account 1',
        '9876543210',
        'token-1',
        'wa-biz-1'
      );

      const account2 = service.registerAccount(
        'Account 2',
        '1111111111',
        'token-2',
        'wa-biz-2'
      );

      expect(account1.id).not.toBe(account2.id);
    });
  });

  describe('processWebhookMessage', () => {
    it('should process text message from webhook', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'msg-123',
                      timestamp: '1707565200',
                      type: 'text',
                      text: {
                        body: 'Hello from WhatsApp!',
                      },
                    },
                  ],
                  contacts: [
                    {
                      profile: {
                        name: 'John Doe',
                      },
                      wa_id: '5511999999999',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await service.processWebhookMessage(
        testAccountId,
        payload
      );

      expect(result.success).toBe(true);
      expect(result.messagesProcessed).toBe(1);
      expect(result.accountId).toBe(testAccountId);
    });

    it('should process image message from webhook', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'msg-image',
                      timestamp: '1707565200',
                      type: 'image',
                      image: {
                        id: 'image-123',
                        mime_type: 'image/jpeg',
                      },
                    },
                  ],
                  contacts: [
                    {
                      profile: {
                        name: 'Jane Smith',
                      },
                      wa_id: '5511999999999',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await service.processWebhookMessage(
        testAccountId,
        payload
      );

      expect(result.success).toBe(true);
      expect(result.messagesProcessed).toBe(1);
    });

    it('should handle multiple messages in batch', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'msg-1',
                      timestamp: '1707565200',
                      type: 'text',
                      text: { body: 'Message 1' },
                    },
                    {
                      from: '5511999999999',
                      id: 'msg-2',
                      timestamp: '1707565201',
                      type: 'text',
                      text: { body: 'Message 2' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'User' },
                      wa_id: '5511999999999',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await service.processWebhookMessage(
        testAccountId,
        payload
      );

      expect(result.success).toBe(true);
      expect(result.messagesProcessed).toBe(2);
    });

    it('should reject message from non-existent account', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'msg-123',
                      timestamp: '1707565200',
                      type: 'text',
                      text: { body: 'Hello' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'User' },
                      wa_id: '5511999999999',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await service.processWebhookMessage(
        'non-existent-account',
        payload
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle message status updates', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  statuses: [
                    {
                      id: 'msg-123',
                      status: 'delivered',
                      timestamp: '1707565200',
                      recipient_id: '5511999999999',
                    },
                  ],
                },
                field: 'message_status',
              },
            ],
          },
        ],
      };

      const result = await service.processWebhookMessage(
        testAccountId,
        payload
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getMessage', () => {
    it('should retrieve stored message', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'msg-retrieve',
                      timestamp: '1707565200',
                      type: 'text',
                      text: { body: 'Test message' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'User' },
                      wa_id: '5511999999999',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      await service.processWebhookMessage(testAccountId, payload);

      const message = service.getMessage(testAccountId, 'msg-retrieve');
      expect(message).toBeDefined();
      expect(message?.content.text).toBe('Test message');
    });

    it('should return undefined for non-existent message', () => {
      const message = service.getMessage(testAccountId, 'non-existent');
      expect(message).toBeUndefined();
    });
  });

  describe('getAccountMessages', () => {
    it('should retrieve all messages for an account', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'msg-1',
                      timestamp: '1707565200',
                      type: 'text',
                      text: { body: 'Message 1' },
                    },
                    {
                      from: '5511999999999',
                      id: 'msg-2',
                      timestamp: '1707565201',
                      type: 'text',
                      text: { body: 'Message 2' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'User' },
                      wa_id: '5511999999999',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      await service.processWebhookMessage(testAccountId, payload);

      const messages = service.getAccountMessages(testAccountId);
      expect(messages).toHaveLength(2);
    });
  });

  describe('clearAccountMessages', () => {
    it('should clear all messages for an account', async () => {
      const payload: WhatsAppBusinessWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  messages: [
                    {
                      from: '5511999999999',
                      id: 'msg-1',
                      timestamp: '1707565200',
                      type: 'text',
                      text: { body: 'Message 1' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'User' },
                      wa_id: '5511999999999',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      await service.processWebhookMessage(testAccountId, payload);
      let messages = service.getAccountMessages(testAccountId);
      expect(messages.length).toBeGreaterThan(0);

      service.clearAccountMessages(testAccountId);
      messages = service.getAccountMessages(testAccountId);
      expect(messages).toHaveLength(0);
    });
  });
});
