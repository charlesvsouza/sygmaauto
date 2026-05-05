# Manual do Usuário — SigmaAuto

**Versão:** 2.0 — Maio/2026  
**Acesso:** [sigmaauto.com.br](https://sigmaauto.com.br)  
**Suporte:** suporte@sigmaauto.com.br

---

## Sumário

1. [Primeiro Acesso](#1-primeiro-acesso)
2. [Painel Principal (Dashboard)](#2-painel-principal-dashboard)
3. [Clientes](#3-clientes)
4. [Veículos](#4-veículos)
5. [Ordens de Serviço](#5-ordens-de-serviço)
6. [Kanban de Pátio](#6-kanban-de-pátio)
7. [Painel de Recepção (Modo TV)](#7-painel-de-recepção-modo-tv)
8. [Checklist de Entrada e Saída](#8-checklist-de-entrada-e-saída)
9. [WhatsApp Automático](#9-whatsapp-automático)
10. [Serviços](#10-serviços)
11. [Estoque](#11-estoque)
12. [Financeiro](#12-financeiro)
13. [Relatórios Gerenciais](#13-relatórios-gerenciais)
14. [Usuários](#14-usuários)
15. [Configurações e Assinatura](#15-configurações-e-assinatura)
16. [Perfis de Acesso (Roles)](#16-perfis-de-acesso-roles)
17. [Dúvidas Frequentes](#17-dúvidas-frequentes)
18. [Comissões de Mecânicos](#18-comissões-de-mecânicos)
19. [Manutenção Preventiva Automática](#19-manutenção-preventiva-automática)
20. [NPS — Pesquisa de Satisfação](#20-nps--pesquisa-de-satisfação)
21. [Módulo Retífica de Motores — Guia Completo](#21-módulo-retífica-de-motores--guia-completo)

---

## 1. Primeiro Acesso

### 1.1 Acessando o sistema

1. Abra o navegador e acesse **sigmaauto.com.br**
2. Clique em **"Acessar sistema"** no menu ou **"Entrar no sistema"** na página inicial
3. Uma tela de carregamento será exibida brevemente
4. Você será redirecionado para a tela de **Login**

### 1.2 Login

1. Informe seu **e-mail** e **senha**
2. Clique em **Entrar**
3. Caso tenha esquecido a senha, clique em **"Esqueci minha senha"**

### 1.3 Tela de Boas-vindas

Após o primeiro login, você verá a **tela de boas-vindas** com um resumo das principais funcionalidades. Clique em **"Entrar"** ou aguarde o redirecionamento automático para o painel.

---

## 2. Painel Principal (Dashboard)

O Dashboard é a tela inicial após o login. Ele exibe:

| Indicador | Descrição |
|---|---|
| **Faturamento** | Total recebido no mês atual (OS concluídas e pagas) |
| **OS em Aberto** | Ordens de serviço ainda não finalizadas |
| **Gráfico de Faturamento** | Receita dos últimos 6 meses |

> Dica: o painel atualiza automaticamente a cada acesso. Para ver dados mais recentes, recarregue a página.

---

## 3. Clientes

### 3.1 Cadastrar um cliente

1. Clique em **Clientes** no menu lateral
2. Clique no botão **"Novo Cliente"**
3. Preencha os dados:
   - **Nome completo** (obrigatório)
   - **CPF/CNPJ**
   - **Telefone**
   - **E-mail**
   - **Endereço**
4. Clique em **Salvar**

### 3.2 Pesquisar clientes

Use a **barra de busca** no topo da listagem para pesquisar por nome, CPF ou telefone.

### 3.3 Editar ou excluir

Clique no cliente na lista para ver seus detalhes. Use os botões de **editar (lápis)** ou **excluir (lixeira)** conforme necessário.

---

## 4. Veículos

Os veículos são sempre vinculados a um cliente.

### 4.1 Cadastrar um veículo

1. Clique em **Veículos** no menu lateral
2. Clique em **"Novo Veículo"**
3. Preencha:
   - **Placa** (obrigatório)
   - **Marca / Modelo / Ano**
   - **Cor**
   - **KM atual**
   - **Cliente proprietário** (selecione da lista)
4. Clique em **Salvar**

### 4.2 Histórico de OS por veículo

Ao abrir um veículo, você visualiza todas as Ordens de Serviço já realizadas nele.

---

## 5. Ordens de Serviço

A OS é o coração do sistema. Ela registra todo o trabalho realizado em um veículo.

### 5.1 Criar uma OS

1. Clique em **Ordens de Serviço** → **"Nova OS"**
2. Selecione o **cliente** e o **veículo**
3. Informe o **motivo da entrada** (reclamação do cliente)
4. Clique em **Criar OS**

### 5.2 Status da OS

| Status | Descrição |
|---|---|
| **ABERTA** | OS criada, aguardando diagnóstico |
| **EM DIAGNÓSTICO** | Técnico avaliando o veículo |
| **AGUARDANDO APROVAÇÃO** | Orçamento enviado ao cliente |
| **APROVADA** | Cliente aprovou o orçamento |
| **EM EXECUÇÃO** | Serviços sendo realizados |
| **AGUARDANDO PEÇAS** | Serviço pausado por falta de peça |
| **PRONTO** | Serviços concluídos, aguardando pagamento |
| **ENTREGUE** | Veículo entregue ao cliente |
| **CANCELADA** | OS cancelada |

**Onde alterar o status:**
- Dentro da O.S., no quadro **Dados do Veículo** (badge de status no topo do card).
- O badge abre a lista de transições permitidas conforme perfil de acesso.

### 5.3 Adicionar serviços e peças

Dentro da OS aberta:
1. Clique em **"Adicionar Serviço"** para incluir mão de obra do catálogo
2. Clique em **"Adicionar Peça"** para incluir peças do estoque
3. Informe a quantidade e confirme

### 5.3A IA Assistiva no Orçamento *(novo — plano PRO e REDE)*

A IA Assistiva sugere serviços e peças automaticamente com base no **sintoma relatado** pelo cliente, cruzando com o catálogo da sua oficina.

**Como usar:**

1. Dentro de uma OS, clique em **"Adicionar Serviço"** ou **"Lançar Peça"** para abrir o catálogo
2. No cabeçalho do painel, clique no botão **✦ IA** (roxo)
3. Descreva o problema no campo que aparece:
   - Ex: *"motor falhando ao acelerar, barulho na suspensão dianteira"*
   - Ex: *"freios rangendo, pedal mole"*
   - Ex: *"luz do motor acesa, consumo alto"*
4. Clique em **"Sugerir"** ou pressione **Enter**
5. O sistema retorna até 5 sugestões com nome, motivo e preço estimado
6. Clique em **"+ Lançar"** para adicionar cada item diretamente na OS

> Dica: as sugestões consideram o veículo da OS e os itens já lançados. Use como ponto de partida — revise antes de confirmar com o cliente.

### 5.4 Reservar peças e gerar Pedido de Compra

Quando a OS estiver com status **APROVADA** ou **AGUARDANDO PEÇAS** e tiver peças lançadas, o botão **"Verificar / Reservar Peças"** fica disponível.

**Fluxo de reserva:**
1. Clique em **"Verificar / Reservar Peças"** (ícone de carrinho, cor âmbar)
2. O sistema exibe um modal com cada peça e sua disponibilidade em estoque:
   - **Verde ✓** — peça disponível, será reservada imediatamente
   - **Vermelho ⚠** — peça faltante, irá gerar pedido de compra
3. Informe opcionalmente a **data prevista de chegada** das peças faltantes
4. Clique em **"Confirmar Reserva"**

**O que acontece após a confirmação:**
- Peças disponíveis: debitadas do estoque imediatamente
- Peças faltantes: gerado **Pedido de Compra** em PDF
- Se houver peças faltantes, a OS passa automaticamente para **AGUARDANDO PEÇAS**

**Pedido de Compra (PDF):**

O PDF é gerado no mesmo padrão visual da O.S. e contém:
- Dados completos da oficina (nome, CNPJ, endereço, telefone, e-mail)
- Número sequencial automático no formato `PC-AAAAMMDD-XXXX`
- Tabela com: Cód. Interno · Cód. Original (SKU) · Peça/Descrição · Qtd · Unitário · Total · Fornecedor · Nº OS
- Rodapé com assinatura

Use o botão **"Imprimir"** no modal para enviar ao fornecedor.

**Cancelar reserva:**

Perfis MASTER, ADMIN e GERENTE podem cancelar a reserva de uma OS. Ao cancelar:
- Todas as peças reservadas são devolvidas ao estoque
- A OS retorna ao status **APROVADA**

### 5.5 Registrar diagnóstico

1. Clique na aba **"Diagnóstico"** dentro da OS
2. Descreva o problema encontrado
3. Adicione fotos se necessário
4. Salve o diagnóstico

### 5.6 Aprovar orçamento

Após o diagnóstico, clique em **"Solicitar Aprovação"** para enviar o orçamento ao cliente. O cliente pode aprovar via link.

### 5.7 Finalizar e receber pagamento

Quando os serviços estiverem concluídos:
1. Mude o status para **"Pronto"**
2. Registre a forma de pagamento
3. Confirme o recebimento
4. Entregue o veículo e marque como **"Entregue"**

### 5.8 Imprimir OS

Use o botão **"Imprimir"** dentro da OS para gerar uma versão para impressão.

### 5.9 Ações de edição da O.S.

- **Fechar**: retorna para a listagem sem salvar alterações pendentes.
- **Salvar alterações**: grava os dados da O.S. sem sair da tela.
- **Atualizar O.S.**: permanece disponível no quadro de totais/resumo para recalcular valores.

---

## 6. Kanban de Pátio

> Disponível no plano **PRO** e **REDE**.

O Kanban de Pátio é um painel visual que exibe todas as OS em andamento organizadas por status, ideal para ser projetado em uma TV da recepção ou do piso da oficina.

### 6.1 Acessar o Kanban

1. Clique em **Kanban** no menu lateral
2. O board exibe colunas para cada status: **Aberta**, **Em Diagnóstico**, **Aguardando Aprovação**, **Em Execução**, **Pronto**, entre outros
3. Cada cartão mostra: número da OS, veículo, cliente e tempo decorrido

### 6.2 Modo TV (Fullscreen)

1. Clique no botão **"Modo TV"** no canto superior direito
2. O painel entra em tela cheia, ideal para monitores de piso de oficina
3. Pressione **Esc** para sair do modo TV

> Dica: atualize automaticamente mantendo a aba aberta. O Kanban reflete o estado atual das OS em tempo real.

### 6.3 Alertas visuais automáticos (SLA por etapa)

O sistema monitora o tempo de permanência de cada OS no status atual e exibe alertas coloridos diretamente nos cartões:

| Situação | Visual | Critério |
|---|---|---|
| Diagnóstico em atenção | Borda **âmbar** + badge de alerta | EM DIAGNÓSTICO há mais de **24h** |
| Diagnóstico atrasado | Card **vermelho pulsante** | EM DIAGNÓSTICO há mais de **48h** |
| Execução em atenção | Borda **âmbar** + badge de alerta | EM EXECUÇÃO há mais de **48h** |
| Execução atrasada | Card **vermelho pulsante** | EM EXECUÇÃO há mais de **72h** |
| Peças aguardando (sem previsão) | Borda **âmbar** + badge de alerta | AGUARDANDO PEÇAS há mais de **48h** sem data prevista |
| Chegada de peças atrasada | Card **vermelho pulsante** | AGUARDANDO PEÇAS com data prevista vencida |

Um badge descritivo aparece no topo do cartão com o motivo e o tempo decorrido (ex: *"Diagnóstico atrasado (52h)"*).

Na faixa superior do painel, o contador **"X alertas ativos"** (em vermelho pulsante) mostra o total de OS que requerem atenção imediata.

---

## 7. Painel de Recepção (Modo TV)

> Disponível no plano **PRO** e **REDE**.

O Painel de Recepção é uma visão dedicada para **monitores de recepção e TV de piso de oficina**. Diferente do Kanban de gestão, este painel mostra apenas as OS ativas em um layout compacto e escuro, otimizado para leitura à distância.

### 7.1 Acessar o Painel de Recepção

1. Clique em **Painel de Recepção** no menu lateral (ícone de monitor)
2. O painel exibe os cards de OS agrupados com contadores por fase

### 7.2 Filtros por fase

Use a barra de filtros no topo para focar em um grupo de status:

| Grupo | Status incluídos |
|---|---|
| **Recebendo** | Aberta, Em Diagnóstico |
| **Orçamento** | Aguardando Aprovação |
| **Em Serviço** | Aprovada, Em Execução |
| **Peças** | Aguardando Peças |
| **Prontos** | Pronto para Entrega |

Clique em um grupo para filtrar; clique novamente para voltar a **Todos**.

### 7.3 Modo TV (Fullscreen)

1. Clique no botão **"Modo TV"** no canto superior direito
2. O painel ocupa toda a tela com fonte maior, ideal para TV
3. Clique em **"Sair do modo TV"** para voltar à visualização normal

### 7.4 Alertas no Painel de Recepção

Os mesmos alertas visuais do Kanban de Pátio (bordas pulsantes e badges) também aparecem neste painel, com a mesma lógica de tempo por status. O contador de alertas ativos fica visível na faixa de filtros.

> O painel atualiza automaticamente a cada **60 segundos**. Deixe-o aberto permanentemente em um monitor dedicado.

---

## 8. Checklist de Entrada e Saída

> Disponível no plano **PRO** e **REDE**.

O Checklist registra o estado do veículo no momento da entrada e da saída, com fotos, protegendo juridicamente a oficina.

### 8.1 Preencher o checklist de entrada

1. Dentro de uma OS, clique na aba **"Checklist"**
2. Para cada uma das **15 áreas** do veículo (para-choque, lataria, vidros, pneus etc.), selecione a condição:
   - Bom • Regular • Ruim • Danificado • N/A
3. Adicione **fotos** clicando na câmera de cada item (comprimidas automaticamente)
4. Informe o **nível de combustível** (0 a 8 traços)
5. Clique em **Salvar Checklist**

### 8.2 Checklist de saída

Repita o processo antes de entregar o veículo ao cliente. O sistema mantém o histórico de entrada e saída separados para comparação.

> Dica legal: o checklist com fotos serve como evidência em caso de disputas sobre danos pré-existentes.

---

## 9. WhatsApp Automático

> Disponível no plano **PRO** e **REDE**.

O sistema envia mensagens WhatsApp automaticamente ao cliente em cada etapa importante da OS.

### 9.1 Mensagens enviadas automaticamente

| Evento | Mensagem enviada |
|---|---|
| Orçamento pronto | Link de aprovação enviado ao cliente |
| OS aprovada | Confirmação de início dos trabalhos |
| Pronto para entrega | Notificação com valor total |
| Veículo entregue | Mensagem de agradecimento pós-serviço |
| OS cancelada | Comunicado de cancelamento |

As mensagens são enviadas para o **telefone cadastrado no cliente**. Certifique-se de que o número está correto e no formato com DDD.

### 9.2 Configurar a conexão WhatsApp

1. Clique em **WhatsApp** no menu lateral (visível para MASTER e ADMIN)
2. Clique em **"Conectar WhatsApp"** para gerar o QR Code
3. No celular, abra o WhatsApp → **Dispositivos conectados** → **Conectar dispositivo**
4. Aponte a câmera para o QR Code exibido na tela
5. Aguarde a confirmação de status **"Conectado"**

### 9.3 Verificar o status da conexão

A tela de WhatsApp exibe em tempo real se a conexão está **Ativa** ou **Desconectada**. Se desconectada, gere um novo QR Code.

> Importante: o WhatsApp conectado deve permanecer no celular como um dispositivo vinculado. Não desconecte manualmente pelo celular.

---

## 10. Serviços

O catálogo de serviços define os tipos de mão de obra que sua oficina realiza.

### 10.1 Cadastrar um serviço

1. Clique em **Serviços** no menu lateral
2. Clique em **"Novo Serviço"**
3. Preencha:
   - **Nome do serviço**
   - **Preço de venda**
   - **Tempo médio de operação (TMO)** — em horas
   - **Categoria**
4. Clique em **Salvar**

> Os serviços cadastrados aqui ficam disponíveis para inclusão em qualquer OS.

---

## 11. Estoque

Controle de peças e materiais utilizados nas OS.

### 11.1 Cadastrar uma peça

1. Clique em **Estoque** no menu lateral
2. Clique em **"Nova Peça"**
3. Preencha:
   - **Nome**
   - **Código / referência**
   - **Quantidade em estoque**
   - **Preço de custo** e **preço de venda**
4. Clique em **Salvar**

### 11.2 Movimentações

Ao adicionar uma peça em uma OS, o estoque é debitado automaticamente. Você também pode registrar entradas manuais (compras, devoluções).

### 11.3 Alerta de estoque baixo

O sistema exibe alertas quando a quantidade de uma peça estiver abaixo do mínimo configurado.

---

## 12. Financeiro

Controle de receitas e despesas da oficina.

### 12.1 Lançamentos

1. Clique em **Financeiro** no menu lateral
2. Clique em **"Novo Lançamento"**
3. Selecione o tipo: **Receita** ou **Despesa**
4. Informe:
   - **Descrição**
   - **Valor**
   - **Data**
   - **Categoria**
5. Clique em **Salvar**

> Pagamentos registrados em OS são lançados automaticamente como receita.

### 12.2 Resumo mensal

O painel financeiro exibe o **total de receitas**, **total de despesas** e o **saldo do mês** com gráficos comparativos.

### 12.3 Exportar relatório

Use o botão **"Imprimir"** para gerar um relatório financeiro do período selecionado.

---

---

## 13. Relatórios Gerenciais

> Disponível no plano **PRO** e **REDE**.

O módulo de Relatórios Gerenciais oferece **6 tipos de análise** com pré-visualização em PDF (modal A4) e impressão direta via navegador. Todos os relatórios incluem cabeçalho com dados da oficina e rodapé com assinatura.

### 13.1 Acessar os relatórios

1. Clique em **Relatórios** no menu lateral
2. Selecione o tipo de relatório desejado
3. Informe o período ou filtros solicitados
4. Clique em **"Gerar Relatório"**
5. Revise na pré-visualização e clique em **"Imprimir"** para enviar à impressora ou salvar como PDF

### 13.2 Tipos de relatório disponíveis

#### Relatório de OS por Período
Visão geral das Ordens de Serviço em um intervalo de datas. Inclui:
- KPIs: total de OS, faturamento, ticket médio, OS concluídas vs. canceladas
- Lista completa de OS do período com status e valores
- Top clientes por faturamento
- Breakdown por status

#### DRE — Mensal
Demonstração de Resultado do Exercício de um mês específico. Inclui:
- Receita bruta, CMV (custo das mercadorias vendidas), margem bruta
- EBITDA e resultado líquido
- Histórico comparativo dos últimos 6 meses
- Detalhamento de despesas por categoria

#### DRE — Anual
Consolidação de todos os 12 meses de um ano. Inclui:
- Tabela de evolução mensal: receita, despesa, EBITDA e resultado mês a mês
- KPIs totalizados do ano: receita bruta, receita líquida, margem bruta, EBITDA
- Despesas por categoria acumuladas no ano

#### Indicadores KPI
Painel gerencial com múltiplos horizontes temporais em um único relatório. Inclui comparativo entre:
- **Mês atual** — resultado do mês em curso
- **Trimestre** — últimos 3 meses
- **Semestre** — últimos 6 meses
- **Semestre anterior** — 6 meses anteriores ao semestre atual (análise histórica)
- **Anual** — ano corrente completo

Para cada período, exibe: Receita Bruta, Receita Líquida, Margem Bruta (%), EBITDA (%), OS Entregues e Ticket Médio.

> **BI:** Os mesmos KPIs financeiros estão disponíveis em tempo real na tela de Indicadores para consulta rápida sem necessidade de gerar relatório.

#### Relatório de Comissões por Período
Análise das comissões da equipe técnica. Inclui:
- Ranking de colaboradores por valor de comissão
- Totais pendentes e pagos por colaborador
- Filtro por período e área de atuação

#### Projeção de Pedido de Compra
Análise de giro e necessidade de reposição do estoque. Inclui:
- Giro de estoque dos últimos 90 dias por item
- Classificação de urgência: **CRÍTICO** / **URGENTE** / **ATENÇÃO**
- Quantidade sugerida de compra e custo estimado total

---

## 13A. DRE — Página Dedicada

Além do módulo de Relatórios, o sistema possui uma página exclusiva do DRE acessível pelo menu lateral.

### Recursos da página DRE

- **Seletor de mês e ano** via dropdowns — navegue diretamente para qualquer mês/ano sem clicar repetidamente
- **Botão ‹ ›** para navegar mês a mês rapidamente
- **Impressão direta**: botão "Imprimir" gera o DRE completo em formato A4 incluindo KPIs, tabela estrutural, despesas por categoria e histórico dos últimos 6 meses
- **Gráfico de barras** com comparativo dos últimos 6 meses (receita vs. despesa)

---

## 13B. KPI's — Gestão à Vista

Nova página gerencial acessível no menu lateral, logo abaixo de **DRE**, com foco em leitura rápida para gestores de concessionárias e autocenters.

### O que a página KPI's mostra

- **Tema 1: Financeiro**
   - Estrutura do resultado no período selecionado (Receita Líquida, CMV, Despesas e EBITDA)
- **Tema 2: Comparativo de períodos**
   - Comparação entre mês atual, trimestre, semestre, semestre anterior e anual
- **Tema 3: Operações de oficina**
   - Funil por etapa (Entrada, Orçamento, Execução, Pronto/Entrega)
   - Taxa de aprovação e volume de OS abertas/entregues
- **Tema 4: Estoque e suprimentos**
   - Itens abaixo do mínimo, valor total em estoque e itens com maior risco de ruptura
- **Tema 5: Pessoas e performance**
   - Totais de comissões (total, pago, pendente) e ranking de executores

### Indicadores avançados (Fase 1)

Além dos temas principais, a página KPI's já inclui os seguintes indicadores de gestão operacional:

- **ELR (Effective Labor Rate)**
   - Mostra o faturamento médio por hora vendida de serviços/mão de obra
   - Ajuda a avaliar precificação, descontos e captura de valor

- **Retrabalho 30 dias (Comeback Rate)**
   - Quantidade e percentual de veículos que retornaram em até 30 dias
   - Apoia o controle de qualidade da execução técnica

- **Conversão de Orçamento**
   - Percentual de orçamentos aprovados dentro do funil de aprovação
   - Indicador direto da performance comercial do atendimento

- **Aging de OS em aberto**
   - Distribuição em faixas: 0-24h, 24-48h, 48-72h, acima de 72h
   - Facilita identificar gargalos de prazo e priorização diária

- **SLA de Peças**
   - Percentual de OS aguardando peças dentro do prazo
   - Evidencia OS atrasadas e OS sem previsão de entrega

### Indicadores avançados (Fase 2)

- **First Time Fix Rate (estimado)**
   - Percentual de OS concluídas sem retorno em curto prazo
   - Usado para acompanhar qualidade da execução e diagnóstico

- **No-show de agendamento (proxy)**
   - Estimativa de faltas em agendamentos vencidos
   - Apoia ajustes de confirmação e remarcação

- **Distribuição da agenda por turno**
   - Volume de agendamentos por manhã, tarde e noite
   - Ajuda no balanceamento de equipe e capacidade operacional

- **Penetração de serviços adicionais**
   - Percentual de OS entregues com 2 ou mais serviços/labores
   - Indicador de performance comercial técnica (upsell de serviços)

> Observação: enquanto não existir status específico de falta no fluxo de OS, o no-show é exibido como proxy/estimativa.

### Como usar

1. Clique em **KPI's** no menu lateral
2. Escolha o período no topo (mês, trimestre, semestre, semestre anterior ou anual)
3. Leia os temas em sequência para identificar gargalos e oportunidades
4. Clique em **Atualizar** para recarregar dados em tempo real

> Dica: utilize o painel KPI's na reunião diária da oficina para decisões rápidas de produtividade, estoque e margem.

---

## 14. Usuários

> Disponível apenas para perfis **MASTER** e **ADMIN**.

### 14.1 Convidar um usuário

1. Clique em **Usuários** no menu lateral
2. Clique em **"Convidar Usuário"**
3. Informe o **e-mail** e selecione o **perfil de acesso**
4. Clique em **Enviar convite**

O usuário receberá um e-mail com um link para criar sua senha e acessar o sistema.

### 14.2 Editar ou desativar

Clique no usuário na lista para editar suas informações ou desativá-lo.

---

## 15. Configurações e Assinatura

### 15.1 Dados da oficina

1. Clique em **Configurações** no menu lateral
2. Na aba **Empresa**, preencha:
   - Razão social / Nome fantasia
   - CNPJ / CPF
   - Endereço completo
   - Telefone e e-mail
3. Clique em **Salvar**

### 15.2 Configurações operacionais

- **Valor da hora de mão de obra** — usado como base para cálculo de OS
- **Horas de diagnóstico** — tempo médio cobrado por diagnóstico

### 15.3 Assinatura e plano

Na aba **Assinatura** você visualiza seu plano atual e pode fazer **upgrade** para um plano superior:

| Ação | Disponibilidade |
|---|---|
| **Upgrade** (plano superior) | Disponível imediatamente |
| **Downgrade** (plano inferior) | Disponível apenas após o vencimento do plano atual |

Para fazer upgrade, clique no plano desejado e você será redirecionado para o checkout online (Mercado Pago).

---

## 16. Perfis de Acesso (Roles)

O sistema possui diferentes níveis de acesso para proteger informações sensíveis:

| Perfil | O que pode fazer |
|---|---|
| **MASTER** | Tudo. Único proprietário da conta. Gerencia assinatura e configurações. |
| **ADMIN** | Gestão operacional completa. Pode convidar usuários (exceto MASTER). |
| **GERENTE** | Gestão de OS, clientes e veículos. Sem acesso a configurações da empresa. |
| **SECRETARIA** | Cadastro de clientes, veículos e abertura de OS. |
| **MECANICO** | Execução de OS: diagnóstico, itens técnicos e fotos. Sem acesso a valores. |
| **FINANCEIRO** | Fechamento de OS, registro de pagamentos e relatórios financeiros. |

---

## 17. Dúvidas Frequentes

**Esqueci minha senha. O que faço?**  
Na tela de login, clique em "Esqueci minha senha", informe seu e-mail e siga as instruções enviadas.

**Posso acessar o sistema pelo celular?**  
Sim. O sistema é responsivo e funciona em qualquer navegador de celular ou tablet.

**Como faço para adicionar outro mecânico?**  
Acesse **Usuários → Convidar Usuário**, informe o e-mail e selecione o perfil "Mecânico".

**Por que não consigo criar mais OS este mês?**  
No plano START, o limite é de 50 OS por mês. Faça upgrade para o plano PRO para ordens ilimitadas.

**O pagamento do cliente foi registrado mas a OS ainda aparece como "Pronto". O que fazer?**  
Após registrar o pagamento, altere o status da OS para **"Entregue"** para concluir o ciclo.

**Como cancelo minha assinatura ou faço downgrade?**  
O downgrade fica disponível automaticamente após o vencimento do plano atual. Para cancelamento, entre em contato com **suporte@sigmaauto.com.br**.

**Meus dados estão seguros?**  
Sim. Todos os dados são armazenados em banco de dados isolado por empresa (multi-tenant), com conexões criptografadas e backups automáticos.

**O WhatsApp não está enviando mensagens. O que fazer?**  
Acesse **WhatsApp** no menu lateral e verifique se o status está como **"Conectado"**. Se aparecer desconectado, clique em **"Conectar WhatsApp"**, gere um novo QR Code e leia com o celular.

**O Kanban de Pátio não aparece no menu. Por quê?**  
O Kanban está disponível apenas nos planos **PRO** e **REDE**. Acesse **Configurações → Assinatura** para fazer upgrade.

**O Painel de Recepção é diferente do Kanban de Pátio?**  
Sim. O **Kanban de Pátio** é voltado para a equipe interna (arrastar cards, ver detalhes). O **Painel de Recepção** é otimizado para exibição em TV — layout escuro e compacto, auto-refresh de 60 segundos, filtros por fase e alertas visuais.

**Como funciona o alerta de peças atrasadas?**  
Ao reservar peças e informar uma data prevista de chegada, o sistema monitora automaticamente. Se a data for ultrapassada e a OS ainda estiver em AGUARDANDO PEÇAS, o card ficará com borda vermelha pulsante e o badge "Peças atrasadas Xh" tanto no Kanban quanto no Painel de Recepção.

**O Pedido de Compra reserva o estoque automaticamente?**  
Sim. As peças que já estão no estoque são reservadas (debitadas) no momento da confirmação. As peças faltantes geram o PDF do Pedido de Compra para envio ao fornecedor. Ao receber as peças, faça uma entrada manual no Estoque.

**Posso usar o Checklist sem tirar fotos?**  
Sim. As fotos são opcionais. Você pode preencher apenas as condições de cada área do veículo e salvar sem adicionar imagens.

---

## 18. Comissões de Mecânicos

> Disponível no plano **PRO** e **REDE**.

O módulo de Comissões calcula e controla automaticamente a remuneração variável de cada técnico com base nos serviços que executou.

### 18.1 Como as comissões são calculadas

Ao faturar uma OS (status FATURADO), o sistema gera automaticamente uma comissão para cada executor vinculado a um item de serviço, com base na sua taxa configurada.

| Função | Taxa padrão |
|---|---|
| Mecânico / Eletricista | 10% |
| Funileiro / Pintor / Preparador | 8% |
| Lavador / Embelezador | 6% |
| Aprendiz | 5% |

> As taxas podem ser personalizadas por colaborador em **Usuários → editar → Taxa de Comissão**.

### 18.2 Configurar executor em um item de serviço

1. Ao adicionar um serviço na OS, selecione o **executor responsável** no campo "Executor do Serviço"
2. O sistema vincula o item ao colaborador e calculará a comissão no faturamento

### 18.3 Visualizar comissões

1. Clique em **Comissões** no menu lateral
2. Filtre por **período** e/ou **área** (Mecânica, Elétrica, Funilaria, etc.)
3. Veja o ranking de colaboradores por valor, com totais **Pendente** e **Pago**

### 18.4 Marcar como pago

Clique no botão **"Marcar como pago"** ao lado de cada comissão para registrar o pagamento. O status muda de **PENDENTE** para **PAGO**.

---

## 19. Manutenção Preventiva Automática

> Disponível no plano **PRO** e **REDE**.

O sistema monitora automaticamente os veículos cadastrados e envia lembretes de revisão via **WhatsApp** quando a manutenção estiver vencida.

### 19.1 Como funciona

- Todo dia às **8h**, o sistema verifica veículos com:
  - **KM atual** acima do intervalo de revisão configurado, **ou**
  - **Data da última revisão** superior ao intervalo em meses configurado
- Para os veículos identificados, envia mensagem WhatsApp ao cliente com o lembrete

### 19.2 Configurar intervalo de revisão por veículo

1. Acesse **Veículos** e abra o cadastro do veículo
2. Preencha:
   - **KM atual**
   - **Intervalo de revisão (KM)** — ex: 10.000 km
   - **Intervalo de revisão (meses)** — ex: 6 meses
   - **Data da última revisão**
3. Salve

### 19.3 Consultar veículos com manutenção vencida

1. Clique em **Manutenção Preventiva** no menu lateral
2. O painel lista todos os veículos com manutenção vencida no momento, com o motivo (KM ou prazo)

> A funcionalidade depende do WhatsApp estar **conectado** e do telefone do cliente estar cadastrado.

---

## 20. NPS — Pesquisa de Satisfação

> Disponível no plano **PRO** e **REDE**.

O NPS (Net Promoter Score) mede a satisfação do cliente automaticamente após a entrega do veículo.

### 20.1 Como funciona

- Ao faturar ou entregar uma OS (status FATURADO/ENTREGUE), o sistema envia automaticamente um link de pesquisa via **WhatsApp** para o cliente
- O cliente acessa o link, dá uma nota de **0 a 10** e pode deixar um comentário
- As respostas são consolidadas no painel de NPS

### 20.2 Dashboard NPS

1. Clique em **NPS** no menu lateral
2. O painel exibe:
   - **Score NPS** calculado (% Promotores − % Detratores)
   - Distribuição por categoria: **Promotores** (9–10), **Neutros** (7–8), **Detratores** (0–6)
   - Lista de respostas com nota, comentário, cliente e data
   - Totais de pesquisas enviadas, respondidas e taxa de resposta

### 20.3 Enviar pesquisa manualmente

1. Dentro de uma OS, clique em **"Enviar NPS"** (disponível após faturamento)
2. O link de pesquisa é enviado imediatamente via WhatsApp

### 20.4 Interpretação do Score

| Score | Situação |
|---|---|
| **75 a 100** | Excelente — clientes muito satisfeitos |
| **50 a 74** | Bom — mas há espaço para melhorias |
| **0 a 49** | Atenção — investigar causas de insatisfação |
| **Abaixo de 0** | Crítico — ação imediata necessária |

---

## 21. Módulo Retífica de Motores — Guia Completo

> Disponível para oficinas e retificadoras com plano **PRO** ou **REDE**. Ative o tipo de OS "Retífica de Motor" na criação da ordem.

O módulo de Retífica possui um **fluxo de status próprio**, separado das OS convencionais. Ele cobre desde a desmontagem até o teste final, com metrologia em 2 etapas, diagnóstico automático e emissão de laudo técnico.

---

### 21.1 Fluxo de Status da Retífica

```
ABERTA → DESMONTAGEM → METROLOGIA → ORCAMENTO_RETIFICA
→ AGUARDANDO_APROVACAO_RETIFICA → EM_RETIFICA
→ MONTAGEM → TESTE_FINAL → PRONTO_ENTREGA → FATURADO → ENTREGUE
```

| Status | Descrição |
|---|---|
| **ABERTA** | Motor recebido, aguardando desmontagem |
| **DESMONTAGEM** | Peças sendo separadas e catalogadas |
| **METROLOGIA** | Medições técnicas sendo realizadas |
| **ORÇAMENTO RETÍFICA** | Orçamento montado após diagnóstico da metrologia |
| **AGUARDANDO APROVAÇÃO** | Cliente sendo consultado sobre o orçamento |
| **EM RETÍFICA** | Trabalho de retífica em execução |
| **MONTAGEM** | Motor sendo remontado com peças retificadas |
| **TESTE FINAL** | Motor testado antes da entrega |
| **PRONTO ENTREGA** | Motor aprovado, aguardando retirada |
| **FATURADO / ENTREGUE** | Ciclo concluído |

---

### 21.2 Criar uma OS de Retífica

1. Clique em **Ordens de Serviço → Nova OS**
2. No campo **Tipo de O.S.**, selecione **"Retífica de Motor"**
3. Preencha:
   - **Cliente**
   - **Marca do motor** (ex: Cummins, MWM, Perkins)
   - **Modelo** e **Número de série** (opcional)
   - **Reclamação** — descreva o problema relatado
4. Clique em **Criar OS**

> Diferente de uma OS convencional, a OS de retífica não requer um veículo cadastrado — pode ser um motor avulso trazido pelo cliente.

---

### 21.3 Kanban de Retífica

1. Clique em **Retífica** no menu lateral (ícone de engrenagem)
2. O Kanban exibe os motores organizados em colunas por status
3. Cada card mostra: número da OS, modelo do motor, tempo no status atual e alertas de SLA

**Painel de Ações Prioritárias:**

No topo do Kanban de Retífica, um painel destaca automaticamente os motores em situação crítica de SLA — motores com prazo vencido são listados em vermelho, com link direto para o card no Kanban.

**Deep-link de foco:**

Ao clicar em um motor crítico no painel de prioridades, o Kanban rola automaticamente e destaca o card correspondente com uma borda pulsante.

---

### 21.4 Metrologia em 2 Etapas

A metrologia é o coração técnico da retífica. Acesse-a de duas formas:

- Dentro da OS (em qualquer tela): clique no **label "Metrologia"** no andamento da OS
- No Kanban de Retífica: clique no botão **"Metrologia"** no card do motor

**Etapa 1 — Medições:**

Informe as medições técnicas do motor:
- **Diâmetro do cilindro** (medição atual vs. especificação)
- **Ovalização** e **conicidade**
- **Medição do virabrequim** (munhão e pino de manivela)
- **Folga lateral e axial**
- Campo de **observações técnicas** livres

Clique em **"Próximo → Diagnóstico"** para avançar.

**Etapa 2 — Diagnóstico Automático:**

Com base nas medições informadas, o sistema:
1. Identifica automaticamente quais componentes estão fora da especificação
2. Sugere serviços de retífica necessários (ex: alargamento de cilindro, retífica de virabrequim)
3. Sugere peças de reposição do catálogo (ex: jogo de anéis, bronzinas, pistões)
4. Exibe a lista de sugestões para revisão do técnico

Você pode **aceitar** ou **remover** cada sugestão antes de confirmar. Ao confirmar:
- Os serviços e peças sugeridos são adicionados automaticamente à OS
- A OS avança para o status **ORÇAMENTO_RETIFICA**

---

### 21.5 Laudo Técnico de Retífica

Ao confirmar a metrologia, o sistema abre automaticamente o **Laudo Técnico** para impressão.

**O laudo contém:**
- Dados da oficina (nome, CNPJ, endereço)
- Dados do motor (marca, modelo, série, OS)
- Tabela completa das medições realizadas vs. especificações
- Diagnóstico técnico em texto
- Serviços e peças indicados
- Campo de assinatura do técnico responsável
- Data e número da OS

**Imprimir o laudo:**

1. O laudo abre automaticamente em modal após confirmar a metrologia
2. Clique em **"Imprimir Laudo"** para enviar à impressora ou salvar como PDF
3. Para reimprimir a qualquer momento: dentro da OS, clique no botão **"Laudo"** (ícone de documento)

> O laudo serve como documento técnico formal entregue ao cliente junto com o motor.

---

### 21.6 Botão "Voltar Fase" (Admin/Master)

Perfis **MASTER** e **ADMIN** podem retroceder uma OS de Retífica para o status anterior caso seja necessário corrigir um passo.

1. Dentro da OS, clique no botão **"← Voltar fase"** (visível apenas para MASTER/ADMIN)
2. Confirme a operação
3. A OS retorna ao status anterior no fluxo

> Este botão não está disponível para OS já finalizadas (FATURADO/ENTREGUE/CANCELADO).

---

### 21.7 Dashboard de Retífica

O Dashboard de Retífica oferece uma visão gerencial dos motores em processo.

**Acesse via:** menu lateral → **Dashboard Retífica**

**O que exibe:**
- Total de motores em cada fase do fluxo
- **Painel de Ações Prioritárias** — motores críticos com SLA vencido ordenados por urgência
- Tempo médio por fase
- Taxa de conclusão no prazo

---

### 21.8 Perguntas frequentes sobre Retífica

**Posso usar a OS de Retífica para um motor sem veículo?**
Sim. Na criação, o campo "Veículo" é opcional. Informe a marca, modelo e número de série do motor diretamente.

**O diagnóstico automático é obrigatório?**
Não. Você pode ignorar as sugestões e lançar serviços/peças manualmente na OS normalmente.

**Posso reimprimir o laudo depois?**
Sim. A qualquer momento dentro da OS, clique no botão de laudo para reabrir e reimprimir.

**O fluxo de retífica aparece no Kanban convencional?**
Não. OS do tipo Retífica aparecem apenas no **Kanban de Retífica** (menu lateral → Retífica). O Kanban convencional exibe apenas OS de veículos.

---

## Contato e Suporte

| Canal | Contato |
|---|---|
| E-mail suporte | suporte@sigmaauto.com.br |
| E-mail comercial | contato@sigmaauto.com.br |
| Site | sigmaauto.com.br |

---

*SigmaAuto © 2026 — Todos os direitos reservados*
