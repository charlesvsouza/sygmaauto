/**
 * migrate-metrology.js
 *
 * Migração única: move a ficha de metrologia da Retífica de Motores, hoje
 * serializada como JSON dentro de ServiceOrder.notes (`{ metrologia: {...} }`),
 * para a tabela própria `engine_metrology`. Depois de migrar, limpa `notes`
 * (esse campo só era usado para guardar esse JSON em OS de retífica — nunca
 * teve outro conteúdo misturado).
 *
 * Idempotente: pode rodar várias vezes sem duplicar (upsert por serviceOrderId)
 * e ignora OS que já não têm JSON de metrologia em notes.
 *
 * Ativação: variável de ambiente MIGRATE_METROLOGY=true (ver release.js).
 */
'use strict';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigrateMetrology() {
  const candidates = await prisma.serviceOrder.findMany({
    where: {
      orderType: 'RETIFICA_MOTOR',
      notes: { not: null },
    },
    select: { id: true, tenantId: true, notes: true },
  });

  let migrated = 0;
  let skipped = 0;

  for (const order of candidates) {
    let parsed;
    try {
      parsed = JSON.parse(order.notes);
    } catch {
      skipped++;
      continue;
    }

    const metrologia = parsed && parsed.metrologia;
    if (!metrologia) {
      skipped++;
      continue;
    }

    await prisma.engineMetrology.upsert({
      where: { serviceOrderId: order.id },
      update: {
        empenamentoCabecote: metrologia.empenamentoCabecote,
        empenamentoBloco: metrologia.empenamentoBloco,
        numeroCilindros: metrologia.numeroCilindros ?? 0,
        cilindros: metrologia.cilindros ?? [],
        numeroMunhoes: metrologia.numeroMunhoes ?? 0,
        munhoes: metrologia.munhoes ?? [],
        numeroMoentes: metrologia.numeroMoentes ?? 0,
        moentes: metrologia.moentes ?? [],
        numeroMancais: metrologia.numeroMancais ?? 0,
        mancaisBloco: metrologia.mancaisBloco ?? [],
        numeroBielas: metrologia.numeroBielas ?? 0,
        bielas: metrologia.bielas ?? [],
        observacoes: metrologia.observacoes,
        tecnico: metrologia.tecnico,
        dataLeitura: metrologia.dataLeitura,
      },
      create: {
        serviceOrderId: order.id,
        tenantId: order.tenantId,
        empenamentoCabecote: metrologia.empenamentoCabecote,
        empenamentoBloco: metrologia.empenamentoBloco,
        numeroCilindros: metrologia.numeroCilindros ?? 0,
        cilindros: metrologia.cilindros ?? [],
        numeroMunhoes: metrologia.numeroMunhoes ?? 0,
        munhoes: metrologia.munhoes ?? [],
        numeroMoentes: metrologia.numeroMoentes ?? 0,
        moentes: metrologia.moentes ?? [],
        numeroMancais: metrologia.numeroMancais ?? 0,
        mancaisBloco: metrologia.mancaisBloco ?? [],
        numeroBielas: metrologia.numeroBielas ?? 0,
        bielas: metrologia.bielas ?? [],
        observacoes: metrologia.observacoes,
        tecnico: metrologia.tecnico,
        dataLeitura: metrologia.dataLeitura,
      },
    });

    await prisma.serviceOrder.update({
      where: { id: order.id },
      data: { notes: null },
    });

    migrated++;
  }

  console.log(`[migrate-metrology] Migradas: ${migrated}, ignoradas (sem metrologia válida): ${skipped}`);
  return { migrated, skipped };
}

if (require.main === module) {
  runMigrateMetrology()
    .catch((err) => {
      console.error('[migrate-metrology] Erro:', err.message || err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { runMigrateMetrology };
