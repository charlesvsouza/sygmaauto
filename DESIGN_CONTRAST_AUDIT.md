# Auditoria de Contraste — Sygma Auto
## Opinião do Fable

**Data:** 2026-07-07
**Escopo:** `frontend/src` (tema claro padrão, tokens de `frontend/src/index.css` + `tailwind.config.js`)
**Regra de exclusão:** templates de impressão/PDF (`#1e293b`, `#64748b` etc. em `.fin-doc`, laudos, ReportsPage/DREPage/FinancialPage print CSS) estão FORA desta auditoria — "A Regra da Impressão à Parte" do DESIGN.md.

---

## Resumo executivo

O "card verde com fonte cinza" existe, é real e é pior do que relatado: são **duas páginas inteiras** (`SuperAdminPage`, `DashboardRetificaPage`) e **quatro blocos da `ServiceOrdersPage`** com fundo teal sólido (`bg-accent`, #0d7d6e) recheados de texto `text-surface-400/500/600` — que no tema claro resolvem para cinzas médios (#6a7b77, #5a6b68, #7a8a87) com contraste de **1.1:1 a 1.4:1**. Isso não é "abaixo de AA", é fisicamente invisível. A causa não é falta de tokens (o sistema tem tokens corretos e documentados): é **código escrito na convenção dark antiga rodando no tema claro com a escala `surface` invertida**, mais um erro semântico recorrente de usar `text-accent-ink` (tinta teal para fundo CLARO) em cima de `bg-accent` (teal sobre teal). Há também o inverso: painel `bg-surface-900` (= branco no claro) com `text-white` — branco no branco.

Referência de contraste dos tokens (tema claro): branco sobre `--accent` #0d7d6e = **5.0:1 (AA, o par correto)**.

---

## Achados

Formato: **severidade | arquivo:linha | classes atuais | problema (contraste estimado) | fix sugerido**

### P0 — Ilegível / invisível

1. **P0 | `frontend/src/pages/ServiceOrdersPage.tsx:1302-1310`** — banner "Orçamento reprovado"
   - Atual: container `bg-accent border border-accent/40`; filhos `text-accent-ink` (o "!"), `text-surface-100` (título), `text-surface-400` (parágrafo).
   - Problema: `#0a6458` sobre `#0d7d6e` ≈ **1.4:1**; `#1e3631` sobre teal ≈ **2.6:1**; `#6a7b77` (cinza) sobre teal ≈ **1.15:1** — o parágrafo explicativo é invisível. Este é literalmente o "card verde com fonte cinza".
   - Fix: banner de aviso não deveria ser `bg-accent` (acento ≠ superfície). Trocar container para `bg-accent-soft border border-accent/40` com `text-ink` (título) + `text-muted` (corpo) + ícone `text-accent-ink`. Alternativa se mantiver preenchido: `text-white` + `text-white/85`.

2. **P0 | `frontend/src/pages/ServiceOrdersPage.tsx:1783-1805`** — card "Totais" da OS
   - Atual: `bg-accent rounded-xl p-6 text-white`; MAS as linhas Serviços/Peças/Mão de Obra usam `text-surface-600` (linha 1798) e o label "Total da Ordem" usa `text-accent-ink` (linha 1804).
   - Problema: `#7a8a87` sobre `#0d7d6e` ≈ **1.4:1** (valores financeiros ilegíveis); `#0a6458` sobre `#0d7d6e` ≈ **1.4:1**.
   - Fix: `text-surface-600` → `text-white/80`; `text-accent-ink` → `text-white/70` (ou `text-accent-soft`). Regra: sobre `bg-accent`, só `text-white`/`text-accent-fg` e suas opacidades.

3. **P0 | `frontend/src/pages/ServiceOrdersPage.tsx:1411-1413`** — card "Dados do Veículo"
   - Atual: `bg-accent rounded-lg p-5 text-white` com `<h3 class="... text-accent-ink ...">`.
   - Problema: teal sobre teal ≈ **1.4:1** — título de seção invisível.
   - Fix: `text-accent-ink` → `text-white/70`. (Mesma pergunta de design: por que um card de dados é teal sólido? Candidato a virar `.card` branco com `panel-head`.)

4. **P0 | `frontend/src/pages/ServiceOrdersPage.tsx:1822-1834`** — header do modal "Reserva de Peças"
   - Atual: `bg-accent` com subtítulo `text-surface-200` (linha 1829) e botão fechar `text-surface-100/60` (linha 1832); `border-surface-800`.
   - Problema: `#2c3f3a` sobre teal ≈ **2.2:1**; `#1e3631` a 60% ≈ invisível.
   - Fix: `text-surface-200` → `text-white/80`; `text-surface-100/60 hover:text-surface-100` → `text-white/60 hover:text-white`.

5. **P0 | `frontend/src/pages/SuperAdminPage.tsx:199` (raiz) + 207, 214, 252, 268, 289, 305-306, 312, 402, 443, 461, 478...** — página inteira
   - Atual: raiz `min-h-screen bg-accent text-white` (linha 199) — a página INTEIRA do Super Admin é teal sólido — com dezenas de `text-surface-400/500/600` por cima (direto no teal ou em cards `bg-black/60`).
   - Problema: cinza sobre teal ≈ **1.1-1.4:1**; cinza `#5a6b68` sobre `black/60` composto no teal ≈ **1.7:1**. Página administrativa quase toda ilegível.
   - Fix estrutural (não pontual): a raiz deve ser `bg-app text-ink` (ou, se a intenção era dark deliberado como kanban/login, `data-theme="dark"` na raiz + `bg-app`). Depois: `text-surface-500` → `text-muted`, `text-surface-400` → `text-faint`, `text-white` → `text-ink`, `bg-black/60` → `bg-panel border-line`. `bg-accent` NUNCA como fundo de página.

6. **P0 | `frontend/src/pages/SuperAdminPage.tsx:350-353, 372, 374, 462, 480`** — drawer "Detalhes do Tenant"
   - Atual: painel `bg-surface-900` (= **BRANCO** no tema claro) com `h2 text-white`, spans `text-white` para valores, `hover:text-white` no botão fechar.
   - Problema: **branco sobre branco = 1.0:1**. O inverso exato do achado 5, no mesmo arquivo — prova de que a página foi escrita na convenção dark e "flipou" (mesma causa-raiz do bug histórico 2.4 do DESIGN_STATUS).
   - Fix: `text-white` → `text-ink`; `bg-surface-900` → `bg-panel`; `text-surface-500 hover:text-white` → `text-muted hover:text-ink`.

7. **P0 | `frontend/src/pages/DashboardRetificaPage.tsx:292-297, 303, 314` (raiz) + 319-326** — página inteira + card do header
   - Atual: raiz `min-h-screen bg-accent text-white` (3 ocorrências); loader `text-surface-600` sobre o teal (linha 293 ≈ **1.4:1**); card do header `bg-gradient-to-r from-surface-900 to-surface-800` (= gradiente **branco→#ecf2f0** no claro) com `<h1>` **sem classe de cor**, herdando `text-white` da raiz.
   - Problema: o título "Dashboard Retifica" é **branco sobre branco (1.0:1)** — invisível — enquanto o subtítulo `text-surface-500` (cinza sobre branco) fica legível. Página teal com miolo caótico.
   - Fix estrutural: raiz → `bg-app text-ink` (ou `data-theme="dark"` se for painel de TV deliberadamente escuro — decidir e declarar); h1 → `text-ink`; `text-surface-500/600` → `text-muted`; botões `bg-ink/5 text-surface-600` → `bg-panel-2 text-muted`.

8. **P0 | `frontend/src/pages/CommissionsPage.tsx:370`** — ticks do eixo Y do gráfico
   - Atual: `<YAxis tick={{ ... fill: '#cbd5e1' }}>` sobre painel branco.
   - Problema: slate-300 sobre branco ≈ **1.6:1** — os valores do eixo praticamente não existem. (Linha 369, XAxis `#64748b` ≈ 4.6:1, raspa o AA.)
   - Fix: neutros de gráfico seguem token, como o DESIGN.md já manda: `fill: 'rgb(var(--muted))'` (ou `--faint`), nos dois eixos.

### P1 — Abaixo de AA (~<4.5:1), legível com esforço

9. **P1 | `frontend/src/pages/SuperAdminPage.tsx:379`** — input do link de convite: `bg-surface-950 ... text-surface-600` = `#7a8a87` sobre `#eef3f2` ≈ **3.2:1**. Fix: `text-ink` (é conteúdo copiável, não decoração).
10. **P1 | `frontend/src/pages/FinancialPage.tsx:595`** — toggle Entrada/Saída não-selecionado `text-surface-400` sobre modal branco ≈ **4.4:1** em texto de 12px uppercase. Fix: `text-muted`.
11. **P1 | `frontend/src/pages/KanbanRecepcaoPage.tsx:318`** — botão TV mode inativo `bg-ink/5 text-surface-400` ≈ **3.7:1**. Fix: `text-muted hover:text-ink`.
12. **P1 | `frontend/src/pages/ServiceOrdersPage.tsx:1644`** — botão desabilitado `bg-surface-700 text-surface-500` = `#5a6b68` sobre `#c7d6d3` ≈ **3.2:1**. Aceitável se for estado disabled real; se for informativo, `bg-panel-2 text-muted` + `opacity`.

### P2 — Drift de token (contraste ok hoje, mas frágil/errado)

13. **P2 | `frontend/src/pages/LoginPage.tsx:206` e `frontend/src/pages/RegisterPage.tsx:254`** — `bg-accent ... text-surface-950`. Hoje passa (~6.6:1) porque a página é `data-theme="dark"`, mas é EXATAMENTE o padrão registrado como bug 2.3 no DESIGN_STATUS; sobreviveu ao sweep. Fix: `text-accent-fg`.
14. **P2 | `frontend/src/pages/ServiceOrdersPage.tsx:1323`** — `bg-white border-surface-800 text-surface-300 hover:bg-surface-950`: contraste ok (~7:1), mas é a convenção invertida remanescente. Fix: `bg-panel border-line text-muted hover:bg-panel-2` (`.btn-secondary` já existe).
15. **P2 | `frontend/src/pages/ServiceOrdersPage.tsx:1317, 1959, 2107, 2223 (e 1133, 1883)`** — `hover:bg-accent` sobre `bg-accent` (hover morto, sem feedback) e ternário `catalogMode === 'service' ? 'bg-accent' : 'bg-accent'` (branches idênticos). Fix: `hover:bg-accent-hover`; resolver o ternário.
16. **P2 | `frontend/src/index.css:213-214` + `frontend/src/components/ui/Chip.tsx:7`** — `.badge-finalizado { bg-emerald-100 text-emerald-800 }`, `.badge-pago { bg-teal-100 text-teal-800 }`, Chip `ok: bg-emerald-100 text-emerald-800`. Contraste ok, mas o DESIGN.md define chip positivo = `teal-soft` + `teal-ink` (`accent-soft`/`accent-ink`) — e esses hardcoded não trocam de tema. Fix: migrar para os tokens.
17. **P2 | `frontend/src/pages/AgendaPage.tsx:155, 163`** — `bg-surface-950/40`, `bg-surface-800 text-surface-300` misturados com tokens na mesma linha. Contraste ok no claro; frágil no dark. Fix: `bg-panel-2 text-muted`.

---

## Padrão raiz (por que isso continua acontecendo)

Não é um problema de paleta — a paleta é boa e o DESIGN.md é explícito. São **três mecanismos**, em ordem de dano:

1. **A escala `surface` de compatibilidade é uma mina terrestre.** A mesma classe (`text-surface-400`) significa "cinza claro sobre escuro" na convenção dark e "cinza médio sobre claro" no tema claro invertido. Todo código escrito antes da virada carrega a semântica antiga e falha silenciosamente — sem erro de build, sem warning, só texto invisível em produção. Já causou o bug 2.4 (ServiceOrders escura), e `SuperAdminPage`/`DashboardRetificaPage` são a mesma doença não tratada: páginas dark-convention rodando no claro. O sintoma delator: no MESMO arquivo, cinza-sobre-teal (invisível) e branco-sobre-branco (invisível) coexistindo, cada um quebrado numa direção.

2. **`bg-accent` virou fundo de página/painel — violação direta do próprio DESIGN.md** ("acento = ações, estados ativos, KPI icons"; superfícies são `--app`/`--panel`). Suspeito de sweep mecânico: algum find-replace de fundo escuro caiu em `bg-accent`. Quando o acento vira superfície, qualquer texto que não seja branco puro morre em cima dele — e o código antigo em cima era todo cinza.

3. **`accent-ink` tem nome que convida ao erro.** O token significa "tinta teal para texto SOBRE fundo claro/tint", mas lê-se como "a tinta que combina com accent" — e desenvolvedores a colocam SOBRE `bg-accent` (teal #0a6458 sobre teal #0d7d6e, 1.4:1). Aconteceu 3+ vezes só na ServiceOrdersPage. A Regra da Tinta do DESIGN.md diz o oposto do que o nome sugere.

Minha leitura direta: o design system está correto e o time o segue em código novo (Customers/Services/Vehicles estão limpos). O problema é **dívida da migração dark→claro que nunca foi paga nas páginas "de canto"** (SuperAdmin, Retífica, miolo da OS) + ausência de qualquer guardrail que impeça o par proibido. Enquanto a escala `surface` invertida existir, cada tela antiga é uma loteria.

---

## Recomendação de processo (para não recorrer)

1. **Regra dura, mecânica, lintável — "Regra do Preenchido":** num mesmo `className` (ou elemento pai imediato) com `bg-accent`/`bg-emerald-500+`/`bg-red-500+` sólido, as únicas classes de texto permitidas são `text-white`, `text-accent-fg` e opacidades (`text-white/NN`). Proibido: `text-surface-*`, `text-muted`, `text-faint`, `text-accent-ink`, `text-*-600+`. Implementável como regra regex no detector do Impeccable ou ESLint custom (`eslint-plugin-tailwindcss` + regra local).
2. **Proibir `bg-accent` como superfície:** `bg-accent` só em elementos interativos/ícones/chips (`button`, `a`, spans pequenos). `min-h-screen bg-accent` ou `div` de página com `bg-accent` = erro de lint.
3. **Congelar e drenar a escala `surface`:** (a) proibir `surface-*` em código NOVO (lint); (b) migrar as 3 telas doentes nesta ordem — `SuperAdminPage`, `DashboardRetificaPage`, blocos teal da `ServiceOrdersPage` — para tokens semânticos; (c) quando o grep de `surface-` zerar fora de `index.css`/`tailwind.config`, deletar a escala. Isso já está listado como "próximo passo 2" no DESIGN_STATUS desde a última rodada; esta auditoria mostra o custo de adiar.
4. **Renomear ou documentar `accent-ink` no ponto de uso:** comentário no `tailwind.config.js` já existe, mas ninguém lê config. Alternativa barata: alias `text-teal-on-light` e deprecação gradual de `accent-ink`; ou item fixo no checklist de PR: "usou accent-ink? o fundo é claro/tint?".
5. **Smoke test de contraste:** o detector do Impeccable já mede drift (162 avisos); adicionar a checagem de PAR (bg+text no mesmo escopo, contraste computado dos tokens) transformaria estes P0 em CI vermelho em vez de bug report do dono do produto.

---

*Auditoria gerada por análise estática (grep + leitura de componentes + contraste WCAG estimado a partir dos hex dos tokens). Nenhum componente de produto foi alterado. Fixes destinados a aplicação via /impeccable polish ou equivalente — itens 1-8 (P0) primeiro, na ordem listada.*
