# Configuracao de Producao - Railway (sygmaauto-api)

## Resumo do incidente

- Sintoma: deployment ficava em retry de healthcheck ate falhar.
- Causa raiz: `DATABASE_URL` estava vazia no servico `sygmaauto-api`.
- Efeito: Prisma falhava no bootstrap com erro `P1012` e o processo reiniciava.
- Correcao aplicada:
  - `DATABASE_URL` preenchida com URL PostgreSQL valida.
  - `NODE_ENV` normalizada para `production` (sem tab/espacos ocultos).
  - `DATABASE_CONNECTION_URI` alinhada ao mesmo valor da `DATABASE_URL` para evitar divergencia.
- Estado validado:
  - Deployment Railway: `SUCCESS`
  - `GET /`: `200`
  - `GET /health`: `200`

## Padrao de seguranca adotado

1. Sempre fazer backup/log das variaveis antes de alterar.
2. Aplicar mudancas minimas e validar logo em seguida.
3. Nao versionar segredos reais no repositrio.
4. Manter uma unica fonte de verdade para conexao com banco (`DATABASE_URL`).

## Variaveis obrigatorias (backend)

| Variavel | Obrigatoria | Exemplo/Regra | Observacao |
|---|---|---|---|
| `DATABASE_URL` | Sim | `postgresql://user:pass@host:port/db` | Nao pode estar vazia. |
| `JWT_SECRET` | Sim | `<secret>` | Token JWT principal. |
| `JWT_REFRESH_SECRET` | Sim | `<secret>` | Token refresh. |
| `NODE_ENV` | Sim | `production` | Sem tabs/espacos ocultos. |
| `PORT` | Sim | `3000` | Alinhado ao target port do Railway. |
| `FRONTEND_URL` | Sim | `https://sigmaauto.com.br` | Base para links de auth/reset. |
| `BACKEND_PUBLIC_URL` | Sim | `https://sygmaauto-api-production.up.railway.app` | URL publica da API. |

## Variaveis de integracao

| Variavel | Obrigatoria | Observacao |
|---|---|---|
| `WHATSAPP_PROVIDER` | Sim | Deve ser `META_CLOUD` (oficial). |
| `META_WHATSAPP_TOKEN` | Sim | Token permanente da Meta Cloud API. |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Sim | Fallback global do backend e referencia padrao inicial. |
| `META_WHATSAPP_API_VERSION` | Nao | Default: `v22.0`. |
| `META_WHATSAPP_APP_SECRET` | Sim | Obrigatoria para validar assinatura `X-Hub-Signature-256` do webhook. |
| `META_WHATSAPP_VERIFY_TOKEN` | Sim | Obrigatoria para validacao inicial do webhook (`hub.challenge`). |
| `MP_ACCESS_TOKEN` | Sim | Mercado Pago (producao). |
| `MP_WEBHOOK_SECRET` | Sim | Assinatura de webhook Mercado Pago. |
| `MP_MODE` | Sim | `production` |
| `GOOGLE_API_KEY` | Sim | IA/importacao de PDF. |
| `SMTP_HOST` | Sim | SMTP transacional. |
| `SMTP_PORT` | Sim | Ex.: `587` |
| `SMTP_USER` | Sim | Usuario SMTP. |
| `SMTP_PASS` | Sim | Senha SMTP. |
| `SMTP_FROM_EMAIL` | Sim | Remetente padrao. |
| `SMTP_FROM_NAME` | Sim | Nome do remetente. |

## Variaveis auxiliares (permitidas)

| Variavel | Status recomendado | Observacao |
|---|---|---|
| `DATABASE_CONNECTION_URI` | Opcional (alias) | Se usada, manter identica a `DATABASE_URL`. |
| `CORS_ORIGINS` | Recomendado | Lista CSV de origens permitidas. |
| `CHECKOUT_SUCCESS_URL` | Recomendado | Fluxo de checkout frontend. |
| `CHECKOUT_CANCEL_URL` | Recomendado | Fluxo de checkout frontend. |
| `CHECKOUT_ALLOWED_RETURN_ORIGINS` | Recomendado | Hardening de retorno de checkout. |
| `ALLOW_INTERNAL_PLAN_CHANGE` | Opcional | Controle de alteracao interna de plano. |
| `SUPER_ADMIN_BOOTSTRAP_SECRET` | Opcional | Bootstrap controlado de superadmin. |

## Nota de seguranca para WhatsApp

- Para producao com clientes finais, usar exclusivamente `WHATSAPP_PROVIDER=META_CLOUD` (API oficial).
- A configuracao por oficina (tenant) do `Phone Number ID` e feita na aba de Configuracoes do sistema.
- Tokens e segredos (`META_WHATSAPP_TOKEN`, `META_WHATSAPP_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN`) devem permanecer apenas no backend (Railway Variables).

## Variaveis automaticas do Railway (nao editar)

- `RAILWAY_ENVIRONMENT`
- `RAILWAY_ENVIRONMENT_ID`
- `RAILWAY_ENVIRONMENT_NAME`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_PROJECT_NAME`
- `RAILWAY_SERVICE_ID`
- `RAILWAY_SERVICE_NAME`
- `RAILWAY_PRIVATE_DOMAIN`
- `RAILWAY_PUBLIC_DOMAIN`
- `RAILWAY_STATIC_URL`
- `RAILWAY_SERVICE_POSTGRES_URL`
- `RAILWAY_SERVICE_SYGMAAUTO_API_URL`

## Checklist rapido para incidentes de healthcheck

1. `railway service status -s sygmaauto-api`
2. `railway service logs --latest --deployment --lines 200 -s sygmaauto-api`
3. Confirmar `DATABASE_URL` nao vazia:
   - `railway variable list -s sygmaauto-api --json`
4. Verificar endpoints publicos:
   - `GET /` deve retornar `200`
   - `GET /health` deve retornar `200`
5. Se variavel critica mudar, aguardar novo deployment ate `SUCCESS`.

## Nota operacional

- O erro `P1012` do Prisma em producao, neste contexto, significa quase sempre problema de `DATABASE_URL` ausente, vazia ou mal formatada.

## Registro legado (compatibilidade de schema)

- Data: 2026-05-07
- Contexto: apos a introducao da configuracao de WhatsApp por tenant, alguns ambientes ficaram com drift de schema e o login passou a falhar com erro de coluna ausente em `tenants.whatsappMetaPhoneNumberId`.
- Acao permanente aplicada: o `release.js` agora executa, antes do `prisma db push`, os comandos abaixo com `IF NOT EXISTS`:
  - `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "whatsappMetaPhoneNumberId" TEXT;`
  - `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "whatsappDisplayNumber" TEXT;`
- Classificacao: legado/compatibilidade operacional para evitar indisponibilidade em caso de deploy com banco desatualizado.
- Observacao: o caminho principal continua sendo `prisma db push`; este fallback apenas previne colapso operacional no bootstrap.
