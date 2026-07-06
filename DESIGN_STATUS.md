# SygmaAuto — Status do Design System / Interface

Documento vivo com o **problema encontrado**, a **solução aplicada**, o **status atual** e os **próximos passos** da repaginação da interface. Última atualização após o commit `2f96a72`.

---

## 1. Linha do tempo (resumo)

1. **Migração para dark premium + gold** (Camadas 0–5, commits `d5b3fe6`…`d032405`): app inteiro padronizado em tokens `surface` + `gold`, componentes-base (`Button/Card/Chip/Modal/Toast/EmptyState`), `alert()` → `useToast()`.
2. **Virada para tema CLARO + verde-água** (padrão "Oficina Integrada", commit `7713253` em diante): reconstrução da cor em **variáveis CSS semânticas**, tema claro como padrão e escuro opcional.
3. **Grades estilo ERP** (`8056b5d`, `ec7f0fa`): listas com busca fixa + rolagem própria.
4. **Lote de 8 correções de feedback** (`5e1a058`…`5d11ed1`).
5. **Ajuste fino** (`ec7f0fa`…`2f96a72`): escala menor, correção da tela de OS, login, contraste, e itens P1–P3 do critique.

---

## 2. Problemas encontrados e soluções

### 2.1 Tema muito escuro / pouco amigável, cards arredondados demais, "tudo colado"
- **Problema:** identidade dark premium ficou pesada; cards com raio 24–40px; sensação de caixas flutuando.
- **Solução:** tema **claro verde-água** por padrão; raio reduzido para 6–8px; painéis brancos com borda fina (`--line`) e sombra sutil. Cor centralizada em **variáveis CSS** (`--app/--panel/--ink/--muted/--line/--accent/--sidebar`), o que também **faz o seletor de tema da aba Configurações funcionar** (Claro/Escuro via `[data-theme]`).

### 2.2 Listas longas exigiam rolar a página inteira
- **Problema:** Serviços/Produtos/Clientes/Veículos com uma tabela única gigante; a busca sumia ao rolar.
- **Solução:** **grade estilo ERP** — toolbar de busca sempre visível + lista completa que rola no próprio container com **cabeçalho de coluna grudado** (`sticky thead`). Ações de linha sempre visíveis (não só no hover).

### 2.3 Botões brancos com texto invisível (tema claro)
- **Problema:** botões primários usavam `bg-accent text-surface-950` (texto quase-branco no teal, contraste ~2,8:1) e vários botões herdados eram `bg-surface-900 text-white` que, com a escala `surface` invertida no claro, viravam **branco no branco**.
- **Solução:** acento verde-água **aprofundado** (`#1f9d8f` → `#0d7d6e`) para passar AA com texto branco; varredura trocando esses botões para `bg-accent text-white`. (commit `e8573e4`)

### 2.4 Tela de Ordens de Serviço aparecia ESCURA com caixas brancas (texto invisível)
- **Problema (causa-raiz):** a `ServiceOrdersPage` foi escrita com a **convenção clara** de `surface` (50=claro, 900=escuro), oposta ao resto do app. Como o tema claro **inverte** a escala `surface`, essa tela "flipou" para escuro e seus campos `bg-surface-900` viraram caixas brancas.
- **Solução:** **reversão dos números de `surface` apenas nessa página** (50↔950, 100↔900, …), devolvendo o visual claro correto. (commit `ec7f0fa`)

### 2.5 Interface grande demais
- **Problema:** tudo ~15% maior do que o desejado.
- **Solução:** `font-size` da raiz em **85%** (escala tudo que é `rem`) + altura mínima de controles 44→38px. (commit `ec7f0fa`)

### 2.6 Logo do login sumindo
- **Problema:** no tema claro o logo branco+dourado sumia; a tentativa anterior deixou-o azul.
- **Solução:** card de login volta a ser **escuro** (`data-theme="dark"`) e o logo volta ao **branco+dourado** da landing. (commit `ec7f0fa`)

### 2.7 Landing muito grande
- **Problema:** hero e caixas gigantes.
- **Solução:** hero `clamp(…,9vw,5.2rem)` → `(…,5.2vw,3.4rem)`, títulos `text-4xl→3xl`, `py-20→14`, etc. (commit `ba173bb`)

### 2.8 Nome fantasia divergente nos relatórios
- **Problema:** relatórios priorizavam `tradeName` (valor de lookup de CNPJ) em vez do Nome Fantasia configurado, que fica em `tenant.name`.
- **Solução:** todos os cabeçalhos passam a priorizar `name`. (commits `7d682d2`, `5d11ed1`)

### 2.9 Itens do critique (Impeccable) — P1/P2
- **P1 contraste kanban:** chips de status ficaram escuro-sobre-escuro; texto voltou para claro (`text-HUE-300/400`) dentro do escopo `data-theme="dark"`.
- **P2 tells:** wordmark da Welcome deixou de usar gradient-clip; gradiente violeta do Dashboard Retífica → teal.
- **P2 eyebrows:** 34 rótulos `font-black uppercase tracking-widest` → `font-semibold … tracking-wide`.
- **P3 alturas de lista:** o `calc(100vh - Npx)` frágil foi substituído por **shell flex** (conteúdo com scroll próprio, `flex-1`). (commits `caeb352`, `2f96a72`)

---

## 3. Arquitetura de tema (como está hoje)

- **Tokens semânticos em variáveis CSS** (`frontend/src/index.css`): `--app`, `--panel`, `--panel-2`, `--line`, `--ink`, `--muted`, `--faint`, `--accent(+hover/fg/soft)`, `--sidebar`. Dois temas: `:root`/`[data-theme=light]` (claro verde-água, padrão) e `[data-theme=dark]` (escuro, opcional e usado de propósito nos kanbans/login).
- **Compat:** `surface`/`gold`/`base` do Tailwind seguem as variáveis (invertidos no claro) para não quebrar o código existente.
- **Seletor de tema:** `frontend/src/lib/themePresets.ts` grava `[data-theme]` no `<html>` (Configurações → Aparência).
- **Componentes-base:** `frontend/src/components/ui/` (`Button, Card, Chip, Modal, EmptyState, Toast, CollapsiblePanel`).
- **Escala global:** `html { font-size: 85% }`.

---

## 4. Status atual

| Área | Status |
|------|--------|
| Tema claro verde-água (padrão) + escuro (opcional) | ✅ funcional, seletor na Settings |
| Escala ~15% menor | ✅ (`font-size 85%`) |
| Grades ERP: Clientes, Veículos, Serviços, Estoque, Usuários | ✅ busca fixa + lista com scroll + header grudado |
| Ordens de Serviço no claro | ✅ corrigida (reversão de surface) |
| Contraste de botões/textos (claro) | ✅ acento aprofundado + sweep |
| Login/Register escuros + logo branco/dourado | ✅ |
| Landing reduzida | ✅ |
| Nome fantasia nos relatórios | ✅ |
| Itens P1–P3 do critique | ✅ |
| Detector Impeccable | 14 → **9** avisos (restantes são falsos-positivos: `Arial` em templates de PDF, `border-l` de toast/blockquote) |
| Build (`npm run build`) | ✅ verde em todos os commits |

**Tudo commitado e no `origin/master`.**

---

## 5. Pendências / pontos a verificar

- **Verificação visual do shell flex (P3):** a mudança do modelo de scroll do Layout (`2f96a72`) precisa de conferência em: Ordens de Serviço (duas colunas `h-[calc(100vh-120px)]`), Kanbans (`min-h-screen`), e telas densas (Relatórios/Financeiro) em resoluções variadas. Se algo regredir, o commit é isolado e reverte fácil.
- **Calibração da escala 85%:** ícones (px) e alguns `text-[Npx]` não acompanham o `rem`; se ficar desproporcional, ajustar num único número.
- **Consistência da tela de OS:** hoje ela usa convenção própria de `surface` (revertida). Funciona, mas seus cabeçalhos de seção ficam barras escuras enquanto o resto do app tem cabeçalho claro — vale unificar depois.

## 6. Próximos passos sugeridos

1. **Confirmar visualmente** o shell flex (P3) e a escala 85% nas telas críticas; calibrar se preciso.
2. **Unificar a ServiceOrdersPage** ao padrão claro das demais (migrar de vez para os tokens semânticos, em vez da reversão numérica).
3. **Aplicar a grade ERP** às demais listas densas que ainda não têm (ex.: Relatórios, DRE, alguns painéis).
4. **Refino tipográfico/peso:** revisar `font-black`/`uppercase` remanescentes fora dos eyebrows.
5. **Rodar `/code-review`** no diff acumulado (muitos arquivos) e, opcionalmente, o **`impeccable critique` formal pontuado** para fechar o ciclo.
6. **Deploy/validação em produção** (Railway) após a conferência visual.
