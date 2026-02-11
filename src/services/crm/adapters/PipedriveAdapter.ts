/**
 * PipedriveAdapter - Implementação de ICrmAdapter para Pipedrive
 */

import type { ICrmAdapter } from './ICrmAdapter';
import type {
  Lead,
  LeadFilter,
  CreateLeadInput,
  UpdateLeadInput,
  MoveLadInput,
  Pipeline,
  Stage,
  FieldDefinition,
} from '../../../models/crm.types';
import { PipedriveApiClient } from '../clients/PipedriveApiClient';
import { FieldMapper } from '../mappers/FieldMapper';
import { LeadMapper } from '../mappers/LeadMapper';

export class PipedriveAdapter implements ICrmAdapter {
  private apiClient: PipedriveApiClient;
  private fieldMapper: FieldMapper;
  private leadMapper: LeadMapper;

  constructor(apiToken: string, companyDomain: string) {
    this.apiClient = new PipedriveApiClient({
      companyDomain,
      apiToken,
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
    });

    this.fieldMapper = new FieldMapper();
    this.leadMapper = new LeadMapper();
  }

  getCrmType() {
    return 'pipedrive' as const;
  }

  /**
   * Buscar leads com filtros
   */
  async getLeads(accountId: string, filters?: LeadFilter): Promise<Lead[]> {
    try {
      const pipelineId = filters?.pipelineId || '1';
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const response = await this.apiClient.getDeals({
        pipeline_id: parseInt(pipelineId),
        limit,
        start: offset,
        sort: filters?.sortBy ? `${filters.sortBy}` : 'modified_desc',
      });

      if (!response.success || !Array.isArray(response.data)) {
        return [];
      }

      const leads: Lead[] = [];

      for (const deal of response.data) {
        const lead = await this.mapPipedriveDealToLead(deal, accountId);
        leads.push(lead);
      }

      return leads;
    } catch (error) {
      console.error('[PipedriveAdapter] getLeads error:', error);
      throw error;
    }
  }

  /**
   * Buscar lead específico
   */
  async getLead(accountId: string, leadId: string): Promise<Lead> {
    try {
      const response = await this.apiClient.getDeal(parseInt(leadId));

      if (!response.success || !response.data) {
        throw new Error(`Lead ${leadId} not found`);
      }

      return this.mapPipedriveDealToLead(response.data, accountId);
    } catch (error) {
      console.error('[PipedriveAdapter] getLead error:', error);
      throw error;
    }
  }

  /**
   * Criar novo lead
   */
  async createLead(accountId: string, data: CreateLeadInput): Promise<Lead> {
    try {
      // Cria pessoa de contato primeiro se houver email/phone
      let personId: number | undefined;
      if (data.email || data.phone) {
        const personResponse = await this.apiClient.createPerson({
          name: data.title,
          email: data.email,
          phone: data.phone,
          org_id: data.companyName ? await this.getOrCreateOrganization(data.companyName) : undefined,
        });

        if (personResponse.success) {
          personId = personResponse.data.id;
        }
      }

      // Cria deal/lead
      const dealResponse = await this.apiClient.createDeal({
        title: data.title,
        pipeline_id: parseInt(data.pipelineId),
        stage_id: parseInt(data.stageId),
        person_id: personId,
        custom_fields: data.customFields || {},
      });

      if (!dealResponse.success) {
        throw new Error('Failed to create lead');
      }

      return this.mapPipedriveDealToLead(dealResponse.data, accountId);
    } catch (error) {
      console.error('[PipedriveAdapter] createLead error:', error);
      throw error;
    }
  }

  /**
   * Atualizar lead
   */
  async updateLead(
    accountId: string,
    leadId: string,
    data: UpdateLeadInput
  ): Promise<Lead> {
    try {
      const updatePayload: Record<string, unknown> = {};

      if (data.title) updatePayload.title = data.title;
      if (data.customFields) {
        updatePayload.custom_fields = data.customFields;
      }

      const response = await this.apiClient.updateDeal(parseInt(leadId), updatePayload);

      if (!response.success) {
        throw new Error('Failed to update lead');
      }

      return this.mapPipedriveDealToLead(response.data, accountId);
    } catch (error) {
      console.error('[PipedriveAdapter] updateLead error:', error);
      throw error;
    }
  }

  /**
   * Mover lead para outra stage
   */
  async moveLead(accountId: string, leadId: string, data: MoveLadInput): Promise<Lead> {
    try {
      const response = await this.apiClient.updateDeal(parseInt(leadId), {
        stage_id: parseInt(data.stageId),
      });

      if (!response.success) {
        throw new Error('Failed to move lead');
      }

      return this.mapPipedriveDealToLead(response.data, accountId);
    } catch (error) {
      console.error('[PipedriveAdapter] moveLead error:', error);
      throw error;
    }
  }

  /**
   * Deletar lead
   */
  async deleteLead(accountId: string, leadId: string): Promise<void> {
    try {
      const response = await this.apiClient.deleteDeal(parseInt(leadId));

      if (!response.success) {
        throw new Error('Failed to delete lead');
      }
    } catch (error) {
      console.error('[PipedriveAdapter] deleteLead error:', error);
      throw error;
    }
  }

  /**
   * Buscar pipelines
   */
  async getPipelines(accountId: string): Promise<Pipeline[]> {
    try {
      const response = await this.apiClient.getPipelines();

      if (!response.success || !Array.isArray(response.data)) {
        return [];
      }

      const pipelines: Pipeline[] = [];

      for (const pipeline of response.data) {
        const stages = await this.getStages(accountId, pipeline.id.toString());
        pipelines.push({
          id: pipeline.id.toString(),
          name: pipeline.name,
          description: pipeline.description,
          stages,
          crmType: 'pipedrive',
          externalId: pipeline.id.toString(),
        });
      }

      return pipelines;
    } catch (error) {
      console.error('[PipedriveAdapter] getPipelines error:', error);
      return [];
    }
  }

  /**
   * Buscar pipeline específica
   */
  async getPipeline(accountId: string, pipelineId: string): Promise<Pipeline> {
    try {
      const response = await this.apiClient.getPipeline(parseInt(pipelineId));

      if (!response.success || !response.data) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      const stages = await this.getStages(accountId, pipelineId);

      return {
        id: response.data.id.toString(),
        name: response.data.name,
        description: response.data.description,
        stages,
        crmType: 'pipedrive',
        externalId: response.data.id.toString(),
      };
    } catch (error) {
      console.error('[PipedriveAdapter] getPipeline error:', error);
      throw error;
    }
  }

  /**
   * Buscar stages de um pipeline
   */
  async getStages(accountId: string, pipelineId: string): Promise<Stage[]> {
    try {
      const response = await this.apiClient.getStages(parseInt(pipelineId));

      if (!response.success || !Array.isArray(response.data)) {
        return [];
      }

      return response.data.map((stage: any) => ({
        id: stage.id.toString(),
        name: stage.name,
        pipelineId,
        order: stage.order_nr ?? 0,
        color: stage.color,
        crmType: 'pipedrive' as const,
        externalId: stage.id.toString(),
      }));
    } catch (error) {
      console.error('[PipedriveAdapter] getStages error:', error);
      return [];
    }
  }

  /**
   * Buscar campos customizados
   */
  async getFields(accountId: string, objectType: 'lead' | 'deal' | 'contact'): Promise<FieldDefinition[]> {
    try {
      const apiObjectType = objectType === 'lead' ? 'deal' : objectType;
      const response = await this.apiClient.getFields(apiObjectType);

      if (!response.success || !Array.isArray(response.data)) {
        return [];
      }

      return response.data.map((field: any) => this.fieldMapper.mapPipedriveFieldToDefinition(field));
    } catch (error) {
      console.error('[PipedriveAdapter] getFields error:', error);
      return [];
    }
  }

  /**
   * Sincronizar lead específico
   */
  async syncLead(accountId: string, leadId: string): Promise<Lead> {
    return this.getLead(accountId, leadId);
  }

  /**
   * Obter URL do webhook
   */
  getWebhookUrl(): string {
    return '/webhooks/crm/sync';
  }

  /**
   * Verificar assinatura do webhook
   */
  verifyWebhook(signature: string, payload: string): boolean {
    // Implementar verificação específica do Pipedrive se necessário
    return true;
  }

  /**
   * Parsear evento webhook
   */
  parseWebhookEvent(payload: any): { type: string; data: any } | null {
    if (!payload || !payload.event) {
      return null;
    }

    const eventType = payload.event;
    const data = payload.data || {};

    return {
      type: eventType,
      data,
    };
  }

  /**
   * Testar conexão com Pipedrive
   */
  async testConnection(accountId: string): Promise<boolean> {
    try {
      const response = await this.apiClient.getPipelines();
      return response.success;
    } catch (error) {
      console.error('[PipedriveAdapter] testConnection error:', error);
      return false;
    }
  }

  /**
   * Helper: Mapear deal Pipedrive para Lead interno
   */
  private async mapPipedriveDealToLead(deal: any, accountId: string): Promise<Lead> {
    const person = deal.person_id ? await this.getPerson(deal.person_id) : null;

    return {
      id: `pipedrive-${deal.id}`,
      externalId: deal.id.toString(),
      crmAccountId: accountId,
      title: deal.title,
      email: person?.email?.[0]?.value,
      phone: person?.phone?.[0]?.value,
      companyName: deal.org_id ? await this.getOrganizationName(deal.org_id) : undefined,
      pipelineId: deal.pipeline_id.toString(),
      stageId: deal.stage_id.toString(),
      stageName: deal.stage_name || '',
      customFields: deal.custom_fields || {},
      source: 'api',
      createdAt: new Date(deal.add_time),
      updatedAt: new Date(deal.update_time),
      syncedAt: new Date(),
      crmType: 'pipedrive',
    };
  }

  /**
   * Helper: Obter detalhes da pessoa
   */
  private async getPerson(personId: number): Promise<any> {
    try {
      const response = await this.apiClient.getPerson(personId);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('[PipedriveAdapter] getPerson error:', error);
      return null;
    }
  }

  /**
   * Helper: Obter ou criar organização
   */
  private async getOrCreateOrganization(name: string): Promise<number | undefined> {
    try {
      // Tentar buscar first
      const searchResponse = await this.apiClient.searchOrganizations(name);
      if (searchResponse.success && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
        return searchResponse.data[0].id;
      }

      // Se não encontrar, criar nova
      const createResponse = await this.apiClient.createOrganization({ name });
      if (createResponse.success && createResponse.data) {
        return createResponse.data.id;
      }

      return undefined;
    } catch (error) {
      console.error('[PipedriveAdapter] getOrCreateOrganization error:', error);
      return undefined;
    }
  }

  /**
   * Helper: Obter nome da organização
   */
  private async getOrganizationName(orgId: number): Promise<string | undefined> {
    try {
      const response = await this.apiClient.getOrganization(orgId);
      return response.success ? response.data?.name : undefined;
    } catch (error) {
      console.error('[PipedriveAdapter] getOrganizationName error:', error);
      return undefined;
    }
  }
}
