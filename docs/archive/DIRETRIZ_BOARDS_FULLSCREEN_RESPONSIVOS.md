# Diretriz de Sistema: Boards Full-Screen Responsivos

## Objetivo

Esta diretriz define o padrão para qualquer tela de board em modo full-screen, como:

- Kanban de pátio
- Painel de recepção
- Kanban técnico
- Painel operacional de TV
- Quadros de atendimento, produção ou triagem

O foco é evitar três problemas clássicos:

1. usuário ficar preso dentro da tela sem saída clara
2. colunas não caberem em tablet ou smartphone
3. interface quebrar ou virar um arrasto lateral confuso em telas menores

Essa diretriz deve ser aplicada como padrão de sistema, não como ajuste isolado de uma página.

---

## Princípios obrigatórios

### 1. Toda tela full-screen precisa ter rota de saída visível

Nunca assumir que o usuário vai usar o navegador para voltar.

Toda tela de board full-screen deve ter no header:

- botão claro de voltar
- destino explícito para dashboard ou painel anterior
- comportamento consistente em desktop, tablet e celular

### 2. O sistema deve detectar o tamanho da tela automaticamente

Não usar largura fixa única para colunas.

O board deve calcular largura das colunas conforme viewport:

- mobile: coluna quase cheia, com respiro lateral
- tablet: coluna média, mantendo leitura e navegação confortável
- desktop: largura padrão estável
- modo TV: largura maior, pensada para leitura à distância

### 3. Scroll horizontal deve ser assistido

Em telas menores, depender apenas de arrasto lateral costuma gerar confusão.

Sempre que o board ultrapassar a largura visível, oferecer:

- scroll horizontal suave
- snap entre colunas quando fizer sentido
- botões de navegar entre colunas em viewport compacta

### 4. Header deve ser flexível

O header de boards full-screen não pode quebrar a usabilidade em telas menores.

Ele deve:

- aceitar quebra de linha no mobile
- agrupar ações secundárias do lado direito
- manter hierarquia clara entre título, contexto e ações

### 5. O usuário precisa entender que a tela se adaptou

Responsividade não é só “caber”.

Ela precisa preservar entendimento operacional:

- títulos legíveis
- contadores visíveis
- ações clicáveis com toque confortável
- colunas com leitura previsível

---

## Estrutura padrão recomendada

### Header mínimo

Toda tela de board full-screen deve conter:

- botão de voltar
- ícone ou identificador visual do módulo
- título da tela
- contexto resumido: empresa, quantidade de itens, última atualização
- ações rápidas: atualizar, modo TV, navegação lateral assistida quando necessário

### Corpo do board

O container principal deve:

- ocupar a altura inteira disponível
- permitir scroll horizontal apenas no board
- evitar scroll horizontal no documento inteiro
- usar `min-w-max` somente no trilho interno, nunca na página inteira

### Colunas

Cada coluna deve:

- ter largura dinâmica por viewport
- manter `shrink-0`
- usar `snap-start` quando houver scroll assistido
- preservar altura mínima para não colapsar visualmente

---

## Regra de dimensionamento recomendada

Use uma função central para calcular a largura da coluna.

Exemplo conceitual:

- `modo TV`: 288px
- `desktop`: 256px
- `tablet`: entre 260px e 320px, proporcional à viewport
- `mobile`: largura quase cheia, descontando respiro lateral

Exemplo de estratégia:

```ts
function getColumnWidth(viewportWidth: number, tvMode: boolean) {
  if (tvMode) return 288;
  if (viewportWidth < 640) return Math.max(250, viewportWidth - 48);
  if (viewportWidth < 1024) return Math.max(260, Math.min(320, viewportWidth * 0.46));
  return 256;
}
```

---

## Hook compartilhado recomendado

Para evitar duplicação, concentrar essa lógica em um hook reutilizável.

Exemplo de responsabilidades do hook:

- observar `window.innerWidth`
- informar se a tela está compacta
- devolver largura ideal das colunas
- expor `ref` do trilho horizontal
- fornecer função para avançar ou voltar colunas com scroll suave

Interface sugerida:

```ts
const {
  isCompactViewport,
  boardScrollRef,
  getColumnWidth,
  scrollColumns,
} = useBoardViewport();
```

---

## Botões de navegação lateral

Quando `isCompactViewport` for verdadeiro e a tela não estiver em modo TV, exibir botões como:

- `Colunas ←`
- `Colunas →`

Esses botões devem:

- rolar aproximadamente uma coluna por vez
- usar `behavior: smooth`
- funcionar sem depender de trackpad ou gesto lateral

Exemplo:

```ts
scrollBy({ left: offset, behavior: 'smooth' })
```

---

## Botão de voltar

Toda tela deve ter um botão de retorno explícito.

Mapeamento recomendado:

- Kanban de pátio → dashboard principal
- Painel de recepção → dashboard principal
- Kanban retífica → dashboard da retífica
- qualquer board especializado → painel pai do módulo

Nunca esconder esse botão no mobile.

---

## Regras de UX para tablet e smartphone

### Toque

Elementos interativos devem respeitar alvo mínimo confortável:

- 44px de altura mínima para ações importantes

### Leitura

Evitar:

- blocos com texto excessivamente pequeno
- títulos comprimidos por largura fixa
- excesso de informação por card em telas pequenas

### Scroll

Separar scroll vertical do board e scroll horizontal do trilho de colunas.

Evitar:

- página inteira com overflow horizontal
- board empurrando o layout global

### Hierarquia

Em tela menor, priorizar:

- ação de voltar
- título do módulo
- atualização manual
- navegação lateral assistida
- modo TV como ação secundária

---

## Checklist de implementação

Antes de considerar a tela pronta, validar:

- existe botão de voltar visível
- a tela cabe sem quebrar em smartphone
- a tela cabe sem quebrar em tablet
- as colunas redimensionam automaticamente
- existe forma clara de ir para a esquerda e para a direita
- o board não gera overflow horizontal no documento inteiro
- o modo TV continua funcionando
- o header não comprime nem esconde ações críticas
- build passa sem erro

---

## Quando isso deve ser aplicado

Aplicar esta diretriz em qualquer tela que tenha uma ou mais destas características:

- usa colunas horizontais
- entra em modo full-screen
- funciona como painel operacional
- é usada em TV, tablet ou monitor no chão de fábrica ou recepção
- depende de leitura rápida por equipe operacional

---

## O que não fazer

- não usar largura fixa única para todas as telas
- não esconder a saída do módulo
- não depender só de gesto lateral para navegação
- não deixar o board controlar o overflow do documento inteiro
- não tratar responsividade como detalhe visual; isso é requisito funcional

---

## Resumo executivo

O padrão correto para boards full-screen é:

- saída explícita
- responsividade automática por viewport
- navegação lateral assistida
- header flexível
- comportamento padronizado entre módulos

Se o projeto tiver mais de um board, a implementação deve ser centralizada em hook ou util compartilhado.

Esse padrão reduz atrito operacional, evita usuário preso na tela e torna o sistema confiável em desktop, tablet, smartphone e TV.