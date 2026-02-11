import { v4 as uuidv4 } from 'uuid';
import type {
  WhatsAppBusinessAccount,
  WhatsAppUnofficialAccount,
  WhatsAppAccountConfig,
} from '../../models/whatsapp.types';

/**
 * Manages multiple WhatsApp accounts (both Business and Unofficial)
 * Supports dynamic account creation, deletion, and activation
 */
export class WhatsAppAccountManager {
  private businessAccounts: Map<string, WhatsAppBusinessAccount> = new Map();
  private unofficialAccounts: Map<string, WhatsAppUnofficialAccount> = new Map();
  private config: WhatsAppAccountConfig;

  constructor(config?: Partial<WhatsAppAccountConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
      webhookTimeout: config?.webhookTimeout ?? 30000,
      messageQueueSize: config?.messageQueueSize ?? 1000,
      sessionTimeout: config?.sessionTimeout ?? 300000,
    };
  }

  /**
   * Register a WhatsApp Business API account
   */
  registerBusinessAccount(
    displayName: string,
    phoneNumberId: string,
    accessToken: string,
    waBusinessAccountId: string
  ): WhatsAppBusinessAccount {
    const account: WhatsAppBusinessAccount = {
      id: uuidv4(),
      type: 'business',
      displayName,
      phoneNumberId,
      accessToken,
      waBusinessAccountId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.businessAccounts.set(account.id, account);
    return account;
  }

  /**
   * Register a WhatsApp Unofficial account
   */
  registerUnofficialAccount(
    displayName: string,
    phoneNumber: string
  ): WhatsAppUnofficialAccount {
    const account: WhatsAppUnofficialAccount = {
      id: uuidv4(),
      type: 'unofficial',
      displayName,
      phoneNumber,
      credentials: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isConnected: false,
      connectionStatus: 'disconnected',
    };

    this.unofficialAccounts.set(account.id, account);
    return account;
  }

  /**
   * Get business account by ID
   */
  getBusinessAccount(accountId: string): WhatsAppBusinessAccount | undefined {
    return this.businessAccounts.get(accountId);
  }

  /**
   * Get unofficial account by ID
   */
  getUnofficialAccount(accountId: string): WhatsAppUnofficialAccount | undefined {
    return this.unofficialAccounts.get(accountId);
  }

  /**
   * Get all business accounts
   */
  getAllBusinessAccounts(): WhatsAppBusinessAccount[] {
    return Array.from(this.businessAccounts.values());
  }

  /**
   * Get all unofficial accounts
   */
  getAllUnofficialAccounts(): WhatsAppUnofficialAccount[] {
    return Array.from(this.unofficialAccounts.values());
  }

  /**
   * Get all active accounts (both types)
   */
  getActiveAccounts(): (WhatsAppBusinessAccount | WhatsAppUnofficialAccount)[] {
    const active: (WhatsAppBusinessAccount | WhatsAppUnofficialAccount)[] = [];
    for (const acc of this.businessAccounts.values()) {
      if (acc.isActive) active.push(acc);
    }
    for (const acc of this.unofficialAccounts.values()) {
      if (acc.isActive) active.push(acc);
    }
    return active;
  }

  /**
   * Activate business account
   */
  activateBusinessAccount(accountId: string): boolean {
    const account = this.businessAccounts.get(accountId);
    if (account) {
      account.isActive = true;
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Activate unofficial account
   */
  activateUnofficialAccount(accountId: string): boolean {
    const account = this.unofficialAccounts.get(accountId);
    if (account) {
      account.isActive = true;
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Deactivate business account
   */
  deactivateBusinessAccount(accountId: string): boolean {
    const account = this.businessAccounts.get(accountId);
    if (account) {
      account.isActive = false;
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Deactivate unofficial account
   */
  deactivateUnofficialAccount(accountId: string): boolean {
    const account = this.unofficialAccounts.get(accountId);
    if (account) {
      account.isActive = false;
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Update unofficial account connection status
   */
  updateConnectionStatus(
    accountId: string,
    status: 'connected' | 'disconnected' | 'qr_code' | 'error',
    isConnected: boolean
  ): boolean {
    const account = this.unofficialAccounts.get(accountId);
    if (account) {
      account.connectionStatus = status;
      account.isConnected = isConnected;
      if (isConnected) {
        account.lastConnectAt = new Date();
      }
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Update unofficial account session data
   */
  updateSessionData(
    accountId: string,
    sessionData: Record<string, unknown>,
    jid?: string
  ): boolean {
    const account = this.unofficialAccounts.get(accountId);
    if (account) {
      account.credentials.sessionData = sessionData;
      if (jid) {
        account.credentials.jid = jid;
      }
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Delete business account
   */
  deleteBusinessAccount(accountId: string): boolean {
    return this.businessAccounts.delete(accountId);
  }

  /**
   * Delete unofficial account
   */
  deleteUnofficialAccount(accountId: string): boolean {
    return this.unofficialAccounts.delete(accountId);
  }

  /**
   * Get total number of accounts
   */
  getTotalAccounts(): number {
    return this.businessAccounts.size + this.unofficialAccounts.size;
  }

  /**
   * Get account config
   */
  getConfig(): WhatsAppAccountConfig {
    return this.config;
  }

  /**
   * Clear all accounts (for testing)
   */
  clearAllAccounts(): void {
    this.businessAccounts.clear();
    this.unofficialAccounts.clear();
  }
}
