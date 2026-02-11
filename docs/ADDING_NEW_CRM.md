# Adicionando um Novo CRM (HubSpot, Salesforce, etc)

Este documento descreve como adicionar suporte a um novo CRM usando o padrão de adapter implementado.

## Pré-requisitos

A arquitetura é extensível através do padrão **Adapter**. Cada CRM deve implementar a interface `ICrmAdapter`.

## Passos para Adicionar um Novo CRM

### 1. Criar o Adapter do CRM

**Arquivo:** `src/services/crm/adapters/{CrmName}Adapter.ts`

```typescript
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

export class HubSpotAdapter implements ICrmAdapter {
  constructor(apiToken: string) {
    // Inicializar com token
  }

  getCrmType() {
    return 'hubspot' as const;
  }

  // Implementar todos os métodos da interface ICrmAdapter
  async getLeads(accountId: string, filters?: LeadFilter): Promise<Lead[]> {
    // Implementação específica do HubSpot
  }

  // ... mais métodos
}
```

### 2. Criar o API Client do CRM

**Arquivo:** `src/services/crm/clients/{CrmName}ApiClient.ts`

```typescript
export class HubSpotApiClient {
  constructor(config: HubSpotConfig) {
    // Inicializar axios ou outro HTTP client
  }

  async getDeals(params: Record<string, any>) {
    // Chamadas específicas para HubSpot API
  }

  // ... mais métodos
}
```

### 3. Criar Mappers (se necessário)

**Arquivo:** `src/services/crm/mappers/{CrmName}Mapper.ts`

Se o CRM tiver estrutura de dados muito diferente, crie um mapper:

```typescript
export class HubSpotMapper {
  mapHubSpotDealToLead(deal: any, accountId: string): Lead {
    // Transformar formato HubSpot para Lead interno
  }
}
```

### 4. Registrar o Adapter no CrmAccountManager

**Arquivo:** `src/services/crm/CrmAccountManager.ts`

Adicione no método `createAdapter`:

```typescript
private createAdapter(config: CrmAccountConfig): ICrmAdapter {
  switch (config.type) {
    case 'pipedrive':
      // ... existente
      return new PipedriveAdapter(config.apiToken, config.domain);

    case 'hubspot':  // ← Novo
      return new HubSpotAdapter(config.apiToken);

    case 'salesforce':
      // ... implementar depois
      throw new Error('Salesforce adapter not yet implemented');

    default:
      throw new Error(`Unsupported CRM type: ${config.type}`);
  }
}
```

### 5. Adicionar Testes

**Arquivo:** `tests/unit/services.crm.{crmname}.adapter.test.ts`

```typescript
describe('HubSpotAdapter', () => {
  let adapter: HubSpotAdapter;

  beforeEach(() => {
    adapter = new HubSpotAdapter('test-token');
  });

  describe('getCrmType', () => {
    it('should return hubspot as CRM type', () => {
      expect(adapter.getCrmType()).toBe('hubspot');
    });
  });

  // ... mais testes
});
```

## Checklist para Novo CRM

- [ ] Adapter implementado (20-30 min)
- [ ] API Client implementado (30-45 min)
- [ ] Mappers implementados se necessário (15-30 min)
- [ ] Registrado em CrmAccountManager (5 min)
- [ ] 20+ testes unitários (1-2 horas)
- [ ] TypeScript compila sem erros
- [ ] Todos os testes passam (100%)
- [ ] PR com descrição clara

## Estimativa de Tempo

| CRM | API Client | Adapter | Mappers | Testes | Total |
|-----|-----------|---------|---------|--------|-------|
| HubSpot | 1h | 1.5h | 30min | 2h | ~5h |
| Salesforce | 1h | 1.5h | 1h | 2h | ~5.5h |

## Estrutura de Tipos do CRM

Cada CRM pode ter estrutura diferente. Mapeie para os tipos internos:

```typescript
// Interno (universal)
interface Lead {
  id: string;
  externalId: string;
  title: string;
  email?: string;
  phone?: string;
  companyName?: string;
  customFields: Record<string, unknown>;
}

// Pipedrive (deal)
interface PipedriveDeal {
  id: number;
  title: string;
  person_id?: number;
  org_id?: number;
  custom_fields?: Record<string, unknown>;
}

// HubSpot (deal)
interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    hubspot_owner_id: string;
    [key: string]: any;
  };
}
```

## Campos Dinâmicos

Cada CRM tem sua própria forma de definir campos customizados:

**Pipedrive:**
```
GET /v1/dealFields - lista com key, name, field_type
```

**HubSpot:**
```
GET /crm/v3/objects/deals/describe - lista propriedades
```

**Salesforce:**
```
GET /services/data/vXX/sobjects/Opportunity/describe - lista fields
```

Implemente `getFields()` conforme a API de cada CRM.

## Suporte a Webhook

Cada CRM tem seu próprio formato de webhook:

**Pipedrive:**
```json
{
  "event": "added.deal",
  "data": { "id": 123, "title": "Deal" }
}
```

**HubSpot:**
```json
{
  "portalId": 123,
  "objectId": 456,
  "changeSource": "CRM_UI",
  "eventId": 789
}
```

Implemente `parseWebhookEvent()` para cada CRM.

## Exemplo Completo: HubSpot (Futuro)

Quando for adicionar HubSpot, siga este padrão:

1. `src/services/crm/adapters/HubSpotAdapter.ts`
2. `src/services/crm/clients/HubSpotApiClient.ts`
3. `src/services/crm/mappers/HubSpotMapper.ts` (opcional)
4. `tests/unit/services.crm.hubspot.adapter.test.ts`
5. Registrar em `CrmAccountManager.createAdapter()`
6. Atualizar type de `CrmType` em `crm.types.ts` se necessário

## Referências

- **PipedriveAdapter**: Exemplo completo em `src/services/crm/adapters/PipedriveAdapter.ts`
- **ICrmAdapter Interface**: `src/services/crm/adapters/ICrmAdapter.ts`
- **CrmTypes**: `src/models/crm.types.ts`

---

**Próximas CRMs Planejadas (1 mês):**
- HubSpot (5h estimadas)
- Salesforce (5.5h estimadas)

Total estimado: **10.5h** para 2 novos CRMs

---

Generated: 2026-02-11 | Framework: Adapter Pattern | Status: Extensível
