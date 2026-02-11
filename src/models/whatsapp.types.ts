/**
 * WhatsApp Integration Types
 * Supports:
 * 1. WhatsApp Business API (Meta)
 * 2. WhatsApp Unofficial API (community-driven)
 *
 * Multiple accounts supported via accountId identifier
 */

// ============================================
// WhatsApp Business API (Meta) Types
// ============================================

export interface WhatsAppBusinessAccount {
  id: string; // Unique account identifier (UUID)
  type: 'business';
  displayName: string;
  phoneNumberId: string;
  accessToken: string;
  waBusinessAccountId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface WhatsAppBusinessMessage {
  accountId: string; // Reference to WhatsAppBusinessAccount
  waMessageId: string; // From Meta API
  phoneNumber: string; // Sender phone (E164 format)
  displayName?: string;
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location';
  content: {
    text?: string;
    imageUrl?: string;
    documentUrl?: string;
    documentFileName?: string;
    audioUrl?: string;
    videoUrl?: string;
    latitude?: number;
    longitude?: number;
  };
  timestamp: Date;
  status: 'received' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface WhatsAppBusinessWebhookPayload {
  object: string; // "whatsapp_business_account"
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: {
            id: string;
            mime_type: string;
          };
          document?: {
            id: string;
            mime_type: string;
            sha256: string;
            filename: string;
          };
          audio?: {
            id: string;
            mime_type: string;
          };
          video?: {
            id: string;
            mime_type: string;
          };
          location?: {
            latitude: number;
            longitude: number;
            name?: string;
            address?: string;
          };
          button?: {
            payload: string;
          };
          interactive?: {
            type: string;
            button_reply?: {
              id: string;
              title: string;
            };
            list_reply?: {
              id: string;
              title: string;
              description: string;
            };
          };
        }>;
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// ============================================
// WhatsApp Unofficial API Types
// ============================================

export interface WhatsAppUnofficialAccount {
  id: string; // Unique account identifier (UUID)
  type: 'unofficial';
  displayName: string;
  phoneNumber: string; // E164 format (+55...)
  sessionId?: string; // Baileys session identifier
  credentials: {
    jid?: string; // User JID (phone@c.us)
    sessionData?: Record<string, unknown>; // Encrypted session
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'qr_code' | 'error';
  lastConnectAt?: Date;
}

export interface WhatsAppUnofficialMessage {
  accountId: string; // Reference to WhatsAppUnofficialAccount
  messageId: string;
  chatId: string; // conversation ID
  phoneNumber: string;
  displayName?: string;
  messageType:
    | 'text'
    | 'image'
    | 'document'
    | 'audio'
    | 'video'
    | 'location'
    | 'contact';
  content: {
    text?: string;
    imageUrl?: string;
    documentUrl?: string;
    documentFileName?: string;
    audioUrl?: string;
    audioMimetype?: string;
    videoUrl?: string;
    latitude?: number;
    longitude?: number;
    contactCard?: string;
  };
  timestamp: Date;
  status: 'received' | 'sent' | 'delivered' | 'read' | 'failed';
  isFromMe: boolean;
  hasMedia: boolean;
}

export interface WhatsAppQRCode {
  accountId: string;
  qrCodeData: string; // Base64 encoded
  qrCodeUrl?: string; // Data URL for rendering
  expiresAt: Date;
}

// ============================================
// Unified Message Types
// ============================================

export interface UnifiedWhatsAppMessage {
  id: string;
  accountId: string;
  accountType: 'business' | 'unofficial';
  phoneNumber: string;
  displayName?: string;
  messageType: string;
  content: Record<string, unknown>;
  timestamp: Date;
  status: string;
  pipedriveLeadId?: string;
  metaConversionEventId?: string;
}

// ============================================
// Configuration & Management
// ============================================

export interface WhatsAppAccountConfig {
  maxRetries: number;
  retryDelay: number; // ms
  webhookTimeout: number; // ms
  messageQueueSize: number;
  sessionTimeout: number; // ms
}

export interface WhatsAppProcessResult {
  success: boolean;
  accountId: string;
  messagesProcessed: number;
  errors?: Array<{
    messageId: string;
    error: string;
  }>;
}
