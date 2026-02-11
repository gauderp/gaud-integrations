import { v4 as uuidv4 } from 'uuid';
import type { PipedriveAccount } from '../../models/pipedrive.types';

/**
 * Manages multiple Pipedrive accounts
 * Supports dynamic account creation, deletion, and activation
 */
export class PipedriveAccountManager {
  private accounts: Map<string, PipedriveAccount> = new Map();

  /**
   * Register a new Pipedrive account
   */
  registerAccount(
    displayName: string,
    companyDomain: string,
    apiToken: string
  ): PipedriveAccount {
    const account: PipedriveAccount = {
      id: uuidv4(),
      displayName,
      companyDomain,
      apiToken,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.accounts.set(account.id, account);
    return account;
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): PipedriveAccount | undefined {
    return this.accounts.get(accountId);
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): PipedriveAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get all active accounts
   */
  getActiveAccounts(): PipedriveAccount[] {
    return Array.from(this.accounts.values()).filter((acc) => acc.isActive);
  }

  /**
   * Activate account
   */
  activateAccount(accountId: string): boolean {
    const account = this.accounts.get(accountId);
    if (account) {
      account.isActive = true;
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Deactivate account
   */
  deactivateAccount(accountId: string): boolean {
    const account = this.accounts.get(accountId);
    if (account) {
      account.isActive = false;
      account.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Delete account
   */
  deleteAccount(accountId: string): boolean {
    return this.accounts.delete(accountId);
  }

  /**
   * Get total number of accounts
   */
  getTotalAccounts(): number {
    return this.accounts.size;
  }

  /**
   * Clear all accounts (for testing)
   */
  clearAllAccounts(): void {
    this.accounts.clear();
  }
}
