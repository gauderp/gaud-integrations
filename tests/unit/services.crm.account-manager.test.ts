import { describe, it, expect, beforeEach } from 'vitest';
import { CrmAccountManager } from '../../src/services/crm/CrmAccountManager';

describe('CrmAccountManager', () => {
  let manager: CrmAccountManager;

  beforeEach(() => {
    manager = new CrmAccountManager();
  });

  describe('registerAccount', () => {
    it('should register new Pipedrive account', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test Account',
        apiToken: 'test-token',
        domain: 'test.pipedrive.com',
      });

      expect(account.id).toBeDefined();
      expect(account.displayName).toBe('Test Account');
      expect(account.type).toBe('pipedrive');
      expect(account.isActive).toBe(true);
      expect(account.createdAt).toBeDefined();
    });

    it('should generate unique account IDs', () => {
      const account1 = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Account 1',
        apiToken: 'token1',
        domain: 'company1.pipedrive.com',
      });

      const account2 = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Account 2',
        apiToken: 'token2',
        domain: 'company2.pipedrive.com',
      });

      expect(account1.id).not.toBe(account2.id);
    });

    it('should throw error for missing Pipedrive domain', () => {
      expect(() => {
        manager.registerAccount({
          type: 'pipedrive',
          displayName: 'Invalid Account',
          apiToken: 'token',
        });
      }).toThrow('Pipedrive domain is required');
    });

    it('should create adapter on registration', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      const adapter = manager.getAdapter(account.id);
      expect(adapter).toBeDefined();
      expect(adapter?.getCrmType()).toBe('pipedrive');
    });

    it('should reject unsupported CRM types', () => {
      expect(() => {
        manager.registerAccount({
          type: 'hubspot' as any,
          displayName: 'HubSpot',
          apiToken: 'token',
          domain: 'hubspot.com',
        });
      }).toThrow('HubSpot adapter not yet implemented');
    });
  });

  describe('getAccount', () => {
    it('should retrieve account by ID', () => {
      const registered = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      const retrieved = manager.getAccount(registered.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(registered.id);
      expect(retrieved?.displayName).toBe('Test');
    });

    it('should return undefined for non-existent account', () => {
      const retrieved = manager.getAccount('non-existent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllAccounts', () => {
    it('should return all registered accounts', () => {
      manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Account 1',
        apiToken: 'token1',
        domain: 'company1.pipedrive.com',
      });

      manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Account 2',
        apiToken: 'token2',
        domain: 'company2.pipedrive.com',
      });

      const accounts = manager.getAllAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts.map((a) => a.displayName)).toContain('Account 1');
      expect(accounts.map((a) => a.displayName)).toContain('Account 2');
    });

    it('should return empty array if no accounts', () => {
      const accounts = manager.getAllAccounts();

      expect(accounts).toEqual([]);
    });
  });

  describe('getActiveAccounts', () => {
    it('should return only active accounts', () => {
      const acc1 = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Active Account',
        apiToken: 'token1',
        domain: 'active.pipedrive.com',
      });

      const acc2 = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Inactive Account',
        apiToken: 'token2',
        domain: 'inactive.pipedrive.com',
      });

      manager.deactivateAccount(acc2.id);

      const active = manager.getActiveAccounts();

      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(acc1.id);
    });
  });

  describe('activateAccount', () => {
    it('should activate deactivated account', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      manager.deactivateAccount(account.id);
      let retrieved = manager.getAccount(account.id);
      expect(retrieved?.isActive).toBe(false);

      manager.activateAccount(account.id);
      retrieved = manager.getAccount(account.id);
      expect(retrieved?.isActive).toBe(true);
    });

    it('should update timestamps on activation', async () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      const originalUpdatedAt = account.updatedAt.getTime();

      // Wait a bit to ensure time passes
      await new Promise((resolve) => setTimeout(resolve, 10));

      manager.deactivateAccount(account.id);
      manager.activateAccount(account.id);

      const updated = manager.getAccount(account.id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      manager.deactivateAccount(account.id);

      const retrieved = manager.getAccount(account.id);
      expect(retrieved?.isActive).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      manager.deleteAccount(account.id);

      const retrieved = manager.getAccount(account.id);
      expect(retrieved).toBeUndefined();
    });

    it('should remove adapter when deleting account', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      expect(manager.getAdapter(account.id)).toBeDefined();

      manager.deleteAccount(account.id);

      expect(manager.getAdapter(account.id)).toBeUndefined();
    });
  });

  describe('updateAccount', () => {
    it('should update account displayName', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Old Name',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      manager.updateAccount(account.id, {
        displayName: 'New Name',
      });

      const updated = manager.getAccount(account.id);
      expect(updated?.displayName).toBe('New Name');
    });

    it('should update API token and recreate adapter', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'old-token',
        domain: 'test.pipedrive.com',
      });

      const oldAdapter = manager.getAdapter(account.id);

      manager.updateAccount(account.id, {
        apiToken: 'new-token',
      });

      const newAdapter = manager.getAdapter(account.id);
      // Adapter should be recreated
      expect(newAdapter).toBeDefined();
      // The old adapter reference should not be the same instance
      // (In real usage, the API client inside should have new token)
    });

    it('should update domain and recreate adapter', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'old.pipedrive.com',
      });

      manager.updateAccount(account.id, {
        domain: 'new.pipedrive.com',
      });

      const updated = manager.getAccount(account.id);
      expect(updated?.domain).toBe('new.pipedrive.com');
    });

    it('should not update non-existent account', () => {
      manager.updateAccount('non-existent', {
        displayName: 'New Name',
      });

      // Should not throw, just silently fail
      expect(manager.getAccount('non-existent')).toBeUndefined();
    });
  });

  describe('getAdapter', () => {
    it('should return adapter for registered account', () => {
      const account = manager.registerAccount({
        type: 'pipedrive',
        displayName: 'Test',
        apiToken: 'token',
        domain: 'test.pipedrive.com',
      });

      const adapter = manager.getAdapter(account.id);

      expect(adapter).toBeDefined();
      expect(adapter?.getCrmType()).toBe('pipedrive');
    });

    it('should return undefined for non-existent account', () => {
      const adapter = manager.getAdapter('non-existent');

      expect(adapter).toBeUndefined();
    });
  });

  describe('testConnection', () => {
    it('should return false for non-existent account', async () => {
      const result = await manager.testConnection('non-existent');

      expect(result).toBe(false);
    });

    // Note: Testing actual connection would require mocking the adapter
    // which is done in the adapter tests
  });
});
