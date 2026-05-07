# 01 - Status Atual do Sistema (Oficina360)

Data: 2026-05-03
Branch: master

## Situacao Geral
- Backend e frontend ativos em arquitetura separada.
- Modulo de estoque com regra de plano PRO/REDE e controle de permissao por perfil.
- Fluxo de cadastro de pecas ajustado para exibir erros ao usuario.
- Integracao WhatsApp via Evolution API operacional com QR Code gerado com sucesso.

## Ajustes Aplicados em 2026-04-28 — Estoque e Permissoes

### Mudancas tecnicas
- Backend: endpoints de escrita de estoque agora exigem plano PRO.
  - POST /inventory/parts
  - PATCH /inventory/parts/:id
  - DELETE /inventory/parts/:id
  - POST /inventory/movements
- Frontend: tela de estoque passa a:
  - Exibir mensagem de erro quando falhar carregamento da lista.
  - Exibir alerta com mensagem da API ao falhar salvar peca.
  - Bloquear botao "Nova Peca" para usuarios sem permissao ou sem plano elegivel.

## Causa do Problema Identificada
- O cadastro podia falhar por permissao/plano sem feedback visual claro.
- Em alguns cenarios, o usuario percebia como "nao salvou" porque o erro ficava apenas no console.

## Arquivos Alterados
- backend/src/inventory/inventory.controller.ts
- frontend/src/pages/InventoryPage.tsx

## Proximos Arquivos de Acompanhamento
- 02_STATUS_SISTEMA.md
- 03_STATUS_SISTEMA.md
- 04_STATUS_SISTEMA.md

## Ajustes Aplicados em 2026-05-03 — Correcao WhatsApp QR Code

### Problema
- Evolution API em `asia-southeast1-eqsg3a` (Cingapura) estava com IP bloqueado pelo WhatsApp.
- Baileys retornava `statusReason: 405` (conexao recusada) sem emitir QR Code.
- QR nunca era gerado, timeout de 45s em todas as tentativas.

### Solucao Implementada
- Criado novo projeto `sygmaauto-wa-region-b` no Railway.
- Adicionado servico `evolution-api-r2` com imagem `atendai/evolution-api:v2.1.1`.
- Regiao alterada para `us-east4` (Virginia, EUA) via GraphQL API do Railway.
- Configuradas variaveis de ambiente:
  - `AUTHENTICATION_API_KEY=<configure_no_railway>`
  - `DATABASE_CONNECTION_URI` (PostgreSQL compartilhado)
  - `DATABASE_PROVIDER=postgresql`
  - `SERVER_URL=https://evolution-api-r2-production.up.railway.app`
  - `CACHE_REDIS_ENABLED=false`, `CACHE_LOCAL_ENABLED=true`
- Criado dominio publico `evolution-api-r2-production.up.railway.app`.
- Atualizada variavel `EVOLUTION_API_URL` no backend (`sygmaauto-api`) para nova URL.
- Redeploy do backend aplicado.

### Resultado
- QR Code gerado com sucesso via `GET /whatsapp/qrcode`.
- Regiao `us-east4` nao apresenta bloqueio de IP pelo WhatsApp.
- Backend com polling de `/instance/connect` a cada 3s, fail-fast em statusReason 405/401.

### Servicos Railway — Estado Atual
| Projeto | Servico | Regiao | URL |
|---|---|---|---|
| distinguished-strength | sygmaauto-api | asia-southeast1 | https://sygmaauto-api-production.up.railway.app |
| distinguished-strength | evolution-api-211 | asia-southeast1 | https://evolution-api-211-production.up.railway.app (inativo) |
| distinguished-strength | Redis-KM-s | asia-southeast1 | interno |
| distinguished-strength | Postgres | asia-southeast1 | switchback.proxy.rlwy.net:35733 |
| sygmaauto-wa-region-b | evolution-api-r2 | us-east4 | https://evolution-api-r2-production.up.railway.app (ativo) |

### Variaveis Chave do Backend
- `EVOLUTION_API_URL=https://evolution-api-r2-production.up.railway.app`
- `EVOLUTION_API_KEY=<configure_no_railway>`
- `EVOLUTION_INSTANCE=sygmaauto`
- `BACKEND_PUBLIC_URL=https://sygmaauto-api-production.up.railway.app`

### Commits Relevantes (backend)
- `245195f` — fail fast on WhatsApp statusReason 405/401 during QR polling
- `b429fb0` — poll /connect every 3s for QR instead of single call
- `01579ae` — call /instance/connect after create to trigger Baileys QR generation
- `886fb29` — add webhook.enabled + events to instance/create payload

## Arquivos Alterados em 2026-04-28
- backend/src/inventory/inventory.controller.ts
- frontend/src/pages/InventoryPage.tsx

## Arquivos Alterados em 2026-05-03
- backend/src/notifications/whatsapp-admin.service.ts (multiplos fixes de QR polling)
- backend/src/whatsapp/whatsapp.controller.ts (endpoint GET /whatsapp/qrcode)
- Configuracoes de ambiente no Railway (sem alteracao de codigo local)

## Proximos Arquivos de Acompanhamento
- 02_STATUS_SISTEMA.md
- 03_STATUS_SISTEMA.md

## Observacoes
- Recomendado manter este padrao numerico crescente para historico de evolucao.
- A Evolution API em `distinguished-strength` (evolution-api-211) pode ser desativada para economizar recursos.
- O banco PostgreSQL e compartilhado entre os dois projetos Railway.
