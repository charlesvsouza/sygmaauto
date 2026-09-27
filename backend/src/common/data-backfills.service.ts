import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Acertos de dados idempotentes executados na inicialização da API.
// (O release.js não roda em produção: o serviço sobe com "prisma db push && node dist/main".)
// Um advisory lock garante que só uma instância execute por vez.
const BACKFILL_LOCK_KEY = 72_031_927;

// Número do atendimento em texto, igual a common/order-number.ts (HEX/MM-AAAA).
const ORDER_CODE_SQL = `lpad(upper(to_hex(so.number)), 8, '0') || '/' || to_char(so."createdAt" AT TIME ZONE 'America/Sao_Paulo', 'MM-YYYY')`;

@Injectable()
export class DataBackfillsService implements OnApplicationBootstrap {
  private readonly logger = new Logger('DataBackfills');

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    // Não atrasa a subida da API nem a derruba se algo falhar.
    this.run().catch((err) => this.logger.warn(`falhou (não fatal): ${err?.message ?? err}`));
  }

  async run() {
    await this.prisma.$transaction(async (tx) => {
      const [{ locked }] = await tx.$queryRawUnsafe<Array<{ locked: boolean }>>(
        `SELECT pg_try_advisory_xact_lock(${BACKFILL_LOCK_KEY}) AS locked`,
      );
      if (!locked) {
        this.logger.log('outra instância está executando os acertos; ignorando');
        return;
      }

      // 1. Numeração: O.S. sem número recebem a sequência da oficina, em ordem de abertura,
      //    continuando do maior número existente; o contador do tenant é alinhado.
      const numbered = await tx.$executeRawUnsafe(`
        WITH seq AS (
          SELECT so.id,
                 COALESCE(mx.max_number, 0)
                   + ROW_NUMBER() OVER (PARTITION BY so."tenantId" ORDER BY so."createdAt", so.id) AS n
          FROM service_orders so
          LEFT JOIN (SELECT "tenantId", MAX(number) AS max_number FROM service_orders GROUP BY "tenantId") mx
            ON mx."tenantId" = so."tenantId"
          WHERE so.number IS NULL
        )
        UPDATE service_orders s SET number = seq.n FROM seq WHERE s.id = seq.id`);
      await tx.$executeRawUnsafe(`
        UPDATE tenants t
        SET "orderSequence" = GREATEST(t."orderSequence", COALESCE(
          (SELECT MAX(number) FROM service_orders so WHERE so."tenantId" = t.id), 0))`);

      // 2. Receita única por O.S. (service-orders: recordOrderRevenue):
      //    a) O.S. faturadas: a receita mais antiga da O.S. passa a valer o total, na data do faturamento.
      const fixed = await tx.$executeRawUnsafe(`
        WITH first_income AS (
          SELECT DISTINCT ON (ft."referenceId") ft.id, ft."referenceId"
          FROM financial_transactions ft
          WHERE ft."referenceType" = 'service_order' AND ft.type = 'INCOME'
          ORDER BY ft."referenceId", ft."createdAt"
        )
        UPDATE financial_transactions t
        SET amount = so."totalCost",
            date = COALESCE(so."paidAt", so."deliveredAt", so."updatedAt"),
            description = 'Receita - OS ' || ${ORDER_CODE_SQL},
            category = 'servicos'
        FROM first_income fi
        JOIN service_orders so ON so.id = fi."referenceId"
        WHERE t.id = fi.id
          AND so.status IN ('FATURADO', 'ENTREGUE')
          AND (t.amount <> so."totalCost"
               OR t.date <> COALESCE(so."paidAt", so."deliveredAt", so."updatedAt")
               OR t.description IS DISTINCT FROM 'Receita - OS ' || ${ORDER_CODE_SQL})`);
      //    b) O.S. faturadas sem receita: cria o lançamento.
      const created = await tx.$executeRawUnsafe(`
        INSERT INTO financial_transactions (id, "tenantId", type, amount, description, category, "referenceId", "referenceType", date, "createdAt")
        SELECT gen_random_uuid()::text, so."tenantId", 'INCOME', so."totalCost", 'Receita - OS ' || ${ORDER_CODE_SQL}, 'servicos',
               so.id, 'service_order', COALESCE(so."paidAt", so."deliveredAt", so."updatedAt"), now()
        FROM service_orders so
        WHERE so.status IN ('FATURADO', 'ENTREGUE') AND so."totalCost" > 0
          AND NOT EXISTS (SELECT 1 FROM financial_transactions ft
                          WHERE ft."referenceId" = so.id AND ft."referenceType" = 'service_order' AND ft.type = 'INCOME')`);
      //    c) Receita lançada na aprovação de O.S. não faturadas é receita que não aconteceu:
      //       vai para audit_logs (com a transação inteira) e sai do caixa.
      const orphanFilter = `
        FROM financial_transactions ft
        JOIN service_orders so ON so.id = ft."referenceId"
        WHERE ft."referenceType" = 'service_order' AND ft.type = 'INCOME'
          AND ft.description LIKE 'Serviços/Peças - OS%'
          AND so.status NOT IN ('FATURADO', 'ENTREGUE')`;
      await tx.$executeRawUnsafe(`
        INSERT INTO audit_logs (id, "tenantId", "userId", "entityType", "entityId", action, changes, "createdAt")
        SELECT gen_random_uuid()::text, ft."tenantId", NULL, 'FinancialTransaction', ft.id, 'DELETE',
               json_build_object('motivo', 'receita lançada na aprovação de O.S. não faturada (regra: receita no faturamento)',
                                 'transacao', row_to_json(ft))::text, now()
        ${orphanFilter}`);
      const removed = await tx.$executeRawUnsafe(
        `DELETE FROM financial_transactions WHERE id IN (SELECT ft.id ${orphanFilter})`,
      );

      if (numbered || fixed || created || removed) {
        this.logger.log(
          `O.S. numeradas: ${numbered}; receitas acertadas: ${fixed}, criadas: ${created}, removidas para audit_logs: ${removed}`,
        );
      }
    }, { timeout: 120_000 });
  }
}
