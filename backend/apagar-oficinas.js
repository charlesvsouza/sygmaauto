// Exclusão de oficinas do SigmaAuto, mantendo apenas a do dono.
// Fase 1 (padrão): audita e faz BACKUP de tudo em C:\tmp\sigmaauto-backup-<ts>\ (não apaga nada).
// Fase 2 (--apply): apaga os dados dessas oficinas na ordem que as chaves estrangeiras permitem.
//
//   node apagar-oficinas.js "POWER&TRAIN"            -> audita + backup
//   node apagar-oficinas.js "POWER&TRAIN" --apply    -> apaga as demais
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const q = (s) => p.$queryRawUnsafe(s);
const exec = (s) => p.$executeRawUnsafe(s);

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const manter = args.filter((a) => !a.startsWith('--')).join(' ').trim();

(async () => {
  if (!manter) {
    console.error('Uso: node apagar-oficinas.js "<parte do nome da sua oficina>" [--apply]');
    process.exit(2);
  }

  const todas = await q(`SELECT id, name, status, "createdAt" FROM tenants ORDER BY "createdAt"`);
  const alvo = todas.filter((t) => t.name.toUpperCase().includes(manter.toUpperCase()));
  if (alvo.length !== 1) {
    console.error(`"${manter}" casou com ${alvo.length} oficinas. Seja mais específico.`);
    for (const t of todas) console.error(`  - ${t.name}`);
    process.exit(1);
  }
  const ficar = alvo[0];
  const apagar = todas.filter((t) => t.id !== ficar.id);

  console.log(`MANTER: ${ficar.name}`);
  console.log(`APAGAR (${apagar.length}):`);
  for (const t of apagar) console.log(`  - ${t.name} (${t.id.slice(0, 8)}, criada ${t.createdAt.toISOString().slice(0, 10)}, ${t.status})`);

  // Tabelas que têm dados por oficina
  const tabelas = (await q(`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='tenantId' ORDER BY table_name
  `)).map((r) => r.table_name);

  const ids = apagar.map((t) => `'${t.id}'`).join(',');
  const resumo = [];
  for (const tab of tabelas) {
    const [{ n }] = await q(`SELECT count(*)::int AS n FROM "${tab}" WHERE "tenantId" IN (${ids})`);
    if (n > 0) resumo.push([tab, n]);
  }
  console.log('\nRegistros que serão apagados:');
  let total = 0;
  for (const [tab, n] of resumo) { console.log(`  ${tab}: ${n}`); total += n; }
  console.log(`  TOTAL: ${total}`);

  // BACKUP
  const dir = path.join('C:\\tmp', `sigmaauto-backup-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const manifesto = { quando: new Date().toISOString(), mantida: ficar, apagadas: apagar, tabelas: {} };
  for (const [tab] of resumo) {
    const linhas = await q(`SELECT * FROM "${tab}" WHERE "tenantId" IN (${ids})`);
    fs.writeFileSync(path.join(dir, `${tab}.json`), JSON.stringify(linhas, null, 2), 'utf8');
    manifesto.tabelas[tab] = linhas.length;
  }
  fs.writeFileSync(path.join(dir, 'manifesto.json'), JSON.stringify(manifesto, null, 2), 'utf8');
  console.log(`\nBackup completo em: ${dir}`);

  if (!apply) {
    console.log('SIMULAÇÃO. Nada foi apagado. Repita com --apply.');
    return;
  }

  // Apagar em passes, até não sobrar nada (resolve a ordem das FKs sozinho)
  let pendentes = resumo.map(([t]) => t);
  let volta = 0;
  const bloqueios = [];
  while (pendentes.length && volta < 10) {
    volta += 1;
    const proximos = [];
    for (const tab of pendentes) {
      try {
        await exec(`DELETE FROM "${tab}" WHERE "tenantId" IN (${ids})`);
      } catch (e) {
        bloqueios.push(`${tab}: ${String(e.message).split('\n')[0].slice(0, 120)}`);
        proximos.push(tab);
      }
    }
    if (proximos.length === pendentes.length && volta > 1) break;
    pendentes = proximos;
  }
  if (pendentes.length) {
    console.error(`\nNão foi possível apagar: ${pendentes.join(', ')}`);
    console.error(bloqueios.slice(-3).join('\n'));
    process.exit(1);
  }

  for (const t of apagar) await exec(`DELETE FROM tenants WHERE id='${t.id}'`);

  const restantes = await q(`SELECT name FROM tenants ORDER BY name`);
  console.log(`\nOficinas restantes: ${restantes.map((r) => r.name).join(' | ')}`);
})()
  .catch((e) => { console.error('erro:', e.message); process.exitCode = 1; })
  .finally(() => p.$disconnect());
