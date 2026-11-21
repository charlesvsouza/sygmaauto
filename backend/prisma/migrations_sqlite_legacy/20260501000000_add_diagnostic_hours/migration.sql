-- Adiciona campo de horas padrão de diagnóstico no tenant
ALTER TABLE "tenants" ADD COLUMN "diagnosticHours" DOUBLE PRECISION DEFAULT 0.5;
