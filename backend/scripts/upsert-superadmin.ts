/**
 * Script para criar ou atualizar o Super Admin no banco de dados.
 * Uso: npx ts-node scripts/upsert-superadmin.ts
 * Configuração via variáveis de ambiente:
 *   SA_EMAIL    - email do superadmin (default: charlesvsouza@sigmaauto.com.br)
 *   SA_NAME     - nome do superadmin (default: Charles Souza)
 *   SA_PASSWORD - senha do superadmin (obrigatório ou usa default abaixo)
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SA_EMAIL || 'charlesvsouza@sigmaauto.com.br').toLowerCase().trim();
  const name = process.env.SA_NAME || 'Charles Souza';
  const password = process.env.SA_PASSWORD || '2021Bl08Ap303*a';

  console.log(`\n🔐 Upserting Super Admin: ${email}`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.superAdmin.upsert({
    where: { email },
    update: { name, passwordHash, isActive: true },
    create: { email, name, passwordHash, isActive: true },
  });

  console.log(`✅ Super Admin pronto! id=${admin.id} email=${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
