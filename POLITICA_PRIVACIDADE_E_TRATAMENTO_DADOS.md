# Politica de Privacidade e Tratamento de Dados

Atualizado em: 07/05/2026
Status: documento interno/publicavel com revisao juridica recomendada antes de publicacao externa definitiva.

## 1. Objetivo

Este documento descreve, em nivel operacional, como o SigmaAuto trata dados pessoais no contexto de uso da plataforma.

## 2. Escopo

Aplica-se ao tratamento de dados no ambiente do sistema SigmaAuto, incluindo:

- cadastro e autenticacao de usuarios;
- cadastro e gestao de clientes e veiculos;
- ordens de servico, checklists, relatorios e comunicacoes operacionais;
- assinatura, cobranca e atendimento tecnico;
- comunicacoes por e-mail e WhatsApp quando configuradas no ambiente.

## 3. Categorias de dados tratados

### 3.1 Dados de identificacao

- nome;
- e-mail;
- CPF/CNPJ e outros identificadores cadastrais quando informados;
- dados da oficina/empresa contratante.

### 3.2 Dados de contato

- telefone;
- e-mail principal;
- e-mail de recuperacao.

### 3.3 Dados de autenticacao e seguranca

- hash de senha;
- token de recuperacao de senha;
- datas de ultimo login e de ultima alteracao de senha.

### 3.4 Dados operacionais

- clientes e veiculos;
- ordens de servico;
- historico de status;
- checklists e fotos anexadas;
- dados de agenda, manutencao, NPS e relatorios.

### 3.5 Dados financeiros e contratuais

- plano contratado;
- dados de assinatura;
- registros de transacoes financeiras;
- dados necessarios para cobranca e renovacao.

## 4. Finalidades do tratamento

Os dados sao tratados para as seguintes finalidades operacionais:

- autenticar usuarios e controlar acesso ao sistema;
- manter isolamento por tenant/oficina;
- cadastrar e gerir clientes, veiculos e ordens de servico;
- emitir comunicacoes operacionais por e-mail e WhatsApp quando configurado;
- registrar cobrancas, pagamentos, relatorios e indicadores;
- atender solicitacoes de suporte, seguranca e compliance;
- auditar operacoes sensiveis quando implementado no sistema.

## 5. Bases legais utilizadas

A definicao final de base legal depende do contexto de negocio e validacao juridica. Operacionalmente, o SigmaAuto utiliza este referencial:

- execucao de contrato: para prestacao do servico principal da plataforma;
- cumprimento de obrigacao legal ou regulatoria: quando houver exigencia fiscal, contabil ou regulatoria;
- exercicio regular de direitos: para trilhas de auditoria, investigacao e defesa de interesses legitimos;
- legitimo interesse: para seguranca da plataforma, prevencao a fraude e continuidade operacional;
- consentimento: somente quando houver tratamento opcional que exija base especifica e destacada.

## 6. Compartilhamento de dados

Podem existir compartilhamentos operacionais com:

- provedores de infraestrutura e banco de dados;
- provedores de e-mail transacional;
- provedores de mensageria WhatsApp configurados;
- provedores de pagamento e cobranca;
- ferramentas de deploy e observabilidade, quando aplicavel.

O compartilhamento deve ser limitado ao necessario para a operacao do servico.

## 7. Seguranca da informacao

Controles tecnicos atualmente implementados:

- autenticacao JWT com segregacao por tenant;
- controle de acesso por perfil;
- hash de senha com bcrypt;
- validacao de entrada no backend;
- trilha de auditoria parcial para eventos sensiveis;
- validacao de webhook da Meta com assinatura e idempotencia duravel.

Referencia tecnica detalhada:

- LGPD_COMPLIANCE_E_SEGURANCA.md

## 8. Direitos do titular

O SigmaAuto preve, em nivel operacional, atendimento a solicitacoes de:

- confirmacao de tratamento;
- acesso aos dados;
- correcao de dados;
- portabilidade tecnica quando suportada;
- eliminacao controlada, observadas dependencias historicas e obrigacoes de guarda.

## 9. Canal operacional do titular

Ate formalizacao juridica de encarregado/DPO, o canal operacional provisório de atendimento e:

- suporte@sigmaauto.com.br

Assunto recomendado:

- LGPD - Solicitacao do Titular

## 10. Retencao e descarte

As diretrizes de retencao e descarte estao descritas em:

- POLITICA_RETENCAO_E_DESCARTE_DADOS.md

## 11. Incidentes de seguranca

O fluxo operacional de resposta a incidentes esta descrito em:

- PLANO_RESPOSTA_INCIDENTES_DADOS.md

## 12. Revisao e versao

Este documento deve ser revisado sempre que houver:

- nova integracao que trate dados pessoais;
- mudanca relevante de fluxo de autenticacao, exportacao, eliminacao ou auditoria;
- exigencia juridica ou regulatoria superveniente.
