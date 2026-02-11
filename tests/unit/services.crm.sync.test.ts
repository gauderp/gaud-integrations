import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from '../../src/services/crm/SyncService';
import { CrmAccountManager } from '../../src/services/crm/CrmAccountManager';
import type { ICrmAdapter } from '../../src/services/crm/adapters/ICrmAdapter';

describe('SyncService', () => {
  let syncService: SyncService;
  let accountManager: CrmAccountManager;
  let mockAdapter: Partial<ICrmAdapter>;

  beforeEach(() => {
    accountManager = new CrmAccountManager();

    mockAdapter = {
      getCrmType: () => 'pipedrive',
      getLeads: vi.fn().mockResolvedValue([]),
      syncLead: vi.fn().mockResolvedValue({}),
    };

    syncService = new SyncService(accountManager);
  });

  describe('syncAccountLeads', () => {
    it('should sync all leads from account', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      // Mock the adapter
      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'getLeads').mockResolvedValueOnce([
        {
          id: '1',
          externalId: '1',
          crmAccountId: account.id,
          title: 'Lead 1',
          pipelineId: '1',
          stageId: '1',
          stageName: 'Open',
          customFields: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          crmType: 'pipedrive',
        },
        {
          id: '2',
          externalId: '2',
          crmAccountId: account.id,
          title: 'Lead 2',
          pipelineId: '1',
          stageId: '2',
          stageName: 'In Progress',
          customFields: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          crmType: 'pipedrive',
        },
      ]);

      const status = await syncService.syncAccountLeads(account.id);

      expect(status.leadsCount).toBe(2);
      expect(status.status).toBe('idle');
      expect(status.lastSyncAt).toBeDefined();
    });

    it('should handle sync errors', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'getLeads').mockRejectedValueOnce(new Error('API Error'));

      const status = await syncService.syncAccountLeads(account.id).catch((err) => {
        const currentStatus = syncService.getSyncStatus(account.id);
        return currentStatus;
      });

      if (status) {
        expect(status.status).toBe('error');
      }
    });

    it('should return error for non-existent account', async () => {
      await expect(syncService.syncAccountLeads('non-existent')).rejects.toThrow();
    });
  });

  describe('syncLead', () => {
    it('should sync single lead', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      const mockLead = {
        id: '1',
        externalId: '1',
        crmAccountId: account.id,
        title: 'Test Lead',
        pipelineId: '1',
        stageId: '1',
        stageName: 'Open',
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        crmType: 'pipedrive' as const,
      };

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'syncLead').mockResolvedValueOnce(mockLead);

      const lead = await syncService.syncLead(account.id, '1');

      expect(lead.title).toBe('Test Lead');
      expect(mockAdapter.syncLead).toHaveBeenCalledWith(account.id, '1');
    });

    it('should throw error for non-existent account', async () => {
      await expect(syncService.syncLead('non-existent', '1')).rejects.toThrow();
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status for account', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'getLeads').mockResolvedValueOnce([]);

      await syncService.syncAccountLeads(account.id);

      const status = syncService.getSyncStatus(account.id);

      expect(status).toBeDefined();
      expect(status?.accountId).toBe(account.id);
      expect(status?.leadsCount).toBe(0);
    });

    it('should return undefined for non-synced account', () => {
      const status = syncService.getSyncStatus('non-existent');

      expect(status).toBeUndefined();
    });
  });

  describe('getLastSyncTime', () => {
    it('should return last sync time', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'getLeads').mockResolvedValueOnce([]);

      await syncService.syncAccountLeads(account.id);

      const lastSync = syncService.getLastSyncTime(account.id);

      expect(lastSync).toBeDefined();
      expect(lastSync?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return undefined for non-synced account', () => {
      const lastSync = syncService.getLastSyncTime('non-existent');

      expect(lastSync).toBeUndefined();
    });
  });

  describe('shouldSync', () => {
    it('should return true if never synced', () => {
      const shouldSync = syncService.shouldSync('never-synced', 5);

      expect(shouldSync).toBe(true);
    });

    it('should return true if interval has passed', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'getLeads').mockResolvedValueOnce([]);

      // Sync immediately
      await syncService.syncAccountLeads(account.id);

      // Should not sync (just synced)
      expect(syncService.shouldSync(account.id, 5)).toBe(false);

      // Mock time passage
      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 5 min + 1 sec

      expect(syncService.shouldSync(account.id, 5)).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('clearSyncStatus', () => {
    it('should clear sync status for account', async () => {
      const account = accountManager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      vi.spyOn(accountManager, 'getAdapter').mockReturnValue(mockAdapter as ICrmAdapter);
      vi.spyOn(mockAdapter, 'getLeads').mockResolvedValueOnce([]);

      await syncService.syncAccountLeads(account.id);

      expect(syncService.getSyncStatus(account.id)).toBeDefined();

      syncService.clearSyncStatus(account.id);

      expect(syncService.getSyncStatus(account.id)).toBeUndefined();
      expect(syncService.getLastSyncTime(account.id)).toBeUndefined();
    });
  });
});
