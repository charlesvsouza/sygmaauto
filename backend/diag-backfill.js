// Diagnóstico do DataBackfillsService: executa os mesmos acertos de dados de
// produção DENTRO de uma transação e faz ROLLBACK no fim. Nada é gravado.
// Objetivo: descobrir qual passo falha (e por isso o boot não numera as O.S.).
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ORDER_CODE_SQL = `lpad(upper(to_hex(so.number)), 8, '0') || '/' || to_char(so."createdAt" AT TIME ZONE 'America/Sao_Paulo', 'MM-YYYY')`;

const passos = [
  ['0. lock', `SELECT pg_try_advisory_xact_lock(72031927) AS locked`],
  ['1. numerar O.S.', `
    WITH seq AS (
      SELECT so.id, COALESCE(mx.max_number, 0)
        + ROW_NUMBER() OVER (PARTITION BY so."tenantId" ORDER BY so."createdAt", so.id) AS n
      FROM service_orders so
      LEFT JOIN (SELECT "tenantId", MAX(number) AS max_number FROM service_orders GROUP BY "tenantId") mx
        ON mx."tenantId" = so."tenantId"
      WHERE so.number IS NULL
    )
    UPDATE service_orders s SET number = seq.n FROM seq WHERE s.id = seq.id`],
  ['1b. alinhar contador', `
    UPDATE tenants t SET "orderSequence" = GREATEST(t."orderSequence", COALESCE(
      (SELECT MAX(number) FROM service_orders so WHERE so."tenantId" = t.id), 0))`],
  ['2a. corrigir receita', `
    WITH first_income AS (
      SELECT DISTINCT ON (ft."referenceId") ft.id, ft."referenceId"
      FROM financial_transactions ft
      WHERE ft."referenceType" = 'service_order' AND ft.type = 'INCOME'
      ORDER BY ft."referenceId", ft."createdAt"
    )
    UPDATE financial_transactions t
    SET amount = so."totalCost",
        date = COALESCE(so."paidAt", so."deliveredAt", so."updatedAt"),
        description = 'Receita - OS ' || ${ORDER_CODE_SQL},
        category = 'servicos'
    FROM first_income fi
    JOIN service_orders so ON so.id = fi."referenceId"
    WHERE t.id = fi.id AND so.status IN ('FATURADO', 'ENTREGUE')`],
  ['2b. criar receita faltante', `
    INSERT INTO financial_transactions (id, "tenantId", type, amount, description, category, "referenceId", "referenceType", date, "createdAt")
    SELECT gen_random_uuid()::text, so."tenantId", 'INCOME', so."totalCost", 'Receita - OS ' || ${ORDER_CODE_SQL}, 'servicos',
           so.id, 'service_order', COALESCE(so."paidAt", so."deliveredAt", so."updatedAt"), now()
    FROM service_orders so
    WHERE so.status IN ('FATURADO', 'ENTREGUE') AND so."totalCost" > 0
      AND NOT EXISTS (SELECT 1 FROM financial_transactions ft
                      WHERE ft."referenceId" = so.id AND ft."referenceType" = 'service_order' AND ft.type = 'INCOME')`],
  ['3. histórico de veículo', `
    INSERT INTO vehicle_ownerships (id, "tenantId", "vehicleId", "customerId", "startedAt", "createdAt")
    SELECT gen_random_uuid()::text, v."tenantId", v.id, v."customerId", v."createdAt", now()
    FROM vehicles v
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_ownerships vo WHERE vo."vehicleId" = v.id)`],
];

(async () => {
  const erros = [];
  for (const [nome, sql] of passos) {
    try {
      await p.$transaction(async (tx) => {
        const r = await tx.$executeRawUnsafe(sql);
        throw new Error(`__ROLLBACK_OK__:${r}`);
      }, { timeout: 120000 });
      console.log(`  ok (não deveria chegar aqui): ${nome}`);
    } catch (e) {
      const msg = String(e.message || e);
      if (msg.includes('__ROLLBACK_OK__')) {
        console.log(`  OK   ${nome} -> ${msg.split(':')[1]} linha(s) afetada(s)`);
      } else {
        const curta = msg.split('\n').filter(Boolean).slice(-2).join(' | ').slice(0, 220);
        console.log(`  FALHA ${nome} -> ${curta}`);
        erros.push([nome, curta]);
      }
    }
  }
  console.log(erros.length ? `\n${erros.length} passo(s) falham em produção. Nada foi gravado.` : '\nTodos os passos funcionam. Nada foi gravado.');
})()
  .catch((e) => console.error(e.message))
  .finally(() => p.$disconnect());
