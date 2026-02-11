# Deployment Guide - gaud-integrations (Cloudflare Workers)

## 🚀 Overview

Deploy **automático no Cloudflare Workers** ao fazer merge para `main`:

- ✅ **CI:** Testes + Build em todo push/PR
- ✅ **Gemini Review:** Validação automática em PRs (via gaud-developer)
- ✅ **Deploy:** Automático para Cloudflare Workers ao merge para `main`

## 📋 Setup Inicial

### 1. Instalar Wrangler CLI

```bash
npm install -g wrangler
# ou local: npm install --save-dev wrangler
```

### 2. Autenticar com Cloudflare

```bash
wrangler login
# Abre navegador para autenticar
```

### 3. Configurar wrangler.toml

```toml
name = "gaud-integrations"
account_id = "seu_account_id"  # Encontrar em Cloudflare Dashboard

[env.development]
route = "dev-api.gaud.com/*"
zone_id = "seu_zone_id"

[env.production]
route = "api.gaud.com/*"
zone_id = "seu_zone_id"

# KV Namespaces
kv_namespaces = [
  { binding = "CACHE", id = "xxx", preview_id = "yyy" }
]
```

### 4. Secrets do GitHub

Configurar em **Settings → Secrets and variables → Actions**:

```yaml
CLOUDFLARE_API_TOKEN: <seu token do Cloudflare>
CLOUDFLARE_ACCOUNT_ID: <seu account ID>
SLACK_WEBHOOK_DEPLOYMENT: https://hooks.slack.com/...
```

## 🔄 Fluxo de Deploy

### 1️⃣ Desenvolvedor cria PR

```bash
git checkout -b feat/nova-feature
# ... implementar
git push origin feat/nova-feature
```

**CI (automático):**
- ✅ Build TypeScript
- ✅ Rodar 117 testes
- ✅ ESLint validation

### 2️⃣ Gemini Review (automático)

```
✅ Code review passed by Gemini
- Testes: 117/117
- TypeScript: 0 errors
- SOLID principles: ✅
```

### 3️⃣ Merge para main

```bash
gh pr merge 4 --squash
```

**Deploy automático:**
```
main ← merge
   ↓
GitHub Actions: CI
   ├─ npm ci
   ├─ npm run lint
   ├─ npm run build
   └─ npm run test:ci
   ↓
Deploy Staging
   └─ wrangler deploy --env development
   ↓
Deploy Production
   └─ wrangler deploy --env production
   ↓
Health Check
   └─ curl api.gaud.com/health
   ↓
Slack notification ✅
```

## 🚀 Deploy Manual

### Staging

```bash
npm run deploy:staging
# Deploy para dev-api.gaud.com
```

### Production

```bash
npm run deploy:prod
# Deploy para api.gaud.com
```

### Ambos (via wrangler)

```bash
wrangler deploy
# Deploy para todos os ambientes configurados
```

## 📊 Monitoramento

### Health Check

```bash
# Staging
curl https://dev-api.gaud.com/health

# Production
curl https://api.gaud.com/health
```

### Logs em Tempo Real

```bash
# Ver logs do Worker
wrangler tail

# Ver logs de um ambiente específico
wrangler tail --env production
```

### Cloudflare Dashboard

1. Ir para **Workers**
2. Selecionar `gaud-integrations`
3. Ver logs, métricas e analytics

## 🔄 Rollback

Se houver problema em produção:

```bash
# Revert commit
git revert <commit-sha>
git push origin main

# Deploy automático da versão anterior
# (GitHub Actions deploy novamente)
```

Ou rollback manual:

```bash
# Deploy versão anterior conhecida
git checkout <commit-anterior>
npm run deploy:prod
```

## 🌐 KV Namespace (Cache)

Configurar cache para leads:

```typescript
// No código
const leads = await CACHE.get('leads:account:123');

// CLI para gerenciar
wrangler kv:namespace list
wrangler kv:key list --binding=CACHE
```

## 📝 Variáveis de Ambiente

### Secrets do Cloudflare

Configurar via Cloudflare Dashboard ou CLI:

```bash
wrangler secret put PIPEDRIVE_API_TOKEN --env production
wrangler secret put PIPEDRIVE_COMPANY_DOMAIN --env production
wrangler secret put WEBHOOK_VERIFY_TOKEN --env production
```

### .wrangler.toml (não commitar secrets!)

```toml
[env.production]
vars = {
  LOG_LEVEL = "info",
  NODE_ENV = "production"
}
```

## ✅ Checklist pré-merge

- [ ] PR aprovado pelo Gemini
- [ ] Testes: 117/117 passing
- [ ] Build sem erros
- [ ] ESLint compliant
- [ ] Documentação atualizada
- [ ] `.env.example` atualizado se novo env var
- [ ] Commit message clara

## 🚨 Troubleshooting

### Deploy falha no Cloudflare

```bash
# Ver erro detalhado
wrangler deploy --verbose

# Tentar deploy local primeiro
npm run dev
# Testar em http://localhost:8787
```

### Health check falha

```bash
# Verificar logs
wrangler tail --env production

# Testar endpoint local
curl http://localhost:8787/health

# Verificar secrets estão configurados
wrangler secret list --env production
```

### Webhook não funciona

1. Verificar logs: `wrangler tail`
2. Testar endpoint:
```bash
curl -X POST https://api.gaud.com/webhooks/crm/sync?accountId=xxx \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

## 📚 Documentação

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [KV Store](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [CI/CD Workflow](https://github.com/gauderp/gaud-integrations/blob/main/.github/workflows/ci.yml)

## 🤝 Integração com gaud-developer

Este repositório é **monitorado pelo gaud-developer**:

- ✅ Code review automático (Gemini)
- ✅ Deploy automático (Cloudflare)
- ✅ Notificações no Slack
- ✅ Webhook sync

Ver [.gaud/config.json](./.gaud/config.json).

---

**Status:** ✅ Pronto para produção (Cloudflare Workers)
**Última atualização:** 2026-02-11
**Deploy:** Automático via GitHub Actions
