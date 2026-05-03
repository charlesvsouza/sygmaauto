# 04 - Status do Sistema (SigmaAuto)

Data: 2026-05-03
Branch: master

## Objetivo deste registro
- Registrar implementação do módulo de Relatórios Gerenciais (Sprint 2).
- Documentar novos endpoints de backend e nova página de frontend.

---

## Resumo da rodada

- Implementados **4 tipos de relatório gerencial** com visualização como PDF e impressão.
- Nova página `/reports` adicionada ao sistema (sidebar + rota protegida).
- 2 novos endpoints de backend: `GET /financial/os-report` e `GET /inventory/purchase-projection`.
- Fix de bug em cadastro de usuários (recoveryEmail vazio + campos extras no payload).

---

## Relatórios Implementados

### 1. Relatório de OS por Período
- Endpoint: `GET /financial/os-report?startDate=&endDate=&status=`
- Retorna: lista de OS, KPIs (total, faturadas, receita, ticket médio), breakdown por status, top 10 clientes por faturamento.

### 2. DRE — Demonstrativo de Resultado
- Usa endpoint existente: `GET /financial/dre?year=&month=`
- Exibe: receita bruta, deduções (8%), receita líquida, CMV, margem bruta, despesas por categoria, EBITDA, histórico 6 meses.

### 3. Relatório de Comissões
- Usa endpoint existente: `GET /commissions?startDate=&endDate=&workshopArea=`
- Exibe: totais (total / pendente / pago), ranking por colaborador com OS executadas e valor de comissão.

### 4. Projeção de Pedido de Compra
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
- Filosofia de layout consistente com FinancialPage e ServiceOrdersPage.

---

## Novos Endpoints Backend

| Endpoint | Módulo | Descrição |
|---|---|---|
| `GET /financial/os-report` | FinancialController | Relatório de OS com filtros de período e status |
| `GET /inventory/purchase-projection` | InventoryController | Projeção de compra por giro e estoque mínimo |

---

## Arquivos Alterados / Criados

| Arquivo | Tipo | Alteração |
|---|---|---|
| `backend/src/financial/financial.service.ts` | modificado | Método `getOSReport()` |
| `backend/src/financial/financial.controller.ts` | modificado | Endpoint `GET /financial/os-report` |
| `backend/src/inventory/inventory.service.ts` | modificado | Método `getPurchaseProjection()` |
| `backend/src/inventory/inventory.controller.ts` | modificado | Endpoint `GET /inventory/purchase-projection` |
| `frontend/src/pages/ReportsPage.tsx` | criado | Página principal de relatórios |
| `frontend/src/api/client.ts` | modificado | `reportsApi` adicionado |
| `frontend/src/App.tsx` | modificado | Rota `/reports` |
| `frontend/src/components/Layout.tsx` | modificado | Item "Relatórios" na sidebar |
| `backend/src/users/dto/user.dto.ts` | modificado | Fix recoveryEmail vazio (@Transform) |
| `frontend/src/pages/UsersPage.tsx` | modificado | Fix payload update (remove commissionPercent/chiefId) |

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
