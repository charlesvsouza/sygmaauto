const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDB() {
  try {
    await prisma.$connect();

    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `;

    console.log('\n📋 Tabelas encontradas:', tables.length);
    console.log('------------------------');
    tables.forEach(t => console.log(`  • ${t.name}`));

    console.log('\n📊 Dados em cada tabela:');
    console.log('------------------------');

    for (const table of tables) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
        console.log(`  ${table.name}: ${count[0].count} registros`);
      } catch (e) {
        console.log(`  ${table.name}: erro`);
      }
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error('Erro:', err.message);
  }
}

checkDB();