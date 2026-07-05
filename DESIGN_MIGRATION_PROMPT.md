# Prompt para Claude Code — Conclusão da Migração de Design System

## Contexto
Você está trabalhando no projeto **SygmaAuto** (sistema de gestão de oficinas), localizado em `C:\sygmaauto`. O projeto tem um frontend React + Vite + TypeScript + Tailwind em `C:\sygmaauto\frontend`.

Foi aprovada uma nova identidade visual: **tema dark premium com acento dourado**. A página `ServiceOrdersPage.tsx` já está migrada. Agora precisamos migrar o restante do sistema de forma incremental e segura, começando pelo Layout/navegação e seguindo por camadas.

## Diretrizes de Design Aprovadas

### Tokens Obrigatórios
- **Fundo base:** `#08090a`
- **Superfície:** `#0f1011` / `#191a1b`
- **Texto principal:** `#e8e8e8` / `#a8a8a8`
- **Acento principal:** dourado (gold)
- **Bordas:** `rgba(255,255,255,0.05)` a `rgba(255,255,255,0.08)`
- **Tipografia:** Inter / system-ui

### Linguagem Permitida
- Usar `surface` para fundo neutro (`surface-50`, `surface-100`, `surface-200`, `surface-900`, etc.)
- Usar `gold` para CTA e destaque primário (`gold-300`, `gold-400`, `gold-500`, `gold-600`, `gold-700`)
- Manter `emerald` e `red` apenas para estado semântico: sucesso/erro
- Eventualmente `amber` pode ser usado para aviso, mas evitar como cor estrutural

### Cores e tokens que DEVEM desaparecer gradualmente do código principal
- `slate` como cor estrutural principal
- `violet`, `indigo`, `blue`, `amber` como identidade visual
- `tracking-widest` em excesso
- `backdrop-blur` excessivo

### Componentes-base alvo
- Card: superfície elevada, borda sutil, sombra curta
- Chip: fundo baixo contraste, texto semântico, sem sombra pesada
- Botão primário: gradiente dourado sobre surface
- Botão secundário: contorno dourado translúcido
- Modal: overlay escuro + blur, container em raised surface
- Toast: borda esquerda dourada
- Tabela: linha sutil, cabeçalho em `surface-900`, hover em superfície elevada

## Estado Atual

### Já implementado
- `frontend/src/pages/ServiceOrdersPage.tsx`: migrada para tokens `surface` + `gold`
- `C:\sygmaauto\design-system-board.html`: artefato de referência visual com 3 variantes (Conservadora, Forte, Divergente)
- `C:\sygmaauto\OPERACIONAL_INTERFACE.md`: documentação atualizada com nova diretriz
- `C:\sygmaauto\README.md`, `C:\sygmaauto\ROADMAP.md`, `C:\sygmaauto\INDEX.md`: atualizados
- **Próximo arquivo-alvo:** `frontend/src/components/Layout.tsx` e sidebar/mobile menu

### Referências
- Análise completa: `C:\sygmaauto\DESIGN_REVIEW_SISTEMA.md`
- Interface operacional: `C:\sygmaauto\OPERACIONAL_INTERFACE.md`
- Design board: `C:\sygmaauto\design-system-board.html`

## Tarefas por Camada (Ordem de Execução)

### Camada 1 — Layout e navegação
**Arquivo:** `frontend/src/components/Layout.tsx` + `frontend/src/index.css`

Objetivo: tornar o shell do app consistente com o tema dark premium.

Checklist:
1. Fundo do layout desktop e mobile deve usar `bg-surface-950` ou `bg-surface-900`, nunca `bg-white`, `bg-slate-50` ou `bg-gradient-to-br from-slate-50 to-slate-100` como base principal.
2. Sidebar deve ser `bg-surface-950` com borda `border-white/5` ou `border-white/10`.
3. Textos da sidebar devem usar `text-surface-200` / `text-surface-400`, evitando `text-slate-300/400` como identidade.
4. Item ativo da sidebar deve usar accent dourado: `bg-gold-500/15 text-gold-400` ou `bg-surface-900 text-gold border-l-2 border-gold-500`.
5. Header desktop deve usar `bg-surface-900/90 backdrop-blur-sm border-b border-white/5`.
6. Avatares e dropdowns devem usar `surface` como base, não `bg-white` puro.
7. Botões do upgrade modal devem usar `bg-gold` quando primário.
8. Busca e inputs do header devem usar `bg-surface-950/40 border-white/10`.
9. Badges de plano devem usar `gold` para premium, `surface` para START.
10. `index.css`: remover tokens azuis antigos que conflitam com dark premium; manter apenas variáveis globais neutras.

Restrições:
- Não alterar lógica de navegação, guards, logout ou comportamento do menu mobile.
- Não alterar rotas ou links.
- Não alterar componentes filhos (páginas) ainda.
- Build do frontend deve continuar passando (`npm run build` sem erro).

### Camada 2 — Telas públicas/auth
**Arquivos:** 
- `LandingPage.tsx`
- `LoginPage.tsx`
- `RegisterPage.tsx`
- `ForgotPasswordPage.tsx`
- `InitialSplash.tsx`
- `WelcomePage.tsx`

Objetivo: unificar landing e login com o novo tema, mantendo a bridge visual por logo/CTA.

Checklist:
1. Landing pode manter densidade informacional, mas reduzir `backdrop-blur` pesado.
2. Login/Register devem usar `bg-surface-950` como base, nunca `bg-white`.
3. Cards de auth devem ser `bg-surface-900 border border-white/5 rounded-2xl`.
4. Inputs devem ser `bg-surface-950/40 border border-white/10 text-surface-100`.
5. Primário: `bg-gold-500 text-surface-950` ou variação mais forte conforme variante escolhida.
6. Links secundários: `text-gold-400 hover:text-gold-300`.
7. States: `emerald` para sucesso, `red` para erro, `amber` para aviso.

### Camada 3 — Atendimento/OS/agenda
**Arquivos:**
- `AgendaPage.tsx`
- `CustomersPage.tsx`
- `VehiclesPage.tsx`

Checklist:
1. Migrar para `surface` + `gold`.
2. Remover `alert()` e substituir por feedback inline ou toast.
3. Tabelas devem usar `bg-surface-900` para o container, `bg-surface-950` para linhas alternadas.
4. Status chips devem ser consistentes com ServiceOrdersPage.

### Camada 4 — Oficina/Kanban
**Arquivos:**
- `ServicesPage.tsx`
- `InventoryPage.tsx`
- `KanbanPage.tsx`
- `KanbanRecepcaoPage.tsx`
- `KanbanRetificaPage.tsx`
- `RetificaMotoresPage.tsx`
- Modais: `MetrologiaModal.tsx`, `ChecklistModal.tsx`, `ImportOSModal.tsx`, `ImportNFModal.tsx`, `LaudoRetificaModal.tsx`

Checklist:
1. Kanban columns devem usar `surface-950` para background das colunas.
2. Cards do kanban: `bg-surface-900 border border-white/5`.
3. Modais devem ser unificados visualmente: overlay `bg-black/60 backdrop-blur-sm`, modal `bg-surface-900`.
4. Reduzir duplicação de estilos por modal.

### Camada 5 — Financeiro/relatórios/admin
**Arquivos:**
- `FinancialPage.tsx`
- `DREPage.tsx`
- `KPIsPage.tsx`
- `CommissionsPage.tsx`
- `ReportsPage.tsx`
- `NpsPage.tsx`, `NpsAnswerPage.tsx`
- `SuperAdminPage.tsx`, `SuperAdminLoginPage.tsx`
- `SettingsPage.tsx`, `MaintenancePage.tsx`, `SupportPage.tsx`, `UserManualPage.tsx`

Checklist:
1. Padronizar KPI cards.
2. Reduzir `alert()`.
3. Manter hierarquia visual por section, sem flood de métricas sem destaque.
4. Admin: usar `surface` + `gold`, reservar `red` apenas para ações destrutivas/alertas.

## Regras Gerais
1. Não alterar funcionalidades existentes, apenas visual/tema.
2. Não alterar backend, schemas Prisma ou endpoints.
3. Manter acessibilidade: `min-h-[44px]` para botões e toques em mobile.
4. Cada camada deve ser commitada separadamente.
5. Atualizar docs correspondentes junto de cada camada.
6. Rodar `npm run build` antes de considerar uma camada pronta.
7. Não deletar funcionalidades ou fluxos existentes sem substituí-los por equivalentes.

## Critérios de Aceitação
- `npm run build` passa sem erro.
- App continua funcional em todas as telas migradas.
- Não há `slate/violet/indigo/blue/amber` como cor estrutural nas camadas migradas.
- Acentos dourados são usados consistentemente.
- Documentação atualizada.

## Primeiro Arquivo para Atacar
Comece por `frontend/src/components/Layout.tsx` e `frontend/src/index.css`. NÃO mexa em outros arquivos até terminar essa camada.
