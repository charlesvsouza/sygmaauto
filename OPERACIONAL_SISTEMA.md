# Operacional do Sistema

Data de referência: 07/07/2026
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
- WHATSAPP_PROVIDER: META_CLOUD (único provider suportado — Evolution foi removida por segurança)
- Credenciais Meta Cloud API por tenant (phone number id) configuráveis via Settings
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

### 4.4 Texto de baixo contraste em cards `bg-accent` (ServiceOrdersPage) — 07/07/2026
- Sintoma: labels (Veículo/Placa/Ano-Cor/KM Atual/KM Entrada, Total da Ordem) quase invisíveis sobre o card verde-água de "Dados do Veículo" e no bloco "Totais".
- Causa: uso de `text-white/60-80` (branco com opacidade reduzida) sobre `bg-accent` (`#0d7d6e`, luminância média). Contraste calculado fica entre ~2,8:1 e ~4,1:1 — abaixo do mínimo AA (4,5:1 para texto, 3:1 para ícones/UI).
- Correção: labels passaram para branco opaco (`text-white`); hierarquia label/valor continua garantida por tamanho e peso de fonte (não por opacidade), alinhado ao princípio de design do produto.
- Nota: opacidade reduzida de branco só é segura sobre fundos bem escuros (`bg-ink`, quase preto); sobre `bg-accent` (teal médio) não fecha AA em nenhuma fração testada — evitar esse padrão em novas telas.

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
- Retífica de Motores: linha de produto própria (planos RETIFICA_PRO/RETIFICA_REDE) com fluxo de status dedicado, metrologia por cilindro e laudo técnico em PDF. Ver `ROADMAP.md` (Sprint 3.5) para detalhes e dívida técnica conhecida (metrologia sem model Prisma próprio).

### 6.1 Backup do banco de dados

- Workflow `.github/workflows/backup-db.yml`: `pg_dump` diário (03:00 BRT) + disparo manual (`gh workflow run backup-db.yml`), formato custom comprimido, enviado como artifact privado do repositório (retenção 30 dias). Reusa o secret `DATABASE__PUBLIC_URL` já existente.
- **Importante:** o servidor de produção roda **Postgres 18** — o dump usa a imagem `postgres:18-alpine` via Docker no runner para evitar erro de `server version mismatch` (pg_dump precisa ser da mesma versão ou mais novo que o servidor).
- **Restaurar um backup:** baixar o artifact (`gh run download <run-id> -n db-backup-<stamp>`), depois `pg_restore --clean --if-exists -d "$DATABASE_URL" sygmaauto-<stamp>.dump`. Isso restaura o banco INTEIRO (todos os tenants) — não é uma operação por tenant. Use com backend parado/health-check desligado para evitar escrita concorrente durante o restore.
- Ainda pendente: confirmar/ativar o backup nativo de volume do Railway (Postgres service → Settings → Backups no dashboard — não acessível via CLI) como camada adicional.
- Ver `.github/workflows/db-reset.yml`: workflow manual existente que **apaga e recria o banco inteiro** (todos os tenants) para popular só com o seed padrão. Não é tenant-scoped — cuidado ao disparar em produção com tenants reais ativos (ex.: POWER&TRAIN).

## 7. Checklist rápido para incidentes

1. Verificar status do serviço Railway: sygmaauto-api.
2. Verificar logs do Railway deployment: DATABASE_URL e NODE_ENV.
3. Confirmar endpoints públicos: GET / e GET /health retornando 200.
4. Verificar variáveis WhatsApp/Meta se houver falha de mensageria.
5. Se mudança de variável crítica, aguardar novo deployment até SUCCESS.
6. **Se um endpoint de listagem retornar 500 logo após um deploy com mudança de schema:** verificar se a tabela nova foi criada (`railway run npx prisma db push --accept-data-loss` recria de forma aditiva). Incidente real em 07/07/2026: `prisma db push` falhou silenciosamente no release do Railway, deixando `GET /service-orders` quebrado para todos os tenants por ~20min até rodar o push manualmente. Dados não foram perdidos — o erro era só de leitura (relação para tabela inexistente).
7. **Sempre conferir o resultado do workflow `Deploy` no GitHub Actions após um push que mexe em frontend** (`gh run list --workflow=deploy.yml --limit 1`) — não basta o push ter ido, o job "Deploy Frontend → Vercel" precisa aparecer como `success`.

### 7.1 Arquitetura de deploy do frontend (esclarecida em 07/07/2026 após falso alarme)

- **Como o frontend chega em produção:** pela **integração Git nativa do Vercel** — o projeto `sygmaauto` no Vercel está conectado a este repositório com Root Directory = `frontend`; todo push em `master` gera um deploy de produção automático (aliases `sigmaauto.com.br` / `www` / `sygmaauto-git-master-...`). Confirmável com `vercel ls sygmaauto` e `vercel inspect <url>` (CLI autenticado como charlesvsouza).
- **Falso alarme investigado:** o job "Deploy Frontend → Vercel" do `.github/workflows/deploy.yml` falhava em todo push desde `7d682d2` (04/07) com `The provided path ".../frontend/frontend" does not exist` — o job rodava o CLI de dentro de `frontend/` e o Root Directory do projeto duplicava o caminho. **Isso NÃO deixou o site desatualizado**: a integração Git deployava em paralelo o tempo todo (verificado no bundle de produção, que continha o código mais recente). O job do Actions era um **caminho duplicado** — quando funcionava, gerava dois deploys de produção por push, com risco de corrida no alias.
- **Decisão (07/07/2026):** o job de deploy do frontend foi **removido** do Actions; a integração Git do Vercel é o caminho único. O `frontend-check` (build de validação) continua rodando a cada push. O deploy do backend via Actions/Railway permanece como está.
- **Como conferir um deploy de frontend:** `vercel ls sygmaauto` (o mais novo com ● Ready e alias em sigmaauto.com.br) ou baixar o bundle do site e procurar um marcador do commit recente.

## 8. Referências úteis
- COMPLIANCE.md: políticas LGPD, privacidade, retenção, incidentes.
- ROADMAP.md: funcionalidades por sprint e plano.
- OPERACIONAL_INTERFACE.md: UI, boards, identidade visual.
- config.md: variáveis, segurança e convenções adicionais.
