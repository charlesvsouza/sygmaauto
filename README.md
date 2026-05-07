# SigmaAuto — ERP para Oficinas Mecânicas

Sistema SaaS multi-tenant para gestão completa de oficinas mecânicas.

**Site:** [sigmaauto.com.br](https://sigmaauto.com.br)

---

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

---

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

---

## Planos

| | START | PRO | REDE |
|---|---|---|---|
| Preço | R\$ 149/mês | R\$ 299/mês | Sob consulta |
| Usuários | até 3 | até 10 | ilimitado |
| OS/mês | 50 | ilimitado | ilimitado |

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15+ (ou via Docker)

### Instalação

\\\ash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev

# Frontend
cd frontend
npm install
\\\

### Variáveis de Ambiente

\\\ash
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/sygmaauto
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3000

# frontend/.env
VITE_API_URL=http://localhost:3000
\\\

### Executar

\\\ash
# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && npm run dev
\\\

### Docker

\\\ash
docker-compose up -d
\\\

---

## Deploy

| Ambiente | Frontend | Backend |
|---|---|---|
| Produção | Vercel (auto-deploy via GitHub Actions) | Railway (auto-deploy via GitHub Actions) |

Push para master dispara o pipeline de CI/CD automaticamente.

---

## Roles

| Role | Descrição |
|---|---|
| MASTER | Proprietário. Um por tenant. Acesso total. |
| ADMIN | Gerência operacional. Pode convidar usuários. |
| GERENTE | Gerência sem acesso a configurações. |
| SECRETARIA | Atendimento e cadastros. |
| MECANICO | Execução técnica. Sem acesso a valores. |
| FINANCEIRO | Fechamento, pagamentos e relatórios. |

---

## Estrutura do Repositório

\\\
sygmaauto/
├── backend/          # NestJS API
│   ├── src/          # Código-fonte (módulos por domínio)
│   └── prisma/       # Schema e migrations
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── pages/    # Páginas da aplicação
│   │   ├── components/
│   │   ├── api/      # Chamadas à API (Axios)
│   │   └── store/    # Estado global (Zustand)
│   └── public/       # sitemap.xml, robots.txt
├── .github/
│   └── workflows/    # CI/CD GitHub Actions
└── docker-compose.yml
\\\

---

## Compliance e Segurança

- Status técnico de LGPD e segurança: [LGPD_COMPLIANCE_E_SEGURANCA.md](LGPD_COMPLIANCE_E_SEGURANCA.md)
- Política de privacidade e tratamento de dados: [POLITICA_PRIVACIDADE_E_TRATAMENTO_DADOS.md](POLITICA_PRIVACIDADE_E_TRATAMENTO_DADOS.md)
- Política de retenção e descarte: [POLITICA_RETENCAO_E_DESCARTE_DADOS.md](POLITICA_RETENCAO_E_DESCARTE_DADOS.md)
- Procedimento de atendimento ao titular: [PROCEDIMENTO_ATENDIMENTO_TITULAR_LGPD.md](PROCEDIMENTO_ATENDIMENTO_TITULAR_LGPD.md)
- Plano de resposta a incidentes: [PLANO_RESPOSTA_INCIDENTES_DADOS.md](PLANO_RESPOSTA_INCIDENTES_DADOS.md)
- Registro de governança LGPD: [REGISTRO_GOVERNANCA_LGPD.md](REGISTRO_GOVERNANCA_LGPD.md)

---

## Licença

Proprietário — todos os direitos reservados © 2026 SigmaAuto
