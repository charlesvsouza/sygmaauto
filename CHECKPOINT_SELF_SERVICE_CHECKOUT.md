# CHECKPOINT — Self-Service Checkout + Onboarding (replicável)

## Objetivo de negócio

Migrar de fluxo **login primeiro** para fluxo **compra primeiro**:
1. Cliente escolhe plano na landing
2. Seleciona periodicidade (mensal/trimestral/semestral/anual)
3. Paga no Mercado Pago
4. Webhook confirma pagamento
5. Sistema envia convite de ativação para MASTER
6. MASTER conclui onboarding em /activate/:token

---

## Problemas encontrados no fluxo antigo

1. Exigia autenticação antes do pagamento (fricção alta para lead novo)
2. Sem opção de periodicidade no checkout
3. Webhook só atualizava assinatura de tenant já autenticado
4. Confusão de credenciais após reset de banco (401 em /auth/login)
5. Erros de extensão no navegador mascaravam diagnóstico real

---

## O que foi implementado agora

### Backend

- Novo endpoint público de checkout:
  - `POST /public/subscriptions/checkout`
  - Controller: `backend/src/subscriptions/subscriptions.public.controller.ts`
  - DTO: `PublicCheckoutDto` em `backend/src/subscriptions/dto/subscription.dto.ts`

- Periodicidade adicionada:
  - `BillingCycle`: `MONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`
  - Aplicada em checkout autenticado e público

- Criação de tenant pendente no checkout público:
  - Reuso/Criação de tenant `PENDING_SETUP`
  - Upsert de subscription em `PAST_DUE` até pagamento aprovado

- Webhook MP aprimorado:
  - Lê `billingCycle` de metadata/external_reference
  - Ajusta `currentPeriodEnd` por meses do ciclo
  - Para tenant `PENDING_SETUP`, gera `setupInviteToken` e `setupInviteExpiresAt`
  - Envia convite de ativação por email (reuso de `EmailService`)

- Módulo atualizado para notificações:
  - `SubscriptionsModule` importa `NotificationsModule`

### Frontend

- Landing page agora abre checkout público para não autenticado:
  - Modal com dados mínimos:
    - Nome da oficina
    - Email para convite MASTER
    - Documento opcional
    - Periodicidade
  - Botão “Ir para Mercado Pago” chama endpoint público

- Fluxo autenticado foi mantido:
  - Se já logado, continua usando `/subscriptions/checkout`

- API client atualizado:
  - `subscriptionsApi.createPublicCheckout(...)`
  - `subscriptionsApi.createCheckout(...)` agora aceita `billingCycle`

---

## Arquivos alterados

- `backend/src/subscriptions/dto/subscription.dto.ts`
- `backend/src/subscriptions/subscriptions.module.ts`
- `backend/src/subscriptions/subscriptions.service.ts`
- `backend/src/subscriptions/subscriptions.public.controller.ts` (novo)
- `frontend/src/api/client.ts`
- `frontend/src/pages/LandingPage.tsx`

---

## Lógica técnica atual (novo fluxo)

1. Landing (não autenticado) -> abre modal checkout público
2. Front chama `POST /public/subscriptions/checkout`
3. Backend cria/atualiza tenant `PENDING_SETUP` + subscription pendente
4. Backend cria preferência MP com metadata:
   - tenantId
   - plan
   - billingCycle
   - inviteEmail
5. Cliente paga no Mercado Pago
6. MP chama webhook
7. Backend valida assinatura/token webhook e busca payment
8. Se approved:
   - ativa subscription com período conforme ciclo
   - gera convite onboarding (token + expiração)
   - envia email de ativação
9. MASTER ativa em `/activate/:token` e cria senha/usuário

---

## Requisitos para funcionar em produção

1. `MP_ACCESS_TOKEN` configurado
2. Segurança webhook configurada:
   - `MP_WEBHOOK_SECRET` (preferível) e/ou `MP_WEBHOOK_TOKEN`
3. URL pública do backend para webhook:
   - `BACKEND_PUBLIC_URL` (ou `MP_WEBHOOK_URL` explícita)
4. Frontend canônico:
   - `FRONTEND_URL=https://sigmaauto.com.br`
5. SMTP configurado para envio de convite:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

---

## Pontos de atenção para replicar em outro projeto

1. Definir estados de tenant/assinatura claros (`PENDING_SETUP`, `ACTIVE`, etc.)
2. Garantir idempotência de webhook (payment já aplicado)
3. Salvar `billingCycle` também no domínio de assinatura (se houver necessidade fiscal/relatórios)
4. Diferenciar fluxo público (aquisição) de fluxo autenticado (upgrade interno)
5. Prever fallback de convite quando SMTP indisponível (retornar link de ativação em admin)

---

## Próximos passos recomendados

1. Persistir dados de cobrança/ciclo em entidade dedicada (ex.: `BillingOrder`) para auditoria
2. Adicionar página pública de sucesso/cancelamento com instrução de “verifique seu email de ativação”
3. Implementar descontos por ciclo (semestral/anual) via tabela de pricing
4. Adicionar antifraude básico e rate limit no endpoint público
5. Cobrir com testes E2E de ponta a ponta (landing -> MP webhook simulado -> onboarding)
