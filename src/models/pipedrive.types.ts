/**
 * Pipedrive CRM Integration Types
 * Supports:
 * 1. Multiple Pipedrive accounts/organizations
 * 2. Lead creation and management
 * 3. Contact deduplication
 * 4. Field mapping from Meta/WhatsApp
 */

// ============================================
// Account Configuration
// ============================================

export interface PipedriveAccount {
  id: string; // UUID
  displayName: string;
  companyDomain: string; // e.g., "mycompany.pipedrive.com"
  apiToken: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// ============================================
// Lead & Contact Types
// ============================================

export interface PipedriveContact {
  id?: number; // Pipedrive contact ID
  name: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  organization?: string;
  customFields?: Record<string, unknown>;
}

export interface PipedriveLead {
  id?: number; // Pipedrive lead ID
  title: string;
  value?: number;
  currency?: string;
  personId?: number; // Contact ID in Pipedrive
  pipelineId: number;
  stageId: number;
  source?: string;
  customFields?: Record<string, unknown>;
  notes?: string;
}

export interface PipedriveLeadResponse {
  success: boolean;
  data?: {
    id: number;
    [key: string]: unknown;
  };
  error?: string;
  additionalData?: {
    [key: string]: unknown;
  };
}

// ============================================
// API Client Types
// ============================================

export interface PipedriveApiConfig {
  companyDomain: string;
  apiToken: string;
  timeout: number; // ms
  retries: number;
  retryDelay: number; // ms
}

export interface PipedriveApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  additionalData?: Record<string, unknown>;
  error?: string;
  errorCode?: number;
}

// ============================================
// Lead Creation & Mapping
// ============================================

export interface LeadCreationPayload {
  accountId: string;
  source: 'meta' | 'whatsapp'; // Where the lead came from
  sourceId: string; // Meta event ID or WhatsApp message ID
  contact: PipedriveContact;
  lead: Partial<PipedriveLead>;
  deduplicateBy: ('email' | 'phone')[];
  metadata?: Record<string, unknown>;
}

export interface LeadCreationResult {
  success: boolean;
  accountId: string;
  sourceId: string;
  contactId?: number;
  leadId?: number;
  isDuplicate: boolean;
  duplicateOf?: number;
  errors?: Array<{
    field: string;
    error: string;
  }>;
}

// ============================================
// Field Mapping
// ============================================

export interface FieldMapping {
  sourceField: string; // e.g., "userData.email"
  targetField: string; // e.g., "email"
  transformer?: (value: unknown) => unknown;
  required: boolean;
}

export interface LeadFieldMapper {
  accountId: string;
  mappings: FieldMapping[];
  customFields: Record<string, string>; // Custom field mappings
}

// ============================================
// Deduplication
// ============================================

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateIds: number[];
  matchScore: number; // 0-1
  matchedFields: string[];
}

export interface ContactDeduplicator {
  accountId: string;
  checkBy: ('email' | 'phone')[];
  createIfNotFound: boolean;
}

// ============================================
// Sync & Webhook Types
// ============================================

export interface PipedriveWebhookEvent {
  id: string;
  type: string; // "person.added", "deal.added", etc
  timestamp: number;
  data: Record<string, unknown>;
  accountId: string;
}

export interface SyncResult {
  success: boolean;
  accountId: string;
  itemsProcessed: number;
  itemsSkipped: number;
  errors?: Array<{
    itemId: string;
    error: string;
  }>;
}
