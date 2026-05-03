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

async function main() {
  await terminateAllAppConnections();

  // Set connection_limit=1 for the prisma db push process so it doesn't re-flood the pool
  const rawUrl = process.env.DATABASE_URL || '';
  const baseUrl = stripPoolParams(rawUrl);
  const sep = baseUrl.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${baseUrl}${sep}connection_limit=1&pool_timeout=30&connect_timeout=15`;

  console.log('[release] Running prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

  if (process.env.SEED_DEMO === 'true') {
    console.log('[release] SEED_DEMO=true — executando seed de dados demo...');
    const { runSeed } = require('./seed-demo.js');
    await runSeed();
    console.log('[release] Seed concluído.');
  }

  console.log('[release] Done.');
}

main().catch((err) => {
  console.error('[release] Fatal error:', err.message);
  process.exit(1);
});
