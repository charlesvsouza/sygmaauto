# SigmaAuto — ERP para Oficinas Mecânicas

Sistema SaaS multi-tenant para gestão completa de oficinas mecânicas.

**Site:** [sigmaauto.com.br](https://sigmaauto.com.br)

## Stack

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript + TailwindCSS + Framer Motion |
| **Backend** | NestJS + TypeScript + Prisma ORM |
| **Banco de Dados** | PostgreSQL |
| **Auth** | JWT (access + refresh token), multi-tenant |
| **Pagamentos** | Mercado Pago Checkout Pro |
| **Deploy** | Vercel (frontend) + Railway (backend) |
| **CI/CD** | GitHub Actions |

## Módulos

- **Autenticação** — login, registro, JWT, refresh, roles
- **Multi-tenant** — isolamento completo por oficina
- **Clientes** — CRM com histórico de OS
- **Veículos** — cadastro por cliente, placa, modelo, ano
- **Ordens de Serviço** — ciclo completo: abertura → diagnóstico → aprovação → execução → entrega → pagamento
- **Serviços** — catálogo com preço, TMO, categoria
- **Estoque** — peças, movimentações, quick-add na OS
- **Financeiro** — lançamentos, receitas/despesas, summary mensal
- **Usuários** — CRUD com roles e permissões
- **Assinaturas** — planos START/PRO/REDE, checkout online, upgrade/downgrade controlado
- **Super Admin** — painel de gestão de todos os tenants

## Planos

|  | START | PRO | REDE |
|---|---|---|---|
| Preço | R$ 149/mês | R$ 299/mês | Sob consulta |
| Usuários | até 3 | até 10 | ilimitado |
| OS/mês | 50 | ilimitado | ilimitado |

## Desenvolvimento Local

### Pré-requisitos
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15+ (ou via Docker)

### Instalação

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev

# Frontend
cd frontend
npm install
```

### Variáveis de Ambiente

```bash
# backend/.env
DATABASE_URL=postgresql://user:***@localhost:5432/sygmaauto
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3000

# frontend/.env
VITE_API_URL=http://localhost:3000
```

Observacao: o `Phone Number ID` pode ser configurado por oficina na aba de Configuracoes. O backend usa esse valor por tenant e mantem `META_WHATSAPP_PHONE_NUMBER_ID` como fallback global.

### Executar

```bash
# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && npm run dev
```

### Docker

```bash
docker-compose up -d
```

## Deploy

| Ambiente | Frontend | Backend |
|---|---|---|
| Produção | Vercel (auto-deploy via GitHub Actions) | Railway (auto-deploy via GitHub Actions) |

Push para master dispara o pipeline de CI/CD automaticamente.

## Roles

| Role | Descrição |
|---|---|
| MASTER | Proprietário. Um por tenant. Acesso total. |
| ADMIN | Gerência operacional. Pode convidar usuários. |
| GERENTE | Gerência sem acesso a configurações. |
| SECRETARIA | Atendimento e cadastros. |
| MECANICO | Execução técnica. Sem acesso a valores. |
| FINANCEIRO | Fechamento, pagamentos e relatórios. |

## Documentação

- **ROADMAP.md** — roadmap, sprints, planos e funcionalidades entregues/pendentes
- **OPERACIONAL_SISTEMA.md** — variáveis, deploy, incidentes, operação
- **OPERACIONAL_INTERFACE.md** — identidade visual, padrões de UI, boards fullscreen, tema dark premium/dourado
- **DESIGN_REVIEW_SISTEMA.md** — análise de design consolidada do sistema
- **design-system-board.html** — artefato de referência visual com 3 variantes de identidade
- **COMPLIANCE.md** — políticas LGPD, privacidade, retenção, incidentes
- **MANUAL_USUARIO.md** — guia do usuário final

## Diretrizes de UI

- Identidade atual: tema dark premium + acento dourado.
- Referência visual: `design-system-board.html`.
- Migração incremental por camada para evitar regressão.
- Boards full-screen devem seguir o padrão de saída explícita, ajuste por viewport e navegação lateral assistida.
- Landing e páginas públicas devem usar linguagem acessível, sem promessas fantasiosas, com foco em qualidade de produto e adoção gradual para oficinas.
- Componentes e páginas devem priorizar uso confortável em smartphone e tablet, não apenas desktop.

Diretriz interna de referência: [OPERACIONAL_INTERFACE.md](OPERACIONAL_INTERFACE.md)

Referência visual: [DESIGN_REVIEW_SISTEMA.md](DESIGN_REVIEW_SISTEMA.md), [design-system-board.html](design-system-board.html)

## Compliance e Segurança

- Status técnico de LGPD e segurança: [COMPLIANCE.md](COMPLIANCE.md)

## Licença

Proprietário — todos os direitos reservados © 2026 SigmaAuto
