import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL ?? '';
  // Keep pool reasonable for Railway Pro (max_connections ~100)
  const separator = base.includes('?') ? '&' : '?';
  if (base.includes('connection_limit')) return base;
  return `${base}${separator}connection_limit=15&pool_timeout=30&connect_timeout=15`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: { db: { url: buildDatabaseUrl() } },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.applyMissingMigrations();
  }

  private async exec(sql: string) {
    try {
      await this.$executeRawUnsafe(sql);
    } catch (err) {
      console.error('[prisma] migration warning:', err.message);
    }
  }

  private async applyMissingMigrations() {
    await this.exec(`
      CREATE TABLE IF NOT EXISTS commission_rates (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId"   TEXT NOT NULL,
        "userId"     TEXT UNIQUE,
        role         TEXT,
        rate         DOUBLE PRECISION NOT NULL,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.exec(`
      CREATE TABLE IF NOT EXISTS commissions (
        id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId"           TEXT NOT NULL,
        "serviceOrderId"     TEXT NOT NULL,
        "serviceOrderItemId" TEXT UNIQUE NOT NULL,
        "userId"             TEXT NOT NULL,
        "baseValue"          DOUBLE PRECISION NOT NULL,
        "commissionPercent"  DOUBLE PRECISION NOT NULL,
        "commissionValue"    DOUBLE PRECISION NOT NULL,
        status               TEXT NOT NULL DEFAULT 'PENDENTE',
        "paidAt"             TIMESTAMPTZ,
        "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.exec(`ALTER TABLE service_order_items ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT`);
    await this.exec(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMPTZ`);
    await this.exec(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "partsReserved" BOOLEAN NOT NULL DEFAULT false`);
    await this.exec(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "partsCheckedAt" TIMESTAMPTZ`);
    await this.exec(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "expectedPartsDate" TIMESTAMPTZ`);
    await this.exec(`ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS "purchaseOrderNumber" TEXT`);
    await this.exec(`ALTER TABLE vehicle_checklists ADD COLUMN IF NOT EXISTS "ownerName" TEXT`);
    await this.exec(`ALTER TABLE vehicle_checklists ADD COLUMN IF NOT EXISTS "ownerType" TEXT DEFAULT 'PROPRIETARIO'`);
    // NPS Responses
    await this.exec(`
      CREATE TABLE IF NOT EXISTS nps_responses (
        id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId"       TEXT NOT NULL,
        "serviceOrderId" TEXT UNIQUE NOT NULL,
        "customerId"     TEXT NOT NULL,
        "vehicleId"      TEXT,
        score            INTEGER,
        comment          TEXT,
        token            TEXT UNIQUE NOT NULL,
        "answeredAt"     TIMESTAMPTZ,
        "sentAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}