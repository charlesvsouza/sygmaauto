/**
 * Railway Release Script
 * Runs BEFORE the new container starts:
 * 1. Terminates ALL other Postgres connections (from previous failed deploys)
 * 2. Waits until connection count reaches 0
 * 3. Runs prisma db push with connection_limit=1 to avoid re-flooding the pool
 */
const { execSync } = require('child_process');
const { Client } = require('pg');

function stripPoolParams(url) {
  if (!url) return url;
  const [base, qs] = url.split('?');
  if (!qs) return url;
  const params = new URLSearchParams(qs);
  params.delete('connection_limit');
  params.delete('pool_timeout');
  params.delete('pgbouncer');
  const remaining = params.toString();
  return remaining ? `${base}?${remaining}` : base;
}

async function terminateAllAppConnections() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[release] DATABASE_URL not set, skipping terminate step.');
    return;
  }

  const cleanUrl = stripPoolParams(url);

  const client = new Client({
    connectionString: cleanUrl,
    connectionTimeoutMillis: 15000,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();

    const countRes = await client.query(
      `SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`
    );
    console.log(`[release] Active connections before kill: ${countRes.rows[0].count}`);

    // Kill ALL other connections to this database (no state filter)
    const result = await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
    `);
    console.log(`[release] Terminated ${result.rowCount} connection(s).`);

    // Poll until 0 other connections remain (max 30s)
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const check = await client.query(
        `SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`
      );
      const remaining = parseInt(check.rows[0].count, 10);
      console.log(`[release] Remaining connections: ${remaining}`);
      if (remaining === 0) break;
      // Kill again in case some reconnected
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
      `);
    }
  } catch (err) {
    console.warn('[release] Could not terminate connections (non-fatal):', err.message);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

async function ensureMissingTables(url) {
  const cleanUrl = stripPoolParams(url);
  const client = new Client({
    connectionString: cleanUrl,
    connectionTimeoutMillis: 15000,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_rates (
        id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId"  TEXT NOT NULL,
        "userId"    TEXT UNIQUE,
        role        TEXT,
        rate        DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId"           TEXT NOT NULL,
        "serviceOrderId"     TEXT NOT NULL,
        "serviceOrderItemId" TEXT UNIQUE NOT NULL,
        "userId"             TEXT NOT NULL,
        "baseValue"          DOUBLE PRECISION NOT NULL,
        "commissionPercent"  DOUBLE PRECISION NOT NULL,
        "commissionValue"    DOUBLE PRECISION NOT NULL,
        status               TEXT NOT NULL DEFAULT 'PENDENTE',
        "paidAt"             TIMESTAMPTZ,
        "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      ALTER TABLE service_order_items ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT;
    `);
    // Campos adicionados na feature de alertas + reserva de peças
    await client.query(`
      ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMPTZ;
      ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "partsReserved" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "partsCheckedAt" TIMESTAMPTZ;
      ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "expectedPartsDate" TIMESTAMPTZ;
      ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "purchaseOrderNumber" TEXT;
    `);
    // Colunas do tenant restauradas (defaultCommissionPercent foi removido em hotfix antigo)
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "defaultCommissionPercent" DOUBLE PRECISION DEFAULT 0;
    `);
    // Compatibilidade legada: evita erro de login caso o deploy suba antes do schema completo.
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "whatsappMetaPhoneNumberId" TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "whatsappDisplayNumber" TEXT;
    `);
    // vehicleId opcional na ServiceOrder (Modo Retífica — motor avulso)
    await client.query(`
      ALTER TABLE service_orders ALTER COLUMN "vehicleId" DROP NOT NULL;
    `);
    console.log('[release] ensureMissingTables: OK');
  } catch (err) {
    console.warn('[release] ensureMissingTables error (non-fatal):', err.message);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

// Numeração sequencial do atendimento (common/order-number.ts). Idempotente: numera,
// por oficina e em ordem de abertura, só as O.S. ainda sem número, continuando do
// maior número existente, e alinha o contador do tenant.
async function backfillOrderNumbers(url) {
  const cleanUrl = stripPoolParams(url);
  const client = new Client({
    connectionString: cleanUrl,
    connectionTimeoutMillis: 15000,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  try {
    await client.connect();
    await client.query('BEGIN');
    const res = await client.query(`
      WITH seq AS (
        SELECT so.id,
               COALESCE(mx.max_number, 0)
                 + ROW_NUMBER() OVER (PARTITION BY so."tenantId" ORDER BY so."createdAt", so.id) AS n
        FROM service_orders so
        LEFT JOIN (
          SELECT "tenantId", MAX(number) AS max_number
          FROM service_orders
          GROUP BY "tenantId"
        ) mx ON mx."tenantId" = so."tenantId"
        WHERE so.number IS NULL
      )
      UPDATE service_orders s SET number = seq.n FROM seq WHERE s.id = seq.id
    `);
    await client.query(`
      UPDATE tenants t
      SET "orderSequence" = GREATEST(t."orderSequence", COALESCE(
        (SELECT MAX(number) FROM service_orders so WHERE so."tenantId" = t.id), 0))
    `);
    await client.query('COMMIT');
    console.log(`[release] backfillOrderNumbers: ${res.rowCount} O.S. numerada(s).`);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.warn('[release] backfillOrderNumbers error (non-fatal):', err.message);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

// Receita única por O.S. (service-orders: recordOrderRevenue). Idempotente:
// 1. O.S. faturadas: o lançamento de receita mais antigo da O.S. passa a valer o total,
//    na data do faturamento; se não houver nenhum, é criado.
// 2. Lançamentos automáticos da aprovação ("Serviços/Peças - OS ...") em O.S. que não
//    foram faturadas são receita que não aconteceu: vão para audit_logs e saem do caixa.
async function unifyOrderRevenue(url) {
  const cleanUrl = stripPoolParams(url);
  const client = new Client({
    connectionString: cleanUrl,
    connectionTimeoutMillis: 15000,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  const code = `lpad(upper(to_hex(so.number)), 8, '0') || '/' || to_char(so."createdAt" AT TIME ZONE 'America/Sao_Paulo', 'MM-YYYY')`;
  try {
    await client.connect();
    await client.query('BEGIN');
    const updated = await client.query(`
      WITH first_income AS (
        SELECT DISTINCT ON (ft."referenceId") ft.id, ft."referenceId"
        FROM financial_transactions ft
        WHERE ft."referenceType" = 'service_order' AND ft.type = 'INCOME'
        ORDER BY ft."referenceId", ft."createdAt"
      )
      UPDATE financial_transactions t
      SET amount = so."totalCost",
          date = COALESCE(so."paidAt", so."deliveredAt", so."updatedAt"),
          description = 'Receita - OS ' || ${code},
          category = 'servicos'
      FROM first_income fi
      JOIN service_orders so ON so.id = fi."referenceId"
      WHERE t.id = fi.id
        AND so.status IN ('FATURADO', 'ENTREGUE')
        AND (t.amount <> so."totalCost" OR t.date <> COALESCE(so."paidAt", so."deliveredAt", so."updatedAt")
             OR t.description IS DISTINCT FROM 'Receita - OS ' || ${code})
    `);
    const inserted = await client.query(`
      INSERT INTO financial_transactions (id, "tenantId", type, amount, description, category, "referenceId", "referenceType", date, "createdAt")
      SELECT gen_random_uuid()::text, so."tenantId", 'INCOME', so."totalCost", 'Receita - OS ' || ${code}, 'servicos',
             so.id, 'service_order', COALESCE(so."paidAt", so."deliveredAt", so."updatedAt"), now()
      FROM service_orders so
      WHERE so.status IN ('FATURADO', 'ENTREGUE') AND so."totalCost" > 0
        AND NOT EXISTS (SELECT 1 FROM financial_transactions ft
                        WHERE ft."referenceId" = so.id AND ft."referenceType" = 'service_order' AND ft.type = 'INCOME')
    `);
    const orphanFilter = `
      FROM financial_transactions ft
      JOIN service_orders so ON so.id = ft."referenceId"
      WHERE ft."referenceType" = 'service_order' AND ft.type = 'INCOME'
        AND ft.description LIKE 'Serviços/Peças - OS%'
        AND so.status NOT IN ('FATURADO', 'ENTREGUE')`;
    await client.query(`
      INSERT INTO audit_logs (id, "tenantId", "userId", "entityType", "entityId", action, changes, "createdAt")
      SELECT gen_random_uuid()::text, ft."tenantId", NULL, 'FinancialTransaction', ft.id, 'DELETE',
             json_build_object('motivo', 'receita lançada na aprovação de O.S. não faturada (regra: receita no faturamento)',
                               'transacao', row_to_json(ft))::text, now()
      ${orphanFilter}
    `);
    const removed = await client.query(`DELETE FROM financial_transactions WHERE id IN (SELECT ft.id ${orphanFilter})`);
    const dup = await client.query(`
      SELECT count(*) AS n FROM (
        SELECT "referenceId" FROM financial_transactions
        WHERE "referenceType" = 'service_order' AND type = 'INCOME'
        GROUP BY "referenceId" HAVING count(*) > 1) x
    `);
    await client.query('COMMIT');
    console.log(`[release] unifyOrderRevenue: ${updated.rowCount} acertada(s), ${inserted.rowCount} criada(s), ${removed.rowCount} removida(s) para audit_logs; O.S. com mais de uma receita: ${dup.rows[0].n}`);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.warn('[release] unifyOrderRevenue error (non-fatal):', err.message);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

async function main() {
  await terminateAllAppConnections();

  const rawUrl = process.env.DATABASE_URL || '';
  await ensureMissingTables(rawUrl);

  // Set connection_limit=1 for the prisma db push process so it doesn't re-flood the pool
  const baseUrl = stripPoolParams(rawUrl);
  const sep = baseUrl.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${baseUrl}${sep}connection_limit=1&pool_timeout=30&connect_timeout=15`;

  console.log('[release] Running prisma db push...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  } catch (err) {
    console.error('[release] prisma db push failed (non-fatal, SQL fallback already ran):', err.message);
  }

  await backfillOrderNumbers(rawUrl);
  await unifyOrderRevenue(rawUrl);

  const seedFlag = (process.env.SEED_DEMO || '').trim().toLowerCase();
  console.log(`[release] SEED_DEMO="${seedFlag}"`);
  if (seedFlag === 'true' || seedFlag === '1') {
    console.log('[release] Iniciando seed de dados demo...');
    try {
      const { runSeed } = require('./seed-demo.js');
      await runSeed();
      console.log('[release] Seed concluído com sucesso.');
    } catch (seedErr) {
      console.error('[release] Erro no seed (non-fatal):', seedErr.message);
    }
  }

  const cleanFlag = (process.env.CLEAN_RESEED || '').trim().toLowerCase();
  console.log(`[release] CLEAN_RESEED="${cleanFlag}"`);
  if (cleanFlag === 'true' || cleanFlag === '1') {
    console.log('[release] Iniciando limpeza de dados demo + resseed...');
    try {
      const { runCleanReseed } = require('./clean-reseed.js');
      await runCleanReseed();
      console.log('[release] Clean-reseed concluído com sucesso.');
    } catch (err) {
      console.error('[release] Erro no clean-reseed (non-fatal):', err.message);
    }
  }

  const repairFlag = (process.env.REPAIR_LOGINS || '').trim().toLowerCase();
  console.log(`[release] REPAIR_LOGINS="${repairFlag}"`);
  if (repairFlag === 'true' || repairFlag === '1') {
    console.log('[release] Iniciando reparo de credenciais...');
    try {
      const { runRepairLogins } = require('./repair-logins.js');
      await runRepairLogins();
      console.log('[release] Reparo de credenciais concluído com sucesso.');
    } catch (err) {
      console.error('[release] Erro no repair-logins (non-fatal):', err.message);
    }
  }

  const migrateMetrologyFlag = (process.env.MIGRATE_METROLOGY || '').trim().toLowerCase();
  console.log(`[release] MIGRATE_METROLOGY="${migrateMetrologyFlag}"`);
  if (migrateMetrologyFlag === 'true' || migrateMetrologyFlag === '1') {
    console.log('[release] Iniciando migração de metrologia (notes JSON -> engine_metrology)...');
    try {
      const { runMigrateMetrology } = require('./migrate-metrology.js');
      await runMigrateMetrology();
      console.log('[release] Migração de metrologia concluída com sucesso.');
    } catch (err) {
      console.error('[release] Erro na migração de metrologia (non-fatal):', err.message);
    }
  }

  const bootstrapFlag = (process.env.RUN_BOOTSTRAP || '').trim().toLowerCase();
  console.log(`[release] RUN_BOOTSTRAP="${bootstrapFlag}"`);
  if (bootstrapFlag === 'true' || bootstrapFlag === '1') {
    console.log('[release] Iniciando bootstrap de usuários essenciais...');
    try {
      const { main: runBootstrap } = require('./bootstrap-users.js');
      await runBootstrap();
      console.log('[release] Bootstrap de usuários concluído com sucesso.');
    } catch (err) {
      console.error('[release] Erro no bootstrap-users (non-fatal):', err.message);
    }
  }

  console.log('[release] Done.');
}

main().catch((err) => {
  console.error('[release] Fatal error:', err.message);
  process.exit(1);
});
