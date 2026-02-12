import crypto from 'crypto';
import { z } from 'zod';
import type {
  MetaConversionEventData,
  MetaUserData,
  NormalizedUserData,
  ProcessConversionResult,
  ConversionEventStore,
} from '../../models/meta.types';

const APP_SECRET = process.env.META_APP_SECRET || 'your_app_secret';

const MetaUserDataSchema = z.object({
  em: z.string().email().optional(),
  ph: z.string().optional(),
  fn: z.string().optional(),
  ln: z.string().optional(),
  ct: z.string().optional(),
  st: z.string().optional(),
  zp: z.string().optional(),
  country: z.string().optional(),
});

const MetaConversionEventSchema = z.object({
  event_id: z.string().min(1),
  event_name: z.string().min(1),
  event_time: z.number(),
  user_data: MetaUserDataSchema,
  custom_data: z.any().optional(),
  event_source_url: z.string().optional(),
  action_source: z.string().optional(),
});

const MetaWebhookPayloadSchema = z.object({
  data: z.array(MetaConversionEventSchema),
});

export class MetaWebhookService {
  private conversions: Map<string, ConversionEventStore> = new Map();

  /**
   * Generate signature for webhook verification
   */
  generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', APP_SECRET)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify Meta webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(payload);
    return (
      expectedSignature.toLowerCase() === signature.toLowerCase()
    );
  }

  /**
   * Process conversion event from Meta webhook
   */
  async processConversionEvent(
    payload: unknown
  ): Promise<ProcessConversionResult> {
    try {
      const validatedPayload = MetaWebhookPayloadSchema.parse(payload);

      const errors: Array<{ eventId: string; error: string }> = [];
      let processed = 0;
      let eventId: string | undefined;

      for (const event of validatedPayload.data) {
        try {
          await this.storeConversionEvent(event);
          processed++;

          if (!eventId) {
            eventId = event.event_id;
          }
        } catch (error) {
          errors.push({
            eventId: event.event_id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const success = errors.length === 0;

      const result: ProcessConversionResult = {
        success,
        processed,
      };

      if (eventId) {
        result.eventId = eventId;
      }

      if (!success) {
        result.errors = errors;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        processed: 0,
        errors: [
          {
            eventId: 'unknown',
            error: error instanceof Error ? error.message : 'Invalid payload',
          },
        ],
      };
    }
  }

  /**
   * Store conversion event in memory (in production, use database)
   */
  private async storeConversionEvent(
    event: MetaConversionEventData
  ): Promise<void> {
    const normalizedUserData = this.extractUserData(event.user_data);

    const conversionEvent: ConversionEventStore = {
      eventId: event.event_id,
      eventName: event.event_name,
      eventTime: new Date(event.event_time * 1000),
      userData: normalizedUserData,
      customData: event.custom_data,
      pixelId: process.env.META_PIXEL_ID || 'unknown',
      status: 'pending',
    };

    this.conversions.set(event.event_id, conversionEvent);
  }

  /**
   * Extract and normalize user data from Meta webhook
   */
  extractUserData(userData: MetaUserData): NormalizedUserData {
    return {
      email: userData.em ? userData.em.toLowerCase().trim() : undefined,
      phone: userData.ph
        ? userData.ph.replace(/\D/g, '').substring(0, 15)
        : undefined,
      firstName: userData.fn ? userData.fn.toLowerCase().trim() : undefined,
      lastName: userData.ln ? userData.ln.toLowerCase().trim() : undefined,
      city: userData.ct ? userData.ct.toLowerCase().trim() : undefined,
      state: userData.st ? userData.st.toLowerCase().trim() : undefined,
      zip: userData.zp ? userData.zp.trim() : undefined,
      country: userData.country
        ? userData.country.toLowerCase().trim()
        : undefined,
    };
  }

  /**
   * Validate Meta pixel ID format
   */
  validatePixelId(pixelId: string): boolean {
    return /^\d+$/.test(pixelId);
  }

  /**
   * Get stored conversion event
   */
  getConversionEvent(eventId: string): ConversionEventStore | undefined {
    return this.conversions.get(eventId);
  }

  /**
   * Get all conversions (for debugging/testing)
   */
  getAllConversions(): ConversionEventStore[] {
    return Array.from(this.conversions.values());
  }

  /**
   * Clear conversions (for testing)
   */
  clearConversions(): void {
    this.conversions.clear();
  }
}
