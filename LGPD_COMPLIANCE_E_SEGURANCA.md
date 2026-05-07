# LGPD, Compliance e Seguranca da Informacao (Status Real)

Atualizado em: 07/05/2026
Escopo: sistema SigmaAuto (backend NestJS/Prisma + frontend React)

## 1) Objetivo deste documento

Este documento descreve apenas controles tecnicos e operacionais que estao implementados no codigo e na configuracao documentada do projeto.

Nao descreve controles juridicos ainda nao formalizados em documento oficial (ex.: politica de privacidade publicada, termo de uso detalhado, processo formal de atendimento ao titular).

## 2) Dados pessoais tratados no sistema

Categorias identificadas no schema e fluxos atuais:

- Dados de identificacao: nome, e-mail, documento, CNPJ/CPF, dados cadastrais da oficina.
- Dados de contato: telefone, e-mail, e-mail de recuperacao.
- Dados de autenticacao: hash de senha, token de recuperacao, timestamps de login/alteracao de senha.
- Dados operacionais: clientes, veiculos, ordens de servico, historico de status, checklist com fotos.
- Dados financeiros: transacoes, pagamentos, comissoes, assinatura/plano.
- Dados de comunicacao: mensagens enviadas por e-mail e WhatsApp.

Referencias tecnicas:

- Modelos de dados: backend/prisma/schema.prisma
- Autenticacao e senha: backend/src/auth/auth.service.ts
- Usuarios: backend/src/users/users.service.ts
- Mensageria WhatsApp: backend/src/notifications/whatsapp.service.ts

## 3) Uso e guarda de dados (como funciona hoje)

- Armazenamento principal: PostgreSQL (via Prisma).
- Persistencia de sessao no frontend: sessionStorage (estado de autenticacao persistido na sessao do navegador).
- Envio de e-mail: SMTP configuravel por variaveis de ambiente.
- Envio de WhatsApp: provider configuravel por variavel WHATSAPP_PROVIDER.
- Webhook Meta: validacao de assinatura e registro de eventos para idempotencia/auditoria.

Referencias tecnicas:

- Frontend auth storage: frontend/src/store/authStore.ts
- CORS e bootstrap API: backend/src/main.ts
- Webhook Meta seguro: backend/src/whatsapp/whatsapp-webhook.controller.ts
- Idempotencia duravel de webhook: backend/src/whatsapp/whatsapp-meta-webhook.service.ts

## 4) Controles implementados (confirmados)

### 4.1 Controle de acesso

- Autenticacao por JWT (access token + refresh token).
- Guardas de autorizacao por perfil (roles) e por plano.
- Isolamento logico multi-tenant por tenantId nas consultas e endpoints.

Evidencias:

- backend/src/auth/strategies/jwt.strategy.ts
- backend/src/auth/guards/roles.guard.ts
- backend/src/auth/guards/plan.guard.ts
- backend/src/common/decorators/tenant.decorator.ts

### 4.2 Credenciais e senha

- Senhas armazenadas com bcrypt.
- Fluxo de recuperacao com token temporario (15 min) e invalidacao apos uso.
- Registro de passwordUpdatedAt e lastLoginAt.

Evidencias:

- backend/src/auth/auth.service.ts
- backend/src/users/users.service.ts

### 4.3 Validacao de entrada e endurecimento basico de API

- ValidationPipe global com:
- whitelist=true
- transform=true
- forbidNonWhitelisted=true
- CORS com lista de origens permitidas.

Evidencia:

- backend/src/main.ts

### 4.4 Logs e trilha

- Auditoria de exclusao de OS com registro em audit_logs.
- Eventos de webhook Meta persistidos em tabela dedicada para auditoria e deduplicacao.

Evidencias:

- backend/src/service-orders/service-orders.service.ts
- backend/src/whatsapp/whatsapp-meta-webhook.service.ts
- backend/prisma/schema.prisma (AuditLog, WhatsappWebhookEvent)

### 4.5 Seguranca de webhook (Meta)

- Validacao de assinatura X-Hub-Signature-256 (HMAC SHA-256).
- Verificacao de challenge hub.challenge.
- Idempotencia duravel em banco (provider + eventKey unico).

Evidencias:

- backend/src/whatsapp/whatsapp-webhook.controller.ts
- backend/src/whatsapp/whatsapp-meta-webhook.service.ts

### 4.6 Atendimento tecnico ao titular (LGPD)

- Cadastro e acompanhamento de solicitacoes LGPD por tenant.
- Exportacao estruturada de dados de cliente para atendimento de acesso/portabilidade.
- Registro de auditoria de criacao/atualizacao de solicitacao e exportacao.

Evidencias:

- backend/src/compliance/compliance.controller.ts
- backend/src/compliance/compliance.service.ts
- backend/prisma/schema.prisma (LgpdRequest)

## 5) Matriz LGPD (status atual)

Legenda:

- Implementado: controle presente e verificavel no codigo.
- Parcial: existe parte tecnica, mas faltam processo/politica formal.
- Nao implementado: nao identificado no codigo/documentacao tecnica atual.

| Requisito LGPD | Status | Situacao atual |
|---|---|---|
| Controle de acesso e segregacao | Implementado | JWT, roles e tenantId no backend |
| Seguranca de credenciais | Implementado | bcrypt + reset com expiracao |
| Registro de eventos relevantes | Parcial | Auditoria em exclusao de OS, webhook e fluxo LGPD; cobertura ainda parcial |
| Minimizacao de dados por endpoint | Parcial | Existem selects com campos filtrados em alguns servicos; sem politica global de minimizacao |
| Correcao/atualizacao de dados | Implementado | CRUD de usuarios/clientes/veiculos/tenant |
| Eliminacao de dados | Parcial | Delete tecnico existe em varios modulos; sem fluxo formal de solicitacao LGPD |
| Portabilidade do titular | Parcial | Exportacao tecnica implementada para subjectType CUSTOMER |
| Anonimizacao/pseudonimizacao | Nao implementado | Nao ha rotina tecnica dedicada |
| Retencao e descarte por prazo | Nao implementado | Nao ha politica versionada nem jobs de descarte |
| Gestao de incidentes e notificacao | Parcial | Existem praticas operacionais, sem plano formal versionado |
| Base legal e transparencia ao titular | Nao implementado (documental) | Falta politica de privacidade/termos publicados e versionados |
| Encarregado/DPO e canal do titular | Nao implementado (formal) | Nao ha secao formal no produto/repositorio |

## 5.1 Endpoints tecnicos de atendimento LGPD (backend)

- POST /compliance/lgpd/requests
- GET /compliance/lgpd/requests
- GET /compliance/lgpd/requests/:id
- PATCH /compliance/lgpd/requests/:id/status
- GET /compliance/lgpd/export/customer/:customerId

Observacao: os endpoints sao protegidos por JWT + role (MASTER/ADMIN) e operam sempre no tenant autenticado.

## 6) Lacunas prioritarias para adequacao

Prioridade alta:

- Publicar politica de privacidade e termos de uso com versao e data.
- Definir processo formal de atendimento ao titular (acesso, correcao, eliminacao, portabilidade).
- Definir politica de retencao/descarte por categoria de dado.
- Expandir trilha de auditoria para eventos administrativos criticos (usuarios, auth, financeiro).

Prioridade media:

- Criar exportacao estruturada de dados por titular/tenant.
- Implementar rotina de anonimização para dados que nao exigem identificacao apos prazo.
- Formalizar plano de resposta a incidente e fluxo de comunicacao.

## 7) Variaveis de seguranca relacionadas

- JWT_SECRET
- JWT_REFRESH_SECRET
- CORS_ORIGINS
- WHATSAPP_PROVIDER
- META_WHATSAPP_TOKEN
- META_WHATSAPP_PHONE_NUMBER_ID
- META_WHATSAPP_APP_SECRET
- META_WHATSAPP_VERIFY_TOKEN

Referencia:

- config.md

## 8) Nota importante de conformidade

Conformidade LGPD nao e apenas tecnica.

O sistema hoje possui base tecnica relevante de seguranca e controle de acesso, mas ainda depende de formalizacao juridica e operacional para atender plenamente os requisitos de governanca, transparencia e direitos do titular.
