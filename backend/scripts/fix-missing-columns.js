'use strict';
/**
 * fix-missing-columns.js
 * Aplica colunas faltantes no banco de produção.
 * Roda com: railway run node scripts/fix-missing-columns.js
 */
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log('[fix] Conectado ao banco.');

  // 1. defaultCommissionPercent nos tenants
  await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "defaultCommissionPercent" DOUBLE PRECISION DEFAULT 0`);
  console.log('[fix] tenants.defaultCommissionPercent OK');

  // 2. vehicleId opcional (Retífica)
  try {
    await client.query(`ALTER TABLE service_orders ALTER COLUMN "vehicleId" DROP NOT NULL`);
    console.log('[fix] service_orders.vehicleId nullable OK');
  } catch (e) {
    console.log('[fix] service_orders.vehicleId já é nullable ou erro:', e.message);
  }

  // Verifica se funcionou
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'defaultCommissionPercent'
  `);
  console.log('[fix] Verificação:', JSON.stringify(res.rows));

  await client.end();
}

main().catch(err => { console.error('[fix] ERRO:', err.message); process.exit(1); });
