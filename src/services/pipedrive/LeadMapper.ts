import type {
  PipedriveContact,
  LeadCreationPayload,
} from '../../models/pipedrive.types';

/**
 * Maps data from Meta/WhatsApp to Pipedrive format
 * Handles contact extraction, lead creation, and deduplication strategies
 */
export class LeadMapper {
  /**
   * Map Meta conversion event to Pipedrive lead creation payload
   */
  mapMetaEventToLead(
    accountId: string,
    metaEvent: any,
    pipelineId: number,
    stageId: number
  ): LeadCreationPayload {
    const contact = this.extractContactData(metaEvent.user_data);
    const eventName = metaEvent.event_name || 'Meta Conversion';

    return {
      accountId,
      source: 'meta',
      sourceId: metaEvent.event_id,
      contact,
      lead: {
        title: `${eventName} - ${contact.name || 'Unknown'}`,
        value: metaEvent.custom_data?.value,
        currency: metaEvent.custom_data?.currency || 'USD',
        source: 'Meta Conversions API',
        notes: `Event: ${eventName}\nTimestamp: ${new Date(metaEvent.event_time * 1000).toISOString()}`,
        pipelineId,
        stageId,
      },
      deduplicateBy: ['email', 'phone'],
      metadata: {
        metaEventId: metaEvent.event_id,
        metaEventName: metaEvent.event_name,
        customData: metaEvent.custom_data,
      },
    };
  }

  /**
   * Map WhatsApp message to Pipedrive lead creation payload
   */
  mapWhatsAppMessageToLead(
    accountId: string,
    message: any,
    pipelineId: number,
    stageId: number
  ): LeadCreationPayload {
    return {
      accountId,
      source: 'whatsapp',
      sourceId: message.messageId,
      contact: {
        name: message.displayName || message.phoneNumber,
        phone: message.phoneNumber,
      },
      lead: {
        title: `WhatsApp Message - ${message.displayName || message.phoneNumber}`,
        source: 'WhatsApp',
        notes: `Message: ${message.content?.text || 'Media message'}\nTimestamp: ${new Date().toISOString()}`,
        pipelineId,
        stageId,
      },
      deduplicateBy: ['phone'],
      metadata: {
        waMessageId: message.messageId,
        messageType: message.messageType,
        content: message.content,
      },
    };
  }

  /**
   * Extract contact data from Meta user_data
   */
  extractContactData(userData: Record<string, string | undefined>): PipedriveContact {
    return {
      name: this.buildName(userData.fn, userData.ln),
      email: userData.em ? this.normalizeEmail(userData.em) : undefined,
      phone: userData.ph ? this.normalizePhone(userData.ph) : undefined,
      firstName: userData.fn ? userData.fn.toLowerCase().trim() : undefined,
      lastName: userData.ln ? userData.ln.toLowerCase().trim() : undefined,
      city: userData.ct ? userData.ct.toLowerCase().trim() : undefined,
      state: userData.st ? userData.st.toLowerCase().trim() : undefined,
      zip: userData.zp ? userData.zp.trim() : undefined,
      country: userData.country ? userData.country.toLowerCase().trim() : undefined,
    };
  }

  /**
   * Build full name from first and last name
   */
  private buildName(firstName?: string, lastName?: string): string {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.join(' ') || 'Unknown Contact';
  }

  /**
   * Normalize phone number (remove formatting)
   */
  normalizePhone(phone: string): string {
    if (!phone) return '';

    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Remove leading + if present for storage
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }

    return normalized;
  }

  /**
   * Normalize email address
   */
  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Determine deduplication strategy based on available data
   */
  getDeduplicationStrategy(contact: PipedriveContact): ('email' | 'phone')[] {
    const strategy: ('email' | 'phone')[] = [];

    if (contact.email) {
      strategy.push('email');
    }

    if (contact.phone) {
      strategy.push('phone');
    }

    return strategy.length > 0 ? strategy : ['email'];
  }

  /**
   * Calculate confidence score for contact match
   */
  calculateMatchConfidence(
    contact1: PipedriveContact,
    contact2: PipedriveContact
  ): number {
    let matches = 0;
    let checks = 0;

    // Email match
    if (contact1.email && contact2.email) {
      checks++;
      if (contact1.email === contact2.email) {
        matches++;
      }
    }

    // Phone match
    if (contact1.phone && contact2.phone) {
      checks++;
      if (contact1.phone === contact2.phone) {
        matches++;
      }
    }

    // Name match
    if (contact1.name && contact2.name) {
      checks++;
      if (contact1.name.toLowerCase() === contact2.name.toLowerCase()) {
        matches++;
      }
    }

    if (checks === 0) return 0;

    return matches / checks;
  }

  /**
   * Merge contact data (keep existing, update with new)
   */
  mergeContacts(
    existing: PipedriveContact,
    newData: PipedriveContact
  ): PipedriveContact {
    return {
      name: newData.name || existing.name,
      email: newData.email || existing.email,
      phone: newData.phone || existing.phone,
      firstName: newData.firstName || existing.firstName,
      lastName: newData.lastName || existing.lastName,
      city: newData.city || existing.city,
      state: newData.state || existing.state,
      zip: newData.zip || existing.zip,
      country: newData.country || existing.country,
      organization: newData.organization || existing.organization,
    };
  }
}
