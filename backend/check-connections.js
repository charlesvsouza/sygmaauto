const { Client } = require('pg');
const fs = require('fs');

let url = process.env.DATABASE_URL;
if (!url) {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const m = env.match(/DATABASE_URL=["']?([^\n"']+)/);
    if (m) url = m[1].trim();
  } catch (_) {}
}
if (!url) { console.log('DATABASE_URL nao encontrada'); process.exit(1); }

// Strip pool params to avoid being blocked
const [base, qs] = url.split('?');
const params = new URLSearchParams(qs || '');
params.delete('connection_limit');
params.delete('pool_timeout');
const cleanUrl = params.toString() ? `${base}?${params}` : base;

const client = new Client({
  connectionString: cleanUrl,
  connectionTimeoutMillis: 15000,
  ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

client.connect().then(async () => {
  const max = await client.query('SHOW max_connections');
  const total = await client.query(
    `SELECT count(*) as total FROM pg_stat_activity WHERE datname = current_database()`
  );
  const grouped = await client.query(`
    SELECT state, application_name, count(*) as qty
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state, application_name
    ORDER BY qty DESC
  `);

  console.log('\n=== CONEXOES ATIVAS ===');
  console.log(`Total: ${total.rows[0].total} / max_connections: ${max.rows[0].max_connections}`);
  console.log('\nDetalhes por estado:');
  console.table(grouped.rows);

  await client.end();
}).catch(e => {
  console.error('Erro ao conectar:', e.message);
  process.exit(1);
});
