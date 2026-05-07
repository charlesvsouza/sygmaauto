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
    await this.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "lgpdErasedAt" TIMESTAMPTZ`);
    await this.exec(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS "lgpdErasedAt" TIMESTAMPTZ`);
    await this.exec(`ALTER TABLE vehicle_checklists ADD COLUMN IF NOT EXISTS "ownerName" TEXT`);
    await this.exec(`ALTER TABLE vehicle_checklists ADD COLUMN IF NOT EXISTS "ownerType" TEXT DEFAULT 'PROPRIETARIO'`);
    // Subscription billing cycle + renewal reminder (05/05/2026)
    await this.exec(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY'`);
    await this.exec(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "renewalReminderSentAt" TIMESTAMPTZ`);
    // WhatsApp webhook events (durable idempotency + audit)
    await this.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        provider          TEXT NOT NULL,
        "eventKey"       TEXT NOT NULL,
        "eventType"      TEXT,
        payload           JSONB NOT NULL,
        "firstReceivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lastReceivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "processCount"   INTEGER NOT NULL DEFAULT 1,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT whatsapp_webhook_events_provider_event_key_unique UNIQUE (provider, "eventKey")
      )
    `);
    await this.exec(`
      CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_provider_created_at_idx
      ON whatsapp_webhook_events (provider, "createdAt")
    `);
    // LGPD requests (titular rights workflow)
    await this.exec(`
      CREATE TABLE IF NOT EXISTS lgpd_requests (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "tenantId"        TEXT NOT NULL,
        protocol          TEXT,
        "requestType"     TEXT NOT NULL,
        "subjectType"     TEXT NOT NULL,
        "subjectId"       TEXT NOT NULL,
        "requesterName"   TEXT NOT NULL,
        "requesterEmail"  TEXT NOT NULL,
        notes             TEXT,
        status            TEXT NOT NULL DEFAULT 'OPEN',
        "dueAt"           TIMESTAMPTZ,
        "resolutionNotes" TEXT,
        "completedAt"     TIMESTAMPTZ,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.exec(`ALTER TABLE lgpd_requests ADD COLUMN IF NOT EXISTS protocol TEXT`);
    await this.exec(`ALTER TABLE lgpd_requests ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMPTZ`);
    await this.exec(`
      UPDATE lgpd_requests
      SET protocol = COALESCE(protocol, 'LGPD-' || to_char(COALESCE("createdAt", now()), 'YYYYMMDD') || '-' || substr(md5(id), 1, 6))
      WHERE protocol IS NULL
    `);
    await this.exec(`
      UPDATE lgpd_requests
      SET "dueAt" = COALESCE("dueAt", COALESCE("createdAt", now()) + interval '15 days')
      WHERE "dueAt" IS NULL
    `);
    await this.exec(`ALTER TABLE lgpd_requests ALTER COLUMN protocol SET NOT NULL`);
    await this.exec(`ALTER TABLE lgpd_requests ALTER COLUMN "dueAt" SET NOT NULL`);
    await this.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS lgpd_requests_tenant_protocol_unique
      ON lgpd_requests ("tenantId", protocol)
    `);
    await this.exec(`
      CREATE INDEX IF NOT EXISTS lgpd_requests_tenant_created_at_idx
      ON lgpd_requests ("tenantId", "createdAt")
    `);
    await this.exec(`
      CREATE INDEX IF NOT EXISTS lgpd_requests_tenant_status_idx
      ON lgpd_requests ("tenantId", status)
    `);
    await this.exec(`
      CREATE INDEX IF NOT EXISTS lgpd_requests_tenant_due_at_idx
      ON lgpd_requests ("tenantId", "dueAt")
    `);
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