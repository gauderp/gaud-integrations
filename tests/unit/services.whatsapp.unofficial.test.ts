import { describe, it, expect, beforeEach } from 'vitest';
import { WhatsAppUnofficialService } from '../../src/services/whatsapp/WhatsAppUnofficialService';

describe('WhatsAppUnofficialService', () => {
  let service: WhatsAppUnofficialService;
  let testAccountId: string;

  beforeEach(() => {
    service = new WhatsAppUnofficialService();
    const account = service.registerAccount('Test WhatsApp', '+5511999999999');
    testAccountId = account.id;
  });

  describe('registerAccount', () => {
    it('should register a new unofficial account', () => {
      const account = service.registerAccount('New Account', '+5511999999998');

      expect(account.id).toBeDefined();
      expect(account.displayName).toBe('New Account');
      expect(account.phoneNumber).toBe('+5511999999998');
      expect(account.type).toBe('unofficial');
      expect(account.isActive).toBe(true);
      expect(account.isConnected).toBe(false);
      expect(account.connectionStatus).toBe('disconnected');
    });

    it('should generate unique account IDs', () => {
      const account1 = service.registerAccount('Account 1', '+5511999999998');
      const account2 = service.registerAccount('Account 2', '+5511999999997');

      expect(account1.id).not.toBe(account2.id);
    });
  });

  describe('getAccount', () => {
    it('should retrieve account by ID', () => {
      const account = service.getAccount(testAccountId);

      expect(account).toBeDefined();
      expect(account?.id).toBe(testAccountId);
      expect(account?.displayName).toBe('Test WhatsApp');
    });

    it('should return undefined for non-existent account', () => {
      const account = service.getAccount('non-existent');
      expect(account).toBeUndefined();
    });
  });

  describe('updateConnectionStatus', () => {
    it('should update connection status to connected', () => {
      service.updateConnectionStatus(testAccountId, 'connected', true);
      const account = service.getAccount(testAccountId);

      expect(account?.isConnected).toBe(true);
      expect(account?.connectionStatus).toBe('connected');
      expect(account?.lastConnectAt).toBeDefined();
    });

    it('should update connection status to disconnected', () => {
      service.updateConnectionStatus(testAccountId, 'disconnected', false);
      const account = service.getAccount(testAccountId);

      expect(account?.isConnected).toBe(false);
      expect(account?.connectionStatus).toBe('disconnected');
    });

    it('should update connection status to qr_code', () => {
      service.updateConnectionStatus(testAccountId, 'qr_code', false);
      const account = service.getAccount(testAccountId);

      expect(account?.connectionStatus).toBe('qr_code');
    });

    it('should update connection status to error', () => {
      service.updateConnectionStatus(testAccountId, 'error', false);
      const account = service.getAccount(testAccountId);

      expect(account?.connectionStatus).toBe('error');
    });
  });

  describe('updateSessionData', () => {
    it('should update session data and JID', () => {
      const sessionData = { isNewLogin: false, keys: {} };
      const jid = '5511999999999@c.us';

      service.updateSessionData(testAccountId, sessionData, jid);
      const account = service.getAccount(testAccountId);

      expect(account?.credentials.sessionData).toEqual(sessionData);
      expect(account?.credentials.jid).toBe(jid);
    });

    it('should update session data without JID', () => {
      const sessionData = { isNewLogin: false };

      service.updateSessionData(testAccountId, sessionData);
      const account = service.getAccount(testAccountId);

      expect(account?.credentials.sessionData).toEqual(sessionData);
    });
  });

  describe('storeMessage', () => {
    it('should store incoming message', async () => {
      const messageData = {
        id: 'msg-123',
        from: '5511999999999',
        body: 'Hello from unofficial WhatsApp',
        timestamp: Math.floor(Date.now() / 1000),
        type: 'text',
      };

      await service.storeMessage(testAccountId, messageData);

      const message = service.getMessage(testAccountId, 'msg-123');
      expect(message).toBeDefined();
      expect(message?.content.text).toBe('Hello from unofficial WhatsApp');
      expect(message?.status).toBe('received');
      expect(message?.isFromMe).toBe(false);
    });

    it('should store message sent by account', async () => {
      const messageData = {
        id: 'msg-456',
        from: '5511999999999',
        to: '5511888888888@c.us',
        body: 'Outgoing message',
        timestamp: Math.floor(Date.now() / 1000),
        type: 'text',
        fromMe: true,
      };

      await service.storeMessage(testAccountId, messageData);

      const message = service.getMessage(testAccountId, 'msg-456');
      expect(message?.isFromMe).toBe(true);
      expect(message?.status).toBe('sent');
    });

    it('should store image message', async () => {
      const messageData = {
        id: 'msg-image',
        from: '5511999999999',
        type: 'image',
        mediaKey: 'abc123',
        timestamp: Math.floor(Date.now() / 1000),
        hasMedia: true,
      };

      await service.storeMessage(testAccountId, messageData);

      const message = service.getMessage(testAccountId, 'msg-image');
      expect(message?.messageType).toBe('image');
      expect(message?.hasMedia).toBe(true);
    });
  });

  describe('getMessage', () => {
    it('should retrieve stored message', async () => {
      const messageData = {
        id: 'msg-retrieve',
        from: '5511999999999',
        body: 'Test message',
        timestamp: Math.floor(Date.now() / 1000),
        type: 'text',
      };

      await service.storeMessage(testAccountId, messageData);

      const message = service.getMessage(testAccountId, 'msg-retrieve');
      expect(message).toBeDefined();
      expect(message?.messageId).toBe('msg-retrieve');
    });

    it('should return undefined for non-existent message', () => {
      const message = service.getMessage(testAccountId, 'non-existent');
      expect(message).toBeUndefined();
    });
  });

  describe('getAccountMessages', () => {
    it('should retrieve all messages for account', async () => {
      const msg1 = {
        id: 'msg-1',
        from: '5511999999999',
        body: 'Message 1',
        timestamp: Math.floor(Date.now() / 1000),
        type: 'text',
      };

      const msg2 = {
        id: 'msg-2',
        from: '5511999999999',
        body: 'Message 2',
        timestamp: Math.floor(Date.now() / 1000) + 1,
        type: 'text',
      };

      await service.storeMessage(testAccountId, msg1);
      await service.storeMessage(testAccountId, msg2);

      const messages = service.getAccountMessages(testAccountId);
      expect(messages).toHaveLength(2);
    });
  });

  describe('activateAccount', () => {
    it('should activate account', () => {
      service.deactivateAccount(testAccountId);
      let account = service.getAccount(testAccountId);
      expect(account?.isActive).toBe(false);

      service.activateAccount(testAccountId);
      account = service.getAccount(testAccountId);
      expect(account?.isActive).toBe(true);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account', () => {
      service.deactivateAccount(testAccountId);
      const account = service.getAccount(testAccountId);

      expect(account?.isActive).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', () => {
      service.deleteAccount(testAccountId);
      const account = service.getAccount(testAccountId);

      expect(account).toBeUndefined();
    });
  });

  describe('getAllAccounts', () => {
    it('should retrieve all unofficial accounts', () => {
      const account1 = service.registerAccount('Account 1', '+5511999999998');
      const account2 = service.registerAccount('Account 2', '+5511999999997');

      const accounts = service.getAllAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(3); // testAccountId + 2 new
    });
  });
});
