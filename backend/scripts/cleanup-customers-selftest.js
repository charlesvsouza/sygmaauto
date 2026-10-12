// Teste do cleanup-process-customers.js com Prisma simulado. Uso: node scripts/cleanup-customers-selftest.js
const Module = require('module');
const assert = require('assert');

const customers = [
  { id: 'c1', tenantId: 't1', name: 'Cliente Processo 001' },
  { id: 'c45', tenantId: 't1', name: 'Cliente Processo 045' },
  { id: 'c46', tenantId: 't1', name: 'Cliente Processo 046' },        // fora do intervalo
  { id: 'cx', tenantId: 't1', name: 'Cliente Processo 12' },          // formato diferente: nunca casa
  { id: 'cr', tenantId: 't1', name: 'MOACYR ANTONIO MOREIRA DE BEZERRA' },
];
const log = [];
const del = (name) => ({ deleteMany: async (a) => { log.push(name); return { count: 1 }; } });
class FakePrisma {
  constructor() {
    this.tenant = { findUnique: async () => ({ id: 't1', name: 'Oficina X' }) };
    this.customer = { findMany: async () => customers.filter((c) => c.name.startsWith('Cliente Processo ')), ...del('clientes') };
    this.vehicle = { findMany: async () => [{ id: 'v1' }], ...del('veiculos') };
    this.serviceOrder = { findMany: async (a) => (a.where.vehicleId ? [] : [{ id: 'o1', number: 41, status: 'ENTREGUE', customerId: 'c1', totalCost: 10 }]), ...del('os') };
    this.commission = del('comissoes'); this.financialTransaction = del('fin'); this.engineMetrology = del('metro'); this.npsResponse = del('nps');
    this.serviceOrderItem = del('itens'); this.serviceOrderTimeline = del('hist'); this.vehicleChecklist = del('check');
    this.$queryRawUnsafe = async () => [{ n: 0 }];
    this.$executeRawUnsafe = async (sql) => { log.push('SQL:' + sql.split(' ').slice(0, 3).join(' ')); };
    this.$transaction = async (fn) => fn(this);
    this.$disconnect = async () => {};
  }
}
const orig = Module._load;
Module._load = function (r, ...rest) { return r === '@prisma/client' ? { PrismaClient: FakePrisma } : orig.call(this, r, ...rest); };

const run = (args) => new Promise((resolve) => {
  process.argv = ['node', 'x', ...args];
  const out = []; const l = console.log, t = console.table, e = console.error;
  console.log = (...a) => out.push(a.join(' ')); console.table = () => out.push('[tabela]'); console.error = (...a) => out.push('ERR ' + a.join(' '));
  delete require.cache[require.resolve('../cleanup-process-customers.js')];
  require('../cleanup-process-customers.js');
  setTimeout(() => { console.log = l; console.table = t; console.error = e; resolve(out.join('\n')); }, 100);
});

(async () => {
  let o = await run(['t1', '--from=1', '--to=45']);
  assert.match(o, /encontrados: 2/); assert.match(o, /Seriam apagados: 2 clientes/); assert.strictEqual(log.length, 0, 'simulacao nao apaga');
  o = await run(['t1', '--from=1', '--to=45', '--apply']);
  assert.match(o, /Informe --expect/); assert.strictEqual(log.length, 0);
  o = await run(['t1', '--from=1', '--to=45', '--expect=45', '--apply']);
  assert.match(o, /esperava 45 clientes, mas ha 2/); assert.strictEqual(log.length, 0, 'contagem errada nao apaga');
  o = await run(['t1', '--from=1', '--to=45', '--expect=2', '--apply']);
  assert.ok(log.filter((x) => x.startsWith('SQL:CREATE TABLE')).length === 12, 'backup das 12 tabelas');
  assert.ok(log.includes('clientes') && log.includes('veiculos') && log.includes('os'));
  console.log('cleanup customers selftest OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
