# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primário: o dono da oficina (MASTER).** Pessoa que assina o SigmaAuto, não é técnica em tecnologia e precisa confiar nos números para cobrar, pagar comissão e decidir. Usa o sistema no escritório e no celular, entre o balcão e o pátio.

**Secundários, com papéis distintos (regra única em `backend/src/common/roles.ts`, espelhada em `frontend/src/lib/roles.ts`):**

- ADMIN e GERENTE: gerência operacional; GERENTE sem acesso a configurações.
- CHEFE_OFICINA: chefe técnico; tudo do mecânico, mais abrir O.S., conduzir aprovação, faturamento e entrega.
- SECRETARIA: recepção; abre O.S., cadastra cliente e veículo, envia para aprovação, aprova no balcão e confirma entrega.
- MECANICO (legado: PRODUTIVO, mesmas permissões): execução técnica; diagnóstico, itens e fotos, em tablet no pátio.
- FINANCEIRO: fatura, registra pagamento, confirma entrega e lança no fluxo de caixa.

**Terceiros:** o cliente final da oficina, que recebe documentos impressos e aprova o orçamento por link no celular, sem conta no sistema.

O trabalho a ser feito: manter a oficina rodando sem fricção. Abrir e atualizar a O.S. rápido, saber o estado de cada carro, faturar e receber, sem voltar ao papel ou à planilha.

## Product Purpose

SaaS multi-tenant, por assinatura via Mercado Pago, para gestão completa de oficinas mecânicas brasileiras pequenas e médias: ordens de serviço, clientes e veículos, catálogo de serviços, estoque e reserva de peças, financeiro (livro caixa, DRE, contas, plano de pagamento com parcelamento), usuários e permissões, e relatórios em PDF.

Sucesso: a oficina opera o dia inteiro dentro do sistema, e o dono confia nos números porque a receita da O.S. segue uma regra única do atendimento ao caixa.

## Positioning

Quatro apostas que um sistema genérico de gestão não copiaria com verdade:

1. **Ciclo do atendimento fechado.** Vistoria com checklist e acessórios, orçamento aprovado pelo cliente por link (ou no balcão), execução, faturamento, entrega, com documentos impressos coerentes (orçamento, O.S., entrega, laudo/solução) e a mesma regra de receita no financeiro.
2. **Retífica de motores como linha própria.** Fluxo de status específico, metrologia por cilindro e laudo técnico.
3. **WhatsApp oficial e IA.** Mensagens automáticas por evento da O.S. pela Meta Cloud API, e orçamento assistido por IA (plano REDE).
4. **Preço e simplicidade para quem não é técnico.** START R$ 149, PRO R$ 299, REDE sob consulta, com 14 dias de trial.

## Operating Context

- **Balcão da recepção:** abertura de O.S., cadastro, aprovação presencial, entrega, cobrança.
- **Chão de oficina:** tablet com mãos sujas; diagnóstico, itens e fotos.
- **TV de parede:** modo recepção e kanban de pátio, lido a distância.
- **Celular do cliente:** aprovação do orçamento por link.
- **Papel e PDF:** orçamento, O.S., documento de entrega, laudo; emitidos com fuso de Brasília, "emitido por" e numeração sequencial em hexadecimal por oficina.
- **Ritmo:** apressado e interrompido o dia inteiro; a maioria dos operadores não é técnica.

## Capabilities and Constraints

- **Planos:** START (até 3 usuários, 50 O.S./mês) · PRO (até 10 usuários, O.S. ilimitadas; aprovação por link, checklist com fotos, kanban de pátio, WhatsApp automático, lembrete de manutenção, comissão de mecânicos, NPS) · REDE (usuários ilimitados; DRE completo, multi-unidades, NF-e/NFS-e, portal do cliente PWA, IA no orçamento). Upgrade imediato; downgrade só após o vencimento.
- **Permissões:** a tela mostra apenas as etapas da O.S. que o perfil pode executar. Revogar ou forçar aprovação: MASTER/ADMIN. Excluir O.S.: MASTER. Teto de desconto por perfil em peças e serviços.
- **Terminologia do domínio:** O.S., orçamento, laudo, solução, vistoria, retífica, chassi/VIN, pátio, entrega.
- **Stack existente:** frontend em Vercel, API em Railway, PostgreSQL; multi-tenant com isolamento por oficina.
- **Em aberto (não inventar):** NF-e/NFS-e, portal do cliente PWA e multi-unidades constam no plano REDE e não devem ser tratados como entregues sem confirmação no código.

## Brand Commitments

- Nome: **SigmaAuto** (domínio sigmaauto.com.br).
- Personalidade: premium e confiante; sério mas caprichado, com cara de produto pago e bem-acabado, não de ferramenta interna improvisada. Confiável, eficiente, polido. Nunca brincalhão, nunca frio ou burocrático.
- Voz: direta, em PT-BR do domínio automotivo, sem jargão de tecnologia. Mensagens de erro dizem o problema e o próximo passo, sem vazar implementação.
- Identidade: o acento verde-água (teal) é a assinatura, com dourado como marca; tema claro como padrão e escuro opcional.
- Anti-referências confirmadas: SaaS genérico com cara de IA; planilha crua; dashboard corporativo frio; app consumer "fofo" demais.

## Evidence on Hand

- `MANUAL_USUARIO.md` (manual 3.0, na ordem do menu), `ROADMAP.md` (planos, perfis, infraestrutura), `COMPLIANCE.md`, `OPERACIONAL_SISTEMA.md`.
- Código real em `backend/` e `frontend/`; documentos de design e auditoria já na raiz (`DESIGN.md`, `DESIGN_REVIEW_SISTEMA.md`, `DESIGN_CONTRAST_AUDIT.md`).
- **Ausências a não fabricar:** depoimentos de clientes, número de oficinas ativas, benchmarks de tempo economizado e comparativos com concorrentes nomeados. Nada disso está registrado no repositório.

## Product Principles

1. **O número do dono é verdade única.** Uma regra de receita, uma regra de permissão, um documento por momento do atendimento. Se duas telas discordam, o produto perde a confiança do dono.
2. **Cada perfil faz o que o sistema promete.** O que o perfil não pode fazer não aparece como opção; o que pode, funciona sem pedir ajuda.
3. **Velocidade do balcão antes de riqueza de recurso.** A O.S. avança em poucos toques, com a próxima ação sempre óbvia, mesmo interrompida e sob pressa.
4. **Fala a língua da oficina.** Termos do domínio automotivo em PT-BR claro; o cliente final entende o orçamento e o documento sem explicação.
5. **O dono não precisa ser técnico para confiar.** Estados, valores e erros dizem o que aconteceu e o que fazer em seguida.

## Accessibility & Inclusion

WCAG 2.1 AA como piso: texto 4.5:1 ou mais, texto grande 3:1 ou mais, foco visível em todo controle interativo. Status nunca só por cor. Alvos de toque de 44px ou mais nas ações primárias (tablet no chão de oficina). `prefers-reduced-motion` respeitado. Tema claro e escuro, ambos em AA. Legível a distância no TV da recepção.
