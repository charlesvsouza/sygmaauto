# Compliance, LGPD e Segurança

Data de referência: 07/05/2026
Escopo: SigmaAuto — backend NestJS/Prisma + frontend React

## 1. Política de Privacidade e Tratamento de Dados

### 1.1 Objetivo
Descrever, em nível operacional, como o SigmaAuto trata dados pessoais no contexto de uso da plataforma.

### 1.2 Escopo
Aplica-se ao tratamento de dados no ambiente do sistema SigmaAuto, incluindo:
- cadastro e autenticação de usuários;
- cadastro e gestão de clientes e veículos;
- ordens de serviço, checklists, relatórios e comunicações operacionais;
- assinatura, cobrança e atendimento técnico;
- comunicações por e-mail e WhatsApp quando configuradas no ambiente.

### 1.3 Categorias de dados tratados

#### 3.1 Dados de identificação
- nome;
- e-mail;
- CPF/CNPJ e outros identificadores cadastrais quando informados;
- dados da oficina/empresa contratante.

#### 3.2 Dados de contato
- telefone;
- e-mail principal;
- e-mail de recuperação.

#### 3.3 Dados de autenticação e segurança
- hash de senha;
- token de recuperação de senha;
- datas de último login e de última alteração de senha.

#### 3.4 Dados operacionais
- clientes e veículos;
- ordens de serviço;
- histórico de status;
- checklists e fotos anexadas;
- dados de agenda, manutenção, NPS e relatórios.

#### 3.5 Dados financeiros e contratuais
- plano contratado;
- dados de assinatura;
- registros de transações financeiras;
- dados necessários para cobrança e renovação.

### 1.4 Finalidades do tratamento
Os dados são tratados para as seguintes finalidades operacionais:
- autenticar usuários e controlar acesso ao sistema;
- manter isolamento por tenant/oficina;
- cadastrar e gerir clientes, veículos e ordens de serviço;
- emitir comunicações operacionais por e-mail e WhatsApp quando configurado;
- registrar cobranças, pagamentos, relatórios e indicadores;
- atender solicitações de suporte, segurança e compliance;
- auditar operações sensíveis quando implementado no sistema.

### 1.5 Bases legais utilizadas
A definição final de base legal depende do contexto de negócio e validação jurídica. Operacionalmente, o SigmaAuto utiliza este referencial:
- execução de contrato: para prestação do serviço principal da plataforma;
- cumprimento de obrigação legal ou regulatoria: quando houver exigência fiscal, contábil ou regulatoria;
- exercício regular de direitos: para trilhas de auditoria, investigação e defesa de interesses legítimos;
- legítimo interesse: para segurança da plataforma, prevenção a fraude e continuidade operacional;
- consentimento: somente quando houver tratamento opcional que exija base específica e destacada.

### 1.6 Compartilhamento de dados
Podem existir compartilhamentos operacionais com:
- provedores de infraestrutura e banco de dados;
- provedores de e-mail transacional;
- provedores de mensageria WhatsApp configurados;
- provedores de pagamento e cobrança;
- ferramentas de deploy e observabilidade, quando aplicável.

O compartilhamento deve ser limitado ao necessário para a operação do serviço.

### 1.7 Segurança da informação
Controles técnicos atualmente implementados:
- autenticação JWT com segregação por tenant;
- controle de acesso por perfil;
- hash de senha com bcrypt;
- validação de entrada no backend;
- trilha de auditoria parcial para eventos sensíveis;
- validação de webhook da Meta com assinatura e idempotência durável.

### 1.8 Direitos do titular
O SigmaAuto prevê, em nível operacional, atendimento a solicitações de:
- confirmação de tratamento;
- acesso aos dados;
- correção de dados;
- portabilidade técnica quando suportada;
- eliminação controlada, observadas dependências históricas e obrigações de guarda.

### 1.9 Canal operacional do titular
Até formalização jurídica de encarregado/DPO, o canal operacional provisório de atendimento é:
- suporte@sigmaauto.com.br

Assunto recomendado:
- LGPD - Solicitacao do Titular

### 1.10 Retenção e descarte
As diretrizes de retenção e descarte estão descritas em:
- Política de Retenção e Descarte de Dados (seção 3 deste documento)

### 1.11 Incidentes de segurança
O fluxo operacional de resposta a incidentes está descrito em:
- Plano de Resposta a Incidentes de Dados (seção 4 deste documento)

### 1.12 Revisão e versão
Este documento deve ser revisado sempre que houver:
- nova integração que trate dados pessoais;
- mudança relevante de fluxo de autenticação, exportação, eliminação ou auditoria;
- exigência jurídica ou regulatoria superveniente.

---

## 2. Dados pessoais tratados no sistema

Categorias identificadas no schema e fluxos atuais:
- Dados de identificação: nome, e-mail, documento, CNPJ/CPF, dados cadastrais da oficina.
- Dados de contato: telefone, e-mail, e-mail de recuperação.
- Dados de autenticação: hash de senha, token de recuperação, timestamps de login/alteração de senha.
- Dados operacionais: clientes, veículos, ordens de serviço, histórico de status, checklist com fotos.
- Dados financeiros: transações, pagamentos, comissões, assinatura/plano.
- Dados de comunicação: mensagens enviadas por e-mail e WhatsApp.

Referências técnicas:
- Modelos de dados: backend/prisma/schema.prisma
- Autenticação e senha: backend/src/auth/auth.service.ts
- Usuários: backend/src/users/users.service.ts
- Mensageria WhatsApp: backend/src/notifications/whatsapp.service.ts

---

## 3. Uso e guarda de dados (como funciona hoje)

- Armazenamento principal: PostgreSQL (via Prisma).
- Persistência de sessão no frontend: sessionStorage (estado de autenticação persistido na sessão do navegador).
- Envio de e-mail: SMTP configurável por variáveis de ambiente.
- Envio de WhatsApp: API oficial Meta Cloud (`WHATSAPP_PROVIDER=META_CLOUD`) com webhook assinado.
- Webhook Meta: validação de assinatura e registro de eventos para idempotência/auditoria.

Referências técnicas:
- Frontend auth storage: frontend/src/store/authStore.ts
- CORS e bootstrap API: backend/src/main.ts
- Webhook Meta seguro: backend/src/whatsapp/whatsapp-webhook.controller.ts
- Idempotência durável de webhook: backend/src/whatsapp/whatsapp-meta-webhook.service.ts

---

## 4. Controles implementados (confirmados)

### 4.1 Controle de acesso
- Autenticação por JWT (access token + refresh token).
- Guardas de autorização por perfil (roles) e por plano.
- Isolamento lógico multi-tenant por tenantId nas consultas e endpoints.

Evidências:
- backend/src/auth/strategies/jwt.strategy.ts
- backend/src/auth/guards/roles.guard.ts
- backend/src/auth/guards/plan.guard.ts
- backend/src/common/decorators/tenant.decorator.ts

### 4.2 Credenciais e senha
- Senhas armazenadas com bcrypt.
- Fluxo de recuperação com token temporário (15 min) e invalidação após uso.
- Registro de passwordUpdatedAt e lastLoginAt.

Evidências:
- backend/src/auth/auth.service.ts
- backend/src/users/users.service.ts

### 4.3 Validação de entrada e endurecimento básico de API
- ValidationPipe global com:
  - whitelist=true
  - transform=true
  - forbidNonWhitelisted=true
- CORS com lista de origens permitidas.

Evidência:
- backend/src/main.ts

### 4.4 Logs e trilha
- Auditoria de exclusão de OS com registro em audit_logs.
- Eventos de webhook Meta persistidos em tabela dedicada para auditoria e deduplicação.

Evidências:
- backend/src/service-orders/service-orders.service.ts
- backend/src/whatsapp/whatsapp-meta-webhook.service.ts
- backend/prisma/schema.prisma (AuditLog, WhatsappWebhookEvent)

### 4.5 Segurança de webhook (Meta)
- Validação de assinatura X-Hub-Signature-256 (HMAC SHA-256).
- Verificação de challenge hub.challenge.
- Idempotência durável em banco (provider + eventKey único).

Evidências:
- backend/src/whatsapp/whatsapp-webhook.controller.ts
- backend/src/whatsapp/whatsapp-meta-webhook.service.ts

### 4.6 Atendimento técnico ao titular (LGPD)
- Cadastro e acompanhamento de solicitações LGPD por tenant.
- Protocolo técnico por solicitação e prazo (SLA técnico) para acompanhamento operacional.
- Exportação estruturada de dados de cliente e usuário para atendimento de acesso/portabilidade.
- Eliminação LGPD controlada com anonimização quando houver dependências históricas.
- Registro de auditoria de criação/atualização de solicitação e exportação.

Evidências:
- backend/src/compliance/compliance.controller.ts
- backend/src/compliance/compliance.service.ts
- backend/prisma/schema.prisma (LgpdRequest)

### 4.7 Governança documental
- Política de privacidade e tratamento de dados documentada.
- Política de retenção e descarte documentada.
- Procedimento de atendimento ao titular documentado.
- Plano operacional de resposta a incidentes documentado.
- Registro consolidado de governança LGPD documentado.

Evidências:
- COMPLIANCE.md (este documento)
- Política de Retenção e Descarte de Dados (seção 3)
- Procedimento de Atendimento ao Titular (seção 5)
- Plano de Resposta a Incidentes (seção 4)
- Registro de Governança LGPD (seção 6)

---

## 5. Matriz LGPD (status atual)

Legenda:
- Implementado: controle presente e verificável no código.
- Parcial: existe parte técnica, mas faltam processo/política formal.
- Não implementado: não identificado no código/documentação técnica atual.

| Requisito LGPD | Status | Situação atual |
|---|---|---|
| Controle de acesso e segregação | Implementado | JWT, roles e tenantId no backend |
| Segurança de credenciais | Implementado | bcrypt + reset com expiração |
| Registro de eventos relevantes | Parcial | Auditoria em exclusão de OS, webhook e fluxo LGPD; cobertura ainda parcial |
| Minimização de dados por endpoint | Parcial | Existem selects com campos filtrados em alguns serviços; sem política global de minimização |
| Correção/atualização de dados | Implementado | CRUD de usuários/clientes/veículos/tenant |
| Eliminação de dados | Parcial | Fluxo LGPD controlado implementado para CUSTOMER e USER, com anonimização quando houver dependências; sem rotina global para todos os domínios |
| Portabilidade do titular | Parcial | Exportação técnica implementada para CUSTOMER e USER |
| Anonimização/pseudonimização | Não implementado | Não há rotina técnica dedicada |
| Retenção e descarte por prazo | Parcial | Política documental criada; jobs automatizados de descarte ainda não implementados |
| Gestão de incidentes e notificação | Parcial | Plano operacional documental criado; módulo dedicado e automações ainda não existem |
| Base legal e transparência ao titular | Parcial (documental) | Política de privacidade e base operacional de termos criadas; publicação externa e revisão jurídica pendentes |
| Encarregado/DPO e canal do titular | Parcial (documental) | Canal operacional provisório documentado via suporte@sigmaauto.com.br, sob responsabilidade operacional provisória da direção da SigmaAuto; encarregado formal ainda pendente |

### 5.1 Maturidade consolidada (estimativa operacional)
- Base técnica de segurança: alta para o estágio atual do projeto.
- Atendimento técnico ao titular: implementado ponta a ponta (backend + UI administrativa em `/lgpd` desde 07/07/2026).
- Governança documental: nível intermediário, com conjunto mínimo documental agora formalizado no repositório.

Estimativa executiva atual:
- aderência técnico-operacional geral de LGPD: aproximadamente 55% a 60%;
- governança documental: aproximadamente 50%.

Esses percentuais são estimativas internas de maturidade e não substituem avaliação jurídica formal.

Publicação externa provisória:
- a partir desta fase, o projeto passa a admitir uma central pública provisória de Compliance/Privacidade no frontend para fins de transparência operacional;
- essa publicação deve manter linguagem factual, status provisório e recomendação expressa de revisão jurídica antes de consolidação definitiva.

### 5.2 Endpoints técnicos de atendimento LGPD (backend)
- POST /compliance/lgpd/requests
- GET /compliance/lgpd/requests
- GET /compliance/lgpd/requests/:id
- PATCH /compliance/lgpd/requests/:id/status
- GET /compliance/lgpd/export/customer/:customerId
- GET /compliance/lgpd/export/user/:userId
- POST /compliance/lgpd/erase/customer/:customerId
- POST /compliance/lgpd/erase/user/:userId

Observação: os endpoints são protegidos por JWT + role (MASTER/ADMIN) e operam sempre no tenant autenticado.

**✅ UI administrativa (criada 07/07/2026):** página `/lgpd` (menu lateral, restrita a MASTER/ADMIN)
permite registrar, listar, detalhar, mudar status, exportar dados e executar eliminação de
solicitações LGPD diretamente pelo produto — sem depender de API/Swagger/Postman. A
`CompliancePage.tsx` pública segue sendo apenas institucional/estática (política pública),
o atendimento operacional agora acontece em `/lgpd`.

---

## 6. Canal operacional atual
- suporte@sigmaauto.com.br

## 7. Responsabilidade operacional provisória
Até a designação formal de encarregado/DPO, a responsabilidade operacional inicial pelos temas de privacidade e governança LGPD permanece centralizada na direção da SigmaAuto, com triagem pelo canal suporte@sigmaauto.com.br.

## 8. Observações
- O canal acima funciona como ponto operacional provisório para assuntos de privacidade e LGPD até formalização jurídica de encarregado/DPO.
- A publicação externa desses documentos ainda deve passar por revisão jurídica e decisão de negócio.
- A central pública de compliance, quando publicada, deve deixar explícito seu caráter provisório e informativo.
