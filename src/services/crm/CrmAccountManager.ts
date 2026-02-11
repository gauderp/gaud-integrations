/**
 * CrmAccountManager - Gerenciamento de contas CRM
 * Suporta múltiplas contas de diferentes CRMs
 */

import type { CrmAccount, CrmType } from '../../models/crm.types';
import { PipedriveAdapter } from './adapters/PipedriveAdapter';
import type { ICrmAdapter } from './adapters/ICrmAdapter';
import { v4 as uuidv4 } from 'uuid';

interface CrmAccountConfig {
  type: CrmType;
  displayName: string;
  apiToken: string;
  domain?: string;
  extraConfig?: Record<string, unknown>;
}

export class CrmAccountManager {
  private accounts: Map<string, CrmAccount> = new Map();
  private adapters: Map<string, ICrmAdapter> = new Map();

  /**
   * Registrar uma nova conta CRM
   */
  registerAccount(config: CrmAccountConfig): CrmAccount {
    const accountId = uuidv4();
    const now = new Date();

    const account: CrmAccount = {
      id: accountId,
      type: config.type,
      displayName: config.displayName,
      apiToken: config.apiToken,
      domain: config.domain,
      extraConfig: config.extraConfig,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.accounts.set(accountId, account);

    // Criar adapter baseado no tipo CRM
    const adapter = this.createAdapter(config);
    this.adapters.set(accountId, adapter);

    return account;
  }

  /**
   * Obter conta por ID
   */
  getAccount(accountId: string): CrmAccount | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Listar todas as contas
   */
  getAllAccounts(): CrmAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Listar contas ativas
   */
  getActiveAccounts(): CrmAccount[] {
    return Array.from(this.accounts.values()).filter((acc) => acc.isActive);
  }

  /**
   * Obter adapter para uma conta
   */
  getAdapter(accountId: string): ICrmAdapter | undefined {
    return this.adapters.get(accountId);
  }

  /**
   * Ativar conta
   */
  activateAccount(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (account) {
      account.isActive = true;
      account.updatedAt = new Date();
    }
  }

  /**
   * Desativar conta
   */
  deactivateAccount(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (account) {
      account.isActive = false;
      account.updatedAt = new Date();
    }
  }

  /**
   * Deletar conta
   */
  deleteAccount(accountId: string): void {
    this.accounts.delete(accountId);
    this.adapters.delete(accountId);
  }

  /**
   * Atualizar conta
   */
  updateAccount(accountId: string, updates: Partial<CrmAccountConfig>): void {
    const account = this.accounts.get(accountId);
    if (!account) return;

    if (updates.displayName) account.displayName = updates.displayName;
    if (updates.apiToken) account.apiToken = updates.apiToken;
    if (updates.domain) account.domain = updates.domain;
    if (updates.extraConfig) account.extraConfig = updates.extraConfig;

    account.updatedAt = new Date();

    // Recriar adapter se configuração mudou
    if (updates.apiToken || updates.domain) {
      const config = {
        type: account.type,
        displayName: account.displayName,
        apiToken: updates.apiToken || account.apiToken,
        domain: updates.domain || account.domain,
        extraConfig: account.extraConfig,
      };
      const adapter = this.createAdapter(config);
      this.adapters.set(accountId, adapter);
    }
  }

  /**
   * Testar conexão da conta
   */
  async testConnection(accountId: string): Promise<boolean> {
    const adapter = this.getAdapter(accountId);
    if (!adapter) return false;

    try {
      return await adapter.testConnection(accountId);
    } catch (error) {
      console.error('[CrmAccountManager] testConnection error:', error);
      return false;
    }
  }

  /**
   * Helper: Criar adapter baseado no tipo CRM
   */
  private createAdapter(config: CrmAccountConfig): ICrmAdapter {
    switch (config.type) {
      case 'pipedrive':
        if (!config.domain) {
          throw new Error('Pipedrive domain is required');
        }
        return new PipedriveAdapter(config.apiToken, config.domain);

      case 'hubspot':
        // TODO: Implementar HubSpotAdapter
        throw new Error('HubSpot adapter not yet implemented');

      case 'salesforce':
        // TODO: Implementar SalesforceAdapter
        throw new Error('Salesforce adapter not yet implemented');

      default:
        throw new Error(`Unsupported CRM type: ${config.type}`);
    }
  }
}
