import { describe, it, expect, beforeEach } from 'vitest';
import { PipedriveAccountManager } from '../../src/services/pipedrive/PipedriveAccountManager';
import { LeadMapper } from '../../src/services/pipedrive/LeadMapper';
import type {
  PipedriveContact,
  LeadCreationPayload,
} from '../../src/models/pipedrive.types';

describe('PipedriveAccountManager', () => {
  let manager: PipedriveAccountManager;

  beforeEach(() => {
    manager = new PipedriveAccountManager();
  });

  describe('registerAccount', () => {
    it('should register a new Pipedrive account', () => {
      const account = manager.registerAccount(
        'Test Account',
        'testcompany.pipedrive.com',
        'test-api-token'
      );

      expect(account.id).toBeDefined();
      expect(account.displayName).toBe('Test Account');
      expect(account.companyDomain).toBe('testcompany.pipedrive.com');
      expect(account.isActive).toBe(true);
    });

    it('should generate unique account IDs', () => {
      const account1 = manager.registerAccount(
        'Account 1',
        'company1.pipedrive.com',
        'token1'
      );

      const account2 = manager.registerAccount(
        'Account 2',
        'company2.pipedrive.com',
        'token2'
      );

      expect(account1.id).not.toBe(account2.id);
    });
  });

  describe('getAccount', () => {
    it('should retrieve account by ID', () => {
      const account = manager.registerAccount(
        'Test',
        'test.pipedrive.com',
        'token'
      );

      const retrieved = manager.getAccount(account.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(account.id);
    });

    it('should return undefined for non-existent account', () => {
      const retrieved = manager.getAccount('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllAccounts', () => {
    it('should retrieve all accounts', () => {
      manager.registerAccount('Account 1', 'company1.pipedrive.com', 'token1');
      manager.registerAccount('Account 2', 'company2.pipedrive.com', 'token2');

      const accounts = manager.getAllAccounts();

      expect(accounts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('activateAccount', () => {
    it('should activate account', () => {
      const account = manager.registerAccount(
        'Test',
        'test.pipedrive.com',
        'token'
      );

      manager.deactivateAccount(account.id);
      let retrieved = manager.getAccount(account.id);
      expect(retrieved?.isActive).toBe(false);

      manager.activateAccount(account.id);
      retrieved = manager.getAccount(account.id);
      expect(retrieved?.isActive).toBe(true);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account', () => {
      const account = manager.registerAccount(
        'Test',
        'test.pipedrive.com',
        'token'
      );

      manager.deactivateAccount(account.id);
      const retrieved = manager.getAccount(account.id);

      expect(retrieved?.isActive).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', () => {
      const account = manager.registerAccount(
        'Test',
        'test.pipedrive.com',
        'token'
      );

      manager.deleteAccount(account.id);
      const retrieved = manager.getAccount(account.id);

      expect(retrieved).toBeUndefined();
    });
  });
});

describe('LeadMapper', () => {
  let mapper: LeadMapper;

  beforeEach(() => {
    mapper = new LeadMapper();
  });

  describe('mapMetaEventToLead', () => {
    it('should map Meta conversion event to lead', () => {
      const metaEvent = {
        event_id: 'meta-event-123',
        event_name: 'Contact',
        event_time: Math.floor(Date.now() / 1000),
        user_data: {
          em: 'test@example.com',
          ph: '5511999999999',
          fn: 'John',
          ln: 'Doe',
        },
        custom_data: {
          value: 1000,
          currency: 'BRL',
        },
      };

      const payload = mapper.mapMetaEventToLead(
        'account-123',
        metaEvent,
        1,
        1
      );

      expect(payload.accountId).toBe('account-123');
      expect(payload.source).toBe('meta');
      expect(payload.sourceId).toBe('meta-event-123');
      expect(payload.contact.email).toBe('test@example.com');
      expect(payload.lead.value).toBe(1000);
    });
  });

  describe('mapWhatsAppMessageToLead', () => {
    it('should map WhatsApp message to lead', () => {
      const whatsappMessage = {
        messageId: 'wa-msg-456',
        phoneNumber: '5511999999999',
        displayName: 'Jane Smith',
        content: {
          text: 'Hi, I am interested',
        },
      };

      const payload = mapper.mapWhatsAppMessageToLead(
        'account-123',
        whatsappMessage,
        1,
        1
      );

      expect(payload.accountId).toBe('account-123');
      expect(payload.source).toBe('whatsapp');
      expect(payload.sourceId).toBe('wa-msg-456');
      expect(payload.contact.name).toContain('Jane');
      expect(payload.contact.phone).toBe('5511999999999');
    });
  });

  describe('extractContactData', () => {
    it('should extract contact data from Meta event', () => {
      const userData = {
        em: 'Test@Example.com',
        ph: '1 (555) 123-4567',
        fn: 'John',
        ln: 'Doe',
        ct: 'New York',
      };

      const contact = mapper.extractContactData(userData);

      expect(contact.email).toBe('test@example.com');
      expect(contact.phone).toBe('15551234567');
      expect(contact.firstName).toBe('john');
      expect(contact.lastName).toBe('doe');
      expect(contact.city).toBe('new york');
    });

    it('should handle missing optional fields', () => {
      const userData = {
        em: 'test@example.com',
      };

      const contact = mapper.extractContactData(userData);

      expect(contact.email).toBe('test@example.com');
      expect(contact.firstName).toBeUndefined();
      expect(contact.phone).toBeUndefined();
    });
  });

  describe('deduplicateBy', () => {
    it('should set deduplication strategy', () => {
      const payload: LeadCreationPayload = {
        accountId: 'acc-123',
        source: 'meta',
        sourceId: 'src-123',
        contact: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+5511999999999',
        },
        lead: {
          title: 'Test Lead',
          pipelineId: 1,
          stageId: 1,
        },
        deduplicateBy: ['email', 'phone'],
      };

      expect(payload.deduplicateBy).toContain('email');
      expect(payload.deduplicateBy).toContain('phone');
    });
  });

  describe('normalizePhone', () => {
    it('should normalize phone numbers', () => {
      const normalized1 = mapper.normalizePhone('1 (555) 123-4567');
      const normalized2 = mapper.normalizePhone('+55 (11) 9 9999-9999');
      const normalized3 = mapper.normalizePhone('(11) 99999-9999');

      expect(normalized1).toBe('15551234567');
      expect(normalized2).toBe('5511999999999');
      expect(normalized3).toBe('11999999999');
    });

    it('should handle empty phone', () => {
      const normalized = mapper.normalizePhone('');
      expect(normalized).toBe('');
    });
  });

  describe('normalizeEmail', () => {
    it('should normalize email addresses', () => {
      const normalized1 = mapper.normalizeEmail('Test@Example.COM');
      const normalized2 = mapper.normalizeEmail('  john@example.com  ');

      expect(normalized1).toBe('test@example.com');
      expect(normalized2).toBe('john@example.com');
    });
  });
});
