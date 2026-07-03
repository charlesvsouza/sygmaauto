# 04 - Status do Sistema (SigmaAuto)

Data: 2026-05-03 (atualizado)
Branch: master

## Objetivo deste registro
- Registrar implementação do módulo de Relatórios Gerenciais (Sprint 2).
- Documentar novos endpoints de backend e nova página de frontend.
- Registrar melhorias v2 do DRE e novos KPIs de indicadores financeiros.

---

## Resumo da rodada

- Implementados **6 tipos de relatório gerencial** (4 originais + DRE Anual + Indicadores KPI).
- Nova página `/reports` adicionada ao sistema (sidebar + rota protegida).
- 4 endpoints de backend: `GET /financial/os-report`, `GET /inventory/purchase-projection`, `GET /financial/dre-anual`, `GET /financial/indicadores`.
- Fix de bug em cadastro de usuários (recoveryEmail vazio + campos extras no payload).
- **Bug fix DRE:** impressão exibia preview vazio — div `#dre-print` não estava no DOM.
- **Melhoria DRE:** seletor de mês e ano via dropdowns (antes: apenas chevrons).
- **Fix crítico:** `applyMissingMigrations()` com try/catch individual por statement — erro em `service_order_items` não bloqueava mais as colunas de `service_orders`.

---

## Relatórios Implementados

### 1. Relatório de OS por Período
- Endpoint: `GET /financial/os-report?startDate=&endDate=&status=`
- Retorna: lista de OS, KPIs (total, faturadas, receita, ticket médio), breakdown por status, top 10 clientes por faturamento.

### 2. DRE — Demonstrativo de Resultado Mensal
- Usa endpoint existente: `GET /financial/dre?year=&month=`
- Exibe: receita bruta, deduções (8%), receita líquida, CMV, margem bruta, despesas por categoria, EBITDA, histórico 6 meses.

### 3. DRE — Anual (novo)
- Endpoint: `GET /financial/dre-anual?year=`
- Agrega todos os 12 meses do ano; retorna evolução mensal + totais consolidados + despesas por categoria.

### 4. Indicadores KPI (novo)
- Endpoint: `GET /financial/indicadores`
- Retorna KPIs para 5 períodos em paralelo: mês atual, trimestre, semestre, semestre anterior e anual.
- Cada período: Receita Bruta, Receita Líquida, Margem Bruta (%), EBITDA (%), OS Entregues, Ticket Médio.

### 5. Relatório de Comissões
- Usa endpoint existente: `GET /commissions?startDate=&endDate=&workshopArea=`
- Exibe: totais (total / pendente / pago), ranking por colaborador com OS executadas e valor de comissão.

### 6. Projeção de Pedido de Compra
- Endpoint: `GET /inventory/purchase-projection`
- Lógica: analisa movimentações de saída dos últimos 90 dias, calcula giro mensal médio, classifica urgência.
- Urgência: CRITICO (sem estoque), URGENTE (abaixo do mínimo), ATENCAO (cobertura < 1,5 meses).
- Retorna: lista de peças com qtd sugerida e custo estimado de reposição.

---

## Funcionalidade PDF

- Botão **Visualizar PDF**: abre modal de pré-visualização em formato A4 com o documento formatado.
- Botão **Imprimir**: aciona `window.print()` com CSS `@media print` — oculta todo o app, exibe apenas o documento.
- Cabeçalho automático: nome da oficina, CNPJ, endereço, telefone, email.
- Rodapé com linha para assinatura e data de geração.
- **DREPage.tsx:** div `#dre-print` agora é sempre renderizada no DOM (hidden via CSS `@media screen`), garantindo que `window.print()` encontre o conteúdo.

---

## Novos Endpoints Backend

| Endpoint | Módulo | Descrição |
|---|---|---|
| `GET /financial/os-report` | FinancialController | Relatório de OS com filtros de período e status |
| `GET /financial/dre-anual` | FinancialController | DRE consolidado do ano com evolução mensal |
| `GET /financial/indicadores` | FinancialController | KPIs financeiros: mês, trimestre, semestre, sem. ant., anual |
| `GET /inventory/purchase-projection` | InventoryController | Projeção de compra por giro e estoque mínimo |

---

## Arquivos Alterados / Criados

| Arquivo | Tipo | Alteração |
|---|---|---|
| `backend/src/financial/financial.service.ts` | modificado | `getOSReport()`, `getDREAnual()`, `getIndicadores()` |
| `backend/src/financial/financial.controller.ts` | modificado | Endpoints DRE anual e Indicadores |
| `backend/src/prisma/prisma.service.ts` | modificado | `exec()` helper + try/catch individual por statement + nome correto `service_order_items` |
| `backend/release.js` | modificado | Correção do nome da tabela `service_order_items` |
| `backend/src/inventory/inventory.service.ts` | modificado | `getPurchaseProjection()` |
| `backend/src/inventory/inventory.controller.ts` | modificado | Endpoint `GET /inventory/purchase-projection` |
| `frontend/src/pages/DREPage.tsx` | modificado | Fix print, seletor mês/ano, div `#dre-print` no DOM |
| `frontend/src/pages/ReportsPage.tsx` | modificado | 2 novos tipos: DRE Anual + Indicadores KPI |
| `frontend/src/api/client.ts` | modificado | `getDREAnual()` e `getIndicadores()` em `reportsApi` |
| `frontend/src/components/Layout.tsx` | modificado | Item "Relatórios" na sidebar |
| `frontend/src/App.tsx` | modificado | Rota `/reports` |

---

## Sprint 2 — Estado Atual

| Feature | Status |
|---|---|
| Comissão de Mecânicos (backend) | ✅ implementado — ⚠️ tabelas ausentes em produção |
| Relatórios Gerenciais com PDF | ✅ implementado |
| Lembrete de Manutenção Preventiva | ⏳ próxima entrega |
| NPS Automático | ⏳ planejado |

---

## Próximo registro
- 05_STATUS_SISTEMA.md (ao implementar Lembrete de Manutenção Preventiva)
