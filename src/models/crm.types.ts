/**
 * Core CRM Types - Multi-CRM Support
 * Agnóstico a CRM específico (Pipedrive, HubSpot, Salesforce, etc)
 */

export type CrmType = 'pipedrive' | 'hubspot' | 'salesforce';

/**
 * Field Definition - Para renderizar dinamicamente no frontend
 */
export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'currency';
  required: boolean;
  readOnly: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;

  // Mapeamento CRM
  crmFieldName: string;      // "custom_fields.123456" no Pipedrive, "hubspot_field_id" no HubSpot
  crmType: CrmType;

  // Validação
  regex?: string;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
}

/**
 * Pipeline - Fluxo de vendas
 */
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: Stage[];
  crmType: CrmType;
  externalId?: string; // ID no CRM externo
}

/**
 * Stage - Etapa do pipeline
 */
export interface Stage {
  id: string;
  name: string;
  pipelineId: string;
  order: number;
  color?: string;
  crmType: CrmType;
  externalId?: string; // ID no CRM externo
}

/**
 * Lead - Oportunidade/Deal
 */
export interface Lead {
  // IDs
  id: string;                    // UUID interno
  externalId: string;            // ID no CRM (Pipedrive: deal_id, HubSpot: dealId, etc)
  crmAccountId: string;          // Qual conta CRM este lead pertence

  // Campos padrão (universal)
  title: string;
  email?: string;
  phone?: string;
  companyName?: string;

  // Status/Pipeline
  pipelineId: string;
  stageId: string;
  stageName: string;

  // Campos dinâmicos por CRM
  customFields: Record<string, unknown>;

  // Metadata
  source?: 'meta' | 'whatsapp' | 'manual' | 'api';
  sourceId?: string;             // Meta event ID ou WhatsApp message ID
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  syncError?: string;

  // Type info
  crmType: CrmType;
}

/**
 * Lead Filter - Para buscar/filtrar leads
 */
export interface LeadFilter {
  pipelineId?: string;
  stageId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Lead Input - Para criar/atualizar
 */
export interface CreateLeadInput {
  title: string;
  email?: string;
  phone?: string;
  companyName?: string;
  pipelineId: string;
  stageId: string;
  customFields?: Record<string, unknown>;
  source?: string;
  sourceId?: string;
}

export interface UpdateLeadInput {
  title?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  customFields?: Record<string, unknown>;
}

export interface MoveLadInput {
  stageId: string;
}

/**
 * CRM Account - Conexão configurada com CRM
 */
export interface CrmAccount {
  id: string;
  type: CrmType;
  displayName: string;
  apiToken: string;            // Encrypted em DB
  domain?: string;              // Para Pipedrive: "company.pipedrive.com"
  extraConfig?: Record<string, unknown>; // Configurações adicionais por CRM
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CRM Adapter Interface - Implementado por cada CRM (Pipedrive, HubSpot, etc)
 */
export interface ICrmAdapter {
  /**
   * Leads Operations
   */
  getLeads(accountId: string, filters?: LeadFilter): Promise<Lead[]>;
  getLead(accountId: string, leadId: string): Promise<Lead>;
  createLead(accountId: string, data: CreateLeadInput): Promise<Lead>;
  updateLead(accountId: string, leadId: string, data: UpdateLeadInput): Promise<Lead>;
  moveLead(accountId: string, leadId: string, data: MoveLadInput): Promise<Lead>;
  deleteLead(accountId: string, leadId: string): Promise<void>;

  /**
   * Pipelines & Stages
   */
  getPipelines(accountId: string): Promise<Pipeline[]>;
  getPipeline(accountId: string, pipelineId: string): Promise<Pipeline>;
  getStages(accountId: string, pipelineId: string): Promise<Stage[]>;

  /**
   * Fields (para renderizar form dinamicamente)
   */
  getFields(accountId: string, objectType: 'lead' | 'deal' | 'contact'): Promise<FieldDefinition[]>;

  /**
   * Sync & Webhooks
   */
  syncLead(accountId: string, leadId: string): Promise<Lead>;
  getWebhookUrl(): string;
  verifyWebhook(signature: string, payload: string): boolean;
  parseWebhookEvent(payload: any): { type: string; data: any } | null;

  /**
   * Health Check
   */
  testConnection(accountId: string): Promise<boolean>;
}

/**
 * Webhook Event - Recebido de CRM
 */
export interface WebhookEvent {
  id: string;
  type: 'lead.created' | 'lead.updated' | 'lead.deleted' | 'lead.stage_changed' | 'custom';
  crmType: CrmType;
  crmAccountId: string;
  data: any;
  timestamp: Date;
  processed: boolean;
  error?: string;
}

/**
 * Sync Status - Track sincronização
 */
export interface SyncStatus {
  accountId: string;
  lastSyncAt?: Date;
  leadsCount: number;
  failedCount: number;
  pendingCount: number;
  status: 'idle' | 'syncing' | 'error';
}
