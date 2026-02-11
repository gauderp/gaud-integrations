import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipedriveApiClient } from '../../src/services/pipedrive/PipedriveApiClient';
import type { PipedriveContact, PipedriveLead } from '../../src/models/pipedrive.types';

describe('PipedriveApiClient', () => {
  let client: PipedriveApiClient;
  const testConfig = {
    companyDomain: 'testcompany.pipedrive.com',
    apiToken: 'test-api-token-123',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000,
  };

  beforeEach(() => {
    client = new PipedriveApiClient(testConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(client).toBeDefined();
      expect(client.getConfig()).toEqual(testConfig);
    });

    it('should set default timeout if not provided', () => {
      const minimalConfig = {
        companyDomain: 'test.pipedrive.com',
        apiToken: 'token',
      };
      const minimalClient = new PipedriveApiClient(minimalConfig);
      const config = minimalClient.getConfig();

      expect(config.timeout).toBeGreaterThan(0);
      expect(config.retries).toBeGreaterThan(0);
    });
  });

  describe('buildApiUrl', () => {
    it('should build correct API URL', () => {
      const url = client.buildApiUrl('persons');
      expect(url).toContain('testcompany.pipedrive.com');
      expect(url).toContain('persons');
      expect(url).toContain('api_token=test-api-token-123');
    });

    it('should include query parameters', () => {
      const url = client.buildApiUrl('persons', { limit: 10, start: 0 });
      expect(url).toContain('limit=10');
      expect(url).toContain('start=0');
    });

    it('should handle filters parameter', () => {
      const url = client.buildApiUrl('persons', { name: 'John Doe' });
      expect(url).toContain('name=John');
      expect(url).toContain('Doe');
    });
  });

  describe('buildLeadPayload', () => {
    it('should build valid lead payload', () => {
      const leadData: PipedriveLead = {
        title: 'Test Lead',
        value: 1000,
        currency: 'USD',
        personId: 123,
        pipelineId: 1,
        stageId: 1,
      };

      const payload = {
        title: leadData.title,
        value: leadData.value,
        currency: leadData.currency || 'USD',
        person_id: leadData.personId,
        pipeline_id: leadData.pipelineId,
        stage_id: leadData.stageId,
      };

      expect(payload.title).toBe('Test Lead');
      expect(payload.value).toBe(1000);
      expect(payload.currency).toBe('USD');
      expect(payload.person_id).toBe(123);
    });
  });

  describe('buildContactPayload', () => {
    it('should build valid contact payload', () => {
      const contactData: PipedriveContact = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+5511999999999',
        city: 'São Paulo',
      };

      const payload = client.buildContactPayload(contactData);

      expect(payload.name).toBe('John Doe');
      expect(payload.email).toBe('john@example.com');
      expect(payload.phone).toBe('+5511999999999');
      expect(payload.org_id).toBeUndefined(); // Not provided
    });

    it('should map optional fields correctly', () => {
      const contactData: PipedriveContact = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        city: 'Rio de Janeiro',
        state: 'RJ',
      };

      const payload = client.buildContactPayload(contactData);

      expect(payload.email).toBe('jane@example.com');
      expect(payload.name).toBe('Jane Smith');
    });
  });

  describe('validateContact', () => {
    it('should validate correct contact', () => {
      const validContact: PipedriveContact = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const isValid = client.validateContact(validContact);

      expect(isValid).toBe(true);
    });

    it('should reject contact without name', () => {
      const invalidContact: PipedriveContact = {
        email: 'john@example.com',
      };

      const isValid = client.validateContact(invalidContact);

      expect(isValid).toBe(false);
    });

    it('should validate email format if provided', () => {
      const invalidEmailContact: PipedriveContact = {
        name: 'John Doe',
        email: 'invalid-email',
      };

      const isValid = client.validateContact(invalidEmailContact);

      expect(isValid).toBe(false);
    });
  });

  describe('validateLead', () => {
    it('should validate correct lead', () => {
      const validLead: PipedriveLead = {
        title: 'Test Lead',
        pipelineId: 1,
        stageId: 1,
      };

      const isValid = client.validateLead(validLead);

      expect(isValid).toBe(true);
    });

    it('should reject lead without title', () => {
      const invalidLead: PipedriveLead = {
        pipelineId: 1,
        stageId: 1,
      };

      const isValid = client.validateLead(invalidLead);

      expect(isValid).toBe(false);
    });

    it('should require pipelineId and stageId', () => {
      const incompleteLead: PipedriveLead = {
        title: 'Test Lead',
      };

      const isValid = client.validateLead(incompleteLead);

      expect(isValid).toBe(false);
    });
  });
});
