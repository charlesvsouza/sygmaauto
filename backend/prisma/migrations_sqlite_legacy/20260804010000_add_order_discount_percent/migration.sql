-- Desconto (%) concedido na O.S., por tipo (pecas/servicos), sujeito ao teto do tenant p/ GERENTE.
ALTER TABLE "service_orders" ADD COLUMN "discountPartsPercent" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "service_orders" ADD COLUMN "discountServicesPercent" DOUBLE PRECISION DEFAULT 0;
