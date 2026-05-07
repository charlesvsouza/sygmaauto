# LGPD, Compliance e Seguranca da Informacao (Status Real)

Atualizado em: 07/05/2026
Escopo: sistema SigmaAuto (backend NestJS/Prisma + frontend React)

## 1) Objetivo deste documento

Este documento descreve controles tecnicos implementados no codigo e o estado atual da governanca documental de LGPD no repositorio.

Os documentos de governanca criados nesta fase ainda recomendam revisao juridica antes de publicacao externa definitiva, mas ja passam a formalizar diretrizes minimas de privacidade, atendimento ao titular, retencao/descarte e resposta a incidentes.

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
- Envio de WhatsApp: API oficial Meta Cloud (`WHATSAPP_PROVIDER=META_CLOUD`) com webhook assinado.
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
- Protocolo tecnico por solicitacao e prazo (SLA tecnico) para acompanhamento operacional.
- Exportacao estruturada de dados de cliente e usuario para atendimento de acesso/portabilidade.
- Eliminacao LGPD controlada com anonimização quando houver dependencias historicas.
- Registro de auditoria de criacao/atualizacao de solicitacao e exportacao.

Evidencias:

- backend/src/compliance/compliance.controller.ts
- backend/src/compliance/compliance.service.ts
- backend/prisma/schema.prisma (LgpdRequest)

### 4.7 Governanca documental

- Politica de privacidade e tratamento de dados documentada.
- Politica de retencao e descarte documentada.
- Procedimento de atendimento ao titular documentado.
- Plano operacional de resposta a incidentes documentado.
- Registro consolidado de governanca LGPD documentado.

Evidencias:

- POLITICA_PRIVACIDADE_E_TRATAMENTO_DADOS.md
- POLITICA_RETENCAO_E_DESCARTE_DADOS.md
- PROCEDIMENTO_ATENDIMENTO_TITULAR_LGPD.md
- PLANO_RESPOSTA_INCIDENTES_DADOS.md
- REGISTRO_GOVERNANCA_LGPD.md

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
| Eliminacao de dados | Parcial | Fluxo LGPD controlado implementado para CUSTOMER e USER, com anonimização quando houver dependencias; sem rotina global para todos os domínios |
| Portabilidade do titular | Parcial | Exportacao tecnica implementada para CUSTOMER e USER |
| Anonimizacao/pseudonimizacao | Nao implementado | Nao ha rotina tecnica dedicada |
| Retencao e descarte por prazo | Parcial | Politica documental criada; jobs automatizados de descarte ainda nao implementados |
| Gestao de incidentes e notificacao | Parcial | Plano operacional documental criado; modulo dedicado e automacoes ainda nao existem |
| Base legal e transparencia ao titular | Parcial (documental) | Politica de privacidade e base operacional de termos criadas; publicacao externa e revisao juridica pendentes |
| Encarregado/DPO e canal do titular | Parcial (documental) | Canal operacional provisório documentado via suporte@sigmaauto.com.br, sob responsabilidade operacional provisória da direção da SigmaAuto; encarregado formal ainda pendente |

## 5.2 Maturidade consolidada (estimativa operacional)

- Base tecnica de seguranca: alta para o estagio atual do projeto.
- Atendimento tecnico ao titular: parcial, com fluxo backend implementado.
- Governanca documental: nivel intermediario, com conjunto minimo documental agora formalizado no repositorio.

Estimativa executiva atual:

- aderencia tecnica-operacional geral de LGPD: aproximadamente 55% a 60%;
- governanca documental: aproximadamente 50%.

Esses percentuais sao estimativas internas de maturidade e nao substituem avaliacao juridica formal.

Publicacao externa provisoria:

- a partir desta fase, o projeto passa a admitir uma central publica provisória de Compliance/Privacidade no frontend para fins de transparencia operacional;
- essa publicacao deve manter linguagem factual, status provisório e recomendacao expressa de revisao juridica antes de consolidacao definitiva.

## 5.1 Endpoints tecnicos de atendimento LGPD (backend)

- POST /compliance/lgpd/requests
- GET /compliance/lgpd/requests
- GET /compliance/lgpd/requests/:id
- PATCH /compliance/lgpd/requests/:id/status
- GET /compliance/lgpd/export/customer/:customerId
- GET /compliance/lgpd/export/user/:userId
- POST /compliance/lgpd/erase/customer/:customerId
- POST /compliance/lgpd/erase/user/:userId

Observacao: os endpoints sao protegidos por JWT + role (MASTER/ADMIN) e operam sempre no tenant autenticado.

## 6) Lacunas prioritarias para adequacao

Prioridade alta:

- Publicar politica de privacidade e termos de uso com versao e data.
- Definir processo formal de atendimento ao titular (acesso, correcao, eliminacao, portabilidade).
- Definir politica de retencao/descarte por categoria de dado.
- Expandir trilha de auditoria para eventos administrativos criticos (usuarios, auth, financeiro).

Prioridade media:

- Publicar externamente os documentos documentais apos revisao juridica.
- Implementar rotina de anonimização para dados que nao exigem identificacao apos prazo.
- Formalizar matriz de responsabilidades e encarregado/DPO.

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
