---
name: Sygma Auto
description: Interface operacional clara verde-água para gestão de oficinas mecânicas — produto teal, marca gold.
colors:
  ink: "#162f2b"
  muted: "#5a6b68"
  faint: "#5f706c"
  app-bg: "#eef3f2"
  panel: "#ffffff"
  panel-2: "#f0f5f4"
  line: "#dce6e4"
  line-strong: "#c7d6d3"
  teal-accent: "#0d7d6e"
  teal-accent-hover: "#0a6458"
  teal-ink: "#0a6458"
  teal-soft: "#dcf2ee"
  sidebar-teal: "#123f3b"
  sidebar-active: "#1f9d8f"
  brand-gold: "#f59e0b"
  success: "#16a34a"
  warning: "#d97706"
  danger: "#dc2626"
  info: "#2563eb"
  chart-positive: "#10b981"
  chart-positive-soft: "#34d399"
  chart-attention: "#fb923c"
  chart-negative: "#ef4444"
  chart-negative-soft: "#f87171"
  chart-info: "#0ea5e9"
  chart-teal: "#0f766e"
  chart-orange: "#f97316"
  chart-cyan: "#06b6d4"
  chart-green: "#22c55e"
  chart-indigo: "#6366f1"
  chart-indigo-soft: "#818cf8"
  chart-violet: "#8b5cf6"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  sm: "10px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teal-accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.teal-accent-hover}"
  button-secondary:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  chip-status-neutral:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-status-positive:
    backgroundColor: "{colors.teal-soft}"
    textColor: "{colors.teal-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  modal:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  sidebar:
    backgroundColor: "{colors.sidebar-teal}"
    textColor: "{colors.panel}"
    padding: "{spacing.sm}"
---

# Design System: Sygma Auto

## 1. Overview

**Creative North Star: "A Oficina Integrada"**

O Sygma Auto é o balcão digital calmo e organizado de uma oficina mecânica. A superfície é um off-white frio verde-água (`#eef3f2`) — o "chão limpo" onde tudo tem lugar — e o verde-água profundo (`#0d7d6e`) é a assinatura do produto: aparece nas ações, nos estados ativos e nos números que importam. A densidade é de ERP (listas longas com busca fixa, grades que rolam no próprio container), mas sem o ruído de planilha: hierarquia clara, um acento só, respiro entre os grupos. O operador — quase sempre apressado, muitas vezes não-técnico em tecnologia — precisa confiar em cada controle. Isso é a régua: nada "sutilmente errado" que o faça hesitar.

O sistema opera em **dois registros deliberados**. O **produto** (app autenticado) é claro e teal: sério, eficiente, polido. A **marca** (landing/marketing e o ícone Σ) carrega o **gold** (`#f59e0b`) como assinatura histórica, sobre um fundo escuro. A regra de ouro é a separação: **gold é marca, teal é produto — um nunca vaza no outro.** O wordmark "SigmaAuto" acompanha o registro: "Auto" em gold no marketing, em teal no app.

Este sistema **rejeita**: SaaS genérico com cara de IA (gradientes roxos, cards idênticos repetidos, eyebrow uppercase em toda seção, hero-metric template); planilha/Excel cru (densidade sem hierarquia, tudo cinza); dashboard corporativo frio (azul-marinho de banco, tom clínico); e app consumer "fofo" (ilustrações, cantos super-arredondados, tom brincalhão).

**Key Characteristics:**
- Superfície clara verde-água fria; um acento teal único carrega a identidade.
- Densidade operacional (grades ERP) com hierarquia firme, não ruído.
- Dois registros separados: produto teal / marca gold.
- Legível com pressa: contraste AA real, alvos de toque adequados, status inequívoco.
- Tema escuro opcional (kanban/login) espelhando os mesmos tokens semânticos.

## 2. Colors

Uma paleta de off-whites frios e um único verde-água aprofundado, com hues semânticos reservados a feedback e a codificação de estágio/papel.

### Primary
- **Verde-Água Profundo** (`#0d7d6e`): o acento do produto. Preenchimento de botões primários, estados ativos, ícones de KPI, barras de progresso. É a única cor de identidade do app.
- **Verde-Água Tinta** (`#0a6458`): variante escura **para texto** teal sobre fundo claro ou tint (chips "Pronto/Pago", links, pills). Existe porque o acento de preenchimento (`#0d7d6e`) reprova AA como texto pequeno; a tinta passa (≥6:1 no soft).
- **Verde-Água Suave** (`#dcf2ee`): fundo de chips e realces positivos; sempre pareado com Verde-Água Tinta no texto.

### Secondary
- **Gold da Marca** (`#f59e0b`): **exclusivo da superfície de marca** — landing, marketing, e o ícone-marca Σ. Nunca aparece como cor de ação no app autenticado.
- **Teal da Sidebar** (`#123f3b` fundo / `#1f9d8f` ativo): o teal profundo da barra lateral e do wordmark do app; ancora o app numa moldura de marca sem competir com o conteúdo claro.

### Neutral
- **Tinta** (`#162f2b`): texto principal. Contraste 12.7:1 sobre o fundo do app.
- **Muted** (`#5a6b68`): texto secundário e labels (5.0:1, AA).
- **Faint** (`#5f706c`): texto fraco e placeholders (4.7:1 — o piso AA; **não** clarear mais).
- **Fundo do App** (`#eef3f2`): superfície base fria verde-água.
- **Painel** (`#ffffff`): cards, tabelas, modais elevados.
- **Painel-2** (`#f0f5f4`): preenchimento sutil, cabeçalho de tabela, botão secundário.
- **Linha** (`#dce6e4`) / **Linha Forte** (`#c7d6d3`): bordas finas e divisórias.

### Feedback (semânticos, só como estado)
- **Success** (`#16a34a`), **Warning** (`#d97706`), **Danger** (`#dc2626`), **Info** (`#2563eb`): reservados a estados de feedback e alertas. Nunca como identidade estrutural.

### Data-viz (paleta categórica de gráficos)
- **Chart Positive** (`#10b981` / soft `#34d399`), **Chart Attention** (`#fb923c`), **Chart Negative** (`#ef4444` / soft `#f87171`), **Chart Info** (`#0ea5e9`): a paleta categórica de séries em gráficos (recharts). **Os neutros de gráfico** (eixo, grid, tick, linha/ink) usam os tokens semânticos via `rgb(var(--muted/--faint/--line/--ink))` — seguem o tema. Cor de série é literal por natureza do data-viz; neutro segue token.

### Named Rules
**A Regra da Impressão à Parte.** Templates de PDF/impressão (`.fin-doc`, laudos, relatórios via Puppeteer/jsPDF) são **outro meio** e usam CSS de impressão próprio (`#111`, `#555`, `#1e293b`). Não migrar para os tokens de tela — a impressão não troca de tema.

### Named Rules
**A Regra dos Dois Registros.** Gold é marca, teal é produto. Nenhum indigo/violet/roxo estrutural no app — essas cores só existem como **codificação semântica** (estágio de kanban, papel de usuário, categoria), nunca como chrome (botão, foco, link).

**A Regra da Tinta.** Texto teal usa sempre `teal-ink` (`#0a6458`), nunca o teal de preenchimento (`#0d7d6e`). Preenchimento e texto são tokens distintos porque têm exigências de contraste distintas.

## 3. Typography

**Display/Body Font:** Inter (com fallback `system-ui, sans-serif`), pesos 400–800.

**Character:** Uma única família geométrica-humanista em vários pesos carrega toda a hierarquia. Sem pares de fontes — a distinção vem de tamanho, peso e cor, não de troca de família. A escala global do app roda em `font-size: 85%` para densidade operacional.

### Hierarchy
- **Display** (800, `clamp(2rem, 5vw, 3.4rem)`, 1.05): apenas heros de marketing. Não aparece no app.
- **Headline** (700, `1.5rem`, 1.2): título de página (`.page-title`).
- **Title** (600, `0.875rem`, 1.3): título de painel, cabeçalho de card.
- **Body** (400, `14px`, 1.55): texto corrido. Limite de 65–75ch em prosa.
- **Label** (600, `11px`, `0.04em`, uppercase): rótulos de seção, cabeçalho de tabela. Uso **contido**, não em toda seção.

### Named Rules
**A Regra do Peso Único.** Peso máximo padrão é **700 (bold)**. `font-black` (900) nem é carregado (o import vai só até 800) e está aposentado do app — hierarquia se faz por tamanho+cor, não por peso extremo.

**A Regra do Eyebrow Contido.** Rótulo uppercase-tracked (`label`) tem **um** papel por tela (ex.: cabeçalho de tabela). Eyebrow decorativo acima de toda seção é gramática de IA — proibido. Tracking máximo `tracking-wide` (`0.04em`), nunca `widest`.

## 4. Elevation

Sistema predominantemente **plano com camadas tonais**. A profundidade vem da separação por cor (fundo do app `#eef3f2` → painel branco → borda `#dce6e4`), não de sombras pesadas. Sombras são sutis e reservadas a elementos que flutuam de fato (modais, dropdowns, o card de KPI em hover).

### Shadow Vocabulary
- **Sutil** (`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`): cards e painéis em repouso (`shadow-sm`/`shadow-card`).
- **Média** (`box-shadow: 0 12px 18px -6px rgba(0,0,0,0.16), 0 4px 8px -4px rgba(0,0,0,0.10)`): hover de cards e foco (`shadow-card-hover`).
- **Modal** (`shadow-xl`): container de modal sobre backdrop `rgba(0,0,0,0.5)`.

### Named Rules
**A Regra Plana por Padrão.** Superfícies são planas em repouso; a separação é por cor e borda fina de 1px. Sombra é resposta a estado (hover, modal, foco), não decoração. **Nunca** parear borda de 1px com sombra difusa larga (≥16px) no mesmo elemento — é o "ghost-card".

## 5. Components

### Buttons
- **Shape:** cantos discretos (6px, `rounded-md`); pill (9999px) só em tags/badges.
- **Primary:** preenchimento Verde-Água Profundo (`#0d7d6e`), texto branco (5.0:1, AA), padding `10px 16px` (`.btn-primary`).
- **Hover / Focus:** hover → Verde-Água Hover (`#0a6458`); foco → ring teal `focus:ring-2 focus:ring-accent`. Transição 150ms.
- **Secondary:** fundo Painel-2, texto Tinta, borda Linha (`.btn-secondary`). **Ghost:** texto Muted, hover com fundo `ink/5` (`.btn-ghost`). **Danger:** `#dc2626`, texto branco.

### Chips (status)
- **Style:** pill (9999px), texto `11px`/600. Dois vocabulários **por contexto**, ambos válidos:
  - **Lista/tabela (por tom):** neutral (`panel-2` + `muted`), positive (`teal-soft` + `teal-ink`), golden (`teal-accent` preenchido + branco), negative (`red-50` + `red-700`). Cor contida numa lista densa.
  - **Kanban (por estágio):** hue distinto por coluna (indigo/blue/orange/emerald/cyan/violet/amber) — codificação semântica de estágio, legítima porque o kanban vive de diferenciar coluna.
- **State:** status por cor **sempre** acompanha rótulo em texto (nunca só cor).

### Cards / Containers
- **Corner Style:** 8px (`rounded-lg`; `.card`/`.panel`).
- **Background:** Painel branco sobre fundo do app; Painel-2 para preenchimentos internos.
- **Shadow Strategy:** Sutil em repouso (ver Elevation).
- **Border:** 1px Linha (`#dce6e4`).
- **Internal Padding:** `16px` (`.card`), cabeçalho `px-4 py-3`.

### Inputs / Fields
- **Style:** fundo Painel, borda Linha 1px, 6px de raio, placeholder em Faint (4.7:1).
- **Focus:** ring teal `focus:ring-2 focus:ring-accent/25` + borda accent.
- **Error:** borda Danger + ring `danger/20` (`.input-error`).

### Navigation
- **Style:** sidebar teal profundo (`#123f3b`), links `sidebar-nav-link`; ativo = fundo `sidebar-active/16` + barra teal inset à esquerda + texto branco. Grupos rotulados (label 8px uppercase `tracking-wide`, `white/45`). Itens bloqueados por plano ficam a 60% de opacidade com badge (RET/PRO).
- **Mobile:** header branco (tone escuro no wordmark), drawer deslizante com a mesma sidebar teal.

### Signature Component — Progress Stepper (Recepção/TV)
Trilha horizontal Ab.→Diag.→Orç.→Apr.→Ok→Exec.→Pronto com dots coloridos marcando o estágio atual. Comunica progresso à distância num TV de parede. Cards atrasados/SLA usam **borda vermelha sólida + banner** em contraste cheio (nunca esmaecidos) — o item mais urgente é o mais legível; a animação de atenção fica só no ícone de alerta.

## 6. Do's and Don'ts

### Do:
- **Do** usar Verde-Água Profundo (`#0d7d6e`) como o único acento de ação/identidade do app.
- **Do** usar `teal-ink` (`#0a6458`) para todo **texto** teal em fundo claro/tint (AA).
- **Do** deixar tamanho e cor carregarem a hierarquia; peso máximo padrão `700`.
- **Do** manter status sempre com rótulo em texto, não só cor.
- **Do** destacar itens atrasados/SLA em **contraste cheio** (borda vermelha sólida), nunca esmaecidos.
- **Do** manter contraste AA: corpo ≥4.5:1, `faint` no piso `#5f706c` — não clarear mais.

### Don't:
- **Don't** deixar gold vazar no produto nem teal vazar na marca (A Regra dos Dois Registros).
- **Don't** usar indigo/violet/roxo como **chrome** (botão, foco, link) no app — só como codificação semântica.
- **Don't** cair em **SaaS genérico com cara de IA**: gradiente roxo, cards idênticos repetidos, eyebrow uppercase em toda seção, hero-metric template.
- **Don't** virar **planilha/Excel cru**: densidade sem hierarquia, tudo cinza, tabela sem respiro.
- **Don't** virar **dashboard corporativo frio** (azul-marinho de banco) nem **app consumer "fofo"** (ilustrações, cantos 24px+, tom brincalhão).
- **Don't** usar `font-black` (900) — nem carregado — nem `tracking-widest`.
- **Don't** parear borda 1px com sombra difusa ≥16px (ghost-card); nem `background-clip: text` com gradiente (gradient-text); nem `border-left` >1px como faixa colorida (side-stripe).
