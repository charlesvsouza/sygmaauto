# SigmaAuto — Roadmap & Estratégia Comercial

**Última atualização:** 27/09/2026 (ciclo do atendimento, documentos, financeiro unificado e permissões)
**Produto:** SigmaAuto — SaaS multi-tenant para gestão de oficinas mecânicas
**Domínio:** sigmaauto.com.br

---

## Pacotes Comerciais

### Comparativo de Funcionalidades

| Funcionalidade | START | PRO | REDE |
|---|---|---|---|
| **Preço mensal** | R\$ 149 | R\$ 299 | Sob consulta |
| **Trial gratuito** | 14 dias | 14 dias | 14 dias |
| **Usuários** | até 3 | até 10 | ilimitado |
| **Ordens de Serviço** | 50/mês | ilimitado | ilimitado |
| **Clientes e Veículos** | ✅ | ✅ | ✅ |
| **Catálogo de Serviços** | ✅ | ✅ | ✅ |
| **Financeiro** | ✅ | ✅ | ✅ |
| **Estoque de Peças + Reserva de Peças** | ✅ | ✅ | ✅ |
| **Aprovação de Orçamento por Link** | ❌ | ✅ | ✅ |
| **Checklist com Fotos** | ❌ | ✅ | ✅ |
| **Kanban de Pátio** | ❌ | ✅ | ✅ |
| **WhatsApp Automático** | ❌ | ✅ | ✅ |
| **Lembrete de Manutenção** | ❌ | ✅ | ✅ |
| **Comissão de Mecânicos** | ❌ | ✅ | ✅ |
| **NPS Automático** | ❌ | ✅ | ✅ |
| **DRE Completo** | ❌ | ❌ | ✅ |
| **Multi-Unidades** | ❌ | ❌ | ✅ |
| **NF-e / NFS-e** | ❌ | ❌ | ✅ |
| **Portal do Cliente (PWA)** | ❌ | ❌ | ✅ |
| **IA Assistiva no Orçamento** | ❌ | ❌ | ✅ |
| **Suporte** | E-mail | Chat | Prioritário |

**Regra de upgrade/downgrade:**
- Upgrade: disponível imediatamente em Configurações → Assinatura
- Downgrade: disponível apenas após o vencimento do plano atual

---

## Roles e Permissões

| Role | Descrição |
|---|---|
| **MASTER** | Proprietário. Um por tenant. Acesso total. Gerencia assinatura. |
| **ADMIN** | Gerência operacional. Convida PRODUTIVO/FINANCEIRO. |
| **GERENTE** | Gerência operacional sem acesso a configurações. |
| **CHEFE_OFICINA** | Chefe técnico. Tudo do Mecânico + abre O.S., cadastra e conduz aprovação, faturamento e entrega. |
| **SECRETARIA** | Recepção: abre O.S., cadastra cliente/veículo, envia para aprovação, aprova no balcão e confirma entrega. |
| **MECANICO** | Execução técnica. Diagnóstico, itens e fotos. `PRODUTIVO` é o nome legado, com as mesmas permissões. |
| **FINANCEIRO** | Fatura/registra pagamento, confirma entrega e lança no Fluxo de Caixa. |

> Desde 27/09/2026 a regra é única: `backend/src/common/roles.ts` (espelho em `frontend/src/lib/roles.ts`)
> define quem pode levar a O.S. a cada etapa; a tela mostra só as etapas permitidas. Revogar/forçar aprovação:
> MASTER/ADMIN. Excluir O.S.: MASTER.

---

## Infraestrutura

| Componente | Plataforma | URL |
|---|---|---|
| Frontend | Vercel | https://sigmaauto.com.br |
| Backend API | Railway (projeto `sygmaauto`, renomeado de `distinguished-strength` em 13/09/2026) | https://sygmaauto-api-production.up.railway.app |
| Banco de Dados | Railway PostgreSQL (`Postgres-geEZ`, região `us-east4` — mesma região das Functions Vercel) | Interno, sem proxy público |
| WhatsApp | Meta Cloud API (oficial) | `WHATSAPP_PROVIDER=META_CLOUD` — Evolution API foi removida do código do sistema por segurança |
| CI/CD | GitHub Actions | Push master → deploy automático |

> **Nota de infra (13/09/2026):** o projeto Railway tinha um segundo Postgres legado (região antiga,
> `asia-southeast1`) e um Redis (`Redis-KM-s`) sem nenhum consumidor — o Redis foi confirmado órfão
> (`DBSIZE=0`, zero tráfego em 7 dias) e removido. O Postgres legado foi mantido de propósito: ainda
> guarda os schemas usados pela instância standalone do Evolution API (`sygmaauto-wa-region-b`), que
> segue como serviço à parte, fora do código deste app. Quatro variáveis de ambiente mortas
> (`DATABASE_CONNECTION_URI`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`) também
> foram removidas do serviço `sygmaauto-api` por não terem nenhuma referência no código.

---

## Roadmap de Desenvolvimento

### ✅ Fase 0 — Base do Sistema (concluído)

- [x] Multi-tenant SaaS com isolamento por tenant
- [x] Autenticação JWT com refresh token
- [x] Roles (MASTER / ADMIN / GERENTE / SECRETARIA / MECANICO / FINANCEIRO)
- [x] Fluxo completo de OS (criação → diagnóstico → aprovação → execução → entrega)
- [x] Estoque com movimentações e quick-add na OS
- [x] Financeiro com lançamentos e summary mensal
- [x] CRM de Clientes e Veículos
- [x] Catálogo de Serviços com TMO e VH
- [x] Assinaturas com Mercado Pago Checkout Pro
- [x] Painel Super Admin
- [x] Deploy Vercel + Railway + GitHub Actions CI/CD
- [x] Domínio sigmaauto.com.br
- [x] SEO: sitemap.xml + robots.txt + title otimizado
- [x] Splash screen com visual da landing page
- [x] Bloqueio de downgrade de plano na UI
- [x] Tagline de produto na WelcomePage

---

### ✅ Sprint 1 — Diferenciais START → PRO (concluído)

- [x] **Kanban de Pátio** — board visual por status, projetável em TV *(implementado)*
- [x] **Checklist de Entrada/Saída com Fotos** — proteção jurídica + upsell *(implementado)*
- [x] **WhatsApp Automático por evento da OS** *(concluído em 03/05/2026, migrado para Meta Cloud em sessão posterior)*
  - [x] Orçamento pronto → link de aprovação ao cliente
  - [x] OS aprovada → confirmação de início dos trabalhos
  - [x] Pronto para entrega → notificação automática
  - [x] Entregue → mensagem de agradecimento pós-serviço
  - [x] Cancelado → informativo ao cliente
  - [x] Status de conexão em tempo real na WhatsappPage

> **Infra WhatsApp (atualizado 07/07/2026):** o provider Evolution API (self-hosted, Baileys) foi
> **removido do sistema por segurança** — o código hoje recusa `WHATSAPP_PROVIDER=EVOLUTION` com
> mensagem explícita. Produção usa exclusivamente **Meta Cloud API** (`whatsapp/meta-cloud-whatsapp.provider.ts`),
> com webhook assinado (HMAC X-Hub-Signature-256) e idempotência durável em banco
> (`whatsapp/whatsapp-meta-webhook.service.ts`). Configuração via `WHATSAPP_PROVIDER=META_CLOUD`
> e phone number id por tenant (Settings).

---

### ✅ Sprint 2 — Fidelização e Relatórios *(entregas principais concluídas em 05/05/2026; itens complementares ainda em evolução)*

> Nota: o núcleo de relatórios, comissões e DRE foi entregue, mas o Sprint 2 manteve pendências operacionais em manutenção preventiva e NPS.

- [x] **Comissão de Mecânicos** — backend 100% implementado (CommissionsModule, CommissionRate, Commission)
  - Modelos `CommissionRate` e `Commission` adicionados ao schema Prisma
  - Campo `assignedUserId` em `ServiceOrderItem` para vincular executor
  - `CommissionsService`: cálculo automático ao faturar OS, relatório com leaderboard
  - `CommissionsController`: GET /commissions, PATCH /:id/pay, GET/POST /rates
  - Taxas padrão: MECANICO/ELETRICISTA 10%, FUNILEIRO/PINTOR/PREPARADOR 8%, LAVADOR/EMBELEZADOR 6%
- [x] **Relatórios Gerenciais com PDF** — página `/reports`, 6 tipos de relatório, visualização e impressão *(implementado em 03/05/2026)*
  - **Relatório de OS por Período** — filtros: data início/fim + status, KPIs, lista de OS, top clientes
    - Backend: `GET /financial/os-report?startDate=&endDate=&status=`
  - **DRE — Demonstrativo de Resultado** — mês/ano, receita bruta, CMV, margem, despesas por categoria, EBITDA, histórico 6 meses
    - Backend: `GET /financial/dre?year=&month=`
  - **DRE Anual** — consolidação 12 meses → `GET /financial/dre-anual?year=`
  - **Indicadores KPI** — 5 períodos em paralelo → `GET /financial/indicadores`
  - **Relatório de Comissões** — filtros: período + área, ranking/leaderboard, totais pendente/pago
    - Backend: `GET /commissions?startDate=&endDate=&workshopArea=`
  - **Projeção de Pedido de Compra** — análise de giro (90 dias), urgência CRÍTICO/URGENTE/ATENÇÃO
    - Backend: `GET /inventory/purchase-projection`
  - Visualização inline (modal preview A4) + impressão `window.print()` com CSS dedicado
- [x] **DRE — Melhorias v2** *(implementado em 03/05/2026)*
  - [x] Bug fix: impressão do DRE exibia preview vazio — `#dre-print` div não estava no DOM
  - [x] Seletor de mês **e** ano via dropdowns (antes: apenas chevrons)
  - [x] Relatório DRE Anual e Indicadores KPI como tipos de relatório imprimível em `/reports`
- [x] **Página KPI's (Gestão à Vista)** *(implementado em 03/05/2026)*
  - [x] Menu lateral: item **KPI's** posicionado logo abaixo de **DRE** — rota `/kpis`
  - [x] Painel temático: Financeiro, Operações, Estoque e Pessoas
  - [x] Fase 1: ELR, retrabalho 30 dias, conversão de orçamento, aging de OS, SLA de peças
  - [x] Fase 2: First Time Fix Rate, no-show de agendamento, distribuição por turno, penetração de serviços adicionais
- [x] **Bug fix — RequirePlan incorreto em DRE, Indicadores e Comissões** *(04/05/2026 — commit `124a33c`)*
  - Endpoints `/financial/dre`, `/financial/dre-anual`, `/financial/indicadores` e `CommissionsController` inteiro estavam com `@RequirePlan('REDE')` mas deveriam exigir apenas `PRO` conforme `planAccess.ts`
  - Resultado: usuários PRO recebiam **403 Forbidden** ao abrir DRE, KPIs, Comissões e Relatórios
  - Corrigido: `@RequirePlan('PRO')` nos 4 pontos
  - KpisPage: `Promise.all` convertido em chamadas independentes — falha de comissões não derruba mais a página inteira
- [x] **Módulo Retífica — Metrologia e Laudo** *(04/05/2026 — commits `903951d` → `5bf566d`)*
  - [x] MetrologiaModal em 2 passos: medições (step 1) + diagnóstico automático serviços/peças (step 2)
  - [x] Label "Metrologia" clicável no Andamento da O.S. na ServiceOrdersPage
  - [x] Botão `← Voltar` para retroceder fase (ADMIN/MASTER) em OS não finalizadas
  - [x] Confirmar metrologia → abre LaudoRetificaModal automaticamente para impressão (Kanban + ServiceOrdersPage)
- [x] **Seed de Dados Demo** — 49 OS + 10 executores + comissões *(04/05/2026 — commits `d5c22f1` + `8d58a82`)*
- [x] **Lembrete de Manutenção Preventiva** — WhatsApp automático por KM/data *(implementado — `MaintenanceModule` + cron 8h + `MaintenancePage`)*
- [x] **NPS Automático** — pesquisa pós-entrega, dashboard de satisfação *(implementado — `NpsModule` + cron 9h + `NpsPage` + resposta pública)*

---

### ⚠️ Bloqueios Resolvidos

**Tabelas de Comissão e Colunas de OS (03/05/2026 — commit `17dfa4d`):**
- `PrismaService.applyMissingMigrations()`: cada `ALTER TABLE` em `try/catch` independente
- Correção do nome da tabela: `"ServiceOrderItem"` → `service_order_items`
- Todas as colunas e tabelas garantidas automaticamente no startup e no release ✅

**RequirePlan incorreto em DRE, KPIs e Comissões (04/05/2026 — commit `124a33c`):**
- Endpoints `/dre`, `/dre-anual`, `/indicadores` e `CommissionsController` estavam com `REDE` → corrigido para `PRO` ✅

---

### ✅ Sprint 3 — IA, Conversão e Agendamento *(concluído em 05/05/2026)*

- [x] **IA Assistiva no Orçamento** — sugestão de serviços e peças por sintoma relatado *(05/05/2026)*
  - Backend: `AiModule` — `POST /ai/suggest` — OpenAI GPT-4o-mini + fallback por palavras-chave
  - Frontend: botão "IA" no modal de catálogo, painel expansível com campo de sintoma e sugestões clicáveis
  - Sem `OPENAI_API_KEY`: fallback automático por matching de palavras-chave no catálogo local
- [x] **Página Notícias** — atualizada com lançamentos recentes e funcionalidades futuras como roadmap público *(05/05/2026)*
- [x] **Agendamento Interno de OS** — campo `scheduledDate` + página `/agenda` + painel no Dashboard *(05/05/2026 — commit `b9a5646`)*
  - Campo `scheduledDate DateTime?` no schema Prisma (já existente)
  - Input `datetime-local` no formulário de criação de OS e no painel lateral de edição
  - Painel "Agenda de Hoje" no Dashboard — lista OS do dia ordenadas por horário, link para `/agenda`
  - Página `/agenda` — grade semanal com 7 colunas, navegação por semana (anterior/próxima/hoje), destaque do dia atual, lista consolidada abaixo
  - Item "Agenda" adicionado ao menu lateral (grupo Atendimento, ícone `CalendarDays`)
- [x] **Correções de Layout** *(05/05/2026 — commits `419dbd9`, `a7aacd4`)*
  - Sidebar desktop: `overflow-y-auto` (era `overflow-hidden` — itens ficavam escondidos em telas pequenas)
  - Header desktop: avatar + nome + e-mail + botão Sair movidos para a extremidade direita
  - Scrollbar fina e discreta na nav da sidebar via CSS
  - Documentação de autoprogamação criada para guia de correção de abertura de O.S. e defeitos de layout: `docs/AUTOPROGRAMACAO_ABERTURA_OS.md`
- [x] **Correções Módulo Retífica** *(05/05/2026 — commits `62f1c85`, `5964182`, `cf9c46b`)*
  - Campos `motorBrand/motorModel/motorSerial` → `equipmentBrand/equipmentModel/serialNumber` (alinhamento com schema Prisma)
  - Fix build TS: `Set<unknown>` → `Set<string>` em `metrologiaTarget`
  - Centralizar `SLA_HOURS` em `retificaConstants.ts`, validar metrologia obrigatória no backend antes de avançar para Orçamento Técnico, proteção contra duplicação de itens

---

### ✅ Sprint 3.5 — Retífica de Motores, LGPD e Rebranding *(concluído, não documentado até 07/07/2026)*

> Esta seção documenta retroativamente ~140 commits de trabalho real que não haviam sido
> incorporados a este roadmap. Ver `sygmaauto-audit-jul2026` para o raio-X completo.

- [x] **Módulo Retífica de Motores** — linha de produto completa, vendida como plano `RETIFICA_PRO`/`RETIFICA_REDE`
  - Tipo de OS `RETIFICA_MOTOR` com veículo opcional (motor avulso) e dados de equipamento (marca/modelo/nº de série)
  - Fluxo de status dedicado: Desmontagem → Metrologia → Orçamento Retífica → Aprovação → Em Retífica → Montagem → Teste Final
  - `KanbanRetificaPage` (kanban especializado), `DashboardRetificaPage` (painel de prioridade com SLA crítico), `RetificaMotoresPage`
  - Ficha de metrologia por cilindro/munhão/moente/mancal com diagnóstico automático de serviços/peças por tolerância
  - Laudo técnico em PDF (Puppeteer) gerado automaticamente ao confirmar a metrologia
  - [x] **Fix (07/07/2026):** ficha de metrologia migrada para model Prisma próprio `EngineMetrology` (1:1 com `ServiceOrder`), com endpoints dedicados `GET/PATCH /service-orders/:id/metrology`. Script único `migrate-metrology.js` (flag `MIGRATE_METROLOGY=true` no release) migra o JSON antigo de `notes` para a tabela e limpa o campo. Verificado ponta a ponta (criação de OS de retífica → metrologia → diagnóstico automático → laudo PDF → reload) sem erros.
- [x] **LGPD / Compliance (backend)** — protocolo `LGPD-YYYYMMDD-XXXXXX`, SLA técnico de 15 dias, export estruturado de dados de cliente/usuário, eliminação controlada (anonimização quando há dependências históricas), audit trail em `AuditLog`. Ver detalhe completo em `COMPLIANCE.md`.
  - [x] **Fix (07/07/2026):** UI administrativa criada em `/lgpd` (menu lateral, MASTER/ADMIN) — lista de solicitações com prazo/SLA, criação de solicitação (cliente ou usuário), alteração de status, exportação de dados (download JSON) e execução de eliminação com confirmação. Verificado ponta a ponta.
- [x] **WhatsApp — migração para Meta Cloud API** — Evolution API (self-hosted) removida por segurança; hoje só Meta Cloud, com webhook assinado e idempotência durável.
- [x] **IA — segundo provedor (Gemini)** — além do OpenAI GPT-4o-mini no orçamento assistivo, `import-nf.service.ts` usa Google Gemini para interpretar PDF de nota fiscal de fornecedor na importação de estoque.
- [x] **Rebranding Oficina360 → Sigma Auto** — logo SVG/PNG, wordmark, substituição em todas as telas (login, marketing, splash, PDFs).
- [x] **Redesenho de tema: dark premium dourado → claro verde-água (padrão)** — ver `DESIGN_STATUS.md` para o histórico completo. Tema escuro selecionável foi removido em 07/07/2026 (fixado apenas em Login/Register); grades estilo ERP aplicadas a Clientes/Veículos/Serviços/Estoque/Usuários/Livro Caixa; dashboard distilado de 9 para 5 KPIs.

---

### ✅ Sprint 3.6 — Descontos, Identidade Visual e Refinamentos de UI *(concluído, não documentado até 13/09/2026)*

> Esta seção documenta retroativamente os commits entre 08/07/2026 e 06/09/2026 que não haviam sido
> incorporados a este roadmap — dois períodos de trabalho separados por hiatos de atividade (16 dias
> em julho, 34 dias entre agosto e setembro).

- [x] **Redesign da Landing Page** *(08–18/07/2026)* — nova hero orbital (`OrbitalHero.tsx`) inspirada em sigmadiagnostics.com.br, com 3 anéis animados; é um restyle visual da `LandingPage.tsx` existente, não o replatform/CMS do Sprint 3.1 (que segue greenfield)
- [x] **Compactação do modal "Nova OS"** *(08–18/07/2026, 5 commits)* — layout landscape, largura reduzida, paddings/botões compactados para melhor aproveitamento de tela
- [x] **CI/CD** — removido job duplicado "Deploy Frontend → Vercel" do GitHub Actions; a integração Git nativa da Vercel (Root Directory=frontend) já era o único caminho real de deploy do frontend, o Actions rodava em paralelo desde 04/07 sem impacto em produção
- [x] **Acessibilidade** — `type="button"` adicionado aos 175 `<button>` restantes (34 arquivos) sem o atributo
- [x] **Sistema de desconto em O.S.** *(03/08/2026)*
  - Desconto percentual em peças e em serviços, aplicável na própria O.S. (`discountPartsPercent`/`discountServicesPercent` no schema)
  - Teto de desconto por role — GERENTE tem limite configurável pelo tenant; roles superiores sem teto
  - Resumo da O.S. detalha total geral e valor de desconto separadamente
  - Fixes de contraste: cor de texto forçada e `color-scheme` corrigido nos campos de desconto (tema claro deixava texto ilegível)
- [x] **Logo da oficina e dados do veículo** *(06/09/2026)*
  - Upload de logo por tenant, usado em telas do sistema
  - Reorganização do campo VIN/Chassi nos formulários de veículo
  - Chassi/VIN exibido no card de dados do veículo dentro da O.S.
  - Fix: `customerId` removido do payload de atualização de veículo (campo não deveria ser alterável nesse fluxo)

---

### ✅ Sprint 3.7 — Ciclo do Atendimento, Documentos e Financeiro Unificado *(27/09/2026)*

> Detalhes e decisões do dono em `MELHORIAS_RELATORIOS_E_OS.md` (seções 2.x).

- [x] **PDFs e relatórios** — fuso de Brasília, escape de HTML, status por extenso, paginação; base única de PDF com rodapé "emitido por" e exportação CSV
- [x] **Numeração da O.S.** — contador por oficina em hexadecimal + mês-ano (`0000007B/09-2026`); o orçamento aprovado vira O.S. com o mesmo número
- [x] **Configurações → Documentos do Atendimento** — garantia (90 dias serviço / 90 dias peça, configurável), validade do orçamento e textos
- [x] **Vistoria** — acessórios fixos (presente/ausente) e fotos opcionais
- [x] **Documentos do atendimento** — entrada, orçamento com QR code, O.S. via do cliente e via da oficina (sem valores), termo de entrega e garantia; Laudo / Solução impressos
- [x] **Aprovação por link** — página pública `/aprovacao/:token` + `/public/approval/:token` (antes o link do WhatsApp não funcionava); revogar aprovação para o cliente aprovar de novo
- [x] **Financeiro unificado** — balcão e link com o mesmo efeito; receita da O.S. = um lançamento no faturamento; Financeiro, DRE e indicadores leem o mesmo livro-caixa; acerto dos dados antigos (`unifyOrderRevenue`)
- [x] **Permissões por perfil** — regra única por etapa de destino (ver "Roles e Permissões")
- [x] **Deploy** — schema aplicado antes de subir a API; acertos de dados rodam na subida
- [x] **Manual do Usuário 3.0** — reorganizado na ordem do menu lateral
- [ ] **Conferir em produção** — gerar cada documento de uma O.S. real, aprovar um orçamento pelo link e testar os perfis Recepção, Financeiro e Mecânico

---

### 🔜 Sprint 3.1 — Site Institucional v3 + SEO Técnico + CMS Comercial *(planejado para próxima sessão)*

- [ ] **Replatform do site institucional** — separar claramente marketing site e app operacional
  - Recomendação base: manter o app autenticado em subdomínio/app separado e reconstruir o site público com renderização orientada a SEO
  - Avaliar `sigmaauto.com.br` para marketing e `app.sigmaauto.com.br` para operação autenticada
  - Comparar deploy em Vercel/Next.js vs Hostinger (somente se houver suporte estável a SSR/Node ou VPS dedicado)
- [ ] **SEO técnico real** — corrigir descoberta e indexação por Google
  - Metadata por página, Open Graph, Twitter Cards e canonical por rota pública
  - JSON-LD estruturado (`SoftwareApplication`, `Organization`, `FAQPage`, `Product`/`Offer` para planos)
  - Sitemap segmentado, robots revisado, Search Console, Bing Webmaster e auditoria de indexação
  - Melhorar semântica HTML, heading hierarchy, performance LCP/CLS/INP e linking interno
- [ ] **CMS / Torre de Comando Comercial** — transformar páginas institucionais em conteúdo administrável
  - Banners, hero, diferenciais, planos, FAQs, notícias, depoimentos, CTAs e widgets editáveis
  - Possível implementação inicial via tabelas/JSON gerenciados no próprio admin antes de adotar headless CMS externo
  - Permitir campanhas, landing pages sazonais e páginas por segmento sem depender de deploy para toda alteração
- [ ] **Nova direção visual “futurista industrial”**
  - Manter a base cromática atual, mas elevar acabamento visual: grid técnico, widgets, brilho controlado, superfícies translúcidas e tipografia mais forte
  - Unificar linguagem entre landing, páginas institucionais e elementos de produto para parecer uma plataforma única
- [ ] **Correção do header/hero da área pública**
  - Revisar a barra superior do `MarketingShell` para impedir quebra/empilhamento de ações em larguras intermediárias
  - Ajustar posição do botão de acesso/saída para nunca “cair” abaixo da linha visual do hero
  - Reorganizar navegação e CTA com comportamento responsivo mais previsível

---

### 🚀 Sprint 4 — Aquisição de Novos Clientes *(aguardando primeiras aquisições)*

> Será iniciado após os primeiros clientes pagantes, com base em feedback real de uso.

- [ ] **Agendamento Online Público** — link da oficina, cliente agenda 24x7
- [ ] **Portal do Cliente (PWA)** — status em tempo real, histórico, aprovação
- [ ] **App Mobile (PWA)** — mecânicos recebem OS no celular

---

### 🚀 Sprint 5 — Enterprise / Franquias (plano REDE)

- [ ] **Gestão Multi-Unidades** — login único, relatórios por filial
- [ ] **Emissão NF-e / NFS-e** — integração Focus NF-e ou eNotas
- [ ] **Marketplace de Peças** — consulta de estoque em distribuidores

---

## Posicionamento vs. Mercado

| Concorrente | Plano Entry | Plano Top |
|---|---|---|
| **SigmaAuto** | **R\$ 149** | **R\$ 299** |
| Onmotor | R\$ 32 | ~R\$ 300 |
| Oficina Integrada | R\$ 99 | R\$ 299 |
| Oficina Inteligente | R\$ 399 | R\$ 599 |
| GestaoAuto | R\$ 250 | — |
 
> **Posicionamento:** melhor custo-benefício no segmento mid-market.
 
### Nova identidade visual
Direção de UI atualizada para tema dark premium com acento dourado.
- Referência de design consolidada: `design-system-board.html`
- Migração incremental por camada para evitar regressão: layout/navegação, auth, atendimento, oficina, financeiro/admin.
