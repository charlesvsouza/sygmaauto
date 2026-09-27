# Melhorias nos relatórios e na Ordem de Serviço — Sigma Auto

> Documento de trabalho (27/09/2026). Serve de ponto de partida para a próxima sessão
> **no repositório do Sigma Auto**: ler, discutir com o dono, decidir e implementar.
> Baseado no que foi feito e aprendido no Sigma Horus entre 26 e 27/09/2026.

---

## 1. O que o Sigma Horus ensinou (e onde ver o código)

No Sigma Horus os relatórios foram padronizados em 26–27/09. Os aprendizados que se
aplicam aqui:

| Aprendizado | Como ficou no Sigma Horus | Arquivo de referência (em `C:\sygmahorus\apps\frontend`) |
|---|---|---|
| **Um componente, não cópias.** Havia 18 cópias do CSS de impressão, com 7 combinações de margem; cada ajuste tinha de ser repetido 18 vezes. | Um documento-base com cabeçalho, rodapé, tabelas e assinaturas; as telas só entregam o conteúdo. | `src/components/report/report-document.tsx` |
| **Três formatos, não um.** Nem tudo é "relatório". | **Relatório** (controle, tabelas, "Página X de Y"), **Documento oficial** (texto formal, fecho com local e data por extenso, assinaturas) e **Quadro de honra** (peça para expor). | `report-document.tsx`, `official-document.tsx`, `honor-board.tsx` |
| **O papel diz quem emitiu e quando.** | "Emitido em dd/mm/aaaa hh:mm por Fulano" no cabeçalho; o horário é o da impressão, no fuso de Brasília. | `report-document.tsx` (`useIssuedAt`) |
| **Rodapé paginado.** | "Página X de Y" e identificação do documento em toda folha, via `@page` (margin boxes). | `printCss()` em `report-document.tsx` |
| **Assinaturas com nome impresso.** | Linhas de assinatura com o nome de quem ocupa o cargo **na data do documento**; cargo vago sai em branco para assinar à mão. | `src/lib/report-signatories.ts` |
| **Folhas em branco (bug real).** 3 linhas saíam em 7 páginas. | O resto da tela era escondido com `visibility: hidden`, que **continua ocupando espaço**. Correção: `display: none` em tudo que não contém o documento, usando `:has()`. | comentário em `printCss()` |
| **Filtro aplicado ≠ filtro digitado.** | O cabeçalho do PDF mostrava o que estava no formulário, não o que tinha sido aplicado na consulta. | Razão por categoria, Extratos, Frequência |
| **CSV junto do PDF.** | Onde há tabela financeira, "Exportar CSV" com BOM e vírgula decimal (abre direto no Excel pt-BR) e os mesmos filtros da tela. | `src/lib/csv.ts` (`downloadCsv`, `csvNumber`) |
| **Documento certo para cada situação.** | Material emprestado → *Termo de responsabilidade*; material que passa a ser do obreiro (Potência, venda, doação) → *Termo de entrega*. A venda gera conta a receber pendente na Tesouraria. | `src/lib/material-supply.ts`, `dashboard/materiais` |
| **Provar antes de dizer que funciona.** | Contagem de páginas com Chrome headless numa página que imita o painel, usando o CSS extraído do próprio código; texto do PDF conferido com `pypdf`. | seção 6 abaixo |

---

## 2. Como o Sigma Auto está hoje (levantado em 27/09)

### 2.1 Caminhos de impressão (são vários, cada um com seu estilo)

| Onde | Como gera | Observação |
|---|---|---|
| **O.S. (servidor)** — `GET /service-orders/:id/pdf` | Puppeteer + template `backend/src/service-orders/templates/os-template.html`, preenchido por `generateOsPdf()` em `service-orders.service.ts` | Caminho oficial da O.S. |
| **O.S. (tela)** — `ServiceOrdersPage.tsx` | `window.print()` com CSS próprio (`#os-print-doc`, margem 8/10 mm) e `window.open` | Segundo formato de O.S., diferente do servidor |
| **Relatórios** — `ReportsPage.tsx` | Monta HTML no navegador e manda para `POST /pdf` (Puppeteer) | 6 tipos: O.S., DRE, DRE anual, Indicadores, Comissões, Ordem de compra |
| **DRE** — `DREPage.tsx` | `window.print()` com CSS próprio (`#dre-print`) | |
| **Financeiro** — `FinancialPage.tsx` | `window.print()` com CSS próprio (`#fin-print-doc`) | |
| **Comissões** — `CommissionsPage.tsx` | `window.open` + `document.write` + `window.print()` | |
| **Laudo** — `LaudoRetificaModal.tsx` | a verificar | |

Há também `backend/scripts/generate_os_reportlab.py` e `backend/src/pdf/pdf.service.ts`, com dois
serviços Puppeteer (`pdf/` e `service-orders/`), cada um com seu próprio navegador e suas margens.

### 2.2 Problemas encontrados (a confirmar na sessão)

**Prováveis bugs**
1. **Folhas em branco.** `DREPage`, `FinancialPage` e `ServiceOrdersPage` usam exatamente o padrão que
   causou o bug no Sigma Horus (`body * { visibility: hidden }` + documento `position: absolute`).
   Telas longas devem imprimir páginas vazias depois do conteúdo. **Testar** imprimindo com poucos registros.
2. **Hora errada no PDF da O.S.** `generateOsPdf()` usa `Intl.DateTimeFormat('pt-BR')` **sem `timeZone`**
   (em "gerado em" e em `formatDate`). No servidor (Railway, UTC), "gerado em" sai **3 horas adiantado**,
   e datas perto da meia-noite caem no dia seguinte. Corrigir com `timeZone: 'America/Sao_Paulo'`.
3. **Texto do cliente vai cru para o HTML.** O template substitui `{{campo}}` sem escapar HTML. Um nome
   ou uma reclamação com `<`, `&` ou `"` quebra o layout. Além disso, `String.replace` interpreta `$&`,
   `$1` etc. no valor, o que pode corromper o texto. Escapar os valores e usar replace com função.
4. **Status em código.** O PDF da O.S. imprime `order.status` como está no banco (ex.: `EM_DIAGNOSTICO`);
   a tela de relatórios já tem `STATUS_LABEL`, mas o servidor não usa.

**Padrão e acabamento**
5. **Número da O.S. é um pedaço do id** (`B8AB0A72`), não um número sequencial. ERP de oficina usa
   numeração sequencial por empresa (ex.: O.S. 2026/000123), que o cliente consegue citar por telefone.
6. **Nenhum PDF tem "Página X de Y"** (o Puppeteer está sem `displayHeaderFooter`/`footerTemplate`).
7. **Estilos divergentes.** A O.S. existe em pelo menos dois formatos (servidor e tela). O PDF de exemplo
   `os-B8AB0A72.pdf` (maio) tem texto de autorização, "Consultor técnico" e coluna de referência da peça,
   que o template atual não tem.
8. **"Emitido por" não aparece** em nenhum documento (só "gerado em").
9. **Sem exportação para planilha** nos relatórios financeiros (DRE, comissões, financeiro).

### 2.3 Leva 1 — resultado (27/09)

- **Correção do levantamento:** DRE, Financeiro, Relatórios, Laudo e O.S. (tela) **já geram o PDF no servidor**
  (`POST /pdf/render`); o único `window.print()` restante é o de Comissões, numa janela só com o documento.
  O bug das folhas em branco **não se reproduz**: relatório com 3 linhas → 1 página; com 200 → 5 páginas, todas as linhas presentes.
- **Corrigidos** (bugs 2, 3, 4 e 6): fuso de Brasília (`common/pdf-format.ts`), escape de HTML inclusive `{{ }}`
  e `$1`/`$&`, status por extenso, "Página X de Y" nos dois serviços Puppeteer (`footerLabel` opcional no `/pdf/render`).
- **Bug extra encontrado:** o template da O.S. escrevia `R$ {{total}}` com valor já formatado → "R$ R$ 100,00". Corrigido.
- Provado com PDF real + `pypdf` (nome `João <b>Negrito</b> & Filhos $1 $& {{total}}` sai literal; 23:30 UTC → 20:30).

---

## 3. Proposta: padrão de relatório

Mesma ideia do Sigma Horus, adaptada à arquitetura daqui (**PDF gerado no servidor com Puppeteer**):

1. **Um único serviço de PDF** no backend (juntar `pdf/pdf.service.ts` e `service-orders/pdf.service.ts`),
   com um **layout-base HTML** que recebe o conteúdo de cada relatório:
   - cabeçalho: logo, nome da oficina, CNPJ, endereço e contato, título do documento, período e filtros
     aplicados, "Emitido em … por …" no fuso de Brasília;
   - rodapé do Puppeteer (`displayHeaderFooter: true` + `footerTemplate`): oficina · documento ·
     **Página X de Y** (`<span class="pageNumber">` / `<span class="totalPages">`);
   - estilo de tabela único, linha de total, A4 retrato ou paisagem por relatório.
2. **Uma única forma de imprimir no frontend:** tudo passa pelo servidor. As telas com `window.print()`
   (DRE, Financeiro, O.S. na tela, Comissões) passam a pedir o PDF ao backend. Isso elimina o bug das
   folhas em branco e as diferenças de estilo. Se alguma tela precisar continuar no navegador, aplicar a
   correção `display: none` + `:has()` do Sigma Horus.
3. **Exportar CSV/Excel** ao lado de "Gerar PDF" em DRE, DRE anual, Comissões, Financeiro e Ordens de compra.
4. **Nomes de arquivo previsíveis:** `OS-2026-000123-PLACA.pdf`, `DRE-2026-09.pdf`.

---

## 4. Proposta: novo formato de Ordem de Serviço

Separar os **documentos do ciclo do veículo**, como no Sigma Horus foram separados o termo de
responsabilidade e o termo de entrega. Cada um tem finalidade e assinatura próprias:

| Documento | Quando | Conteúdo essencial | Quem assina |
|---|---|---|---|
| **Ordem de Serviço / Entrada** (check-in) | Recepção do veículo | Cliente, veículo (placa, chassi, KM, combustível), reclamação, **vistoria de entrada** (avarias, objetos no veículo, fotos), prazo previsto | Cliente e consultor |
| **Orçamento** | Após o diagnóstico | Diagnóstico, serviços (mão de obra em horas) e peças (referência, marca, original ou paralela), validade do orçamento, prazo de execução, condições de pagamento, texto de autorização | Cliente (aprovação, com data; aproveitar a aprovação por link que já existe) |
| **O.S. de execução** (oficina) | Durante o serviço | Itens aprovados, técnico responsável por item, tempos, peças aplicadas, **sem valores** (cópia do chão de oficina) | Técnico |
| **Termo de entrega / Recibo** | Entrega do veículo | Serviços executados, peças trocadas (e destino das peças substituídas), KM de saída, valor pago e forma de pagamento, **garantia** (prazo por serviço e por peça; o CDC exige no mínimo 90 dias para serviço) | Cliente (retirada) e oficina |

**Melhorias de conteúdo** (valem para todos):
- **Número sequencial** por oficina e ano, com o tipo de documento no título.
- **Status por extenso**, com a data de cada etapa (abertura, aprovação, conclusão, entrega).
- **Peças com referência/código, marca e procedência** (a O.S. antiga tinha a coluna *Referência*).
- **Mão de obra em horas × valor/hora**, separada de serviço de terceiro.
- **Totais claros:** serviços, peças, descontos (por item e geral, que já existem), total, **valor pago e saldo**.
- **Textos legais configuráveis por oficina** (autorização, garantia, responsabilidade por objetos),
  como a fórmula de abertura configurável do Sigma Horus. Hoje o texto de autorização estava fixo no
  formato antigo.
- **QR code / link** para o cliente acompanhar ou aprovar o orçamento (aproveitar o token de aprovação).
- **Assinatura do técnico com o nome impresso** (quem executou), não só uma linha genérica.

---

## 5. Perguntas para decidir com o dono antes de implementar

1. A oficina quer **documentos separados** (entrada, orçamento, execução, entrega) ou **uma O.S. só**
   que muda de título conforme a fase? A separação é o padrão das oficinas maiores; a O.S. única é mais simples.
2. **Numeração sequencial:** por ano (2026/000123) ou contínua? Começa do zero ou de um número informado
   (oficina que migra de outro sistema)?
3. **Vistoria de entrada:** checklist fixo (combustível, estepe, macaco, rádio, avarias por região do
   carro) ou livre? Com fotos?
4. **Garantia:** prazo padrão por serviço e por peça, configurável? Aparece no termo de entrega?
5. **Cópia da oficina sem valores** para o chão de oficina: é útil?
6. **Relatórios:** quais são os mais usados no dia a dia, para começar por eles? Quais precisam de planilha?
7. Existe exigência de **nota fiscal de serviço** que o documento precise referenciar?

---

## 6. Plano sugerido (em levas, como no Sigma Horus)

1. **Correções rápidas** (independem das decisões): fuso de Brasília nas datas do PDF, escapar o HTML dos
   campos, status por extenso, "Página X de Y" no Puppeteer, e testar as folhas em branco nas telas com
   `window.print()`.
2. **Base única de PDF** no backend + migração dos 6 relatórios da `ReportsPage` e das telas DRE,
   Financeiro e Comissões; CSV nos financeiros.
3. **Novo formato de O.S.** conforme as decisões da seção 5, começando pelo orçamento e pelo termo de
   entrega (os dois que o cliente leva para casa).
4. **Manual do usuário** atualizado (`MANUAL_USUARIO.md`).

**Como provar cada leva:**
- Gerar o PDF real pelo endpoint e contar as páginas (`pypdf`).
- Conferir o texto extraído: cabeçalho, totais, "Página X de Y", data no fuso certo.
- Testar com poucos registros (folhas em branco) e com muitos (quebra de página, cabeçalho de tabela
  repetido, linha que não racha no meio).
- Testar com um nome de cliente contendo `&`, `<` e `$1`.
- Rodar o checklist completo do CI antes do push (lint, testes, build), não só o `tsc`.

---

*Referências cruzadas: histórico completo em `C:\sygmahorus\historico_de_desenvolvimento.md`
(sessões de 26 e 27/09/2026).*
