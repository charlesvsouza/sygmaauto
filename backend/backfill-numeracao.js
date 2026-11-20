// Numera as O.S. que estão sem número (o mesmo acerto que o DataBackfillsService
// deveria fazer no boot da API) e alinha o contador de cada oficina.
//
//   node backfill-numeracao.js            -> simulação
//   node backfill-numeracao.js --apply    -> grava (com backup em C:\tmp antes)
//
// Idempotente: só toca em O.S. com number IS NULL.

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const apply = process.argv.includes('--apply');

(async () => {
  const antes = await p.$queryRaw`
    SELECT so.id, so."tenantId", so.number, so."createdAt", t.name AS oficina
    FROM service_orders so JOIN tenants t ON t.id = so."tenantId"
    WHERE so.number IS NULL ORDER BY so."createdAt", so.id`;

  if (antes.length === 0) {
    console.log('Nada a numerar: todas as O.S. já têm número.');
    return;
  }
  console.log(`O.S. sem número: ${antes.length}`);
  const porOficina = {};
  for (const r of antes) porOficina[r.oficina] = (porOficina[r.oficina] || 0) + 1;
  for (const [k, v] of Object.entries(porOficina)) console.log(`  ${k}: ${v}`);

  if (!apply) {
    console.log('\nSIMULAÇÃO. Rode com --apply para numerar.');
    return;
  }

  const backup = `C:\\tmp\\sigmaauto-os-sem-numero-${Date.now()}.json`;
  fs.writeFileSync(backup, JSON.stringify(antes, null, 2), 'utf8');
  console.log(`\nBackup das ${antes.length} O.S.: ${backup}`);

  const resultado = await p.$transaction(async (tx) => {
    const numeradas = await tx.$executeRawUnsafe(`
      WITH seq AS (
        SELECT so.id,
               COALESCE(mx.max_number, 0)
                 + ROW_NUMBER() OVER (PARTITION BY so."tenantId" ORDER BY so."createdAt", so.id) AS n
        FROM service_orders so
        LEFT JOIN (SELECT "tenantId", MAX(number) AS max_number FROM service_orders GROUP BY "tenantId") mx
          ON mx."tenantId" = so."tenantId"
        WHERE so.number IS NULL
      )
      UPDATE service_orders s SET number = seq.n FROM seq WHERE s.id = seq.id`);

    const sequencias = await tx.$executeRawUnsafe(`
      UPDATE tenants t
      SET "orderSequence" = GREATEST(t."orderSequence", COALESCE(
        (SELECT MAX(number) FROM service_orders so WHERE so."tenantId" = t.id), 0))`);

    return { numeradas, sequencias };
  });

  console.log(`O.S. numeradas: ${resultado.numeradas}`);
  console.log(`Oficinas com contador alinhado: ${resultado.sequencias}`);

  const restam = await p.$queryRaw`SELECT count(*)::int AS n FROM service_orders WHERE number IS NULL`;
  const amostra = await p.$queryRaw`
    SELECT t.name AS oficina, min(so.number) AS de, max(so.number) AS ate, count(*)::int AS n
    FROM service_orders so JOIN tenants t ON t.id = so."tenantId"
    WHERE so.number IS NOT NULL GROUP BY t.name ORDER BY t.name`;
  console.log(`\nAinda sem número: ${restam[0].n}`);
  for (const a of amostra) console.log(`  ${a.oficina}: ${a.de} a ${a.ate} (${a.n} O.S.)`);
})()
  .catch((e) => { console.error('erro:', e.message); process.exitCode = 1; })
  .finally(() => p.$disconnect());
