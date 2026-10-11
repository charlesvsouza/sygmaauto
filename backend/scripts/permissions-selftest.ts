// Autoteste das permissões configuráveis. Uso: npx ts-node scripts/permissions-selftest.ts
import assert from 'assert';
import { roleCan, roleCanMoveToStatus, sanitizeOverrides } from '../src/common/permissions';
import { canMoveToStatus } from '../src/common/roles';

// Sem ajuste, o comportamento é idêntico à regra histórica.
const statuses = ['EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'EM_EXECUCAO', 'PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE', 'CANCELADO', 'ABERTA'];
const roles = ['MASTER', 'ADMIN', 'GERENTE', 'CHEFE_OFICINA', 'MECANICO', 'PRODUTIVO', 'SECRETARIA', 'FINANCEIRO'];
for (const r of roles) for (const s of statuses) {
  assert.strictEqual(roleCanMoveToStatus(r, s, null), canMoveToStatus(r, s), `${r} -> ${s}`);
}

// Ajuste: a secretaria passa a faturar; o financeiro deixa de entregar.
const over = sanitizeOverrides({
  'os.invoice': ['GERENTE', 'CHEFE_OFICINA', 'FINANCEIRO', 'SECRETARIA'],
  'os.deliver': ['GERENTE', 'CHEFE_OFICINA', 'SECRETARIA'],
  'os.cancel': ['GERENTE', 'CHEFE_OFICINA'], // igual ao padrão: não é guardado
  'os.items': ['ADMIN', 'INEXISTENTE', 'MECANICO'], // ADMIN e perfil inválido são descartados
});
assert.ok(!('os.cancel' in over));
assert.deepStrictEqual(over['os.items'], ['MECANICO']);
assert.strictEqual(roleCanMoveToStatus('SECRETARIA', 'FATURADO', over), true);
assert.strictEqual(roleCanMoveToStatus('FINANCEIRO', 'ENTREGUE', over), false);
assert.strictEqual(roleCan('ADMIN', 'os.items', over), true, 'ADMIN nunca perde acesso');
assert.strictEqual(roleCan('MASTER', 'os.invoice', { 'os.invoice': [] }), true, 'MASTER nunca perde acesso');
assert.strictEqual(roleCan('GERENTE', 'os.items', over), false, 'ajuste vale mesmo removendo o padrão');
console.log('permissions selftest OK');
