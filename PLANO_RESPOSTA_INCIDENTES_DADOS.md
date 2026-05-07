# Plano de Resposta a Incidentes de Dados

Atualizado em: 07/05/2026
Status: plano operacional documental. Algumas etapas dependem de amadurecimento de monitoramento e governanca.

## 1. Objetivo

Definir resposta minima a incidentes que possam afetar confidencialidade, integridade ou disponibilidade de dados tratados pelo SigmaAuto.

## 2. O que e tratado como incidente

- acesso indevido a dados;
- exposicao de segredo ou credencial;
- envio indevido de dados a terceiro;
- falha relevante de autenticacao/autorizacao;
- webhook ou integracao comprometida;
- indisponibilidade com risco de perda de dados;
- exclusao ou alteracao indevida de registros.

## 3. Fluxo minimo de resposta

1. Identificar e registrar o incidente.
2. Conter o problema com a menor mudanca segura possivel.
3. Preservar evidencias tecnicas e logs disponiveis.
4. Avaliar impacto em dados pessoais e escopo afetado.
5. Corrigir a causa raiz.
6. Validar restauracao do servico.
7. Documentar incidente, causa, impacto e acao corretiva.
8. Avaliar necessidade de comunicacao a clientes/titulares e autoridades competentes com apoio juridico.

## 4. Controles que ajudam hoje

- audit log parcial;
- webhook com assinatura e idempotencia;
- segregacao por tenant;
- fluxo documentado de rotacao de variaveis e incidentes operacionais em config.md.

## 5. Responsabilidades operacionais minimas

- responsavel tecnico: analisar logs, conter e corrigir;
- responsavel operacional: consolidar informacoes do incidente;
- responsavel administrativo/juridico: avaliar comunicacoes externas, quando aplicavel.

## 6. Registro minimo do incidente

- data e hora de deteccao;
- componente afetado;
- tipo de dado potencialmente impactado;
- tenants ou usuarios afetados;
- causa provavel;
- acao de contencao;
- acao corretiva;
- status final e data de encerramento.

## 7. Pendencias conhecidas

- nao ha modulo dedicado de incidentes no sistema;
- nao ha automacao de classificacao por severidade;
- nao ha runbook formal por tipo de integracao;
- notificacao regulatoria depende de avaliacao juridica externa/interna.
