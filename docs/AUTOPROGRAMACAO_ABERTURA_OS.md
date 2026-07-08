# AUTOPROGRAMAÇÃO - TELA DE ABERTURA DE O.S. (FORMATO IMPECÁVEL)

Data: 08/07/2026
Escopo: documentar o fluxo de correção e validação da tela de abertura de ordem de serviço (O.S.) e telas irmãs com defeitos de layout, acessibilidade ou formatação inconsistente.
Status: P0 ativo.

## 1) Objetivo

Criar uma instrução técnica clara para que o próximo agente corrija a tela de abertura de O.S. e encontre outras páginas onde o layout não esteja em formato adequado ao sistema.

- deixar a tela de abertura alinhada ao design do produto
- assegurar consistência de espaçamento, hierarquia e labels
- remover inline styles impróprios em componentes de impressão e visualização
- validar acessibilidade mínima em botões, formulários e modais

## 2) Detectar o contexto do projeto

Antes de codar, determine:

1. framework: React + Vite + TypeScript
2. estilo: Tailwind-like / classes utilitárias + `cn` helper
3. componentes: modais, botões icon-only, tabelas de ordens, print preview HTML
4. bibliotecas visíveis: `lucide-react`, `framer-motion`, `react-router-dom`

## 3) Problemas esperados na tela de abertura O.S.

Foco nesta entrega:

- layout de abertura da O.S. não está no formato adequado ao sistema
- componentes sem labels ou `aria-label` em botões de ícone
- inputs/selects sem rotulo semântico
- print preview usando estilos inline ou markup desorganizado
- campos de status e ações sem hierarquia visual clara

## 4) Regras de correção

Aplicar estas regras em todas as telas afetadas:

- usar classes CSS reutilizáveis em vez de estilos inline quando possível
- adicionar `aria-label` em botões somente-ícone e labels visíveis em formulários
- agrupar seções de O.S. em painéis claros: cliente, veículo, serviço, status, total
- manter espaçamentos consistentes entre seções e botões de ação
- definir ações secundárias e primárias com contraste e ordem lógica
- não alterar a stack do projeto ou introduzir UI framework novo

## 5) Padrões de qualidade

Verificar:

- `get_errors` sem erros TypeScript no arquivo alterado
- navegação clara, sem botões perdidos ou labels ambíguos
- impressão/preview com CSS bem definido e sem `style=` embarcado
- telas responsivas e legíveis em desktop e mobile
- componentes de modal com foco e fechamento acessível

## 6) Fluxo de verificação

1. localizar o componente da tela de O.S. no frontend: `frontend/src/pages/ServiceOrdersPage.tsx`
2. identificar seções de abertura, formulário de O.S. e visualização de impressão
3. revisar modais relacionados: `MetrologiaModal`, `LaudoRetificaModal`, `ImportOSModal`, `ChecklistModal`
4. aplicar correções de layout e acessibilidade onde necessário
5. executar `npm run build` ou validação de TypeScript apenas no escopo alterado
6. executar `git diff` para garantir só as correções esperadas

## 7) Itens de verificação para defeitos similares

Sempre buscar e corrigir também:

- páginas com modais de ações rápidas que usam botões sem texto visível
- telas com labels colocados apenas como `placeholder`
- componentes que renderizam `iframe` ou `print preview` com `style=` inline
- tabelas e cards de status que misturam classes de borda e cores sem padrão
- campos de formulário sem `id` + `label` ou `aria-describedby`

## 8) Critérios de pronto

A correção está pronta quando:

1. layout da abertura de O.S. está consistente com telas do sistema
2. sem erros TypeScript ou warnings relevantes no arquivo modificado
3. todos os botões icon-only têm nomes acessíveis
4. print preview usa estilos declarativos e exibe corretamente em tela/impressão
5. novo arquivo de documentação está presente e claro para o próximo agente

## 9) Entrega mínima

- `docs/AUTOPROGRAMACAO_ABERTURA_OS.md`
- `frontend/src/pages/ServiceOrdersPage.tsx` ajustado se necessário
- validação de `git status` limpo após commit

## 10) Observações

- priorizar correções de UX que afetam o fluxo de abertura e impressão de O.S.
- quando detectar layout similar em outra página, reportar e corrigir no mesmo ciclo
- manter o padrão visual já existente no projeto, sem reinventar componentes

Fim.
