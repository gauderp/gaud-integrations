import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipedriveAdapter } from '../../src/services/crm/adapters/PipedriveAdapter';
import type { CreateLeadInput, UpdateLeadInput, MoveLadInput } from '../../src/models/crm.types';

describe('PipedriveAdapter', () => {
  let adapter: PipedriveAdapter;
  const testAccountId = 'test-account-123';

  beforeEach(() => {
    adapter = new PipedriveAdapter('test-token', 'test.pipedrive.com');
  });

  describe('getCrmType', () => {
    it('should return pipedrive as CRM type', () => {
      expect(adapter.getCrmType()).toBe('pipedrive');
    });
  });

  describe('getLeads', () => {
    it('should handle empty leads list', async () => {
      // Mock the API client
      vi.spyOn(adapter['apiClient'], 'getDeals').mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const leads = await adapter.getLeads(testAccountId);
      expect(leads).toEqual([]);
    });

    it('should apply filters when provided', async () => {
      const spyGetDeals = vi
        .spyOn(adapter['apiClient'], 'getDeals')
        .mockResolvedValueOnce({ success: true, data: [] });

      await adapter.getLeads(testAccountId, {
        pipelineId: '1',
        stageId: '2',
        limit: 25,
        offset: 10,
      });

      expect(spyGetDeals).toHaveBeenCalledWith(
        expect.objectContaining({
          pipeline_id: 1,
          limit: 25,
          start: 10,
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(adapter['apiClient'], 'getDeals').mockResolvedValueOnce({
        success: false,
        error: 'API Error',
      });

      const leads = await adapter.getLeads(testAccountId);
      expect(leads).toEqual([]);
    });
  });

  describe('getLead', () => {
    it('should fetch single lead', async () => {
      const mockDeal = {
        id: 123,
        title: 'Test Lead',
        add_time: '2024-01-01T00:00:00Z',
        update_time: '2024-01-02T00:00:00Z',
        pipeline_id: 1,
        stage_id: 2,
        stage_name: 'Negotiation',
        custom_fields: {},
      };

      vi.spyOn(adapter['apiClient'], 'getDeal').mockResolvedValueOnce({
        success: true,
        data: mockDeal,
      });

      const lead = await adapter.getLead(testAccountId, '123');

      expect(lead).toBeDefined();
      expect(lead.title).toBe('Test Lead');
      expect(lead.externalId).toBe('123');
    });

    it('should throw error if lead not found', async () => {
      vi.spyOn(adapter['apiClient'], 'getDeal').mockResolvedValueOnce({
        success: false,
      });

      await expect(adapter.getLead(testAccountId, '999')).rejects.toThrow();
    });
  });

  describe('createLead', () => {
    it('should create lead without person', async () => {
      const leadInput: CreateLeadInput = {
        title: 'New Lead',
        pipelineId: '1',
        stageId: '2',
      };

      const mockResponse = {
        id: 456,
        title: 'New Lead',
        pipeline_id: 1,
        stage_id: 2,
        add_time: '2024-01-01T00:00:00Z',
        update_time: '2024-01-01T00:00:00Z',
        stage_name: 'Open',
        custom_fields: {},
      };

      vi.spyOn(adapter['apiClient'], 'createDeal').mockResolvedValueOnce({
        success: true,
        data: mockResponse,
      });

      const lead = await adapter.createLead(testAccountId, leadInput);

      expect(lead).toBeDefined();
      expect(lead.title).toBe('New Lead');
      expect(adapter['apiClient'].createDeal).toHaveBeenCalled();
    });

    it('should create lead with email and phone', async () => {
      const leadInput: CreateLeadInput = {
        title: 'Contact Lead',
        email: 'contact@example.com',
        phone: '+5511999999999',
        pipelineId: '1',
        stageId: '2',
      };

      vi.spyOn(adapter['apiClient'], 'createPerson').mockResolvedValueOnce({
        success: true,
        data: { id: 789, name: 'Contact Lead' },
      });

      vi.spyOn(adapter['apiClient'], 'createDeal').mockResolvedValueOnce({
        success: true,
        data: {
          id: 456,
          title: 'Contact Lead',
          person_id: 789,
          pipeline_id: 1,
          stage_id: 2,
          add_time: '2024-01-01T00:00:00Z',
          update_time: '2024-01-01T00:00:00Z',
          stage_name: 'Open',
          custom_fields: {},
        },
      });

      const lead = await adapter.createLead(testAccountId, leadInput);

      expect(lead).toBeDefined();
      expect(adapter['apiClient'].createPerson).toHaveBeenCalled();
    });

    it('should include custom fields', async () => {
      const leadInput: CreateLeadInput = {
        title: 'Custom Fields Lead',
        pipelineId: '1',
        stageId: '2',
        customFields: { custom_field_1: 'value1' },
      };

      vi.spyOn(adapter['apiClient'], 'createDeal').mockResolvedValueOnce({
        success: true,
        data: {
          id: 456,
          title: 'Custom Fields Lead',
          pipeline_id: 1,
          stage_id: 2,
          add_time: '2024-01-01T00:00:00Z',
          update_time: '2024-01-01T00:00:00Z',
          stage_name: 'Open',
          custom_fields: { custom_field_1: 'value1' },
        },
      });

      const lead = await adapter.createLead(testAccountId, leadInput);

      expect(lead.customFields).toEqual({ custom_field_1: 'value1' });
    });
  });

  describe('updateLead', () => {
    it('should update lead title', async () => {
      const updateInput: UpdateLeadInput = {
        title: 'Updated Title',
      };

      vi.spyOn(adapter['apiClient'], 'updateDeal').mockResolvedValueOnce({
        success: true,
        data: {
          id: 123,
          title: 'Updated Title',
          pipeline_id: 1,
          stage_id: 2,
          add_time: '2024-01-01T00:00:00Z',
          update_time: '2024-01-02T00:00:00Z',
          stage_name: 'Open',
          custom_fields: {},
        },
      });

      const lead = await adapter.updateLead(testAccountId, '123', updateInput);

      expect(lead.title).toBe('Updated Title');
      expect(adapter['apiClient'].updateDeal).toHaveBeenCalledWith(123, expect.any(Object));
    });

    it('should update custom fields', async () => {
      const updateInput: UpdateLeadInput = {
        customFields: { custom_field_1: 'new_value' },
      };

      vi.spyOn(adapter['apiClient'], 'updateDeal').mockResolvedValueOnce({
        success: true,
        data: {
          id: 123,
          title: 'Test',
          pipeline_id: 1,
          stage_id: 2,
          add_time: '2024-01-01T00:00:00Z',
          update_time: '2024-01-02T00:00:00Z',
          stage_name: 'Open',
          custom_fields: { custom_field_1: 'new_value' },
        },
      });

      const lead = await adapter.updateLead(testAccountId, '123', updateInput);

      expect(lead.customFields.custom_field_1).toBe('new_value');
    });
  });

  describe('moveLead', () => {
    it('should move lead to new stage', async () => {
      const moveInput: MoveLadInput = {
        stageId: '5',
      };

      vi.spyOn(adapter['apiClient'], 'updateDeal').mockResolvedValueOnce({
        success: true,
        data: {
          id: 123,
          title: 'Test Lead',
          pipeline_id: 1,
          stage_id: 5,
          add_time: '2024-01-01T00:00:00Z',
          update_time: '2024-01-02T00:00:00Z',
          stage_name: 'Won',
          custom_fields: {},
        },
      });

      const lead = await adapter.moveLead(testAccountId, '123', moveInput);

      expect(lead.stageId).toBe('5');
      expect(lead.stageName).toBe('Won');
    });
  });

  describe('getPipelines', () => {
    it('should fetch all pipelines with stages', async () => {
      vi.spyOn(adapter['apiClient'], 'getPipelines').mockResolvedValueOnce({
        success: true,
        data: [
          { id: 1, name: 'Sales', description: 'Sales pipeline' },
          { id: 2, name: 'Support', description: 'Support pipeline' },
        ],
      });

      vi.spyOn(adapter['apiClient'], 'getStages')
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: 1, name: 'Open', order_nr: 1 }],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: 10, name: 'New', order_nr: 1 }],
        });

      const pipelines = await adapter.getPipelines(testAccountId);

      expect(pipelines).toHaveLength(2);
      expect(pipelines[0].name).toBe('Sales');
      expect(pipelines[0].stages).toBeDefined();
    });

    it('should handle empty pipelines', async () => {
      vi.spyOn(adapter['apiClient'], 'getPipelines').mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const pipelines = await adapter.getPipelines(testAccountId);

      expect(pipelines).toEqual([]);
    });
  });

  describe('getStages', () => {
    it('should fetch stages for pipeline', async () => {
      const mockStages = [
        { id: 1, name: 'Open', order_nr: 1, color: '#00FF00' },
        { id: 2, name: 'In Progress', order_nr: 2, color: '#FFFF00' },
        { id: 3, name: 'Won', order_nr: 3, color: '#0000FF' },
      ];

      vi.spyOn(adapter['apiClient'], 'getStages').mockResolvedValueOnce({
        success: true,
        data: mockStages,
      });

      const stages = await adapter.getStages(testAccountId, '1');

      expect(stages).toHaveLength(3);
      expect(stages[0].name).toBe('Open');
      expect(stages[0].order).toBe(1);
      expect(stages[0].crmType).toBe('pipedrive');
    });
  });

  describe('getFields', () => {
    it('should fetch deal fields', async () => {
      const mockFields = [
        { id: 1, key: 'title', name: 'Title', field_type: 'text', mandatory: true },
        { id: 2, key: 'value', name: 'Value', field_type: 'double', mandatory: false },
      ];

      vi.spyOn(adapter['apiClient'], 'getFields').mockResolvedValueOnce({
        success: true,
        data: mockFields,
      });

      const fields = await adapter.getFields(testAccountId, 'lead');

      expect(fields).toBeDefined();
      expect(adapter['apiClient'].getFields).toHaveBeenCalledWith('deal');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      vi.spyOn(adapter['apiClient'], 'getPipelines').mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const isConnected = await adapter.testConnection(testAccountId);

      expect(isConnected).toBe(true);
    });

    it('should return false on failed connection', async () => {
      vi.spyOn(adapter['apiClient'], 'getPipelines').mockResolvedValueOnce({
        success: false,
      });

      const isConnected = await adapter.testConnection(testAccountId);

      expect(isConnected).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('should parse valid webhook event', () => {
      const payload = {
        event: 'added.deal',
        data: { id: 123, title: 'New Deal' },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result).toBeDefined();
      expect(result?.type).toBe('added.deal');
      expect(result?.data).toEqual({ id: 123, title: 'New Deal' });
    });

    it('should return null for invalid payload', () => {
      const result = adapter.parseWebhookEvent(null);

      expect(result).toBeNull();
    });

    it('should return null for missing event', () => {
      const payload = { data: {} };

      const result = adapter.parseWebhookEvent(payload);

      expect(result).toBeNull();
    });
  });
});
