# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primário: o dono da oficina (MASTER).** Assina o SigmaAuto, não é técnico em tecnologia e precisa, a cada abertura do sistema, saber **o que exige uma decisão dele hoje** (orçamento parado, carro atrasado, peça acabando, saldo) e confiar nos números para cobrar, pagar comissão e decidir. Usa no escritório e no celular, entre o balcão e o pátio.

**Secundários, com papéis distintos (regra única em `backend/src/common/roles.ts`, espelhada em `frontend/src/lib/roles.ts`):**

- ADMIN e GERENTE: gerência operacional; GERENTE sem acesso a configurações.
- CHEFE_OFICINA: chefe técnico; tudo do mecânico, mais abrir O.S., conduzir aprovação, faturamento e entrega.
- SECRETARIA: recepção; abre O.S., cadastra cliente e veículo, envia para aprovação, aprova no balcão e confirma entrega. É quem mais vezes pergunta "e agora, qual o próximo passo desta O.S.?".
- MECANICO (legado: PRODUTIVO, mesmas permissões): execução técnica; diagnóstico, itens e fotos, em tablet no pátio.
- FINANCEIRO: fatura, registra pagamento, confirma entrega e lança no fluxo de caixa.

**Terceiros:** o cliente final da oficina, que recebe documentos impressos e aprova o orçamento por link no celular, sem conta no sistema.

O trabalho a ser feito: manter a oficina rodando sem fricção. Abrir e atualizar a O.S. rápido, saber o estado de cada carro e **qual a próxima ação**, faturar e receber, sem voltar ao papel ou à planilha.

## Product Purpose

SaaS multi-tenant, por assinatura via Mercado Pago, para gestão completa de oficinas mecânicas brasileiras pequenas e médias: ordens de serviço, clientes e veículos, catálogo de serviços, estoque e reserva de peças, financeiro (livro caixa, DRE, contas, plano de pagamento com parcelamento), usuários e permissões, e relatórios em PDF.

Sucesso: a oficina opera o dia inteiro dentro do sistema; o dono abre o Painel e sabe em dez segundos o que precisa dele; confia nos números porque a receita da O.S. segue uma regra única do atendimento ao caixa.

## Positioning

Cinco apostas que um sistema genérico de gestão não copiaria com verdade:

1. **Ciclo do atendimento fechado.** Vistoria com checklist e acessórios, orçamento aprovado pelo cliente por link (ou no balcão), execução, faturamento, entrega com data e recebedor registrados e O.S. travada depois, e documentos impressos coerentes (entrada, orçamento, O.S. via cliente e via oficina, termo de entrega com ou sem garantia) com a mesma regra de receita no financeiro.
2. **Retífica de motores como linha própria.** Fluxo de status específico, metrologia por cilindro e laudo técnico.
3. **Cobrança direto da O.S. pelo Asaas da oficina.** PIX, boleto ou cartão emitidos da própria O.S.; o pagamento confirmado fatura a O.S. sozinho, pela mesma regra única de receita.
4. **WhatsApp oficial e IA.** Mensagens automáticas por evento da O.S. pela Meta Cloud API, importação de orçamento em PDF lido por IA (sempre com conferência humana) e orçamento assistido por IA (plano REDE).
5. **Preço e simplicidade para quem não é técnico.** START R$ 149, PRO R$ 299, REDE sob consulta, com 14 dias de trial.

## Operating Context

- **Balcão da recepção:** abertura de O.S., cadastro, aprovação presencial, entrega, cobrança.
- **Chão de oficina:** tablet com mãos sujas; diagnóstico, itens e fotos.
- **TV de parede:** modo recepção e kanban de pátio, lidos a vários metros de distância.
- **Celular do dono e do cliente:** o dono confere o dia; o cliente aprova o orçamento por link.
- **Papel e PDF:** orçamento, O.S., termo de entrega, laudo; emitidos com fuso de Brasília, "emitido por" e numeração sequencial em hexadecimal por oficina (ex.: `0000007B/09-2026`).
- **Ritmo:** apressado e interrompido o dia inteiro; a maioria dos operadores não é técnica.

## Capabilities and Constraints

- **Planos:** START (até 3 usuários, 50 O.S./mês) · PRO (até 10 usuários, O.S. ilimitadas; aprovação por link, checklist com fotos, kanban de pátio, WhatsApp automático, lembrete de manutenção, comissão de mecânicos, NPS) · REDE (usuários ilimitados; DRE completo, multi-unidades, NF-e/NFS-e, portal do cliente PWA, IA no orçamento). Upgrade imediato; downgrade só após o vencimento.
- **Permissões:** a tela mostra apenas as etapas da O.S. que o perfil pode executar. Revogar ou forçar aprovação: MASTER/ADMIN. Excluir O.S.: MASTER. Registrar entrega de O.S. antiga sem os dados: MASTER/ADMIN. Teto de desconto por perfil em peças e serviços.
- **Checklist:** toda O.S. nova de oficina com checklist (Pro, Rede ou Start com adicional ligado pelo superadmin) nasce com o checklist de entrada (basta uma informação) e só é entregue com o checklist de saída, a data, quem retirou e quem autorizou. O orçamento é um rascunho sem número até ser salvo.
- **Regras de estado:** O.S. entregue, faturada, cancelada ou reprovada não aceita mudança de itens; para ajustar, muda-se o status (reabrir desfaz o registro de entrega). A conclusão nunca é posterior à entrega.
- **Terminologia do domínio:** O.S., orçamento, laudo, solução, vistoria, retífica, chassi/VIN, pátio, entrega, TMO (tempo de mão de obra), VH (valor da hora).
- **Idioma:** PT-BR com acentuação completa em toda a interface, nos documentos e nas páginas públicas.
- **Tema:** claro e teal é o único tema do produto e da marca; não há seleção de tema pelo usuário.
- **Stack existente:** frontend em Vercel, API em Railway, PostgreSQL; multi-tenant com isolamento por oficina.
- **Pagamentos:** a assinatura do SigmaAuto passa pelo Mercado Pago; a cobrança do cliente da oficina passa pelo Asaas, com a chave da própria oficina (cifrada no servidor) e webhook por oficina.
- **Em aberto (não inventar):** NF-e/NFS-e, portal do cliente PWA e multi-unidades constam no plano REDE e não devem ser tratados como entregues sem confirmação no código.

## Brand Commitments

- Nome: **SigmaAuto** (domínio sigmaauto.com.br).
- Personalidade: premium e confiante; sério mas caprichado, com cara de produto pago e bem-acabado, não de ferramenta interna improvisada. Confiável, eficiente, polido. Nunca brincalhão, nunca frio ou burocrático.
- Voz: direta, em PT-BR do domínio automotivo, sem jargão de tecnologia. Mensagens de erro dizem o problema e o próximo passo, sem vazar implementação.
- Identidade: o acento verde-água (teal) é a assinatura, em **uma única superfície clara** que vale para app, páginas públicas, login e manual. O símbolo Σ do logotipo mantém seu tom quente como única nota de cor fora do teal.
- Anti-referências confirmadas: SaaS genérico com cara de IA; planilha crua; dashboard corporativo frio; app consumer "fofo" demais.

## Evidence on Hand

- `MANUAL_USUARIO.md` (manual 3.1, na ordem do menu, publicado em `/manual` como livro com índice, busca e PDF), `ROADMAP.md` (planos, perfis, infraestrutura), `COMPLIANCE.md`, `OPERACIONAL_SISTEMA.md`.
- Código real em `backend/` e `frontend/`; auditorias de design anteriores na raiz (`DESIGN_REVIEW_SISTEMA.md`, `DESIGN_CONTRAST_AUDIT.md`) e a crítica de 2026-10-11 em `.impeccable/critique/`.
- **Ausências a não fabricar:** depoimentos de clientes, número de oficinas ativas, benchmarks de tempo economizado e comparativos com concorrentes nomeados. Nada disso está registrado no repositório.

## Product Principles

1. **Mostrar o que fazer hoje.** Cada tela principal responde "o que precisa de mim agora?" antes de mostrar histórico: o Painel abre com uma fila de atenção; a O.S. abre com um botão primário para a próxima ação.
2. **O número do dono é verdade única.** Uma regra de receita, uma regra de permissão, um documento por momento do atendimento. Se duas telas discordam, ou um selo diz "ótimo" sem dados, o produto perde a confiança do dono.
3. **Cada perfil faz o que o sistema promete.** O que o perfil não pode fazer não aparece como opção; o que pode, funciona sem pedir ajuda.
4. **Velocidade do balcão antes de riqueza de recurso.** A O.S. avança em poucos toques, mesmo interrompida e sob pressa.
5. **Fala a língua da oficina.** Termos do domínio automotivo em PT-BR claro e bem acentuado; o cliente final entende o orçamento e o documento sem explicação.
6. **Legível a distância e com a mão suja.** O que vai ao TV de parede ou ao tablet de pátio é lido de longe e tocado sem precisão.

## Accessibility & Inclusion

WCAG 2.1 AA como piso: texto 4.5:1 ou mais, texto grande 3:1 ou mais, foco visível em todo controle interativo. Status nunca só por cor. Alvos de toque de 44px ou mais nas ações primárias (tablet no chão de oficina). `prefers-reduced-motion` respeitado. Texto mínimo de 11px renderizados no app e de 16px no modo TV. Legível a distância no TV da recepção.
