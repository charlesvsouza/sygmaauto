# Politica de Retencao e Descarte de Dados

Atualizado em: 07/05/2026
Status: politica documental de referencia; automatizacoes de descarte ainda dependem de implementacao adicional.

## 1. Objetivo

Definir diretrizes minimas de retencao, revisao e descarte de dados pessoais e operacionais tratados pelo SigmaAuto.

## 2. Premissas

- Retencao deve observar necessidade operacional, obrigacao legal e defesa de direitos.
- Descarte nao deve comprometer trilha historica necessaria para operacao, auditoria ou exigencia legal.
- Quando houver dependencia historica, priorizar anonimização em vez de remocao fisica.

## 3. Regras por categoria

| Categoria | Exemplos | Regra documental atual |
|---|---|---|
| Credenciais e autenticacao | hash de senha, timestamps de login, token de reset | manter enquanto o usuario estiver ativo; token de reset tem expiracao tecnica de 15 min |
| Usuarios internos | nome, e-mail, recoveryEmail, perfil | manter enquanto houver vinculo operacional; em solicitacao LGPD, aplicar anonimização/desativacao quando houver dependencias |
| Clientes | nome, telefone, e-mail, documento, endereco | manter enquanto houver relacao operacional e historico de OS; em solicitacao LGPD, excluir quando nao houver dependencia e anonimizar quando houver |
| Veiculos | placa, marca, modelo, ano | manter vinculados ao historico operacional da oficina enquanto houver necessidade operacional ou historica |
| Ordens de servico | dados de execucao, status, valores, timeline | manter por necessidade operacional, financeira e de auditoria |
| Financeiro e cobranca | transacoes, pagamentos, assinatura | manter conforme necessidade contabil, fiscal e de defesa de direitos |
| Auditoria e webhook | audit_logs, whatsapp_webhook_events, lgpd_requests | manter para seguranca, rastreabilidade e compliance |
| Checklist e fotos | fotos e itens de vistoria | manter enquanto fizerem parte do historico operacional e de defesa da oficina |

## 4. Descarte controlado atualmente suportado

Atualmente, o sistema suporta:

- eliminacao controlada de CUSTOMER;
- eliminacao controlada de USER;
- anonimização quando houver dependencias historicas.

O sistema ainda nao possui job automatico de expiracao/expurgo por prazo para todas as categorias.

## 5. Forma de descarte

### 5.1 Exclusao fisica

Permitida apenas quando nao houver dependencia relevante de historico operacional.

### 5.2 Anonimizacao

Aplicada quando a remocao completa comprometer:

- historico de ordens de servico;
- trilha de auditoria;
- registros financeiros;
- rastreabilidade operacional.

## 6. Revisao periodica

Recomendacao operacional:

- revisar esta politica a cada 6 meses;
- revisar tambem sempre que novo modulo tratar dado pessoal relevante.

## 7. Pendencias conhecidas

- automatizacao de descarte por prazo ainda nao implementada;
- tabela por tabela ainda precisa de parametrizacao mais fina por requisito legal/contabil;
- revisao juridica formal ainda recomendada.
