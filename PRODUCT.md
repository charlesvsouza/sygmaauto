# Product

## Register

product

## Users

Donos e equipe de oficinas mecânicas brasileiras (pequenas e médias). Perfis com papéis distintos — MASTER/dono, ADMIN, GERENTE, SECRETÁRIA, MECÂNICO, PRODUTIVO, FINANCEIRO — usando o sistema no balcão da recepção, no chão de fábrica (tablet, mãos sujas) e em um TV de parede (modo recepção/kanban). Contexto de uso é operacional e apressado: registrar ordens de serviço, acompanhar o fluxo de reparos, cobrar, controlar estoque e clientes ao longo do dia.

O trabalho a ser feito: **manter a oficina rodando sem fricção** — abrir/atualizar OS rápido, saber o estado de cada carro, faturar e receber, e não perder tempo com software. A maioria não é técnica em tecnologia; confiança e clareza importam mais que profundidade de recursos.

## Product Purpose

SaaS multi-tenant (assinatura via Mercado Pago) para gestão completa de oficinas mecânicas: ordens de serviço, clientes, veículos, serviços, estoque, financeiro (livro caixa, DRE, contas), usuários/permissões e relatórios em PDF. Inclui também uma linha de produto para retífica de motores (fluxo de status próprio, metrologia por cilindro, laudo técnico), comissão de mecânicos, WhatsApp automático por evento da OS e orçamento assistido por IA. Sucesso = a oficina opera o dia inteiro dentro do sistema sem cair para papel/planilha, e o dono confia nos números para cobrar e decidir.

## Brand Personality

**Premium e confiante.** Sério mas caprichado — sensação de produto pago e bem-acabado, não de ferramenta interna improvisada. O acento verde-água (teal) é a assinatura da identidade. Voz direta em PT-BR do domínio automotivo (OS, orçamento, laudo, retífica), sem jargão de tecnologia. Cada controle deve inspirar confiança: o operador confia que o botão faz o que diz. Tom: **confiável · eficiente · polido** — nunca brincalhão, nunca frio/burocrático.

## Anti-references

- **SaaS genérico com cara de IA**: gradientes roxos, cards idênticos repetidos, eyebrows uppercase tracking-widest em toda seção, hero-metric template.
- **Planilha/Excel cru**: densidade sem hierarquia, tudo cinza, tabelas sem respiro nem foco visual.
- **Dashboard corporativo frio**: tom clínico/impessoal, azul-marinho de banco, sensação de software burocrático.
- **App consumer "fofo" demais**: excesso de ilustrações, cantos super-arredondados (24px+), tom brincalhão que não combina com ferramenta de trabalho.

## Design Principles

1. **Confiança em cada controle.** Um vocabulário de componentes só (um chip, um modal, um botão). Nada "sutilmente errado" que faça o operador hesitar.
2. **Velocidade operacional acima de decoração.** Layouts densos com hierarquia clara; a busca e as ações principais sempre visíveis. O sistema serve o fluxo, não o contrário.
3. **Identidade carregada pelo acento, não pelo ruído.** O teal e a tipografia carregam a marca; peso/tamanho carregam hierarquia — não uppercase + tracking em tudo.
4. **Legível a distância e com pressa.** Funciona no balcão, no tablet engordurado e no TV da recepção. Contraste real (AA), alvos de toque adequados, estados de status legíveis à distância.
5. **Fala a língua da oficina.** Domínio automotivo em PT-BR claro; mensagens de erro dizem o problema E o próximo passo, sem vazar implementação.

## Accessibility & Inclusion

WCAG 2.1 AA como piso: texto ≥4.5:1, texto grande ≥3:1, foco visível em todo controle interativo. Status nunca só por cor (backup de texto/forma). Alvos de toque ≥44px para ações primárias (uso em tablet no chão de fábrica). `prefers-reduced-motion` respeitado. Tema claro (verde-água) como padrão e tema escuro opcional; ambos precisam passar AA.
