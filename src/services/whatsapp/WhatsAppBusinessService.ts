import type {
  WhatsAppBusinessAccount,
  WhatsAppBusinessMessage,
  WhatsAppBusinessWebhookPayload,
  WhatsAppProcessResult,
} from '../../models/whatsapp.types';
import { WhatsAppAccountManager } from './WhatsAppAccountManager';

/**
 * WhatsApp Business API Service (Meta)
 * Handles webhook processing and message management for WhatsApp Business accounts
 */
export class WhatsAppBusinessService {
  private accountManager: WhatsAppAccountManager;
  private messages: Map<string, Map<string, WhatsAppBusinessMessage>> = new Map();

  constructor() {
    this.accountManager = new WhatsAppAccountManager();
  }

  /**
   * Register a new WhatsApp Business account
   */
  registerAccount(
    displayName: string,
    phoneNumberId: string,
    accessToken: string,
    waBusinessAccountId: string
  ): WhatsAppBusinessAccount {
    return this.accountManager.registerBusinessAccount(
      displayName,
      phoneNumberId,
      accessToken,
      waBusinessAccountId
    );
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): WhatsAppBusinessAccount | undefined {
    return this.accountManager.getBusinessAccount(accountId);
  }

  /**
   * Process webhook message from WhatsApp Business API
   */
  async processWebhookMessage(
    accountId: string,
    payload: WhatsAppBusinessWebhookPayload
  ): Promise<WhatsAppProcessResult> {
    try {
      // Verify account exists and is active
      const account = this.accountManager.getBusinessAccount(accountId);
      if (!account) {
        return {
          success: false,
          accountId,
          messagesProcessed: 0,
          errors: [{ messageId: 'unknown', error: 'Account not found' }],
        };
      }

      if (!account.isActive) {
        return {
          success: false,
          accountId,
          messagesProcessed: 0,
          errors: [{ messageId: 'unknown', error: 'Account is not active' }],
        };
      }

      const errors: Array<{ messageId: string; error: string }> = [];
      let processed = 0;

      // Process entries
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          // Process incoming messages
          if (value.messages && value.contacts) {
            for (const message of value.messages) {
              try {
                const contact = value.contacts[0];
                await this.storeMessage(
                  accountId,
                  message,
                  contact.wa_id,
                  contact.profile.name
                );
                processed++;
              } catch (error) {
                errors.push({
                  messageId: message.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }
          }

          // Process message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              // Handle status updates (delivered, read, etc)
              // In production, update database status
              console.debug('[WhatsAppBusinessService] Status update:', status.id);
              processed++;
            }
          }
        }
      }

      const result: WhatsAppProcessResult = {
        success: errors.length === 0,
        accountId,
        messagesProcessed: processed,
      };

      if (errors.length > 0) {
        result.errors = errors;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        accountId,
        messagesProcessed: 0,
        errors: [
          {
            messageId: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  /**
   * Store message in memory (in production, use database)
   */
  private async storeMessage(
    accountId: string,
    messageData: any,
    phoneNumber: string,
    displayName: string
  ): Promise<void> {
    const message: WhatsAppBusinessMessage = {
      accountId,
      waMessageId: messageData.id,
      phoneNumber,
      displayName,
      messageType: messageData.type || 'text',
      content: this.extractContent(messageData),
      timestamp: new Date(parseInt(messageData.timestamp) * 1000),
      status: 'received',
    };

    if (!this.messages.has(accountId)) {
      this.messages.set(accountId, new Map());
    }

    this.messages.get(accountId)!.set(messageData.id, message);
  }

  /**
   * Extract message content based on type
   */
  private extractContent(messageData: any): WhatsAppBusinessMessage['content'] {
    const content: WhatsAppBusinessMessage['content'] = {};

    if (messageData.text) {
      content.text = messageData.text.body;
    }

    if (messageData.image) {
      content.imageUrl = `https://graph.instagram.com/v18.0/${messageData.image.id}/image`;
    }

    if (messageData.document) {
      content.documentUrl = `https://graph.instagram.com/v18.0/${messageData.document.id}/document`;
      content.documentFileName = messageData.document.filename;
    }

    if (messageData.audio) {
      content.audioUrl = `https://graph.instagram.com/v18.0/${messageData.audio.id}/audio`;
    }

    if (messageData.video) {
      content.videoUrl = `https://graph.instagram.com/v18.0/${messageData.video.id}/video`;
    }

    if (messageData.location) {
      content.latitude = messageData.location.latitude;
      content.longitude = messageData.location.longitude;
    }

    return content;
  }

  /**
   * Get message by ID
   */
  getMessage(
    accountId: string,
    messageId: string
  ): WhatsAppBusinessMessage | undefined {
    return this.messages.get(accountId)?.get(messageId);
  }

  /**
   * Get all messages for an account
   */
  getAccountMessages(accountId: string): WhatsAppBusinessMessage[] {
    return Array.from(this.messages.get(accountId)?.values() ?? []);
  }

  /**
   * Clear all messages for an account (for testing)
   */
  clearAccountMessages(accountId: string): void {
    this.messages.delete(accountId);
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): WhatsAppBusinessAccount[] {
    return this.accountManager.getAllBusinessAccounts();
  }

  /**
   * Get account manager for advanced operations
   */
  getAccountManager(): WhatsAppAccountManager {
    return this.accountManager;
  }
}
