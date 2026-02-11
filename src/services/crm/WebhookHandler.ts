/**
 * WebhookHandler - Processa webhooks recebidos de CRM
 * Sincroniza mudanças em tempo real
 */

import type { CrmAccountManager } from './CrmAccountManager';
import type { SyncService } from './SyncService';
import type { WebhookEvent } from '../../models/crm.types';
import { v4 as uuidv4 } from 'uuid';

export class WebhookHandler {
  private webhookLogs: Map<string, WebhookEvent> = new Map();

  constructor(
    private accountManager: CrmAccountManager,
    private syncService: SyncService
  ) {}

  /**
   * Processar evento webhook
   */
  async handleWebhook(accountId: string, payload: any): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      id: uuidv4(),
      type: 'custom',
      crmType: 'pipedrive',
      crmAccountId: accountId,
      data: payload,
      timestamp: new Date(),
      processed: false,
    };

    try {
      const adapter = this.accountManager.getAdapter(accountId);
      if (!adapter) {
        event.error = `Adapter not found for account ${accountId}`;
        event.processed = false;
        this.webhookLogs.set(event.id, event);
        return event;
      }

      // Parsear evento
      const parsedEvent = adapter.parseWebhookEvent(payload);
      if (!parsedEvent) {
        event.error = 'Failed to parse webhook event';
        event.processed = false;
        this.webhookLogs.set(event.id, event);
        return event;
      }

      event.type = parsedEvent.type as any;
      event.data = parsedEvent.data;

      // Processar baseado no tipo de evento
      await this.processEvent(accountId, event);

      event.processed = true;
      this.webhookLogs.set(event.id, event);

      return event;
    } catch (error) {
      event.error = String(error);
      event.processed = false;
      this.webhookLogs.set(event.id, event);

      console.error('[WebhookHandler] handleWebhook error:', error);

      return event;
    }
  }

  /**
   * Processar evento baseado no tipo
   */
  private async processEvent(accountId: string, event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'lead.created':
      case 'lead.updated':
        // Sincronizar lead específico
        if (event.data?.id) {
          await this.syncService.syncLead(accountId, event.data.id.toString());
        }
        break;

      case 'lead.deleted':
        // Pode ser tratado no frontend (remover do kanban)
        break;

      case 'lead.stage_changed':
        // Sincronizar lead após mudança de stage
        if (event.data?.id) {
          await this.syncService.syncLead(accountId, event.data.id.toString());
        }
        break;

      default:
        console.warn(`[WebhookHandler] Unknown event type: ${event.type}`);
    }
  }

  /**
   * Obter log de webhook por ID
   */
  getWebhookLog(eventId: string): WebhookEvent | undefined {
    return this.webhookLogs.get(eventId);
  }

  /**
   * Listar logs de webhook (últimos N)
   */
  getWebhookLogs(limit: number = 100): WebhookEvent[] {
    return Array.from(this.webhookLogs.values()).slice(-limit);
  }

  /**
   * Limpar logs antigos (mais de N horas)
   */
  clearOldLogs(hoursOld: number = 24): number {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [id, event] of this.webhookLogs.entries()) {
      if (event.timestamp < cutoff) {
        this.webhookLogs.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
