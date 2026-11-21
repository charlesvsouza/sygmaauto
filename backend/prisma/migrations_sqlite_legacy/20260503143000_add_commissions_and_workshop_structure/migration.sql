-- Enums
DO $$ BEGIN
  CREATE TYPE "JobFunction" AS ENUM (
    'MECANICO',
    'ELETRICISTA',
    'APRENDIZ',
    'PINTOR',
    'PREPARADOR',
    'COLABORADOR_SERVICOS_GERAIS',
    'FUNILEIRO',
    'LAVADOR',
    'MARTELINHO_OURO',
    'EMBELEZADOR_AUTOMOTIVO',
    'CHEFE_OFICINA'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkshopArea" AS ENUM (
    'MECANICA',
    'ELETRICA',
    'FUNILARIA_PINTURA',
    'LAVACAO',
    'HIGIENIZACAO_EMBELEZAMENTO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'CHEFE_OFICINA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tenant
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "defaultCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- User
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "jobFunction" "JobFunction",
  ADD COLUMN IF NOT EXISTS "workshopArea" "WorkshopArea",
  ADD COLUMN IF NOT EXISTS "commissionPercent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "chiefId" TEXT;

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_chiefId_fkey"
    FOREIGN KEY ("chiefId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Service Order Item
ALTER TABLE "service_order_items"
  ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT;

DO $$ BEGIN
  ALTER TABLE "service_order_items"
    ADD CONSTRAINT "service_order_items_assignedUserId_fkey"
    FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Commissions table
CREATE TABLE IF NOT EXISTS "mechanic_commissions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serviceOrderId" TEXT NOT NULL,
  "serviceOrderItemId" TEXT NOT NULL,
  "commissionPercent" DOUBLE PRECISION NOT NULL,
  "baseValue" DOUBLE PRECISION NOT NULL,
  "commissionValue" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "paidAt" TIMESTAMP(3),
  "paidBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mechanic_commissions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "mechanic_commissions"
    ADD CONSTRAINT "mechanic_commissions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "mechanic_commissions"
    ADD CONSTRAINT "mechanic_commissions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "mechanic_commissions"
    ADD CONSTRAINT "mechanic_commissions_serviceOrderId_fkey"
    FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "mechanic_commissions"
    ADD CONSTRAINT "mechanic_commissions_serviceOrderItemId_fkey"
    FOREIGN KEY ("serviceOrderItemId") REFERENCES "service_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "mechanic_commissions"
    ADD CONSTRAINT "mechanic_commissions_paidBy_fkey"
    FOREIGN KEY ("paidBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "mechanic_commissions_tenantId_userId_idx"
  ON "mechanic_commissions"("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "mechanic_commissions_tenantId_status_idx"
  ON "mechanic_commissions"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "mechanic_commissions_serviceOrderId_idx"
  ON "mechanic_commissions"("serviceOrderId");

CREATE INDEX IF NOT EXISTS "mechanic_commissions_serviceOrderItemId_idx"
  ON "mechanic_commissions"("serviceOrderItemId");
