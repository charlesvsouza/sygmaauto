# CHECKPOINT — Para Claude (01/05/2026)

## Contexto Geral

**Projeto:** Sygma Auto — SaaS multi-tenant para gestão de oficinas mecânicas  
**GitHub:** `charlesvsouza/sygmaauto` branch `master`  
**Frontend:** React + Vite + TypeScript + Tailwind → deploy Vercel → `https://sigmaauto.com.br` (LIVE)  
**Backend:** NestJS + Prisma + PostgreSQL → deploy Railway → `https://sygmaauto-api-production.up.railway.app`  
**Pagamentos:** Mercado Pago Checkout Pro (modo production)  
**State mgmt:** Zustand com persist (`oficina360-auth` no localStorage)  
**Auth:** JWT multi-tenant, roles: MASTER / ADMIN / GERENTE / SECRETARIA / MECANICO / PRODUTIVO / FINANCEIRO  
**Credencial MASTER:** `charlesvsouza@hotmail.com` / `2021Bl08Ap303*a`

---

## Problema Atual — Deploy "não ocorre" (sintoma relatado pelo usuário)

O CI/CD do GitHub Actions roda e **TODOS os jobs passam com ✓**:
- ✓ Backend Type Check (18s)
- ✓ Frontend Build Check (20s)  
- ✓ Deploy Backend → Railway (6s)
- ✓ Deploy Frontend → Vercel (48s)

O log do Vercel confirma:
```
Production: https://sygmaauto-bx7z6ad4t-charlesvsouzas-projects.vercel.app [28s]
Aliased: https://sigmaauto.com.br [28s]
```

O usuário diz que mesmo assim as mudanças não aparecem no site. **Causa provável:** cache do Vercel / CDN ou cache do browser. O usuário já tentou hard refresh (Ctrl+Shift+R) e aba anônima e ainda não viu diferença.

**Possíveis causas a investigar:**
1. O arquivo `vercel.json` no frontend pode estar com cache-control agressivo
2. O Vercel pode ter o domínio `sigmaauto.com.br` apontando para outro projeto/deployment
3. O DNS pode estar em propagação ou apontado para lugar errado
4. O `VITE_API_URL` env var no Vercel pode estar errado, fazendo o build usar fallback

---

## Estado Atual do Código (COMMITADO e DEPLOYADO)

### Último commit: `0cd964d`
```
fix: fluxo de checkout via sessionStorage - evita bloqueio de mesmo plano no autocheckout
```

### Commits recentes (git log --oneline -8):
```
0cd964d fix: fluxo de checkout via sessionStorage - evita bloqueio de mesmo plano no autocheckout
8d5d03d fix: remover link de registro da tela de login - substituir por link para landing page
3d0f86c ci: remover working-directory do deploy Vercel - rodar da raiz do repo
0713241 ci: simplificar deploy Vercel - usar vercel deploy --prod direto
e11470a ci: corrigir workflow - usar vercel build antes de deploy --prebuilt
f84c8ef ci: corrigir VERCEL_PROJECT_ID e VERCEL_ORG_ID para deploy correto
f766833 feat: glow pulsante suave no titulo Sygma Auto
b3497e3 fix: ler isAuthenticated via getState() no clique para evitar race de hidratacao do Zustand
```

---

## Arquivos Chave — Código Exato

### `.github/workflows/deploy.yml` (FUNCIONANDO)
```yaml
name: Deploy
on:
  push:
    branches: [master]
jobs:
  backend-check:
    name: Backend Type Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit

  frontend-check:
    name: Frontend Build Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_URL: https://placeholder-api.railway.app

  deploy-backend:
    name: Deploy Backend → Railway
    needs: backend-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      - name: Deploy to Railway
        run: railway up --service sygmaauto-api --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    name: Deploy Frontend → Vercel
    needs: frontend-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - name: Install Vercel CLI
        run: npm install -g vercel@latest
      - name: Deploy to Vercel
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Secrets GitHub Actions:**
- `VERCEL_TOKEN` = `[REDACTED - configure em GitHub Secrets]`
- `VERCEL_ORG_ID` = `team_7QYTlGPuptyNca5dwgFYHPhX`
- `VERCEL_PROJECT_ID` = `prj_kcpcdmLKe6Zhmiok2RVrOxlVx0VQ`
- `RAILWAY_TOKEN` = (configurado, funcional)

---

### `frontend/src/pages/LandingPage.tsx` — função de checkout (ATUAL)

```tsx
const startPlanCheckout = async (planName: Plan['name']) => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated;

  if (!isAuthenticated) {
    sessionStorage.setItem('pendingCheckoutPlan', planName);
    navigate('/login');
    return;
  }

  setCheckoutLoading(planName);
  setCheckoutError(null);
  try {
    const origin = window.location.origin;
    const successUrl = `${origin}/settings?checkout=success&plan=${planName}`;
    const cancelUrl = `${origin}/settings?checkout=cancel`;
    const response = await subscriptionsApi.createCheckout(planName, successUrl, cancelUrl);
    const checkoutUrl = response.data?.checkoutUrl;
    if (!checkoutUrl) throw new Error('Checkout indisponível para este plano');
    window.location.href = checkoutUrl;
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Falha ao iniciar checkout';
    setCheckoutError(msg);
  } finally {
    setCheckoutLoading(null);
  }
};
```

**Características visuais:**
- Fundo `#090e17`, laranja `#ff7b2f`
- Glow pulsante no h1 via Framer Motion `textShadow` keyframes (0.55→0.80 opacity, 3s)
- Font: Space Grotesk
- Sem link de registro público — só "Acessar sistema"
- Planos: START R$149, PRO R$299 (featured), REDE R$599

---

### `frontend/src/pages/LoginPage.tsx` — lógica pós-login (ATUAL)

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  // ... login() com token ...
  
  const nextPath = searchParams.get('next');

  // Se há plano pendente (vindo da landing page), faz checkout direto
  const pendingPlan = sessionStorage.getItem('pendingCheckoutPlan');
  if (pendingPlan) {
    sessionStorage.removeItem('pendingCheckoutPlan');
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/settings?checkout=success&plan=${pendingPlan}`;
      const cancelUrl = `${origin}/settings?checkout=cancel`;
      const res = await subscriptionsApi.createCheckout(pendingPlan, successUrl, cancelUrl);
      const checkoutUrl = res.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
    } catch {
      // Se falhar, segue para dashboard normalmente
    }
  }

  if (nextPath && nextPath.startsWith('/')) {
    navigate(nextPath, { replace: true });
  } else {
    navigate('/welcome');
  }
};
```

- Removido: link "Crie sua conta premium" → `/register`
- Adicionado: link "Ver planos e preços" → `/`

---

### `frontend/src/pages/SettingsPage.tsx` — autocheckout (ATUAL)

```tsx
useEffect(() => {
  if (loading || autoCheckoutHandledRef.current) return;

  const requestedPlan = (searchParams.get('autocheckout') || '').toUpperCase();
  if (!requestedPlan) return;

  autoCheckoutHandledRef.current = true;
  const requested = plans.find((plan) => String(plan.name || '').toUpperCase() === requestedPlan);

  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete('autocheckout');
  setSearchParams(nextParams, { replace: true });

  if (!requested) {
    // Plano não encontrado — ignora silenciosamente
    return;
  }

  // Não bloqueia checkout mesmo que o plano seja o atual
  void handleCheckoutPlan(requested.name);
}, [currentPlan, loading, plans, searchParams, setSearchParams]);
```

**Bug corrigido:** removida checagem `if (currentPlan === requested.name) { alert('Este já é o seu plano atual.') }` que bloqueava novos usuários (padrão: plano START trial) de assinar o plano START.

---

### `frontend/src/api/client.ts` — subscriptionsApi

```ts
const PROD_API_FALLBACK = 'https://sygmaauto-api-production.up.railway.app';
const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_API_FALLBACK : 'http://localhost:3000')).replace(/\/+$/, '');

export const subscriptionsApi = {
  getCurrent: () => api.get('/subscriptions/current'),
  getPlans: () => api.get('/subscriptions/plans'),
  changePlan: (plan: string) => api.post('/subscriptions/change-plan', { plan }),
  createCheckout: (plan: string, successUrl?: string, cancelUrl?: string) =>
    api.post('/subscriptions/checkout', { plan, successUrl, cancelUrl }),
};
```

- Axios interceptor lê `useAuthStore.getState().accessToken` em cada request (sem race de hidratação)
- Refresh automático de token em 401

---

### `backend/src/subscriptions/subscriptions.controller.ts`

```ts
@Post('checkout')
@Roles('MASTER', 'ADMIN')
async createCheckout(@Tenant() tenant: { tenantId: string }, @Body() dto: CreateCheckoutDto) {
  return this.subscriptionsService.createCheckoutLink(tenant.tenantId, dto);
}
```

**Importante:** endpoint requer role MASTER ou ADMIN. Novos usuários têm role MASTER por padrão (são os donos da oficina). Usuários convidados (ADMIN, MECANICO, etc.) também podem acionar.

---

### `backend/src/subscriptions/subscriptions.service.ts` — createCheckoutLink

- Cria preferência no Mercado Pago via `POST https://api.mercadopago.com/checkout/preferences`
- Usa `MP_ACCESS_TOKEN` do Railway
- `external_reference`: `${tenantId}:${planName}:${timestamp}`
- `auto_return: 'approved'`
- `back_urls.success` → `successUrl` (validado por `allowedReturnOrigins`)
- Retorna `{ checkoutUrl: init_point }`

**Railway env vars (já configuradas):**
```
FRONTEND_URL=https://sigmaauto.com.br
MP_ACCESS_TOKEN=<configure_no_railway>
MP_WEBHOOK_SECRET=<configure_no_railway>
MP_MODE=production
BACKEND_PUBLIC_URL=https://sygmaauto-api-production.up.railway.app
CHECKOUT_SUCCESS_URL=https://sigmaauto.com.br/settings?checkout=success
CHECKOUT_CANCEL_URL=https://sigmaauto.com.br/settings?checkout=cancel
```

---

## Fluxo de Checkout (como implementado)

### Usuário não autenticado (landing page → login → MP):
1. Clica "Assinar Pro" na landing → `sessionStorage.set('pendingCheckoutPlan', 'PRO')`
2. Redireciona para `/login` (sem query params)
3. Faz login → `LoginPage.handleSubmit` lê sessionStorage
4. Remove do sessionStorage, chama `subscriptionsApi.createCheckout('PRO', ...)`
5. `window.location.href = checkoutUrl` → vai direto para MP

### Usuário autenticado (landing page → MP):
1. Clica "Assinar Pro" → `useAuthStore.getState().isAuthenticated === true`
2. Chama `subscriptionsApi.createCheckout('PRO', ...)` diretamente
3. `window.location.href = checkoutUrl` → vai direto para MP

### Usuário autenticado (settings page):
- `handleCheckoutPlan(planName)` → `subscriptionsApi.createCheckout(...)` → `window.location.href`
- URL `?autocheckout=PLAN` ainda funciona (para redirects legados), mas o fluxo principal agora usa sessionStorage

---

## O que Verificar se o Deploy "não Aparece"

### 1. Verificar se o domínio está apontado corretamente no Vercel
```bash
# No Vercel dashboard: Settings > Domains
# Deve mostrar sigmaauto.com.br → Production
# Verificar se não há outro projeto Vercel com o mesmo domínio
```

### 2. Verificar DNS
```bash
nslookup sigmaauto.com.br
# Deve apontar para Vercel (76.76.21.21 ou similar)
```

### 3. Verificar o `vercel.json` do frontend
```bash
# c:\sygmaauto\frontend\vercel.json
# Verificar se tem headers de cache que podem estar impedindo atualização
```

### 4. Verificar VITE_API_URL no Vercel
```
# Vercel Dashboard > Project > Settings > Environment Variables
# VITE_API_URL deve ser: https://sygmaauto-api-production.up.railway.app
```

### 5. Forçar redeployment sem cache
```bash
vercel --force --prod --token=[REDACTED]
```

---

## Estrutura do Projeto

```
c:\sygmaauto\
├── .github/workflows/deploy.yml       # CI/CD GitHub Actions
├── frontend/
│   ├── vercel.json                    # Config Vercel (SPA routing)
│   ├── vite.config.ts
│   └── src/
│       ├── api/client.ts              # Axios + todos os endpoints
│       ├── store/authStore.ts         # Zustand persist
│       └── pages/
│           ├── LandingPage.tsx        # Página pública /
│           ├── LoginPage.tsx          # Login + checkout pós-login
│           ├── SettingsPage.tsx       # Config da oficina + assinatura
│           └── (demais páginas do sistema)
└── backend/
    ├── src/
    │   └── subscriptions/
    │       ├── subscriptions.controller.ts
    │       └── subscriptions.service.ts   # Integração MP
    └── prisma/schema.prisma
```

---

## Problemas Resolvidos Nesta Sessão

| Problema | Solução |
|---|---|
| `window.open()` bloqueado pelo browser | Trocado para `window.location.href` |
| Zustand hydration race (auth lido antes de hidratar) | `useAuthStore.getState()` no clique, não no render |
| CI/CD quebrado (VERCEL_PROJECT_ID errado + --prebuilt sem build + caminho duplo frontend/) | Corrigido IDs, removido --prebuilt, removido working-directory do deploy |
| `alert('Este já é o seu plano atual.')` para novos usuários | Removida checagem que bloqueava usuários em START trial de assinar START |
| Fluxo autocheckout via `?autocheckout=` era frágil | Substituído por sessionStorage + checkout direto no LoginPage |
| Deploy parece não refletir mudanças | **EM INVESTIGAÇÃO** — CI/CD passa com ✓, Vercel confirma alias, usuário não vê diferença |
