// Teste do cleanup-seeded-orders.js com um Prisma simulado (sem banco). Uso: node scripts/cleanup-selftest.js
const Module = require('module');
const path = require('path');

const orders = [1, 2, 3, 46, 47].map((n) => ({
  id: `id-${n}`, number: n, status: 'ENTREGUE', createdAt: new Date('2026-05-01T10:00:00Z'), totalCost: 100,
  customer: { name: 'c' }, vehicle: { plate: 'p' }, timeline: [{ createdAt: new Date('2026-05-01T10:00:30Z'), createdBy: 'u' }],
}));
const log = [];
const del = (name) => ({ deleteMany: async (a) => { const w = a.where; const f = w.id || w.serviceOrderId || w.referenceId; log.push(name + ':' + f.in.length); return { count: 1 }; } });
class FakePrisma {
  constructor() {
    this.tenant = { findMany: async () => [{ id: 't1', name: 'Oficina X' }] };
    this.serviceOrder = { findMany: async () => orders, ...del('os') };
    this.commission = del('comissao'); this.financialTransaction = del('financeiro'); this.engineMetrology = del('metrologia');
    this.npsResponse = del('nps'); this.serviceOrderItem = del('itens'); this.serviceOrderTimeline = del('historico'); this.vehicleChecklist = del('checklist');
    this.$executeRawUnsafe = async (sql) => { log.push('SQL:' + sql.split(' ').slice(0, 3).join(' ')); };
    this.$transaction = async (fn) => fn(this);
    this.$disconnect = async () => {};
  }
}
const orig = Module._load;
Module._load = function (request, ...rest) {
  if (request === '@prisma/client') return { PrismaClient: FakePrisma };
  return orig.call(this, request, ...rest);
};

const run = (args) => new Promise((resolve) => {
  process.argv = ['node', 'x', ...args];
  const out = [];
  const origLog = console.log; const origTable = console.table; const origErr = console.error;
  console.log = (...a) => out.push(a.join(' ')); console.table = () => out.push('[tabela]'); console.error = (...a) => out.push('ERR ' + a.join(' '));
  delete require.cache[require.resolve('../cleanup-seeded-orders.js')];
  require('../cleanup-seeded-orders.js');
  setTimeout(() => { console.log = origLog; console.table = origTable; console.error = origErr; resolve(out.join('\n')); }, 100);
});

(async () => {
  const assert = require('assert');
  // número inexistente: recusa e mostra os que existem
  let o = await run(['t1', '--all-except=45']);
  assert.match(o, /Numeros que existem hoje nesta oficina: 1, 2, 3, 46, 47/); assert.match(o, /Nao existe O.S. com o numero: 45/);
  assert.strictEqual(log.length, 0);
  // por ids, simulação: nada é apagado
  o = await run(['t1', '--all-except-ids=id-46,id-47,id-inexistente']);
  assert.match(o, /MANTIDAS \(2 de 3 pedidas\)/); assert.match(o, /NAO existem mais \(ignorados\): id-inexistente/); assert.match(o, /SERIAM APAGADAS: 3 de 5/);
  assert.strictEqual(log.length, 0, 'sem --apply nada é apagado');
  // por ids com --apply: backup em SQL e exclusão em transação apenas dos 3
  o = await run(['t1', '--all-except-ids=id-46,id-47', '--apply']);
  assert.ok(log.filter((l) => l.startsWith('SQL:CREATE TABLE')).length === 4, 'quatro tabelas de backup');
  console.log(log.join(' | '));
  console.log(o);
  assert.ok(log.includes('os:3'), 'apaga 3 O.S.');
  console.log('cleanup selftest OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
