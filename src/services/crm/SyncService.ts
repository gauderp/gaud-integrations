/**
 * SyncService - Sincronização bidirecional de leads
 * Mantém dados do CRM sincronizados com backoffice
 */

import type { CrmAccountManager } from './CrmAccountManager';
import type { Lead, SyncStatus } from '../../models/crm.types';

export class SyncService {
  private syncStatus: Map<string, SyncStatus> = new Map();
  private lastSyncTime: Map<string, Date> = new Map();

  constructor(private accountManager: CrmAccountManager) {}

  /**
   * Sincronizar todos os leads de uma conta
   */
  async syncAccountLeads(accountId: string): Promise<SyncStatus> {
    const adapter = this.accountManager.getAdapter(accountId);
    if (!adapter) {
      throw new Error(`Adapter not found for account ${accountId}`);
    }

    const status: SyncStatus = {
      accountId,
      lastSyncAt: new Date(),
      leadsCount: 0,
      failedCount: 0,
      pendingCount: 0,
      status: 'syncing',
    };

    try {
      // Buscar todos os leads do CRM
      const leads = await adapter.getLeads(accountId);

      status.leadsCount = leads.length;
      status.status = 'idle';
      status.lastSyncAt = new Date();

      this.syncStatus.set(accountId, status);
      this.lastSyncTime.set(accountId, new Date());

      return status;
    } catch (error) {
      console.error('[SyncService] syncAccountLeads error:', error);

      status.status = 'error';
      status.failedCount = status.leadsCount;
      this.syncStatus.set(accountId, status);

      throw error;
    }
  }

  /**
   * Sincronizar lead específico
   */
  async syncLead(accountId: string, leadId: string): Promise<Lead> {
    const adapter = this.accountManager.getAdapter(accountId);
    if (!adapter) {
      throw new Error(`Adapter not found for account ${accountId}`);
    }

    return adapter.syncLead(accountId, leadId);
  }

  /**
   * Obter status de sincronização
   */
  getSyncStatus(accountId: string): SyncStatus | undefined {
    return this.syncStatus.get(accountId);
  }

  /**
   * Obter última sincronização
   */
  getLastSyncTime(accountId: string): Date | undefined {
    return this.lastSyncTime.get(accountId);
  }

  /**
   * Verificar se precisa sincronizar (intervalo em minutos)
   */
  shouldSync(accountId: string, intervalMinutes: number = 5): boolean {
    const lastSync = this.lastSyncTime.get(accountId);
    if (!lastSync) return true;

    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

    return diffMinutes >= intervalMinutes;
  }

  /**
   * Limpar status de sincronização
   */
  clearSyncStatus(accountId: string): void {
    this.syncStatus.delete(accountId);
    this.lastSyncTime.delete(accountId);
  }
}
