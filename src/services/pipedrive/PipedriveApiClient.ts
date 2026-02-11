import axios, { AxiosInstance } from 'axios';
import type {
  PipedriveApiConfig,
  PipedriveContact,
  PipedriveLead,
  PipedriveApiResponse,
} from '../../models/pipedrive.types';

/**
 * Pipedrive API Client
 * Handles communication with Pipedrive CRM API
 * Supports contact management, lead creation, and field mapping
 */
export class PipedriveApiClient {
  private config: Required<PipedriveApiConfig>;
  private axiosInstance: AxiosInstance;

  constructor(config: Partial<PipedriveApiConfig> & Pick<PipedriveApiConfig, 'companyDomain' | 'apiToken'>) {
    this.config = {
      companyDomain: config.companyDomain,
      apiToken: config.apiToken,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    };

    this.axiosInstance = axios.create({
      baseURL: `https://${this.config.companyDomain}/v1`,
      timeout: this.config.timeout,
    });
  }

  /**
   * Get current config
   */
  getConfig(): Required<PipedriveApiConfig> {
    return this.config;
  }

  /**
   * Build API URL with query parameters
   */
  buildApiUrl(endpoint: string, params?: Record<string, unknown>): string {
    const baseUrl = `https://${this.config.companyDomain}/v1/${endpoint}`;
    const queryParams = new URLSearchParams();

    queryParams.append('api_token', this.config.apiToken);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
    }

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Search contact by email
   */
  async searchContactByEmail(email: string): Promise<number[]> {
    try {
      const response = await this.axiosInstance.get<PipedriveApiResponse>('/persons/search', {
        params: {
          term: email,
          fields: 'email',
        },
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data as any;
        return data.items?.map((item: any) => item.person.id) ?? [];
      }

      return [];
    } catch (error) {
      console.error(`Error searching contact by email: ${email}`, error);
      return [];
    }
  }

  /**
   * Search contact by phone
   */
  async searchContactByPhone(phone: string): Promise<number[]> {
    try {
      const response = await this.axiosInstance.get<PipedriveApiResponse>('/persons/search', {
        params: {
          term: phone,
          fields: 'phone',
        },
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data as any;
        return data.items?.map((item: any) => item.person.id) ?? [];
      }

      return [];
    } catch (error) {
      console.error(`Error searching contact by phone: ${phone}`, error);
      return [];
    }
  }

  /**
   * Create a new contact
   */
  async createContact(contact: PipedriveContact): Promise<PipedriveApiResponse> {
    if (!this.validateContact(contact)) {
      return {
        success: false,
        error: 'Invalid contact data',
      };
    }

    try {
      const payload = this.buildContactPayload(contact);

      const response = await this.axiosInstance.post<PipedriveApiResponse>(
        '/persons',
        payload
      );

      return {
        success: response.data.success,
        data: response.data.data as any,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update existing contact
   */
  async updateContact(
    contactId: number,
    updates: Partial<PipedriveContact>
  ): Promise<PipedriveApiResponse> {
    try {
      const payload = this.buildContactPayload(updates as PipedriveContact);

      const response = await this.axiosInstance.put<PipedriveApiResponse>(
        `/persons/${contactId}`,
        payload
      );

      return {
        success: response.data.success,
        data: response.data.data as any,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: number): Promise<PipedriveApiResponse> {
    try {
      const response = await this.axiosInstance.get<PipedriveApiResponse>(
        `/persons/${contactId}`
      );

      return {
        success: response.data.success,
        data: response.data.data as any,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Not found',
      };
    }
  }

  /**
   * Create a new lead
   */
  async createLead(lead: PipedriveLead): Promise<PipedriveApiResponse> {
    if (!this.validateLead(lead)) {
      return {
        success: false,
        error: 'Invalid lead data',
      };
    }

    try {
      const payload = {
        title: lead.title,
        value: lead.value,
        currency: lead.currency || 'USD',
        person_id: lead.personId,
        pipeline_id: lead.pipelineId,
        stage_id: lead.stageId,
        source: lead.source,
        notes: lead.notes,
        ...lead.customFields,
      };

      const response = await this.axiosInstance.post<PipedriveApiResponse>(
        '/leads',
        payload
      );

      return {
        success: response.data.success,
        data: response.data.data as any,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update existing lead
   */
  async updateLead(
    leadId: number,
    updates: Partial<PipedriveLead>
  ): Promise<PipedriveApiResponse> {
    try {
      const payload: Record<string, unknown> = {};

      if (updates.title) payload.title = updates.title;
      if (updates.value !== undefined) payload.value = updates.value;
      if (updates.stageId) payload.stage_id = updates.stageId;
      if (updates.currency) payload.currency = updates.currency;
      if (updates.notes) payload.notes = updates.notes;

      const response = await this.axiosInstance.put<PipedriveApiResponse>(
        `/leads/${leadId}`,
        payload
      );

      return {
        success: response.data.success,
        data: response.data.data as any,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId: number): Promise<PipedriveApiResponse> {
    try {
      const response = await this.axiosInstance.get<PipedriveApiResponse>(
        `/leads/${leadId}`
      );

      return {
        success: response.data.success,
        data: response.data.data as any,
        error: response.data.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Not found',
      };
    }
  }

  /**
   * Build contact payload for API
   */
  buildContactPayload(contact: Partial<PipedriveContact>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (contact.name) payload.name = contact.name;
    if (contact.email) payload.email = contact.email;
    if (contact.phone) payload.phone = contact.phone;
    if (contact.firstName) payload.first_name = contact.firstName;
    if (contact.lastName) payload.last_name = contact.lastName;
    if (contact.city) payload.add_city = contact.city;
    if (contact.state) payload.add_state = contact.state;
    if (contact.zip) payload.add_postal_code = contact.zip;
    if (contact.country) payload.add_country = contact.country;
    if (contact.organization) payload.org_id = contact.organization;

    // Add custom fields
    if (contact.customFields) {
      Object.assign(payload, contact.customFields);
    }

    return payload;
  }

  /**
   * Validate contact data
   */
  validateContact(contact: Partial<PipedriveContact>): boolean {
    // Name is required
    if (!contact.name || contact.name.trim().length === 0) {
      return false;
    }

    // Email must be valid if provided
    if (contact.email && !this.isValidEmail(contact.email)) {
      return false;
    }

    // Phone must be valid if provided
    if (contact.phone && !this.isValidPhone(contact.phone)) {
      return false;
    }

    return true;
  }

  /**
   * Validate lead data
   */
  validateLead(lead: Partial<PipedriveLead>): boolean {
    // Title is required
    if (!lead.title || lead.title.trim().length === 0) {
      return false;
    }

    // Pipeline ID is required
    if (!lead.pipelineId) {
      return false;
    }

    // Stage ID is required
    if (!lead.stageId) {
      return false;
    }

    return true;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (basic check)
   */
  private isValidPhone(phone: string): boolean {
    // Allow E164 format and variations
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
  }
}
