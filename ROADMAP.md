# SigmaAuto — Roadmap & Estratégia Comercial

**Última atualização:** 03/05/2026
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
| **Estoque de Peças** | básico | ✅ | ✅ |
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
  - **BLOQUEIO:** tabelas `commission_rates` e `commissions` não criadas em produção (ver seção abaixo)
- [ ] **Seed de Dados Demo** — 48 OS + 10 executores + comissões *(bloqueado — ver abaixo)*
- [x] **Relatórios Gerenciais com PDF** — página `/reports`, 4 tipos de relatório, visualização e impressão *(implementado em 03/05/2026)*
  - **Relatório de OS por Período** — filtros: data início/fim + status, KPIs, lista de OS, top clientes
    - Backend: `GET /financial/os-report?startDate=&endDate=&status=`
  - **DRE — Demonstrativo de Resultado** — mês/ano, receita bruta, CMV, margem, despesas por categoria, EBITDA, histórico 6 meses
    - Usa endpoint existente `GET /financial/dre?year=&month=`
  - **Relatório de Comissões** — filtros: período + área, ranking/leaderboard, totais pendente/pago
    - Usa endpoint existente `GET /commissions?startDate=&endDate=&workshopArea=`
  - **Projeção de Pedido de Compra** — análise de giro (90 dias), urgência CRÍTICO/URGENTE/ATENÇÃO, qtd sugerida, custo estimado
    - Backend: `GET /inventory/purchase-projection`
  - Visualização inline (modal preview A4) + impressão `window.print()` com CSS dedicado
  - Layout consistente com FinancialPage e ServiceOrdersPage (mesma filosofia visual)
- [x] **DRE — Melhorias v2** *(implementado em 03/05/2026)*
  - [x] Bug fix: impressão do DRE exibia preview vazio — `#dre-print` div não estava no DOM
  - [x] Seletor de mês **e** ano via dropdowns (antes: apenas chevrons)
  - [x] Relatório **DRE Anual** — consolidação de todos os 12 meses → endpoint `GET /financial/dre-anual?year=`
  - [x] Relatório **Indicadores KPI** — 5 períodos em paralelo: mês atual, trimestre, semestre, semestre anterior, anual → endpoint `GET /financial/indicadores`
  - [x] KPIs por período: Receita Bruta, Receita Líquida, Margem Bruta (%), EBITDA (%), OS Entregues, Ticket Médio
  - [x] Disponíveis como relatório imprimível em `/reports` (2 novos tipos: DRE Anual + Indicadores KPI)
- [x] **Página KPI's (Gestão à Vista)** *(implementado em 03/05/2026)*
  - [x] Menu lateral: item **KPI's** posicionado logo abaixo de **DRE**
  - [x] Nova rota: `/kpis`
  - [x] Painel temático para leitura rápida: Financeiro, Operações, Estoque e Pessoas
  - [x] Gráficos de alto entendimento (barras e pizza) e KPIs executivos em cards
  - [x] Dados consolidados de endpoints já existentes: financeiro, OS, estoque e comissões
  - [x] **Fase 1 de indicadores avançados**
    - [x] ELR (Effective Labor Rate) — faturamento de mão de obra por hora vendida
    - [x] Retrabalho 30 dias (comeback rate)
    - [x] Conversão de orçamento (aprovados no funil)
    - [x] Aging de OS em aberto (0-24h, 24-48h, 48-72h, >72h)
    - [x] SLA de peças (no prazo x atrasadas x sem previsão)
- [ ] **Lembrete de Manutenção Preventiva** — WhatsApp automático por KM/data
- [ ] **NPS Automático** — pesquisa pós-entrega, dashboard de satisfação

---

### ⚠️ Bloqueios Resolvidos — Tabelas de Comissão e Colunas de OS

**Problema 1:** Tabelas `commission_rates` e `commissions` não criadas em produção.
**Problema 2:** Colunas `statusChangedAt`, `partsReserved`, etc. não existiam no banco → `Internal server error` ao criar O.S.

**Solução definitiva (03/05/2026):**
- `PrismaService.applyMissingMigrations()`: cada `ALTER TABLE` em `try/catch` independente — falha isolada não bloqueia as demais
- Correção do nome da tabela: `"ServiceOrderItem"` → `service_order_items` (reflete o `@@map` do schema Prisma)
- `release.js`: mesma correção aplicada
- **Resultado:** todas as colunas e tabelas são garantidas automaticamente no startup do app e no release

**Status:** ✅ Resolvido (commit `17dfa4d`)

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
