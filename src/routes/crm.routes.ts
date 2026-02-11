/**
 * CRM Routes - 9 endpoints para operações de CRM
 */

import type { FastifyInstance } from 'fastify';
import type { CrmAccountManager } from '../services/crm/CrmAccountManager';
import type { SyncService } from '../services/crm/SyncService';
import type { WebhookHandler } from '../services/crm/WebhookHandler';
import { z } from 'zod';

// Schemas para validação
const CreateLeadSchema = z.object({
  title: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  customFields: z.record(z.unknown()).optional(),
  source: z.string().optional(),
  sourceId: z.string().optional(),
});

const UpdateLeadSchema = z.object({
  title: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const MoveLadSchema = z.object({
  stageId: z.string().min(1),
});

const ConfigureAccountSchema = z.object({
  type: z.enum(['pipedrive', 'hubspot', 'salesforce']),
  displayName: z.string().min(1),
  apiToken: z.string().min(1),
  domain: z.string().optional(),
  extraConfig: z.record(z.unknown()).optional(),
});

export function registerCrmRoutes(
  fastify: FastifyInstance,
  accountManager: CrmAccountManager,
  syncService: SyncService,
  webhookHandler: WebhookHandler
) {
  /**
   * 1. POST /api/crm/configure
   * Registrar/configurar nova conta CRM
   */
  fastify.post<{ Body: z.infer<typeof ConfigureAccountSchema> }>(
    '/api/crm/configure',
    async (request, reply) => {
      try {
        const config = ConfigureAccountSchema.parse(request.body);

        const account = accountManager.registerAccount(config);

        // Testar conexão
        const isConnected = await accountManager.testConnection(account.id);

        reply.code(201).send({
          success: true,
          data: {
            accountId: account.id,
            displayName: account.displayName,
            type: account.type,
            isConnected,
            createdAt: account.createdAt,
          },
        });
      } catch (error) {
        console.error('[crm.routes] configure error:', error);
        reply.code(400).send({
          success: false,
          error: String(error),
        });
      }
    }
  );

  /**
   * 2. GET /api/crm/leads
   * Listar leads com filtros
   */
  fastify.get<{
    Querystring: {
      accountId: string;
      pipelineId?: string;
      stageId?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/crm/leads', async (request, reply) => {
    try {
      const { accountId, pipelineId, stageId, search, limit = '50', offset = '0' } = request.query;

      if (!accountId) {
        return reply.code(400).send({
          success: false,
          error: 'accountId is required',
        });
      }

      const adapter = accountManager.getAdapter(accountId);
      if (!adapter) {
        return reply.code(404).send({
          success: false,
          error: 'Account not found',
        });
      }

      const leads = await adapter.getLeads(accountId, {
        pipelineId,
        stageId,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      reply.send({
        success: true,
        data: leads,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: leads.length,
        },
      });
    } catch (error) {
      console.error('[crm.routes] getLeads error:', error);
      reply.code(500).send({
        success: false,
        error: String(error),
      });
    }
  });

  /**
   * 3. GET /api/crm/leads/:leadId
   * Obter lead específico
   */
  fastify.get<{ Params: { accountId: string; leadId: string }; Querystring: { accountId: string } }>(
    '/api/crm/leads/:leadId',
    async (request, reply) => {
      try {
        const { accountId } = request.query;
        const { leadId } = request.params;

        if (!accountId) {
          return reply.code(400).send({
            success: false,
            error: 'accountId is required',
          });
        }

        const adapter = accountManager.getAdapter(accountId);
        if (!adapter) {
          return reply.code(404).send({
            success: false,
            error: 'Account not found',
          });
        }

        const lead = await adapter.getLead(accountId, leadId);

        reply.send({
          success: true,
          data: lead,
        });
      } catch (error) {
        console.error('[crm.routes] getLead error:', error);
        reply.code(500).send({
          success: false,
          error: String(error),
        });
      }
    }
  );

  /**
   * 4. POST /api/crm/leads
   * Criar novo lead
   */
  fastify.post<{ Body: z.infer<typeof CreateLeadSchema>; Querystring: { accountId: string } }>(
    '/api/crm/leads',
    async (request, reply) => {
      try {
        const { accountId } = request.query;

        if (!accountId) {
          return reply.code(400).send({
            success: false,
            error: 'accountId is required',
          });
        }

        const data = CreateLeadSchema.parse(request.body);
        const adapter = accountManager.getAdapter(accountId);

        if (!adapter) {
          return reply.code(404).send({
            success: false,
            error: 'Account not found',
          });
        }

        const lead = await adapter.createLead(accountId, data);

        reply.code(201).send({
          success: true,
          data: lead,
        });
      } catch (error) {
        console.error('[crm.routes] createLead error:', error);
        reply.code(400).send({
          success: false,
          error: String(error),
        });
      }
    }
  );

  /**
   * 5. PATCH /api/crm/leads/:leadId
   * Atualizar lead
   */
  fastify.patch<{
    Body: z.infer<typeof UpdateLeadSchema>;
    Params: { leadId: string };
    Querystring: { accountId: string };
  }>('/api/crm/leads/:leadId', async (request, reply) => {
    try {
      const { accountId } = request.query;
      const { leadId } = request.params;

      if (!accountId) {
        return reply.code(400).send({
          success: false,
          error: 'accountId is required',
        });
      }

      const data = UpdateLeadSchema.parse(request.body);
      const adapter = accountManager.getAdapter(accountId);

      if (!adapter) {
        return reply.code(404).send({
          success: false,
          error: 'Account not found',
        });
      }

      const lead = await adapter.updateLead(accountId, leadId, data);

      reply.send({
        success: true,
        data: lead,
      });
    } catch (error) {
      console.error('[crm.routes] updateLead error:', error);
      reply.code(400).send({
        success: false,
        error: String(error),
      });
    }
  });

  /**
   * 6. PATCH /api/crm/leads/:leadId/stage
   * Mover lead para outra stage
   */
  fastify.patch<{
    Body: z.infer<typeof MoveLadSchema>;
    Params: { leadId: string };
    Querystring: { accountId: string };
  }>('/api/crm/leads/:leadId/stage', async (request, reply) => {
    try {
      const { accountId } = request.query;
      const { leadId } = request.params;

      if (!accountId) {
        return reply.code(400).send({
          success: false,
          error: 'accountId is required',
        });
      }

      const data = MoveLadSchema.parse(request.body);
      const adapter = accountManager.getAdapter(accountId);

      if (!adapter) {
        return reply.code(404).send({
          success: false,
          error: 'Account not found',
        });
      }

      const lead = await adapter.moveLead(accountId, leadId, data);

      reply.send({
        success: true,
        data: lead,
      });
    } catch (error) {
      console.error('[crm.routes] moveLead error:', error);
      reply.code(400).send({
        success: false,
        error: String(error),
      });
    }
  });

  /**
   * 7. GET /api/crm/pipelines
   * Listar pipelines e stages
   */
  fastify.get<{ Querystring: { accountId: string } }>('/api/crm/pipelines', async (request, reply) => {
    try {
      const { accountId } = request.query;

      if (!accountId) {
        return reply.code(400).send({
          success: false,
          error: 'accountId is required',
        });
      }

      const adapter = accountManager.getAdapter(accountId);
      if (!adapter) {
        return reply.code(404).send({
          success: false,
          error: 'Account not found',
        });
      }

      const pipelines = await adapter.getPipelines(accountId);

      reply.send({
        success: true,
        data: pipelines,
      });
    } catch (error) {
      console.error('[crm.routes] getPipelines error:', error);
      reply.code(500).send({
        success: false,
        error: String(error),
      });
    }
  });

  /**
   * 8. GET /api/crm/fields
   * Listar campos customizados
   */
  fastify.get<{
    Querystring: { accountId: string; objectType?: 'lead' | 'deal' | 'contact' };
  }>('/api/crm/fields', async (request, reply) => {
    try {
      const { accountId, objectType = 'lead' } = request.query;

      if (!accountId) {
        return reply.code(400).send({
          success: false,
          error: 'accountId is required',
        });
      }

      const adapter = accountManager.getAdapter(accountId);
      if (!adapter) {
        return reply.code(404).send({
          success: false,
          error: 'Account not found',
        });
      }

      const fields = await adapter.getFields(accountId, objectType);

      reply.send({
        success: true,
        data: fields,
      });
    } catch (error) {
      console.error('[crm.routes] getFields error:', error);
      reply.code(500).send({
        success: false,
        error: String(error),
      });
    }
  });

  /**
   * 9. POST /webhooks/crm/sync
   * Receber e processar webhooks CRM
   */
  fastify.post<{ Body: any; Querystring: { accountId: string } }>(
    '/webhooks/crm/sync',
    async (request, reply) => {
      try {
        const { accountId } = request.query;

        if (!accountId) {
          return reply.code(400).send({
            success: false,
            error: 'accountId is required',
          });
        }

        const event = await webhookHandler.handleWebhook(accountId, request.body);

        reply.code(200).send({
          success: true,
          data: {
            eventId: event.id,
            processed: event.processed,
            type: event.type,
            error: event.error,
          },
        });
      } catch (error) {
        console.error('[crm.routes] webhook error:', error);
        reply.code(500).send({
          success: false,
          error: String(error),
        });
      }
    }
  );
}
