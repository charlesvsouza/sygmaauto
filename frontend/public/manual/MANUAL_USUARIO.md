# Manual do Usuário — SigmaAuto

**Versão:** 1.0 — Maio/2026  
**Acesso:** [sigmaauto.com.br](https://sigmaauto.com.br)  
**Suporte:** suporte@sigmaauto.com.br

---

## Sumário

1. [Primeiro Acesso](#1-primeiro-acesso)
2. [Painel Principal (Dashboard)](#2-painel-principal-dashboard)
3. [Clientes](#3-clientes)
4. [Veículos](#4-veículos)
5. [Ordens de Serviço](#5-ordens-de-serviço)
6. [Serviços](#6-serviços)
7. [Estoque](#7-estoque)
8. [Financeiro](#8-financeiro)
9. [Usuários](#9-usuários)
10. [Configurações e Assinatura](#10-configurações-e-assinatura)
11. [Perfis de Acesso (Roles)](#11-perfis-de-acesso-roles)
12. [Dúvidas Frequentes](#12-dúvidas-frequentes)

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

### 5.3 Adicionar serviços e peças

Dentro da OS aberta:
1. Clique em **"Adicionar Serviço"** para incluir mão de obra do catálogo
2. Clique em **"Adicionar Peça"** para incluir peças do estoque
3. Informe a quantidade e confirme

### 5.4 Registrar diagnóstico

1. Clique na aba **"Diagnóstico"** dentro da OS
2. Descreva o problema encontrado
3. Adicione fotos se necessário
4. Salve o diagnóstico

### 5.5 Aprovar orçamento

Após o diagnóstico, clique em **"Solicitar Aprovação"** para enviar o orçamento ao cliente. O cliente pode aprovar via link.

### 5.6 Finalizar e receber pagamento

Quando os serviços estiverem concluídos:
1. Mude o status para **"Pronto"**
2. Registre a forma de pagamento
3. Confirme o recebimento
4. Entregue o veículo e marque como **"Entregue"**

### 5.7 Imprimir OS

Use o botão **"Imprimir"** dentro da OS para gerar uma versão para impressão.

---

## 6. Serviços

O catálogo de serviços define os tipos de mão de obra que sua oficina realiza.

### 6.1 Cadastrar um serviço

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

## 7. Estoque

Controle de peças e materiais utilizados nas OS.

### 7.1 Cadastrar uma peça

1. Clique em **Estoque** no menu lateral
2. Clique em **"Nova Peça"**
3. Preencha:
   - **Nome**
   - **Código / referência**
   - **Quantidade em estoque**
   - **Preço de custo** e **preço de venda**
4. Clique em **Salvar**

### 7.2 Movimentações

Ao adicionar uma peça em uma OS, o estoque é debitado automaticamente. Você também pode registrar entradas manuais (compras, devoluções).

### 7.3 Alerta de estoque baixo

O sistema exibe alertas quando a quantidade de uma peça estiver abaixo do mínimo configurado.

---

## 8. Financeiro

Controle de receitas e despesas da oficina.

### 8.1 Lançamentos

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

### 8.2 Resumo mensal

O painel financeiro exibe o **total de receitas**, **total de despesas** e o **saldo do mês** com gráficos comparativos.

### 8.3 Exportar relatório

Use o botão **"Imprimir"** para gerar um relatório financeiro do período selecionado.

---

## 9. Usuários

> Disponível apenas para perfis **MASTER** e **ADMIN**.

### 9.1 Convidar um usuário

1. Clique em **Usuários** no menu lateral
2. Clique em **"Convidar Usuário"**
3. Informe o **e-mail** e selecione o **perfil de acesso**
4. Clique em **Enviar convite**

O usuário receberá um e-mail com um link para criar sua senha e acessar o sistema.

### 9.2 Editar ou desativar

Clique no usuário na lista para editar suas informações ou desativá-lo.

---

## 10. Configurações e Assinatura

### 10.1 Dados da oficina

1. Clique em **Configurações** no menu lateral
2. Na aba **Empresa**, preencha:
   - Razão social / Nome fantasia
   - CNPJ / CPF
   - Endereço completo
   - Telefone e e-mail
3. Clique em **Salvar**

### 10.2 Configurações operacionais

- **Valor da hora de mão de obra** — usado como base para cálculo de OS
- **Horas de diagnóstico** — tempo médio cobrado por diagnóstico

### 10.3 Assinatura e plano

Na aba **Assinatura** você visualiza seu plano atual e pode fazer **upgrade** para um plano superior:

| Ação | Disponibilidade |
|---|---|
| **Upgrade** (plano superior) | Disponível imediatamente |
| **Downgrade** (plano inferior) | Disponível apenas após o vencimento do plano atual |

Para fazer upgrade, clique no plano desejado e você será redirecionado para o checkout online (Mercado Pago).

---

## 11. Perfis de Acesso (Roles)

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

## 12. Dúvidas Frequentes

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

---

## Contato e Suporte

| Canal | Contato |
|---|---|
| E-mail suporte | suporte@sigmaauto.com.br |
| E-mail comercial | contato@sigmaauto.com.br |
| Site | sigmaauto.com.br |

---

*SigmaAuto © 2026 — Todos os direitos reservados*
