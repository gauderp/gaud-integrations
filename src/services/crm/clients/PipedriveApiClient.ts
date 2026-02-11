/**
 * PipedriveApiClient - REST API Client para Pipedrive
 */

import axios, { AxiosInstance } from 'axios';

interface PipedriveConfig {
  companyDomain: string;
  apiToken: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  additional_data?: any;
}

export class PipedriveApiClient {
  private client: AxiosInstance;
  private config: PipedriveConfig;

  constructor(config: PipedriveConfig) {
    this.config = {
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: `https://${this.config.companyDomain}/v1`,
      timeout: this.config.timeout,
      params: {
        api_token: this.config.apiToken,
      },
    });
  }

  /**
   * Buscar deals (leads)
   */
  async getDeals(params: Record<string, any>): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/deals', { params });
      return {
        success: response.data.success,
        data: response.data.data,
        additional_data: response.data.additional_data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getDeals error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar deal específico
   */
  async getDeal(dealId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/deals/${dealId}`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getDeal error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Criar deal
   */
  async createDeal(data: Record<string, any>): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/deals', data);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] createDeal error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Atualizar deal
   */
  async updateDeal(dealId: number, data: Record<string, any>): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.put(`/deals/${dealId}`, data);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] updateDeal error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Deletar deal
   */
  async deleteDeal(dealId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.delete(`/deals/${dealId}`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] deleteDeal error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar pipelines
   */
  async getPipelines(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/pipelines');
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getPipelines error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar pipeline específica
   */
  async getPipeline(pipelineId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/pipelines/${pipelineId}`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getPipeline error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar stages de um pipeline
   */
  async getStages(pipelineId: number): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get(`/pipelines/${pipelineId}/stages`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getStages error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar campos customizados
   */
  async getFields(objectType: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get(`/${objectType}Fields`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getFields error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar pessoas (contatos)
   */
  async getPerson(personId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/persons/${personId}`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getPerson error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Criar pessoa
   */
  async createPerson(data: Record<string, any>): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/persons', data);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] createPerson error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar organizações
   */
  async searchOrganizations(name: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/organizations', {
        params: { name },
      });
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] searchOrganizations error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Buscar organização específica
   */
  async getOrganization(orgId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/organizations/${orgId}`);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] getOrganization error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Criar organização
   */
  async createOrganization(data: Record<string, any>): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/organizations', data);
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('[PipedriveApiClient] createOrganization error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get internal config (for testing)
   */
  getConfig(): PipedriveConfig {
    return this.config;
  }
}
