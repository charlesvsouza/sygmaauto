# Migrations do SigmaAuto (Postgres)

## Como está a partir de 21/11/2026

- `migrations/` é o histórico **real** de produção: `0_init` é a baseline, com o schema
  inteiro em Postgres, registrada como já aplicada no banco de produção.
- O deploy roda `npx prisma migrate deploy` antes de subir a API (ver `railway.toml`).
  **Não** roda mais `prisma db push`.
- `migrations_sqlite_legacy/` guarda as 12 migrations antigas, de quando o banco local era
  SQLite. Elas não se aplicam ao Postgres e ficam só para rastreabilidade. Não execute nada
  delas.

## Por que mudou

Até 19/11/2026 o schema de produção era aplicado por `prisma db push` no start da API. Isso
não deixa histórico, não pede revisão e já causou estrago real: o banco ficou atrás do código
e faltava, entre outras, a coluna `tenants."orderSequence"`, o que derrubava qualquer consulta
de oficina com `P2022` e impedia a numeração de O.S.

## Como mudar o schema agora

1. Edite `prisma/schema.prisma`.
2. Gere a migration **em desenvolvimento** (com um banco local de verdade):
   ```bash
   npx prisma migrate dev --name descricao_curta
   ```
3. Revise o SQL gerado em `prisma/migrations/<timestamp>_descricao_curta/migration.sql`.
   Mudança destrutiva tem de ser consciente; `migrate deploy` não apaga dado por conta própria
   sem o SQL mandar.
4. Commit da migration junto com o schema. No deploy, `migrate deploy` aplica o que falta.

## Emergências

- Se o deploy falhar por migration travada: `npx prisma migrate status` mostra o estado;
  `npx prisma migrate resolve --rolled-back <nome>` libera uma migration que falhou **antes**
  de aplicar de fato.
- Nunca use `prisma db push` contra produção: volta a criar divergência silenciosa.
