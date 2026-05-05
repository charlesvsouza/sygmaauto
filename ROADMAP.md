# SigmaAuto — Roadmap & Estratégia Comercial

**Última atualização:** 04/05/2026 (sessão 2)
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
| **SECRETARIA** | Atendimento, abertura de OS, cadastro de clientes. |
| **MECANICO** | Execução técnica. Diagnóstico, itens e fotos. Sem acesso a valores. |
| **FINANCEIRO** | Fechamento, pagamentos, relatórios financeiros. |

---

## Infraestrutura

| Componente | Plataforma | URL |
|---|---|---|
| Frontend | Vercel | https://sigmaauto.com.br |
| Backend API | Railway | https://sygmaauto-api-production.up.railway.app |
| Banco de Dados | Railway PostgreSQL | Provisionado automaticamente |
| Evolution API (WhatsApp) | Railway — sygmaauto-wa-region-b | https://evolution-api-r2-production.up.railway.app |
| CI/CD | GitHub Actions | Push master → deploy automático |

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
- [x] **WhatsApp Automático por evento da OS** *(concluído em 03/05/2026)*
  - [x] Integração com Evolution API v2.3.7 (Baileys 7.0.0-rc.9 + suporte LID)
  - [x] Orçamento pronto → link de aprovação ao cliente
  - [x] OS aprovada → confirmação de início dos trabalhos
  - [x] Pronto para entrega → notificação automática
  - [x] Entregue → mensagem de agradecimento pós-serviço
  - [x] Cancelado → informativo ao cliente
  - [x] QR Code na interface administrativa para pareamento
  - [x] Status de conexão em tempo real na WhatsappPage

> **Infra WhatsApp:** Evolution API v2.3.7 (`evoapicloud/evolution-api:v2.3.7`) hospedada em
> projeto Railway separado (`sygmaauto-wa-region-b`, região `us-east4`) com schema PostgreSQL
> isolado (`evolution_r2`). Ver guia completo em `c:/dev/evolution-api-setup.md`.

---

### 🔄 Sprint 2 — Fidelização e Relatórios *(em andamento — iniciado em 03/05/2026)*

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
- [ ] **Seed de Dados Demo** — 48 OS + 10 executores + comissões *(pendente)*
- [ ] **Lembrete de Manutenção Preventiva** — WhatsApp automático por KM/data
- [ ] **NPS Automático** — pesquisa pós-entrega, dashboard de satisfação

---

### ⚠️ Bloqueios Resolvidos

**Tabelas de Comissão e Colunas de OS (03/05/2026 — commit `17dfa4d`):**
- `PrismaService.applyMissingMigrations()`: cada `ALTER TABLE` em `try/catch` independente
- Correção do nome da tabela: `"ServiceOrderItem"` → `service_order_items`
- Todas as colunas e tabelas garantidas automaticamente no startup e no release ✅

**RequirePlan incorreto em DRE, KPIs e Comissões (04/05/2026 — commit `124a33c`):**
- Endpoints `/dre`, `/dre-anual`, `/indicadores` e `CommissionsController` estavam com `REDE` → corrigido para `PRO` ✅

---

### 🚀 Sprint 3 — Aquisição de Novos Clientes

- [ ] **Agendamento Online Público** — link da oficina, cliente agenda 24x7
- [ ] **Portal do Cliente (PWA)** — status em tempo real, histórico, aprovação
- [ ] **App Mobile (PWA)** — mecânicos recebem OS no celular

---

### 🚀 Sprint 4 — Enterprise / Franquias (plano REDE)

- [ ] **Gestão Multi-Unidades** — login único, relatórios por filial
- [ ] **Emissão NF-e / NFS-e** — integração Focus NF-e ou eNotas
- [ ] **IA Assistiva no Orçamento** — sugestão de serviços por sintoma
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
