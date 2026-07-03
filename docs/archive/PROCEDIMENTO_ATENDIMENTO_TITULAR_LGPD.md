# Procedimento de Atendimento ao Titular (LGPD)

Atualizado em: 07/05/2026
Status: procedimento operacional baseado no fluxo tecnico atualmente implementado.

## 1. Objetivo

Padronizar o recebimento, registro, tratamento e resposta a solicitacoes do titular de dados.

## 2. Canal operacional atual

Canal provisório de atendimento:

- suporte@sigmaauto.com.br

Assunto recomendado:

- LGPD - Solicitacao do Titular

## 3. Tipos de solicitacao suportados tecnicamente

- ACCESS
- CORRECTION
- DELETION
- PORTABILITY

## 4. Fluxo operacional

1. Receber a solicitacao pelo canal operacional.
2. Confirmar a identidade minima do solicitante por contexto operacional.
3. Registrar a solicitacao no sistema via endpoint de LGPD.
4. Gerar protocolo tecnico e prazo operacional.
5. Classificar subjectType e subjectId corretos.
6. Executar exportacao, atualizacao ou eliminacao controlada conforme o caso.
7. Registrar resolucao e encerrar a solicitacao.

## 5. SLA operacional atual

- Prazo tecnico interno padrao: 15 dias a partir da abertura.
- O prazo juridico definitivo deve ser validado conforme interpretacao aplicavel e orientacao juridica.

## 6. Evidencias geradas

- registro em lgpd_requests;
- protocolo tecnico;
- prazo dueAt;
- audit_log de criacao e atualizacao;
- audit_log de exportacao ou eliminacao LGPD.

## 7. Operacoes tecnicas existentes

- listar solicitacoes;
- consultar solicitacao por id;
- atualizar status;
- exportar CUSTOMER;
- exportar USER;
- eliminar CUSTOMER de forma controlada;
- eliminar USER de forma controlada.

## 8. Limites atuais

- o fluxo ainda depende de acao administrativa autenticada no backend;
- nao ha portal publico de autoatendimento do titular;
- nao ha workflow automatizado de notificacao por e-mail sobre mudanca de status;
- validacao juridica de identidade do titular ainda depende do processo operacional.
