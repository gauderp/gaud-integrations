import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookHandler } from '../../src/services/crm/WebhookHandler';
import { CrmAccountManager } from '../../src/services/crm/CrmAccountManager';
import { SyncService } from '../../src/services/crm/SyncService';
import type { ICrmAdapter } from '../../src/services/crm/adapters/ICrmAdapter';

describe('WebhookHandler', () => {
  let webhookHandler: WebhookHandler;
  let accountManager: CrmAccountManager;
  let syncService: SyncService;
  let mockAdapter: Partial<ICrmAdapter>;

  beforeEach(() => {
    accountManager = new CrmAccountManager();
    syncService = new SyncService(accountManager);

    mockAdapter = {
      getCrmType: () => 'pipedrive',
      parseWebhookEvent: vi.fn(),
      syncLead: vi.fn(),
    };

    webhookHandler = new WebhookHandler(accountManager, syncService);
  });

  describe('handleWebhook', () => {
    it('should process valid webhook event', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.updated',
        data: { id: 123 },
      });
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValue({
        id: '1',
        externalId: '123',
        crmAccountId: account.id,
        title: 'Updated Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive',
      });

      const payload = {
        event: 'updated.deal',
        data: { id: 123 },
      };

      const event = await webhookHandler.handleWebhook(account.id, payload);

      expect(event.processed).toBe(true);
      expect(event.type).toBe('lead.updated');
      expect(event.error).toBeUndefined();
    });

    it('should handle non-existent account', async () => {
      const payload = {
        event: 'updated.deal',
        data: { id: 123 },
      };

      const event = await webhookHandler.handleWebhook('non-existent', payload);

      expect(event.processed).toBe(false);
      expect(event.error).toContain('Adapter not found');
    });

    it('should handle parsing errors', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue(null);

      const event = await webhookHandler.handleWebhook(account.id, {});

      expect(event.processed).toBe(false);
      expect(event.error).toBe('Failed to parse webhook event');
    });

    it('should generate unique event IDs', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.created',
        data: { id: 123 },
      });
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValue({
        id: '1',
        externalId: '123',
        crmAccountId: account.id,
        title: 'Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive',
      });

      const event1 = await webhookHandler.handleWebhook(account.id, { event: 'added.deal' });
      const event2 = await webhookHandler.handleWebhook(account.id, { event: 'added.deal' });

      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('event type processing', () => {
    beforeEach(() => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValue({
        id: '1',
        externalId: '123',
        crmAccountId: account.id,
        title: 'Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive',
      });
    });

    it('should sync lead on lead.created event', async () => {
      const account = accountManager.getAllAccounts()[0];

      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.created',
        data: { id: 123 },
      });

      await webhookHandler.handleWebhook(account.id, {});

      expect(mockAdapter.syncLead).toHaveBeenCalledWith(account.id, '123');
    });

    it('should sync lead on lead.updated event', async () => {
      const account = accountManager.getAllAccounts()[0];

      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.updated',
        data: { id: 456 },
      });

      await webhookHandler.handleWebhook(account.id, {});

      expect(mockAdapter.syncLead).toHaveBeenCalledWith(account.id, '456');
    });

    it('should sync lead on lead.stage_changed event', async () => {
      const account = accountManager.getAllAccounts()[0];

      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.stage_changed',
        data: { id: 789 },
      });

      await webhookHandler.handleWebhook(account.id, {});

      expect(mockAdapter.syncLead).toHaveBeenCalledWith(account.id, '789');
    });

    it('should not sync on lead.deleted event', async () => {
      const account = accountManager.getAllAccounts()[0];

      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.deleted',
        data: { id: 999 },
      });

      await webhookHandler.handleWebhook(account.id, {});

      expect(mockAdapter.syncLead).not.toHaveBeenCalled();
    });
  });

  describe('getWebhookLog', () => {
    it('should retrieve webhook log by ID', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.created',
        data: { id: 123 },
      });
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValue({
        id: '1',
        externalId: '123',
        crmAccountId: account.id,
        title: 'Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive',
      });

      const event = await webhookHandler.handleWebhook(account.id, {});
      const retrieved = webhookHandler.getWebhookLog(event.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(event.id);
    });

    it('should return undefined for non-existent log', () => {
      const log = webhookHandler.getWebhookLog('non-existent');

      expect(log).toBeUndefined();
    });
  });

  describe('getWebhookLogs', () => {
    it('should return recent webhook logs', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.created',
        data: { id: 123 },
      });
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValue({
        id: '1',
        externalId: '123',
        crmAccountId: account.id,
        title: 'Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive',
      });

      await webhookHandler.handleWebhook(account.id, {});
      await webhookHandler.handleWebhook(account.id, {});

      const logs = webhookHandler.getWebhookLogs(10);

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect limit parameter', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.created',
        data: { id: 123 },
      });
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValue({
        id: '1',
        externalId: '123',
        crmAccountId: account.id,
        title: 'Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive',
      });

      for (let i = 0; i < 5; i++) {
        await webhookHandler.handleWebhook(account.id, {});
      }

      const logs = webhookHandler.getWebhookLogs(2);

      expect(logs.length).toBeLessThanOrEqual(2);
    });
  });

  describe('clearOldLogs', () => {
    it('should remove logs older than threshold', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'parseWebhookEvent').mockReturnValue({
        type: 'lead.created',
        data: { id: 123 },
      });
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValue({
        id: '1',
        externalId: '123',
        crmAccountId: account.id,
        title: 'Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive',
      });

      // Create event
      await webhookHandler.handleWebhook(account.id, {});

      // Mock time passage
      vi.useFakeTimers();
      vi.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

      // Clear logs older than 24 hours
      const deleted = webhookHandler.clearOldLogs(24);

      expect(deleted).toBeGreaterThanOrEqual(1);

      vi.useRealTimers();
    });
  });
});
