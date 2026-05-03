-- AlterTable: adiciona campos de manutenção preventiva ao modelo Vehicle
ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "lastMaintenanceKm" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastMaintenanceDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "maintenanceIntervalKm" INTEGER,
  ADD COLUMN IF NOT EXISTS "maintenanceIntervalDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
