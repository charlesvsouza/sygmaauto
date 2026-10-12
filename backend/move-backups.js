// Move as tabelas backup_os_* do schema public para o schema os_backups.
// O `prisma db push` da subida só conhece as tabelas do schema.prisma e tenta apagar as que não conhece
// (o que abortava o deploy e poria os backups em risco). No schema os_backups ele não mexe.
// Roda antes do db push, a cada subida; não faz nada quando não há o que mover. Nunca apaga dados.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'backup\\_os\\_%'`,
  );
  if (tables.length === 0) return;
  await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS os_backups');
  for (const { table_name } of tables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."${table_name}" SET SCHEMA os_backups`);
    console.log(`[move-backups] ${table_name} -> os_backups`);
  }
})()
  .catch((e) => { console.error('[move-backups] aviso:', e.message || e); })
  .finally(() => prisma.$disconnect());
