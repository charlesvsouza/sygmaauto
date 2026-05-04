'use strict';
/**
 * bootstrap-users.js
 *
 * Garante que os 3 usuários essenciais existam no banco, sem apagar dados existentes.
 * Pode ser rodado múltiplas vezes com segurança (idempotente).
 *
 * Cria/Atualiza:
 *   1. SuperAdmin       → superadmin@sygmaauto.com  /  SygmaMaster@2026!
 *   2. MASTER REDE      → master.rede@sygmaauto.com /  SygmaMaster@2026!
 *   3. MASTER RETIFICA  → master.ret@sygmaauto.com  /  SygmaMaster@2026!
 *
 * Sobrescreve variáveis de ambiente:
 *   BOOTSTRAP_SUPERADMIN_EMAIL / _PASSWORD / _NAME
 *   BOOTSTRAP_REDE_EMAIL / _PASSWORD / _NAME
 *   BOOTSTRAP_RETIFICA_EMAIL / _PASSWORD / _NAME
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────
// Config (override via env vars se necessário)
// ──────────────────────────────────────────────────────────
const SUPER_EMAIL    = process.env.BOOTSTRAP_SUPERADMIN_EMAIL    || 'superadmin@sygmaauto.com';
const SUPER_NAME     = process.env.BOOTSTRAP_SUPERADMIN_NAME     || 'Super Admin SygmaAuto';
const SUPER_PASSWORD = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || 'SygmaMaster@2026!';

// charles@sygmaauto.com → login principal
const CHARLES_EMAIL    = process.env.BOOTSTRAP_CHARLES_EMAIL    || 'charles@sygmaauto.com';
const CHARLES_NAME     = process.env.BOOTSTRAP_CHARLES_NAME     || 'Charles Souza';
const CHARLES_PASSWORD = process.env.BOOTSTRAP_CHARLES_PASSWORD || 'SygmaMaster@2026!';

// charlesvsouza@sigmaauto.com.br → email legado (mantém acesso)
const LEGACY_EMAIL    = 'charlesvsouza@sigmaauto.com.br';
const LEGACY_NAME     = 'Charles Souza (legado)';
const LEGACY_PASSWORD = 'SygmaMaster@2026!';

const REDE_EMAIL    = process.env.BOOTSTRAP_REDE_EMAIL    || 'master.rede@sygmaauto.com';
const REDE_NAME     = process.env.BOOTSTRAP_REDE_NAME     || 'Master Rede SygmaAuto';
const REDE_PASSWORD = process.env.BOOTSTRAP_REDE_PASSWORD || 'SygmaMaster@2026!';

const RETIFICA_EMAIL    = process.env.BOOTSTRAP_RETIFICA_EMAIL    || 'master.ret@sygmaauto.com';
const RETIFICA_NAME     = process.env.BOOTSTRAP_RETIFICA_NAME     || 'Master Retífica SygmaAuto';
const RETIFICA_PASSWORD = process.env.BOOTSTRAP_RETIFICA_PASSWORD || 'SygmaMaster@2026!';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
async function upsertSuperAdmin(email, name, password) {
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.superAdmin.upsert({
    where: { email },
    update: { name, passwordHash: hash, isActive: true },
    create: { email, name, passwordHash: hash, isActive: true },
  });
  return admin;
}

async function findPlanIdByName(planName) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { name: planName } });
  if (!plan) throw new Error(`Plano "${planName}" não encontrado no banco. Rode o seed primeiro.`);
  return plan.id;
}

async function ensureTenantWithPlan(planName, document, tenantName, masterEmail, masterName, masterPassword) {
  const planId = await findPlanIdByName(planName);

  // Tenta achar um tenant ativo que já tenha esse plano
  const existingSub = await prisma.subscription.findFirst({
    where: { planId, status: { in: ['ACTIVE', 'TRIALING'] } },
    include: { tenant: true },
    orderBy: { createdAt: 'asc' },
  });

  let tenant;

  if (existingSub) {
    tenant = existingSub.tenant;
    console.log(`[bootstrap] Tenant ${planName} já existe: ${tenant.name} (${tenant.id})`);
  } else {
    // Cria tenant novo
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 5);

    tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        document,
        status: 'ACTIVE',
        subscription: {
          create: {
            planId,
            status: 'ACTIVE',
            startedAt: new Date(),
            currentPeriodStart: new Date(),
            currentPeriodEnd: endDate,
          },
        },
      },
    });
    console.log(`[bootstrap] Tenant ${planName} criado: ${tenant.name} (${tenant.id})`);
  }

  // Garante MASTER com email conhecido
  const hash = await bcrypt.hash(masterPassword, 10);

  const existingMaster = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'MASTER' },
  });

  const sameEmail = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: { equals: masterEmail, mode: 'insensitive' } },
  });

  let master;
  if (sameEmail) {
    master = await prisma.user.update({
      where: { id: sameEmail.id },
      data: { name: masterName, email: masterEmail, passwordHash: hash, role: 'MASTER', isActive: true, passwordUpdatedAt: new Date() },
    });
  } else if (existingMaster) {
    // Atualiza o MASTER existente com o email/senha corretos
    master = await prisma.user.update({
      where: { id: existingMaster.id },
      data: { name: masterName, email: masterEmail, passwordHash: hash, isActive: true, passwordUpdatedAt: new Date() },
    });
  } else {
    master = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: masterEmail,
        name: masterName,
        passwordHash: hash,
        role: 'MASTER',
        isActive: true,
        passwordUpdatedAt: new Date(),
      },
    });
  }

  // Atualiza email de contato do tenant
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { email: masterEmail },
  }).catch(() => null);

  return { tenant, master };
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n[bootstrap-users] Iniciando...\n');

  // 1. SuperAdmin principal
  const sa1 = await upsertSuperAdmin(SUPER_EMAIL, SUPER_NAME, SUPER_PASSWORD);
  console.log(`[bootstrap] SuperAdmin: ${sa1.email} ✓`);

  // 2. charles@sygmaauto.com como SuperAdmin (login principal)
  const sa2 = await upsertSuperAdmin(CHARLES_EMAIL, CHARLES_NAME, CHARLES_PASSWORD);
  console.log(`[bootstrap] SuperAdmin (charles): ${sa2.email} ✓`);

  // 3. charlesvsouza@sigmaauto.com.br → email legado (mantém senha atualizada)
  const sa3 = await upsertSuperAdmin(LEGACY_EMAIL, LEGACY_NAME, LEGACY_PASSWORD);
  console.log(`[bootstrap] SuperAdmin (legado): ${sa3.email} ✓`);

  // 3. Tenant REDE + MASTER
  const rede = await ensureTenantWithPlan(
    'REDE',
    '00.000.000/0001-01',
    'SygmaAuto Demo - Rede',
    REDE_EMAIL,
    REDE_NAME,
    REDE_PASSWORD,
  );
  console.log(`[bootstrap] MASTER REDE: ${rede.master.email} → tenant=${rede.tenant.name} ✓`);

  // 4. Tenant RETIFICA_REDE + MASTER
  const retifica = await ensureTenantWithPlan(
    'RETIFICA_REDE',
    '11.111.111/0001-11',
    'SygmaAuto Demo - Retífica Rede',
    RETIFICA_EMAIL,
    RETIFICA_NAME,
    RETIFICA_PASSWORD,
  );
  console.log(`[bootstrap] MASTER RETIFICA_REDE: ${retifica.master.email} → tenant=${retifica.tenant.name} ✓`);

  console.log('\n════════════════════════════════════════════════');
  console.log(' Credenciais pós-bootstrap:');
  console.log('════════════════════════════════════════════════');
  console.log(` SuperAdmin 1 : ${SUPER_EMAIL}`);
  console.log(`   Senha      : ${SUPER_PASSWORD}`);
  console.log(`   Login em   : /superadmin/login`);
  console.log('────────────────────────────────────────────────');
  console.log(` SuperAdmin 2 : ${CHARLES_EMAIL}`);
  console.log(`   Senha      : ${CHARLES_PASSWORD}`);
  console.log(`   Login em   : /superadmin/login`);
  console.log('────────────────────────────────────────────────');
  console.log(` MASTER REDE  : ${REDE_EMAIL}`);
  console.log(`   Senha      : ${REDE_PASSWORD}`);
  console.log(`   Tenant     : ${rede.tenant.name} (${rede.tenant.id})`);
  console.log(`   Login em   : /login`);
  console.log('────────────────────────────────────────────────');
  console.log(` MASTER RETÍFICA: ${RETIFICA_EMAIL}`);
  console.log(`   Senha       : ${RETIFICA_PASSWORD}`);
  console.log(`   Tenant      : ${retifica.tenant.name} (${retifica.tenant.id})`);
  console.log(`   Login em    : /login`);
  console.log('════════════════════════════════════════════════\n');
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[bootstrap-users] ERRO:', err.message || err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { main };
