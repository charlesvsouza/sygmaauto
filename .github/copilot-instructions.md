# Copilot Instructions — SygmaAuto

## Stack
- **Backend:** NestJS + Prisma + PostgreSQL (Railway)
- **Frontend:** React/Next.js (Railway)
- **Deploy:** Railway com Dockerfile monorepo (`backend/Dockerfile`) + `release.js`

---

## Deploy Railway — Diagnóstico de Falhas

### Fluxo de deploy
1. Build Docker (`backend/Dockerfile` a partir da raiz do repo)
2. Release command: `node release.js` → termina conexões antigas → `prisma db push`
3. Start command: `node dist/main`
4. Healthcheck em `/health`

### Erro mais comum: `DATABASE_URL` inválida
**Sintoma:**
```
PrismaClientInitializationError: the URL must start with the protocol `postgresql://` or `postgres://`.
errorCode: 'P1012'
```
**Causa:** `DATABASE_URL` está vazia, ausente ou mal formatada no Railway.

**Fix:**
- Railway → serviço backend → Variables → verificar `DATABASE_URL`
- Deve começar com `postgresql://` ou `postgres://`
- Se o banco está no Railway: usar **Add Reference** apontando para o plugin PostgreSQL

### Erro de conexões esgotadas
**Sintoma:** `release.js` loga muitas conexões ativas, `prisma db push` trava ou falha.

**Fix:** O `release.js` já mata conexões e aguarda 0 antes do push. Se persistir, verificar `connection_limit` na `DATABASE_URL` do app.

O `PrismaService` em `backend/src/prisma/prisma.service.ts` injeta automaticamente `connection_limit=15` se não estiver presente na URL.

---

## Regras de código

### PrismaService
- Nunca instanciar `PrismaClient` diretamente — sempre injetar `PrismaService`
- Multi-tenant: toda query deve filtrar por `tenantId` do usuário autenticado
- `onModuleInit` chama `$connect()` — erros aqui indicam problema de banco, não de código

### Release Script (`backend/release.js`)
- Roda no container de release (antes do start), não no container da app
- Usa `pg` diretamente (sem Prisma) para matar conexões via `pg_terminate_backend`
- Modifica `DATABASE_URL` só no próprio processo para o `prisma db push` usar `connection_limit=1`

### Dockerfile
- Build em dois estágios: `builder` (compila) → `stage-1` (produção)
- `ARG CACHEBUST=1` posicionado antes do `COPY backend/. .` para invalidar cache de fonte sem reinstalar dependências
- `prisma` está em `dependencies` (não devDependencies) — necessário para `npx prisma db push` no release

---

## Variáveis de ambiente obrigatórias (produção)
| Variável | Descrição |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:port/db?sslmode=require` |
| `JWT_SECRET` | Secret do token JWT |
| `EVOLUTION_API_URL` | URL da Evolution API (WhatsApp) |
| `EVOLUTION_API_KEY` | Chave da Evolution API |
| `EVOLUTION_INSTANCE` | Nome da instância WhatsApp (`sygmaauto`) |
| `BACKEND_PUBLIC_URL` | URL pública do backend (`https://...railway.app`) |
| `MERCADOPAGO_ACCESS_TOKEN` | Token do Mercado Pago |
