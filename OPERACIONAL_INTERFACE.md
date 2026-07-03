# Operacional de Interface

Data de referência: 06/2026
Escopo: identidade visual, UX, componentes e padrões de interface do SigmaAuto

## 1. Diretriz de Identidade Impeccable

### 1.1 Objetivo
Garantir a mesma identidade de implementação em todos os projetos:
- experiência premium e consistente
- código previsível e reutilizável
- fluxo de entrega com validação técnica e operacional

### 1.2 Regras de stack (autodetecção obrigatória)
Antes de codar UI:
1. detectar framework (Next.js/React/Vite)
2. detectar estilo (Tailwind/CSS Modules/etc.)
3. detectar UI/animação (Framer Motion, Lucide, etc.)
4. implementar usando o stack já existente (sem trocar base do projeto)

### 1.3 Design System base (estilo Sigma)
Direção visual:
- shell light
- hero com accent escuro por página
- cards e tabelas claras
- CTA primário em teal

Tokens semânticos recomendados:
- fundo app: #f3f9fb
- painel: #ffffff
- texto forte: #0f1f2b
- borda: #d2e2e7
- brand primário: #0b7f86

Status colors padrão:
- sucesso: green-50/700
- alerta: amber-50/700
- erro: red-50/700
- info: blue-50/700
- neutro: slate-50/600

### 1.4 Padrões obrigatórios de página
Estrutura:
1. Hero section (título, subtítulo, contexto, ações)
2. KPI strip (cards objetivos)
3. Conteúdo principal (tabs, tabela, formulários, empty state)

Componentes:
- botão primário consistente
- badge de status padronizado
- tabela com thead clara e hover leve
- modal padrão (overlay + foco + ações)

### 1.5 UX e conversão (impeccable)
Obrigatório em telas novas/refatoradas:
- hierarquia visual clara
- feedback imediato de estado (loading/success/error)
- validação de formulário em tempo real
- CTA principal visível no fim natural de leitura
- empty states com CTA explícito
- microcopy curta e sem ambiguidade

### 1.6 Estabilidade de navegação
Aplicar guardrails:
- aguardar hidratação/auth antes de redirect
- aguardar resolução de plano/features antes de bloquear rota
- role gating + feature gating no frontend e backend
- fallback de rota seguro por papel

### 1.7 Acessibilidade mínima (sempre)
- semântica HTML correta
- aria-* em componentes interativos
- foco visível keyboard-first
- contraste adequado para dados críticos
- navegação por teclado funcional

### 1.8 Contratos e modularidade
- fonte única para navegação (mapa central de rotas)
- cliente HTTP único (evitar fetch disperso)
- schemas claros de request/response
- status de assinatura e gating derivados de fonte única

### 1.9 Definição de pronto (DoD)
Uma entrega só fecha quando:
1. funcionalidade implementada
2. type-check/lint sem erro no escopo
3. tratamento de loading e erro adicionado
4. docs operacionais sincronizados no mesmo ciclo
5. sem regressão de navegação/role/feature gate

### 1.10 Governance operacional
A cada mudança de fluxo visível:
- atualizar docs do fluxo
- registrar checkpoint de continuidade
- manter trilha curta: o que mudou, impacto, como validar

### 1.11 Antipadrões proibidos
- tema inconsistente entre páginas irmãs
- redirect prematuro durante hidratação
- duplicação de regra de rota sem fonte única
- ação crítica sem feedback visual
- liberar recurso premium sem validar assinatura

### 1.12 Modo de execução recomendado
Sequência padrão:
1. mapear contexto atual do módulo
2. aplicar design system + regras de acessibilidade
3. implementar com componentes reaproveitáveis
4. validar fluxo ponta a ponta
5. sincronizar documentação

## 2. Diretriz para Boards Fullscreen Responsivos

### 2.1 Objetivo
Padrão para qualquer tela de board em modo fullscreen:
- Kanban de pátio
- Painel de recepção
- Kanban técnico
- Painel operacional de TV
- Quadros de atendimento, produção ou triagem

### 2.2 Princípios obrigatórios
1. Toda tela full-screen precisa ter rota de saída visível.
2. O sistema deve detectar o tamanho da tela automaticamente.
3. Scroll horizontal deve ser assistido.
4. Header deve ser flexível.
5. O usuário precisa entender que a tela se adaptou.

### 2.3 Header mínimo
- botão de voltar
- ícone ou identificador visual do módulo
- título da tela
- contexto resumido: empresa, quantidade de itens, última atualização
- ações rápidas: atualizar, modo TV, navegação lateral assistida quando necessário

### 2.4 Corpo do board
- ocupar a altura inteira disponível
- permitir scroll horizontal apenas no board
- evitar scroll horizontal no documento inteiro
- usar min-w-max somente no trilho interno, nunca na página inteira

### 2.5 Colunas
- largura dinâmica por viewport
- manter shrink-0
- usar snap-start quando houver scroll assistido
- preservar altura mínima para não colapsar visualmente

### 2.6 Regra de dimensionamento recomendada
- modo TV: 288px
- desktop: 256px
- tablet: entre 260px e 320px, proporcional à viewport
- mobile: largura quase cheia, descontando respiro lateral

### 2.7 Hook compartilhado recomendado
Responsabilidades:
- observar window.innerWidth
- informar se a tela está compacta
- devolver largura ideal das colunas
- expor ref do trilho horizontal
- fornecer função para avançar ou voltar colunas com scroll suave

Interface sugerida:
- isCompactViewport
- boardScrollRef
- getColumnWidth
- scrollColumns

### 2.8 Botões de navegação lateral
Quando isCompactViewport for verdadeiro e a tela não estiver em modo TV:
- Colunas ←
- Colunas →
- rolar aproximadamente uma coluna por vez
- behavior: smooth
- funcionar sem depender de trackpad ou gesto lateral

### 2.9 Botão de voltar
Mapeamento recomendado:
- Kanban de pátio → dashboard principal
- Painel de recepção → dashboard principal
- Kanban retífica → dashboard da retífica
- qualquer board especializado → painel pai do módulo

Nunca esconder esse botão no mobile.

### 2.10 Regras de UX para tablet e smartphone
Toque:
- alvo mínimo confortável: 44px de altura mínima para ações importantes

Leitura:
- evitar blocos com texto excessivamente pequeno
- evitar títulos comprimidos por largura fixa
- evitar excesso de informação por card em telas pequenas

Scroll:
- separar scroll vertical do board e scroll horizontal do trilho de colunas
- evitar página inteira com overflow horizontal
- evitar board empurrando o layout global

Hierarquia:
- ação de voltar
- título do módulo
- atualização manual
- navegação lateral assistida
- modo TV como ação secundária

## 3. Referências de Implementação

Arquivos-chave:
- frontend/src/hooks/useBoardViewport.ts
- frontend/src/components/Layout.tsx
- frontend/src/index.css
- frontend/src/pages/KanbanPage.tsx
- frontend/src/pages/KanbanRetificaPage.tsx
- frontend/src/pages/KanbanRecepcaoPage.tsx
- frontend/src/pages/LandingPage.tsx
