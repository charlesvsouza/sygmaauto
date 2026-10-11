---
name: Sygma Auto
description: Superfície clara única em verde-água para gestão de oficinas mecânicas; o sistema mostra o que fazer hoje e a próxima ação de cada O.S.
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
  logo-warm: "#f59e0b"
  success: "#16a34a"
  warning: "#d97706"
  danger: "#dc2626"
  info: "#2563eb"
  chart-positive: "#10b981"
  chart-attention: "#fb923c"
  chart-negative: "#ef4444"
  chart-info: "#0ea5e9"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
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
    letterSpacing: "0.02em"
  tv:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.teal-accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.teal-accent-hover}"
  button-next-action:
    backgroundColor: "{colors.teal-accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 24px"
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
  kpi-tile:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  attention-row:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
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

## Overview

**Creative North Star: "O Quadro do Dia"**

O SigmaAuto é o quadro branco do balcão da oficina, em versão digital: uma superfície calma onde o que importa hoje está escrito grande e o resto espera. O fundo é um off-white frio verde-água (`#eef3f2`), os painéis são brancos, e **um único verde-água profundo** (`#0d7d6e`) fala em nome do produto. A cor não decora; ela aponta. Onde há teal cheio, há algo para fazer.

**Uma superfície só.** App, páginas públicas, login, cadastro e o manual compartilham o mesmo mundo claro e teal e os mesmos tokens. Não existe registro escuro de marca: as páginas públicas são o mesmo sistema com mais ar, não outra identidade. O símbolo Σ do logotipo guarda seu tom quente como a única nota de cor fora do teal; ele nunca é cor de interface.

A hierarquia segue a ordem do trabalho: primeiro **o que precisa de você agora** (fila de atenção, botão da próxima ação, alerta de prazo), depois o estado (cartões, listas), depois o histórico. Densidade de ERP, com respiro: linhas escaneáveis, rótulos legíveis, nenhum texto que o olho precise adivinhar.

Este sistema **rejeita**: SaaS genérico com cara de IA (gradientes, cartões idênticos repetidos, eyebrow em toda seção, saudação gigante com métricas de enfeite); planilha crua (tudo cinza, sem hierarquia); dashboard corporativo frio; app consumer "fofo".

**Key Characteristics:**
- Superfície clara verde-água, um acento teal, em tudo.
- A próxima ação é sempre o elemento mais forte da tela.
- Densidade operacional com hierarquia firme, não ruído.
- Legível com pressa, com a mão suja e a metros de distância (TV).
- Português completo e acentuado, sem exceção.

## Colors

Uma paleta de off-whites frios e um único verde-água aprofundado; matizes semânticos reservados a estado.

### Primary
- **Verde-Água Profundo** (`#0d7d6e`): o acento. Preenchimento de botões primários e do botão de próxima ação, estados ativos, barras de progresso. Única cor de identidade.
- **Verde-Água Tinta** (`#0a6458`): variante para **texto** teal em fundo claro (links, chips, selos). O preenchimento reprova AA como texto pequeno; a tinta passa.
- **Verde-Água Suave** (`#dcf2ee`): fundo de chips, linhas de atenção positivas e realces; sempre com Verde-Água Tinta no texto.

### Secondary
- **Teal da Sidebar** (`#123f3b` fundo, `#1f9d8f` ativo): a barra lateral do app e o cabeçalho das páginas públicas. Ancora a moldura sem competir com o conteúdo.
- **Tom do Logotipo** (`#f59e0b`): só no símbolo Σ. Nunca em botão, link, ícone ou destaque.

### Neutral
- **Tinta** (`#162f2b`): texto principal, 12.7:1 sobre o fundo.
- **Muted** (`#5a6b68`): texto secundário e rótulos (5.0:1).
- **Faint** (`#5f706c`): texto fraco e placeholders (4.7:1, piso AA; não clarear).
- **Fundo do App** (`#eef3f2`), **Painel** (`#ffffff`), **Painel-2** (`#f0f5f4`), **Linha** (`#dce6e4`), **Linha Forte** (`#c7d6d3`).

### Feedback (só como estado)
- **Success** `#16a34a`, **Warning** `#d97706`, **Danger** `#dc2626`, **Info** `#2563eb`. Atrasado é vermelho cheio; aguardando é âmbar; nunca como cor estrutural.

### Data-viz
- Séries: `#10b981` / `#fb923c` / `#ef4444` / `#0ea5e9`. Eixos e grade usam os neutros de tinta, não cores de série.

### Named Rules
**A Regra de Uma Voz.** Teal é a única cor de ação e de identidade. Indigo, violeta, laranja e azul existem só como codificação de estado ou de série em gráfico, nunca como chrome (botão, foco, link, ícone de KPI).

**A Regra da Tinta.** Texto teal em fundo claro usa `#0a6458`, nunca o teal de preenchimento.

**A Regra do Dado Vazio.** Nenhum selo de saúde ou conclusão ("Ótima", "Em dia") aparece sem dado que o sustente. Sem dados, a tela diz "Sem movimentação ainda" e convida à primeira ação.

**A Regra da Impressão à Parte.** PDF e impressão (laudos, termos, relatórios) são outro meio e têm CSS próprio (`#111`, `#555`). Não migram para os tokens de tela.

## Typography

**Fonte única:** Inter (fallback `system-ui, sans-serif`), pesos 400 a 700. Space Grotesk e qualquer segunda família estão aposentadas, inclusive nas páginas públicas.

**Character:** uma família geométrico-humanista carrega toda a hierarquia; a distinção vem de tamanho, peso e cor. A escala global do app roda a 85% do `rem` para densidade operacional, por isso **o piso é 11px renderizados** no app (`text-[11px]`); nada de `text-[9px]` ou `text-[10px]`, e `text-xs` só em apoio fora do Kanban e da TV.

### Hierarchy
- **Display** (700, `clamp(2rem, 5vw, 3.25rem)`, 1.08): só hero das páginas públicas.
- **Headline** (700, `1.5rem`, 1.2): título de página.
- **Title** (600, `0.9375rem`, 1.3): título de painel e de cartão.
- **Body** (400, `14px`, 1.55): texto corrido, 65–75ch em prosa e no manual.
- **Label** (600, `11px`, `0.02em`): cabeçalho de tabela e rótulo de campo. Caixa-alta somente em cabeçalho de tabela.
- **TV** (600, `1rem` mínimo, 1.35): cartões do Kanban de Pátio e da Recepção, lidos a metros.

### Named Rules
**A Regra do Peso Único.** Peso máximo 700. `font-black` não existe neste sistema.

**A Regra do Eyebrow Contido.** Nada de rótulo caixa-alta espaçado acima de título ("PAINEL DE INTELIGÊNCIA", "INTELIGÊNCIA FINANCEIRA"). O título fala por si. Tracking máximo `tracking-wide`.

**A Regra do Acento.** Toda palavra em português leva seu acento, em rótulo, estágio, tabela, preço e documento. "Execucao" é bug.

## Layout

Duas gramáticas:

- **App (autenticado):** sidebar teal fixa de 218px (recolhível a trilho) + coluna de conteúdo em fundo `#eef3f2`. Lista e detalhe lado a lado onde há seleção (O.S.). Espaçamento em múltiplos de 6/10/16/24px. Em telas estreitas a sidebar vira gaveta e lista e detalhe viram **uma coisa por vez**: a lista ocupa a tela, o detalhe abre por cima, sem cartão vazio "selecione".
- **Páginas públicas e manual:** mesma paleta, container de 1152px, mais respiro vertical, cabeçalho claro fixo com fundo ao rolar. Leitura longa em coluna de até 46rem com índice lateral.

Painel: abre com a **fila "Precisa de atenção"** (O.S. atrasadas, aguardando aprovação, prontas para entrega, estoque crítico, contas vencidas), cada linha leva à tela já filtrada. Abaixo, uma fileira de KPIs em um único estilo e, por fim, gráficos.

Modo TV (Kanban de Pátio e Recepção): tela inteira sem sidebar, cartões que usam a altura, texto de 16px ou mais, no máximo uma cor de destaque por coluna.

Alvos de toque de 44px ou mais para toda ação primária; 48px para o botão de próxima ação.

## Elevation & Depth

Predominantemente **plano com camadas tonais**: fundo `#eef3f2`, painel branco, borda de 1px `#dce6e4`. Sombra é resposta a estado e a elementos que flutuam de fato.

### Shadow Vocabulary
- **Sutil** (`0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`): cartões em repouso.
- **Média** (`0 12px 18px -6px rgba(0,0,0,0.16), 0 4px 8px -4px rgba(0,0,0,0.10)`): hover e menus.
- **Modal** (`shadow-xl`) sobre backdrop `rgba(0,0,0,0.5)`.

### Named Rules
**A Regra Plana por Padrão.** Nunca borda de 1px com sombra difusa de 16px ou mais no mesmo elemento. Nenhum brilho, órbita ou blur decorativo no fundo, nem nas páginas públicas.

## Shapes

Cantos discretos: 6px em botões e campos, 8px em cartões e painéis, 12px em modais; pill só em chips e selos. Nada acima de 12px (sem `rounded-3xl`). Borda de 1px como divisão padrão; **nunca** faixa lateral colorida maior que 1px.

## Components

### Buttons
- **Primário** (6px, `#0d7d6e`, texto branco, `10px 16px`): ação comum; hover `#0a6458`, foco em anel teal.
- **Próxima ação** (8px, `#0d7d6e`, 48px de altura, `0 24px`): **um por tela de O.S.**, com o verbo da etapa ("Enviar para aprovação", "Registrar pagamento", "Confirmar entrega"). Salvar vira secundário.
- **Secundário** (`#f0f5f4`, texto tinta, borda linha) e **Ghost** (texto muted); **Danger** (`#dc2626`) só para destrutivo.

### Chips (status)
- Pill, 12px/600. Lista e tabela: neutro (`panel-2` + muted), positivo (`teal-soft` + `teal-ink`), atenção (âmbar claro + texto escuro), negativo (`red-50` + `red-700`). Status **sempre com rótulo em texto**.
- Kanban e Recepção: uma cor de apoio por coluna (traço no topo ou ponto), nunca fundo de coluna pastel.

### Cards / Containers
- Painel branco, 8px, borda 1px linha, padding 16px, sombra sutil.
- **KPI** (um único estilo em todo o app): rótulo 12px muted, valor 24–28px/700 tinta, nota 12px; ícone, quando houver, **monocromático teal**. Sem tile de cor própria por métrica.
- **Linha de atenção:** painel branco, ícone de estado à esquerda, o que e quantos em 14px/600, ação à direita; atrasado usa borda vermelha cheia, nunca esmaecido.

### Inputs / Fields
- Fundo painel, borda linha 1px, 6px de raio, placeholder faint. Foco: anel `ring-2 ring-accent/25` + borda accent. Erro: borda danger + ring `danger/20`. Rótulo sempre visível e ligado ao campo.

### Navigation
- Sidebar teal `#123f3b`, ativo com fundo `sidebar-active/16` e barra inset; grupos recolhíveis rotulados em 12px. Itens bloqueados por plano ficam a 60% com cadeado e explicam o plano ao tocar.
- Páginas públicas: cabeçalho claro (`#ffffff` com borda) fixo; ganha sombra sutil ao rolar.
- Mobile: header branco e gaveta com a mesma sidebar teal.

### Stepper da O.S.
- Linha de etapas com a atual preenchida em teal, as concluídas com marca e a **próxima** com contorno teal e o verbo; as demais em neutro. Troca de etapa pelo botão de próxima ação ou por menu **Mudar status**, nunca escondida no cartão do veículo.

### Cartão do Pátio (TV)
- Texto de 16px ou mais; placa e número da O.S. em 18px/700; atraso em borda vermelha cheia com o motivo em texto.

## Do's and Don'ts

### Do:
- **Do** deixar o botão de próxima ação como o elemento mais forte da O.S., e a fila "Precisa de atenção" como o primeiro bloco do Painel.
- **Do** usar teal (`#0d7d6e`) como única cor de ação e `#0a6458` para todo texto teal.
- **Do** usar um único estilo de KPI em Painel, Financeiro, KPIs e Retífica.
- **Do** manter 11px como piso de texto no app e 16px no modo TV.
- **Do** acentuar todo texto em português e revisar copy nova antes de publicar.
- **Do** mostrar estado vazio útil ("Sem movimentação ainda" + ação) em vez de selo otimista.
- **Do** manter contraste AA e status com rótulo em texto.

### Don't:
- **Don't** criar um registro escuro de marca: nem `data-theme="dark"`, nem fundo `#060b13`, nem laranja nas páginas públicas.
- **Don't** usar Space Grotesk, `font-black` ou `tracking-widest` e similares.
- **Don't** colocar eyebrow caixa-alta espaçado acima de títulos.
- **Don't** dar a cada métrica um ícone de cor diferente.
- **Don't** usar fundos de coluna pastel, gradientes, órbitas ou brilhos decorativos.
- **Don't** usar `border-left` maior que 1px como faixa colorida, nem `background-clip: text` com gradiente, nem raio acima de 12px.
- **Don't** exibir selo de saúde, "ótimo" ou "em dia" sem dado.
- **Don't** esconder a troca de status dentro de outro cartão.
