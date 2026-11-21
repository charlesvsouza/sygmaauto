// Conclui a exclusão das oficinas que sobraram (filhos com FK RESTRICT primeiro).
// Só age sobre as oficinas que NÃO casam com o nome informado.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const exec = (s) => p.$executeRawUnsafe(s);
const q = (s) => p.$queryRawUnsafe(s);

const manter = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').trim();
const apply = process.argv.includes('--apply');

(async () => {
  const alvo = await q(`SELECT id, name FROM tenants WHERE name NOT ILIKE '%${manter}%' ORDER BY name`);
  if (!alvo.length) { console.log('Nada a apagar.'); return; }
  const ids = alvo.map((t) => `'${t.id}'`).join(',');
  const osDoAlvo = `SELECT id FROM service_orders WHERE "tenantId" IN (${ids})`;

  console.log(`Oficinas ainda no alvo (${alvo.length}): ${alvo.map((t) => t.name).join(' | ')}`);

  const passos = [
    ['service_order_items', `DELETE FROM service_order_items WHERE "serviceOrderId" IN (${osDoAlvo})`],
    ['service_order_timeline', `DELETE FROM service_order_timeline WHERE "serviceOrderId" IN (${osDoAlvo})`],
    ['vehicle_checklists', `DELETE FROM vehicle_checklists WHERE "serviceOrderId" IN (${osDoAlvo})`],
    ['nps_responses (por O.S.)', `DELETE FROM nps_responses WHERE "serviceOrderId" IN (${osDoAlvo})`],
    ['nps_responses (por cliente)', `DELETE FROM nps_responses WHERE "customerId" IN (SELECT id FROM customers WHERE "tenantId" IN (${ids}))`],
    ['engine_metrology', `DELETE FROM engine_metrology WHERE "serviceOrderId" IN (${osDoAlvo})`],
    ['commissions', `DELETE FROM commissions WHERE "serviceOrderId" IN (${osDoAlvo})`],
    ['vehicle_ownerships', `DELETE FROM vehicle_ownerships WHERE "tenantId" IN (${ids})`],
    ['service_orders', `DELETE FROM service_orders WHERE "tenantId" IN (${ids})`],
    ['customers', `DELETE FROM customers WHERE "tenantId" IN (${ids})`],
  ];

  for (const [nome, sql] of passos) {
    if (!apply) { console.log(`  (simulação) ${nome}`); continue; }
    try {
      const n = await exec(sql);
      console.log(`  ${nome}: ${n} linha(s)`);
    } catch (e) {
      console.log(`  FALHOU ${nome}: ${String(e.message).split('\n')[0].slice(0, 140)}`);
    }
  }

  if (!apply) { console.log('\nSIMULAÇÃO. Use --apply.'); return; }

  const sobrou = [];
  for (const t of ['customers', 'service_orders']) {
    const [{ n }] = await q(`SELECT count(*)::int AS n FROM "${t}" WHERE "tenantId" IN (${ids})`);
    if (n > 0) sobrou.push(`${t}=${n}`);
  }
  if (sobrou.length) { console.error(`\nAinda restam: ${sobrou.join(', ')} — não apaguei as oficinas.`); return; }

  for (const t of alvo) await exec(`DELETE FROM tenants WHERE id='${t.id}'`);
  const fim = await q(`SELECT name FROM tenants ORDER BY name`);
  console.log(`\nOficinas restantes (${fim.length}): ${fim.map((r) => r.name).join(' | ')}`);
})()
  .catch((e) => { console.error('erro:', e.message); process.exitCode = 1; })
  .finally(() => p.$disconnect());
