# AUTOPROGRAMACAO - IDENTIDADE IMPECCABLE (PADRAO CROSS-PROJECT)

Data: 02/06/2026
Escopo: padronizar design, UX e codificacao para manter linearidade entre produtos.
Status: P0 ativo.

## 1) Objetivo

Garantir a mesma identidade de implementacao em todos os projetos:

- experiencia premium e consistente
- codigo previsivel e reutilizavel
- fluxo de entrega com validacao tecnica e operacional

## 2) Regras de stack (autodeteccao obrigatoria)

Antes de codar UI:

1. detectar framework (Next.js/React/Vite)
2. detectar estilo (Tailwind/CSS Modules/etc.)
3. detectar UI/animacao (Framer Motion, Lucide, etc.)
4. implementar usando o stack ja existente (sem trocar base do projeto)

## 3) Design System base (estilo Sigma)

Direcao visual:

- shell light
- hero com accent escuro por pagina
- cards e tabelas claras
- CTA primario em teal

Tokens semanticos recomendados:

- fundo app: #f3f9fb
- painel: #ffffff
- texto forte: #0f1f2b
- borda: #d2e2e7
- brand primario: #0b7f86

Status colors padrao:

- sucesso: green-50/700
- alerta: amber-50/700
- erro: red-50/700
- info: blue-50/700
- neutro: slate-50/600

## 4) Padrões obrigatorios de pagina

Estrutura:

1. Hero section (titulo, subtitulo, contexto, acoes)
2. KPI strip (cards objetivos)
3. Conteudo principal (tabs, tabela, formulos, empty state)

Componentes:

- botao primario consistente
- badge de status padronizado
- tabela com thead clara e hover leve
- modal padrao (overlay + foco + acoes)

## 5) UX e conversao (impeccable)

Obrigatorio em telas novas/refatoradas:

- hierarquia visual clara
- feedback imediato de estado (loading/success/error)
- validacao de formulario em tempo real
- CTA principal visivel no fim natural de leitura
- empty states com CTA explicito
- microcopy curta e sem ambiguidade

## 6) Estabilidade de navegacao

Aplicar guardrails:

- aguardar hidratacao/auth antes de redirect
- aguardar resolucao de plano/features antes de bloquear rota
- role gating + feature gating no frontend e backend
- fallback de rota seguro por papel

## 7) Acessibilidade minima (sempre)

- semantica HTML correta
- aria-\* em componentes interativos
- foco visivel keyboard-first
- contraste adequado para dados criticos
- navegacao por teclado funcional

## 8) Contratos e modularidade

- fonte unica para navegacao (mapa central de rotas)
- cliente HTTP unico (evitar fetch disperso)
- schemas claros de request/response
- status de assinatura e gating derivados de fonte unica

## 9) Definicao de pronto (DoD)

Uma entrega so fecha quando:

1. funcionalidade implementada
2. type-check/lint sem erro no escopo
3. tratamento de loading e erro adicionado
4. docs operacionais sincronizados no mesmo ciclo
5. sem regressao de navegacao/role/feature gate

## 10) Governance operacional

A cada mudanca de fluxo visivel:

- atualizar docs do fluxo
- registrar checkpoint de continuidade
- manter trilha curta: o que mudou, impacto, como validar

## 11) Antipadroes proibidos

- tema inconsistente entre paginas irmas
- redirect prematuro durante hidratacao
- duplicacao de regra de rota sem fonte unica
- acao critica sem feedback visual
- liberar recurso premium sem validar assinatura

## 12) Modo de execucao recomendado

Sequencia padrao:

1. mapear contexto atual do modulo
2. aplicar design system + regras de acessibilidade
3. implementar com componentes reaproveitaveis
4. validar fluxo ponta a ponta
5. sincronizar documentacao

Fim.
