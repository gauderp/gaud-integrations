/**
 * LeadMapper - Mapeia leads entre CRM e formato interno
 */

import type { Lead, CreateLeadInput } from '../../../models/crm.types';

export class LeadMapper {
  /**
   * Mapear deal Pipedrive para Lead interno
   */
  mapPipedriveDealToLead(deal: any, accountId: string): Lead {
    return {
      id: `pipedrive-${deal.id}`,
      externalId: deal.id.toString(),
      crmAccountId: accountId,
      title: deal.title,
      email: deal.email || undefined,
      phone: deal.phone || undefined,
      companyName: deal.company_name || undefined,
      pipelineId: deal.pipeline_id.toString(),
      stageId: deal.stage_id.toString(),
      stageName: deal.stage_name || '',
      customFields: deal.custom_fields || {},
      source: deal.source || 'api',
      sourceId: deal.source_id,
      createdAt: new Date(deal.add_time),
      updatedAt: new Date(deal.update_time),
      syncedAt: new Date(),
      crmType: 'pipedrive',
    };
  }

  /**
   * Mapear Lead interno para payload Pipedrive
   */
  mapLeadToCreatePayload(lead: CreateLeadInput): Record<string, any> {
    return {
      title: lead.title,
      pipeline_id: parseInt(lead.pipelineId),
      stage_id: parseInt(lead.stageId),
      email: lead.email,
      phone: lead.phone,
      company_name: lead.companyName,
      custom_fields: lead.customFields || {},
    };
  }

  /**
   * Mapear Lead interno para payload Pipedrive (update)
   */
  mapLeadToUpdatePayload(lead: Partial<CreateLeadInput>): Record<string, any> {
    const payload: Record<string, any> = {};

    if (lead.title) payload.title = lead.title;
    if (lead.email) payload.email = lead.email;
    if (lead.phone) payload.phone = lead.phone;
    if (lead.companyName) payload.company_name = lead.companyName;
    if (lead.customFields) payload.custom_fields = lead.customFields;

    return payload;
  }
}
