# Oficina360 — Roadmap & Estratégia Comercial

## Pacotes Comerciais

### Comparativo de Funcionalidades

| Funcionalidade                      | START    | PRO      | REDE     |
|-------------------------------------|----------|----------|----------|
| **Preço mensal**                    | R$ 97    | R$ 197   | R$ 397   |
| **Preço anual** (2 meses grátis)    | R$ 970   | R$ 1.970 | R$ 3.970 |
| **Trial gratuito**                  | 14 dias  | 14 dias  | 14 dias  |
| **Usuários**                        | até 3    | até 10   | ilimitado |
| **Ordens de Serviço**               | 50/mês   | ilimitado | ilimitado |
| **Clientes e Veículos**             | ✅       | ✅       | ✅       |
| **Catálogo de Serviços**            | ✅       | ✅       | ✅       |
| **Financeiro Básico**               | ✅       | ✅       | ✅       |
| **Aprovação de Orçamento por Link** | ❌       | ✅       | ✅       |
| **Estoque de Peças**                | ❌       | ✅       | ✅       |
| **Checklist com Fotos**             | ❌       | ✅       | ✅       |
| **Kanban de Pátio**                 | ❌       | ✅       | ✅       |
| **WhatsApp Automático**             | ❌       | ✅       | ✅       |
| **Lembrete de Manutenção**          | ❌       | ✅       | ✅       |
| **Comissão de Mecânicos**           | ❌       | ✅       | ✅       |
| **NPS Automático**                  | ❌       | ✅       | ✅       |
| **DRE Completo**                    | ❌       | ❌       | ✅       |
| **Multi-Unidades**                  | ❌       | ❌       | ✅       |
| **NF-e / NFS-e**                    | ❌       | ❌       | ✅       |
| **Portal do Cliente (PWA)**         | ❌       | ❌       | ✅       |
| **IA Assistiva no Orçamento**       | ❌       | ❌       | ✅       |
| **Suporte**                         | E-mail   | Chat     | Prioritário |
---

## Sistema de Autenticação, Roles e Privilégios

### Fluxo de Onboarding e Registro

**1. Contratação do Plano**
- Vendedor publica pacote (START/PRO/REDE) para cliente
- Sistema gera **link de registro único** com `invitationToken`
- Email enviado: "Clique aqui para criar sua conta MASTER"

**2. Primeiro Login (MASTER)**
- Usuário clica link e registra: email, senha, nome
- Sistema cria:
  - Novo **Tenant** (empresa)
  - Novo **User** com role `MASTER`
  - **Subscription** vinculada (START/PRO/REDE conforme plano contratado)
- MASTER redireciona para: "Cadastre sua empresa" (dados, endereço, horários)

**3. Convite de Colaboradores**
- MASTER vai em "Gerenciar Usuários" → "Convidar"
- Seleciona role: `ADMIN`, `PRODUTIVO` ou `FINANCEIRO`
- Envia email com link de convite único (válido 7 dias)
- Colaborador registra-se com aquele role já definido

**4. Restrição Crítica**
- ⚠️ **Um e apenas um MASTER por Tenant** — impossível criar segundo MASTER
- Se MASTER quer remover-se: delegar para outro ADMIN → converter ADMIN para MASTER (apenas 1 por vez)

---

### Matriz de Privilégios por Role

| Ação | MASTER | ADMIN | PRODUTIVO | FINANCEIRO |
|------|--------|-------|-----------|------------|
| **Cadastro de Empresa** | ✅ | ❌ | ❌ | ❌ |
| **Gerenciar Usuários** | ✅ | ✅* | ❌ | ❌ |
| **Criar Peças** | ✅ | ✅ | ❌ | ❌ |
| **Editar Peças** | ✅ | ✅ | ❌ | ❌ |
| **Deletar Peças** | ✅ | ✅ | ❌ | ❌ |
| **Criar Serviços** | ✅ | ✅ | ❌ | ❌ |
| **Editar Serviços** | ✅ | ✅ | ❌ | ❌ |
| **Deletar Serviços** | ✅ | ✅ | ❌ | ❌ |
| **Criar O.S.** | ✅ | ✅ | ✅ | ✅ |
| **Adicionar Itens à O.S.** | ✅ | ✅ | ✅ | ❌ |
| **Remover Itens de O.S.** | ✅ | ✅ | ✅ | ❌ |
| **Descrever Diagnóstico** | ✅ | ✅ | ✅ | ❌ |
| **Anexar Fotos/Laudo** | ✅ | ✅ | ✅ | ❌ |
| **Editar Valores de O.S.** | ✅ | ✅ | ❌ | ✅** |
| **Aplicar Desconto** | ✅ | ✅ | ❌ | ✅** |
| **Fechar O.S.** | ✅ | ✅ | ❌ | ✅ |
| **Registrar Pagamento** | ✅ | ✅ | ❌ | ✅ |
| **Ver Relatório Financeiro** | ✅ | ✅ | ❌ | ✅ |
| **Alterar Plano/Assinatura** | ✅ | ❌ | ❌ | ❌ |
| **Configurações Globais** | ✅ | ❌ | ❌ | ❌ |

**\* ADMIN** pode convidar e editar apenas PRODUTIVO e FINANCEIRO (nunca MASTER)
**\*\* FINANCEIRO** só edita valores após aprovação do orçamento (status `APROVADO`)

---

### Descrição de Cada Role

#### 👑 **MASTER** (Proprietário / Gestor Máximo)
- **Um por Tenant** — responsável legal e administrativo
- Acesso total a todas as funcionalidades
- Única conta que faz alterações de plano/assinatura
- Vê todos os dados financeiros (DRE, comissões, relatórios)
- Pode deletar dados sensíveis (O.S., clientes, usuários)

#### 🔑 **ADMIN** (Gerente Operacional)
- **Múltiplos por Tenant** — até limite do plano
- Gestão de inventory (peças, serviços)
- Pode convidar e remover usuários PRODUTIVO/FINANCEIRO
- Acesso completo a O.S. (técnica + financeiro)
- **Não pode** converter-se em MASTER ou gerenciar outros ADMIN

#### 🔧 **PRODUTIVO** (Técnico / Executor)
- **Múltiplos por Tenant** — até limite do plano
- Trabalha diretamente com O.S.
- Adiciona/remove itens do catálogo já existente
- **Não cria novos serviços/peças** (usa catálogo ADMIN/MASTER)
- **Não vê nem edita** valores, descontos, pagamentos
- Responsável por: diagnóstico, laudo, fotos

#### 💰 **FINANCEIRO** (Administrativo / Faturamento)
- **Múltiplos por Tenant** — até limite do plano
- Especializado em fechamento e cobrança
- Pode aplicar descontos/cupons (com auditoria)
- Registra pagamentos e gera recibos
- Vê relatório financeiro (DRE, fluxo de caixa)
- **Não pode** editar técnica da O.S. (diagnóstico, itens)

---

### Quotas de O.S. Mensal por Plano

| Plano | O.S./mês | Peças | Serviços | Usuários | Changelog |
|-------|----------|-------|----------|----------|-----------|
| **START** | **50** | 100 | 100 | até 3 | Reset no 1º dia do mês; upgrade imediato se ultrapassa |
| **PRO** | **150** | 1.000 | 1.000 | até 10 | Reset no 1º dia do mês; upgrade automático em plano anual |
| **REDE** | **250** | Ilimitado | Ilimitado | Ilimitado | Reset no 1º dia do mês; suporte prioritário |
| **ENTERPRISE** (futuro) | **1.000+** | Ilimitado | Ilimitado | Ilimitado | Contato: vendas@oficina360.com |

**Como contar O.S.?**
- Cada O.S. criada (POST /service-orders) consome 1 slot
- Reset automático no 1º dia de cada mês (baseado em `createdAt`)
- Alertas: 80% e 100% da quota (notificação email + banner na UI)
- Bloqueio hard: 100% = erro 403 "Quota de O.S. excedida para este mês. [Upgrade →]"

---

### Fluxo de Implementação (4 Sprints)

#### **Sprint Auth.1 — Preparar Backend (1–2 semanas)**

```prisma
// Adicionar ao schema.prisma:
enum UserRole {
  MASTER
  ADMIN
  PRODUTIVO
  FINANCEIRO
}

model User {
  // ... existing ...
  role     UserRole @default(PRODUTIVO)
  invitedBy String?  // email de quem convidou (auditoria)
}

model Subscription {
  // ... existing ...
  osCreatedThisMonth    Int       @default(0)
  osMonthResetDate      DateTime? // data do último reset
}
```

**Tarefas:**
- [ ] Criar migration Prisma (role enum + quotas)
- [ ] Seed script: atualizar usuários existentes com role padrão
- [ ] Testar migração local + staging

---

#### **Sprint Auth.2 — Enforcement de Roles (2–3 semanas)**

**Backend:**
- [ ] Criar `@RequirePermission(action: string)` decorator
- [ ] Estender RolesGuard para validar permissions
- [ ] Aplicar decorators em endpoints:
  - `POST /inventory` → `@RequirePermission('canCreateParts')`
  - `PATCH /inventory/:id` → `@RequirePermission('canEditParts')`
  - `POST /service-orders/:id/status` → validar role antes de mudar status
  - `PATCH /service-orders/:id/items` → `@RequirePermission('canAddItemsToOS')`
- [ ] Testes unitários: cada role + permissões

**Frontend:**
- [ ] Remover botões de ação não-permitidos por role
- [ ] Esconder abas "Peças" / "Serviços" para PRODUTIVO
- [ ] Desabilitar inputs de valor/desconto para PRODUTIVO

---

#### **Sprint Auth.3 — Quota de O.S. (2–3 semanas)**

- [ ] Contador `osCreatedThisMonth` em Subscription
- [ ] Middleware: incrementar contador ao criar O.S.
- [ ] Check antes de criar: se `osCreatedThisMonth >= limite` → erro 403
- [ ] Cron job ou trigger DB: reset mensal no 1º dia
- [ ] Endpoint `GET /subscription/quota` → retorna usado + limite
- [ ] Testes: criar O.S. até limite, verificar bloqueio

**Frontend:**
- [ ] Header: exibir "O.S. 45/50" com barra de progresso
- [ ] Alert ao chegar 80%: "Você está usando 80% da sua quota mensal"
- [ ] Modal ao bloquear: "Quota excedida [Upgrade para PRO →]"

---

#### **Sprint Auth.4 — Onboarding MASTER + Invites (2–3 semanas)**

- [ ] Novo endpoint: `POST /auth/register-master` (com invitationToken)
- [ ] Novo endpoint: `POST /auth/invite` (MASTER/ADMIN convida)
- [ ] Email de convite com link único (7 dias de validade)
- [ ] Validação: apenas 1 MASTER por Tenant
- [ ] Conversão: ADMIN → MASTER (com confirmação)
- [ ] Frontend: página "Gerenciar Usuários" com convites pendentes

---

### Exemplo de Uso - Fluxo Completo

**Dia 1: Contratação**
1. Vendedor: "Cliente contratou PRO anual"
2. Sistema envia: email com link `https://oficina360.app/auth/register?token=XYZ`

**Dia 1: Primeiro Login**
1. Cliente clica link → registro como MASTER
2. Confirma email → cadastra empresa (nome, CNPJ, endereço)
3. Vê dashboard vazio → "Convide seus mecânicos"

**Dia 2: Convite de Mecânicos**
1. MASTER: "Gerenciar Usuários" → "Convidar Novo"
2. Email para João (joão@email.com) com role `PRODUTIVO`
3. João: clica link → registra-se com role já pré-determinado
4. João vê: "O.S." aba, mas não vê "Peças" nem "Serviços"

**Dia 3: Convite de Gerente**
1. MASTER: convida Maria como `ADMIN`
2. Maria registra-se → pode criar peças, convidar mais usuários

**Dia 4: Uso**
1. Maria: cria 5 peças + 10 serviços
2. João: cria O.S. → adiciona 2 peças, 1 serviço
3. Contador: "O.S. 1/150" aparece no header
4. Maria: edita valores + aplica desconto (João não consegue)
5. Contador: "O.S. 1/150" continua (desconto não consome quota)

---

### Roadmap de Rollout Comercial

**Fase 1: Soft Launch (Sem Bloqueio)**
- Roles existem, mas sem enforcement
- Quotas são apenas informativos (não bloqueiam)
- Objetivo: testar sem quebrar clientes existentes

**Fase 2: Hard Enforcement (Com Avisos)**
- Roles começam a bloquear ações
- Quotas avisam a 80%
- Objetivo: dar tempo aos clientes se prepararem

**Fase 3: Bloqueio Total**
- 100% de quota = bloqueio hard
- Roles aplicadas em todos endpoints
- Objetivo: monetização funcional

---
### Posicionamento vs. Mercado

| Concorrente           | Plano Entry   | Plano Top     |
|-----------------------|---------------|---------------|
| **Oficina360**        | **R$ 97**     | **R$ 397**    |
| Onmotor               | R$ 32         | ~R$ 300       |
| Oficina Integrada     | R$ 99         | R$ 299        |
| Oficina Inteligente   | R$ 399        | R$ 599        |
| GestaoAuto            | R$ 250        | —             |

> Posicionamento: **melhor custo-benefício no segmento mid-market**, abaixo dos players premium
> e com mais features que os players de entrada.

---

## Infraestrutura

| Componente | Plataforma | Observações |
|------------|------------|-------------|
| Frontend   | **Vercel** | React + Vite, CDN global, deploy automático |
| Backend    | **Railway** | NestJS + Docker, auto-deploy do GitHub |
| Banco      | **Railway PostgreSQL** | Managed, backups automáticos |
| CI/CD      | **GitHub Actions** | Type-check + build + deploy em push para master |

### Variáveis de Ambiente (Railway)

```env
DATABASE_URL=postgresql://...  # provida automaticamente pelo Railway
JWT_SECRET=<gerar com: openssl rand -hex 32>
JWT_REFRESH_SECRET=<gerar com: openssl rand -hex 32>
FRONTEND_URL=https://oficina360.vercel.app
NODE_ENV=production
PORT=3000
```

### Variáveis de Ambiente (Vercel)

```env
VITE_API_URL=https://oficina360-api.railway.app
```

### Secrets GitHub Actions (Settings > Secrets)

```
RAILWAY_TOKEN         # token da Railway CLI
VITE_API_URL          # URL da API no Railway
VERCEL_TOKEN          # token da Vercel CLI
VERCEL_ORG_ID         # ID da organização no Vercel
VERCEL_PROJECT_ID     # ID do projeto no Vercel
```

---

## Roadmap de Desenvolvimento

### ✅ Fase 0 — Infraestrutura (concluído)
- [x] Multi-tenant SaaS com isolamento por tenant
- [x] Autenticação JWT com refresh token
- [x] Fluxo completo de OS (11 etapas + timeline)
- [x] Estoque com movimentações e quick-add
- [x] Financeiro com lançamentos e summary
- [x] CRM de Clientes e Veículos
- [x] Aprovação de orçamento por link/token
- [x] Serviços com TMO e VH
- [x] Migração SQLite → PostgreSQL
- [x] Deploy: Vercel + Railway + GitHub Actions

---

### 🚀 Sprint 1 — Converter START → PRO (3–4 semanas)
> Meta: funcionalidades que fazem o cliente perceber valor no upgrade imediato

- [ ] **Kanban de Pátio** — board visual por status, projetável em TV
- [ ] **Checklist de Entrada/Saída com Fotos** — proteção jurídica + upsell
- [ ] **WhatsApp Automático por evento da OS** — via Evolution API ou Z-API
  - Orçamento pronto → link de aprovação
  - OS aprovada → "Iniciando os serviços"
  - Pronto para entrega → notificação
  - Pós-venda (7 dias após entrega)

---

### 🚀 Sprint 2 — Consolidar PRO + preparar REDE (3–4 semanas)
> Meta: fidelização e relatórios gerenciais

- [ ] **Lembrete de Manutenção Preventiva** — WhatsApp automático por KM/data
- [ ] **DRE — Demonstrativo de Resultado** — Receita, CMV, Margem, Despesas, EBITDA
- [ ] **Comissão de Mecânicos** — % por serviço executado, relatório por funcionário
- [ ] **NPS Automático** — pesquisa via WhatsApp pós-entrega, dashboard de satisfação

---

### 🚀 Sprint 3 — Expandir para novos segmentos (4–6 semanas)
> Meta: aquisição de novos clientes e ticket PRO

- [ ] **Agendamento Online Público** — link da oficina, cliente agenda 24x7
- [ ] **Portal do Cliente (PWA)** — status em tempo real, histórico, aprovação
- [ ] **App Mobile (React Native ou PWA)** — para mecânicos receberem OS no celular

---

### 🚀 Sprint 4 — Enterprise / Franquias (6–8 semanas)
> Meta: plano REDE, ticket alto, contrato anual

- [ ] **Gestão Multi-Unidades** — login único, estoque compartilhado, relatórios por filial
- [ ] **Emissão NF-e / NFS-e** — integração Focus NF-e ou eNotas
- [ ] **IA Assistiva no Orçamento** — via Claude API: sugestão de serviços por sintoma
- [ ] **Marketplace de Peças** — consulta de estoque e preço em distribuidores parceiros

---

## Checklist de Deploy Inicial

### Backend (Railway)

```bash
# 1. Criar projeto no Railway e adicionar PostgreSQL
# 2. Definir variáveis de ambiente
# 3. Conectar repositório GitHub

# 4. Após deploy: rodar seed
railway run --service oficina360-api npx ts-node prisma/seed.ts
```

### Frontend (Vercel)

```bash
# 1. Importar repositório no Vercel
# 2. Root directory: frontend
# 3. Framework: Vite
# 4. Adicionar variável: VITE_API_URL=https://<sua-api>.railway.app
```

### Após primeiro deploy

```bash
# Rodar migrations (Railway executa automaticamente via CMD)
# Rodar seed manualmente uma vez:
railway run npx ts-node prisma/seed.ts
```
