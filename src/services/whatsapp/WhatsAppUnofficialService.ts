import type {
  WhatsAppUnofficialAccount,
  WhatsAppUnofficialMessage,
} from '../../models/whatsapp.types';
import { WhatsAppAccountManager } from './WhatsAppAccountManager';

/**
 * WhatsApp Unofficial Service (Baileys/Community)
 * Handles account management and message storage for unofficial WhatsApp accounts
 * Supports multiple accounts with independent sessions
 */
export class WhatsAppUnofficialService {
  private accountManager: WhatsAppAccountManager;
  private messages: Map<string, Map<string, WhatsAppUnofficialMessage>> = new Map();

  constructor() {
    this.accountManager = new WhatsAppAccountManager();
  }

  /**
   * Register a new unofficial account
   */
  registerAccount(
    displayName: string,
    phoneNumber: string
  ): WhatsAppUnofficialAccount {
    return this.accountManager.registerUnofficialAccount(
      displayName,
      phoneNumber
    );
  }

  /**
   * Get account by ID
   */
  getAccount(accountId: string): WhatsAppUnofficialAccount | undefined {
    return this.accountManager.getUnofficialAccount(accountId);
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): WhatsAppUnofficialAccount[] {
    return this.accountManager.getAllUnofficialAccounts();
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(
    accountId: string,
    status: 'connected' | 'disconnected' | 'qr_code' | 'error',
    isConnected: boolean
  ): boolean {
    return this.accountManager.updateConnectionStatus(
      accountId,
      status,
      isConnected
    );
  }

  /**
   * Update session data and JID
   */
  updateSessionData(
    accountId: string,
    sessionData: Record<string, unknown>,
    jid?: string
  ): boolean {
    return this.accountManager.updateSessionData(accountId, sessionData, jid);
  }

  /**
   * Activate account
   */
  activateAccount(accountId: string): boolean {
    return this.accountManager.activateUnofficialAccount(accountId);
  }

  /**
   * Deactivate account
   */
  deactivateAccount(accountId: string): boolean {
    return this.accountManager.deactivateUnofficialAccount(accountId);
  }

  /**
   * Delete account
   */
  deleteAccount(accountId: string): boolean {
    // Remove messages when account is deleted
    this.messages.delete(accountId);
    return this.accountManager.deleteUnofficialAccount(accountId);
  }

  /**
   * Store message in memory (in production, use database)
   */
  async storeMessage(
    accountId: string,
    messageData: any
  ): Promise<WhatsAppUnofficialMessage> {
    const account = this.accountManager.getUnofficialAccount(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const message: WhatsAppUnofficialMessage = {
      accountId,
      messageId: messageData.id,
      chatId: messageData.from || messageData.to || '',
      phoneNumber: messageData.from ? messageData.from.replace(/@.*/, '') : '',
      displayName: messageData.pushName,
      messageType: this.mapMessageType(messageData.type),
      content: this.extractContent(messageData),
      timestamp: new Date(messageData.timestamp * 1000),
      status: messageData.fromMe ? 'sent' : 'received',
      isFromMe: messageData.fromMe || false,
      hasMedia: messageData.hasMedia || false,
    };

    if (!this.messages.has(accountId)) {
      this.messages.set(accountId, new Map());
    }

    this.messages.get(accountId)!.set(messageData.id, message);
    return message;
  }

  /**
   * Map Baileys message type to standard type
   */
  private mapMessageType(
    type: string
  ):
    | 'text'
    | 'image'
    | 'document'
    | 'audio'
    | 'video'
    | 'location'
    | 'contact' {
    const typeMap: Record<string, any> = {
      text: 'text',
      extendedText: 'text',
      image: 'image',
      audio: 'audio',
      video: 'video',
      document: 'document',
      location: 'location',
      contact: 'contact',
      sticker: 'image',
      vcard: 'contact',
    };

    return typeMap[type] || 'text';
  }

  /**
   * Extract message content
   */
  private extractContent(messageData: any): Record<string, unknown> {
    const content: Record<string, unknown> = {};

    if (messageData.body) {
      content.text = messageData.body;
    }

    if (messageData.type === 'image' && messageData.mediaKey) {
      content.imageUrl = `data:image/jpeg;base64,${messageData.mediaKey}`;
    }

    if (messageData.type === 'document' && messageData.filename) {
      content.documentFileName = messageData.filename;
      content.documentUrl = `file://${messageData.filename}`;
    }

    if (messageData.type === 'audio' && messageData.mediaKey) {
      content.audioUrl = `data:audio/ogg;base64,${messageData.mediaKey}`;
      content.audioMimetype = 'audio/ogg';
    }

    if (messageData.type === 'video' && messageData.mediaKey) {
      content.videoUrl = `data:video/mp4;base64,${messageData.mediaKey}`;
    }

    if (messageData.type === 'location' && messageData.loc) {
      const loc = messageData.loc.split(',');
      content.latitude = parseFloat(loc[0]);
      content.longitude = parseFloat(loc[1]);
    }

    if (messageData.type === 'contact' && messageData.vcard) {
      content.contactCard = messageData.vcard;
    }

    return content;
  }

  /**
   * Get message by ID
   */
  getMessage(
    accountId: string,
    messageId: string
  ): WhatsAppUnofficialMessage | undefined {
    return this.messages.get(accountId)?.get(messageId);
  }

  /**
   * Get all messages for account
   */
  getAccountMessages(accountId: string): WhatsAppUnofficialMessage[] {
    return Array.from(this.messages.get(accountId)?.values() ?? []);
  }

  /**
   * Clear messages for account (for testing)
   */
  clearAccountMessages(accountId: string): void {
    this.messages.delete(accountId);
  }

  /**
   * Get account manager for advanced operations
   */
  getAccountManager(): WhatsAppAccountManager {
    return this.accountManager;
  }
}
