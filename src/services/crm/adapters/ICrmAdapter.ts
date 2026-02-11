/**
 * CRM Adapter Interface
 * Base abstrata para implementações específicas de CRM
 */

import type {
  Lead,
  LeadFilter,
  CreateLeadInput,
  UpdateLeadInput,
  MoveLadInput,
  Pipeline,
  Stage,
  FieldDefinition,
  CrmType,
} from '../../../models/crm.types';

export interface ICrmAdapter {
  /**
   * Get CRM type identifier
   */
  getCrmType(): CrmType;

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
