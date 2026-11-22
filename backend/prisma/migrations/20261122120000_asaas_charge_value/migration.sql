-- Adiantamento de 10% a 100% do saldo: valor e percentual desta emissão,
-- e o total já recebido (soma dos adiantamentos), para saber quanto ainda falta.
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "asaasChargeValue" DOUBLE PRECISION;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "asaasChargePercent" INTEGER;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "asaasPaidValue" DOUBLE PRECISION;
