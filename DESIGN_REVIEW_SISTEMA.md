# Review de Design — Sistema SygmaAuto
Arquivo consolidado de análise visual/UX por superfície do sistema, gerado a partir de varredura estática do frontend.

## Escopo analisado
- Layout global, telas públicas, autenticação, dashboard, atendimento, oficina, financeiro, relatórios, admin e modais reutilizáveis.
- Método: inspeção de código fonte TSX + referência de tema Linear já aplicado em ServiceOrdersPage.

## 1. Consistência de tema
Achado principal: há dois sistemas visuais coexistindo.
- ServiceOrdersPage já adota tom dark premium, superfícies neutras e acento dourado.
- O restante do app ainda depende de slate/indigo/violet/blue/amber como cor estrutural.

Impacto: identidade diluída, sensação de produto fragmentado.

Sugestão: adotar `surface` como base e `gold` como acento único para todo o app. Tolerar `emerald/red/amber` apenas para estado: sucesso, erro, aviso.

## 2. Tela x Tela — achados por grupo

### 2.1 Público e autenticação
Arquivos: LandingPage, LoginPage, RegisterPage, ForgotPasswordPage, Splash/Welcome.
- Login já tem direção interessante: fundo escuro, cartão translúcido, foco no form. Bom ponto de partida.
- Landing mantém identidade própria, mas usa muito glassmorphism/blur. Isso cria peso visual e custo de renderização.
- Falta convergência entre Landing e app logado: login azul/escuro, app interno com tons neutros variados.

Sugestão: manter landing emocional, mas reduzir blur; definir bridge visual pelo header/logo e CTA.

### 2.2 Layout e navegação
Arquivos: Layout.tsx, sidebar/mobile menu.
- Sidebar fixa com agrupamentos temáticos; isso é bom para escaneabilidade.
- Ainda usa slate extensivamente e avatares/ícones sem tratamento consistente de contraste.
- Badges de plano usam purple/amber como identificadores; ok se forem semânticos, ruins se forem identidade.

Sugestão: padronizar sidebar em fundo escuro neutro, usar gold só para estado ativo e gold para premium.

### 2.3 Atendimento / OS
Arquivos: ServiceOrdersPage, AgendaPage, CustomersPage, VehiclesPage.
- ServiceOrdersPage está mais consistente.
- AgendaPage mistura slate/violet/indigo/blue/amber e usa `alert()` em fluxo.
- CustomersPage e VehiclesPage seguem padrão light/core anterior, destoando do Dark.

Sugestão: migrar essas páginas para `surface` + `gold`, mantendo `red/emerald` só para erro/positivo.

### 2.4 Oficina / Kanban
Arquivos: ServicesPage, InventoryPage, KanbanPage, KanbanRecepcaoPage, KanbanRetificaPage, RetificaMotoresPage, MetrologiaModal, ChecklistModal, ImportOSModal, ImportNFModal, LaudoRetificaModal.
- Kanban e retífica usam muito slate/violet/indigo/amber; repetição de `tracking-widest` e `backdrop-blur`.
- Modais reutilizáveis repetem padrões parecidos, mas sem componentes unificados.
- Tela cheia/TV é tratada, o que é bom.

Sugestão: criar variantes dark e light claras, mas padronizar cores semânticas iguais; evitar duplicação de estilos por modal.

### 2.5 Financeiro / DRE / KPIs / Comissões / Relatórios / NPS
Arquivos: FinancialPage, DREPage, KPIsPage, CommissionsPage, ReportsPage, NpsPage, NpsAnswerPage.
- Telas densas, com muitos `slate`, `tracking-widest`, `alert()`.
- Gráficos e cartões repetem estilos sem biblioteca visual comum.
- Alto risco de “data slop” porque há muita métrica sem destaque hierárquico.

Sugestão: criar padrão de KPI card, limitar headlines por seção e remover alertas; usar toast/banner in-page.

### 2.6 Admin e suporte
Arquivos: SuperAdminPage, SuperAdminLoginPage, SettingsPage, MaintenancePage, SupportPage, UserManualPage.
- Admin/security usa destaque em vermelho/azul ok, mas inconsistente com app.
- Settings, maintenance e support ainda com estética anterior.

Sugestão: sistema deve ter identidade única; reservar vermelho/azul só para estados funcionais.

## 3. Padrões problemáticos repetidos
- `alert()` confirmando ações em várias páginas.
- `backdrop-blur` excessivo em páginas públicas e modais.
- `tracking-widest` e peso de fonte alto como substituto de hierarquia.
- Falta de componentes unificados para: card, chip, modal, toast, empty state.

## 4. Pontos positivos a preservar
- Modos especiais preservados: kanban tela cheia, retífica, recepção/TV.
- ServiceOrdersPage com fluxo rico, status claro e ações contextuais mantidas após migração.
- Uso de ícones e emojis limitados; estrutura por grupos de navegação faz sentido operacional.

## 5. Plano sugerido de unificação
1. Tokens: fechar `surface` + `gold` + estados semânticos.
2. Componentes base: criar `Card`, `Chip`, `Modal`, `Toast`, `EmptyState`.
3. Migração por onda: admin, atendimento, financeiro, oficina.
4. Remover `alert()` dos fluxos principais.
5. Reduzir glassmorphism para superfícies opacas + sombra.
6. Homens de impressão e PDF também devem consumir os mesmos tokens; senão identidade quebra no papel.

## 6. Próximo passo recomendado
Quer que eu gere um artefato de comparação visual tipo 3 variantes para a identidade consolidada? Ou você prefere seguir evoluindo o código gradualmente?
