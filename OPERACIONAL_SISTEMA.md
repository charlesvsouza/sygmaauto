# Operacional do Sistema

Data de referência: 05/05/2026
Escopo: SigmaAuto — backend NestJS/Prisma + frontend React + deploy Railway/Vercel

## 1. Visão Geral do Sistema

| Componente | URL | Status |
|---|---|---|
| Site Institucional | https://sigmaauto.com.br | Online |
| App (sistema) | https://www.sigmaauto.com.br | Online |
| API Backend | https://sygmaauto-api-production.up.railway.app | Online |
| Google Search Console | https://sigmaauto.com.br | Verificado e indexando |

Stack:
- Backend: NestJS + TypeScript + Prisma ORM + PostgreSQL
- Frontend: React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Zustand
- Auth: JWT (access + refresh token), multi-tenant por tenantId
- Pagamentos: Mercado Pago Checkout Pro
- Deploy: Vercel (frontend) + Railway (backend)
- CI/CD: GitHub Actions

## 2. Variáveis de Ambiente

### Railway Backend (obrigatórias)
- DATABASE_URL: conexão PostgreSQL
- JWT_SECRET: segredo JWT principal
- JWT_REFRESH_SECRET: segredo refresh
- FRONTEND_URL: base do frontend para links de auth
- NODE_ENV: production
- PORT: 3000
- EVOLUTION_API_URL: URL pública da Evolution API ou Meta Cloud
- EVOLUTION_API_KEY: chave de API
- EVOLUTION_INSTANCE: sygmaauto
- BACKEND_PUBLIC_URL: URL pública da API
- MP_ACCESS_TOKEN, MP_MODE, MP_WEBHOOK_SECRET, MP_WEBHOOK_TOKEN: Mercado Pago
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME: e-mail transacional
- ADMIN_NOTIFY_EMAIL: e-mail para notificações internas

### Vercel Frontend
- VITE_API_URL: https://sygmaauto-api-production.up.railway.app
- VITE_APP_URL: https://sigmaauto.com.br

### GitHub Actions Secrets
- RAILWAY_TOKEN
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
- VITE_API_URL

Nota de segurança:
- Nunca versionar segredos reais no repositório.
- Railway é a fonte de verdade para variáveis de produção.
- .env local existe apenas para desenvolvimento.

## 3. Deploy e Infraestrutura

### Railway
- Projeto: sygmaauto-wa-region-b / distinguished-strength
- Serviço backend: sygmaauto-api
- Release command: node release.js
- Start command: node dist/main
- Healthcheck: /health
- Região ativa WhatsApp: us-east4

### Vercel
- Projeto frontend: sygmaauto
- Domínio: sigmaauto.com.br / www.sigmaauto.com.br

### Docker Local
- docker-compose.yml sobe postgres:15, backend:3000, frontend:5173
- Backend build inclui prisma generate + puppeteer/chromium
- Frontend build entrega bundle para Nginx

## 4. Incidentes Resolvidos

### 4.1 Healthcheck Railway / DATABASE_URL vazia
- Sintoma: deployment ficava em retry até falhar.
- Causa: DATABASE_URL vazia no serviço sygmaauto-api.
- Correção: preencher DATABASE_URL, normalizar NODE_ENV=production, alinhar DATABASE_CONNECTION_URI.

### 4.2 WhatsApp QR Code / Evolution API bloqueada
- Sintoma: QR não gerado, timeout 45s.
- Causa: região asia-southeast1 com IP bloqueado pelo WhatsApp.
- Correção: migração para projeto Railway us-east4, reconfiguração de variáveis, polling de conexão.

### 4.3 RequirePlan incorreto em DRE/Indicadores/Comissões
- Sintoma: usuários PRO recebiam 403.
- Causa: endpoints com @RequirePlan('REDE') indevidamente.
- Correção: alterado para @RequirePlan('PRO').

## 5. Padrões de Código e Configuração

- Backend: apiResponse pattern e error handling centralizados com status HTTP semânticos.
- Backend: release.js executa prisma db push + fallbacks ALTER TABLE IF NOT EXISTS antes do start.
- Backend: aplicação de migration ausente via applyMissingMigrations() com try/catch por statement.
- Frontend: path alias @ mapeado para src.
- Frontend: axios client único em src/api/client.ts.
- Frontend: autenticação com Zustand + persist.
- Frontend: guardas de role/feature no frontend e backend.

## 6. Integrações Operacionais

- WhatsApp: provedor oficial Meta Cloud com validação HMAC e idempotência.
- Mercado Pago: checkout público e autenticado, periodicidade, webhook idempotente.
- SMTP: e-mails transacionais e convites de onboarding.
- IA: sugestão de orçamento via OpenAI GPT-4o-mini com fallback por keywords.
- PDF: Puppeteer headless para geração de OS/relatórios em produção.
- Google: suporte a OCR/importação de PDF quando GOOGLE_API_KEY configurado.

## 7. Checklist rápido para incidentes

1. Verificar status do serviço Railway: sygmaauto-api.
2. Verificar logs do Railway deployment: DATABASE_URL e NODE_ENV.
3. Confirmar endpoints públicos: GET / e GET /health retornando 200.
4. Verificar variáveis WhatsApp/Meta se houver falha de mensageria.
5. Se mudança de variável crítica, aguardar novo deployment até SUCCESS.

## 8. Referências úteis
- COMPLIANCE.md: políticas LGPD, privacidade, retenção, incidentes.
- ROADMAP.md: funcionalidades por sprint e plano.
- OPERACIONAL_INTERFACE.md: UI, boards, identidade visual.
- config.md: variáveis, segurança e convenções adicionais.
