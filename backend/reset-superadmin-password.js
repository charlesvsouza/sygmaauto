// Senha de superadmin do SigmaAuto: NÃO é possível ler a atual (o banco guarda hash
// bcrypt, não a senha). Este script faz o caminho seguro: lista as contas e, com
// --apply, define uma senha temporária aleatória e mostra uma única vez.
//
//   node reset-superadmin-password.js                      (só lista as contas)
//   node reset-superadmin-password.js --email voce@x.com --apply
//
// Roda com a DATABASE_URL do backend/.env (a mesma da API).

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const i = args.indexOf('--email');
const email = i > -1 ? String(args[i + 1] || '').toLowerCase().trim() : null;

// Sem 0/O/l/1 para não errar ao digitar no celular.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function senhaTemporaria(tamanho = 14) {
  const bytes = crypto.randomBytes(tamanho);
  let out = '';
  for (let n = 0; n < tamanho; n += 1) out += ALFABETO[bytes[n] % ALFABETO.length];
  return `${out}!7`;
}

(async () => {
  const contas = await prisma.superAdmin.findMany({
    select: { id: true, email: true, name: true, isActive: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (contas.length === 0) {
    console.log('Nenhuma conta de superadmin cadastrada.');
    return;
  }

  console.log('\nContas de superadmin:');
  for (const c of contas) {
    console.log(`  ${c.email}  | ${c.name || '(sem nome)'} | ativo=${c.isActive} | último ajuste: ${c.updatedAt.toISOString().slice(0, 16).replace('T', ' ')}`);
  }
  console.log('\nA senha não é legível: o banco guarda hash bcrypt. Só é possível redefinir.');

  if (!email) {
    console.log('\nPara redefinir: --email <conta> --apply');
    return;
  }

  const alvo = contas.find((c) => c.email.toLowerCase() === email);
  if (!alvo) {
    console.error(`\nConta "${email}" não encontrada. Use um dos e-mails listados acima.`);
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log(`\nSIMULAÇÃO: redefiniria a senha de ${alvo.email}. Repita com --apply para gravar.`);
    return;
  }

  const senha = senhaTemporaria();
  const passwordHash = await bcrypt.hash(senha, 10);
  await prisma.superAdmin.update({
    where: { id: alvo.id },
    data: { passwordHash },
  });

  console.log(`\nSenha temporária de ${alvo.email}:`);
  console.log(`\n    ${senha}\n`);
  console.log('Ela aparece só agora. Anote, entre em /admin/login e troque por uma sua.');
  console.log('Se perder, rode este script de novo.');
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
