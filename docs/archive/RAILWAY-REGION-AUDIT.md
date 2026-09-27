# Auditoria de região Railway × Vercel (pós-incidente Sigma Horus)

> **Status no SigmaAuto (13/09/2026): resolvido.** O Postgres ativo (`Postgres-geEZ`) está em `us-east4`, mesma
> região das Functions Vercel (`iad1`). Detalhes na nota de infraestrutura do `ROADMAP.md`.

> Gerado em 2026-08-31 a partir da migração de região feita no projeto Sigma
> Horus. Este arquivo foi copiado para os diretórios de outros projetos que
> compartilham a mesma conta Railway, para checarmos um por um.

## O que aconteceu no Sigma Horus

Sintoma relatado: um gap perceptível (mais que "alguns milissegundos") ao
navegar entre abas do dashboard. Causa raiz encontrada:

- As **Functions do Vercel** rodam em `iad1` (Washington D.C. / Virgínia, US East).
- O **Postgres do Railway** rodava em `asia-southeast1` (Sudeste Asiático).
- Toda navegação faz pelo menos uma query Prisma → cada troca de aba pagava
  a ida-e-volta inteira EUA ↔ Sudeste Asiático (~270-290ms só de handshake TCP).

**Causa raiz de verdade** (não era o projeto, era a conta inteira): o campo
`preferredRegion` do **workspace Railway** (`Charles Vasconcelos de Souza's
Projects`) estava configurado como `asia-southeast1-eqsg3a`. Isso faz **todo
serviço novo criado em qualquer projeto dessa conta** nascer no Sudeste
Asiático por padrão, a não ser que seja movido manualmente.

Região correta para esta conta: **`us-east4`** (Railway) — é literalmente a
mesma região física (`iad`, Ashburn/VA) do `iad1` do Vercel, e a melhor opção
disponível pra usuários no Brasil (Railway não tem região na América do Sul).

## Como descobrir se um projeto está com o problema

```bash
# 1. Região das Functions do Vercel (rode dentro do projeto frontend)
vercel inspect <url-do-deploy-mais-recente>
# procure a região entre colchetes, ex.: [iad1]

# 2. Região do banco no Railway
railway status
# campo "region:" do serviço Postgres/Redis/etc.
```

Se a região do Vercel for `iad1` (ou outra região dos EUA) e a do Railway for
`asia-southeast1` (ou qualquer região fora dos EUA), **está com o mesmo
problema**.

O `preferredRegion` do workspace já foi corrigido para `us-east4` durante o
incidente do Sigma Horus (2026-08-31) — então **qualquer serviço criado a
partir de agora já nasce na região certa**. O que precisa de atenção é
**serviço que já existia antes dessa correção**, que continua preso na região
antiga até ser migrado manualmente.

## Runbook de correção (o que foi feito no Sigma Horus)

1. Criar um novo serviço Postgres no projeto (nasce em `us-east4` automaticamente
   agora que o `preferredRegion` já foi corrigido).
2. Criar um proxy TCP público nele (`railway tcp-proxy create --port 5432 --service <nome>`)
   pra conseguir migrar os dados de fora da rede interna do Railway.
3. Migrar os dados via Docker (não precisa instalar Postgres local):
   ```
   docker run --rm postgres:18 bash -c 'pg_dump "$OLD_URL" -Fc --no-owner --no-privileges | pg_restore -d "$NEW_URL" --clean --if-exists --no-owner --no-privileges'
   ```
4. **Atenção**: `--no-owner --no-privileges` não copia roles nem GRANTs (são
   por cluster, não por banco). Se o projeto usa uma role de app separada da
   `postgres` (RLS, `NOBYPASSRLS`, multi-tenant — como o Sigma Horus faz com
   `sigma_app`), ela **precisa ser recriada manualmente** no banco novo, com a
   mesma senha, os mesmos GRANTs e (se usar RLS) confirmar que as policies
   vieram no dump (essas sim vêm, são schema, não privilégio).
5. Conferir contagem de linhas por tabela nos dois bancos antes do corte —
   `pg_stat_user_tables` **não é confiável** (estatística de autovacuum, pode
   vir zerada mesmo com dados). Use contagem exata:
   ```sql
   SELECT table_name,
          (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS row_count
   FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE'
   ORDER BY table_name;
   ```
6. Trocar `DATABASE_URL` (e qualquer outra `*_DATABASE_URL`) nas env vars de
   produção do Vercel (`vercel env add NOME production --force --yes --value "..."`)
   e no `.env` local. Redeploy (`vercel deploy --prod --yes`).
7. Verificar produção (`curl` nas rotas principais + `vercel logs` procurando
   erro) antes de considerar concluído.
8. Manter o banco antigo rodando alguns dias como rede de segurança antes de
   apagar.

### Nota sobre Windows/PowerShell

Se for migrar de uma máquina Windows: `--env NOME=$var` no `docker run` via
PowerShell **quebra em vários argumentos** se o valor tiver espaços (ex.:
uma query SQL) — mesmo com aspas. A saída é escrever a query num arquivo
`.sql` e montar como volume (`-v "pasta:/mnt"`, `psql "$URL" -f /mnt/query.sql`)
em vez de passar a query pela linha de comando.

## Projetos Railway na mesma conta (levantado em 2026-08-31)

| Projeto Railway | Serviço(s) visto(s) | Pasta local provável |
|---|---|---|
| sigma-horus | Postgres | `sygmahorus` (**já corrigido**) |
| sigma-cognis | Postgres, Postgres-kuGt (⚠️ dois bancos?) | `sygmacognis` |
| exemplary-beauty | sygmahelthTech-ai, Postgres | `sygmahelthTech-ai` |
| meticulous-radiance | sygmaflow, Postgres | `sygmaflow` |
| sygmaauto (ex-distinguished-strength) | sygmaauto-api, Postgres, Postgres-geEZ | `sygmaauto` / `sygmaauto-site` |
| sygmaauto-wa-region-b | evolution-api-r2 | (WhatsApp/Evolution API do sygmaauto?) |
| pretty-analysis | lexgen-studio-v2 | `lexgenstudio-v3/lexgen-studio-v2` |
| amiable-elegance | Postgres | não identificado |
| prolific-growth | Postgres | não identificado |
| stellar-wonder | Postgres | não identificado |
| feisty-flow | Postgres | não identificado |
| satisfied-kindness | blissful-contentment | não identificado |

Os "não identificado" podem ser projetos antigos/abandonados — vale conferir
se ainda estão em uso antes de gastar tempo migrando (ou simplesmente
apagar se não forem).

## Status deste projeto especificamente

- [x] Região do Vercel checada — assumida `iad1` por padrão de conta (não confirmada diretamente: CLI/MCP da Vercel não autenticados nesta sessão)
- [x] Região do Railway checada — `sygmaauto-api` e `Postgres-geEZ` em `us-east4-eqdc4a` (correto); `Postgres` (plain) em `asia-southeast1-eqsg3a` (antigo)
- [x] Precisa migrar? **Não** — a migração já está feita: o app já usa `DATABASE_URL` → `Postgres-geEZ` (us-east4). O `Postgres` antigo continua rodando de propósito (schemas `evolution`/`evolution_r2` usados pelo `sygmaauto-wa-region-b`), não é órfão.
- [x] Migração feita — confirmado em 2026-09-13 (config + teste ao vivo: reprovação de orçamento refletiu no app)
- [x] Verificado em produção — via teste ao vivo do dono do produto

**Achados extras (2026-09-13):** `sygmaauto-api` tem duas vars mortas que valem limpeza:
`DATABASE_CONNECTION_URI` (aponta pro `Postgres` antigo, sem nenhuma referência no código) e possivelmente
`EVOLUTION_API_KEY`/`EVOLUTION_API_URL`/`EVOLUTION_INSTANCE` (app já usa só `WHATSAPP_PROVIDER=META_CLOUD`,
mas confirmar se algo externo ainda lê essas vars antes de remover). Ver detalhe completo em
`C:\sygma-guidelines\railway-audit-guidelines.md` (linha `distinguished-strength`).
