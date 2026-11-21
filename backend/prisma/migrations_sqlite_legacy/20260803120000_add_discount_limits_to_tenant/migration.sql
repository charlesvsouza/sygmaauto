-- Tetos de desconto (%) por tenant que o GERENTE deve respeitar ao lançar itens em O.S.
-- MASTER/ADMIN não têm limite. Default 0 = GERENTE bloqueado até MASTER/ADMIN configurar.
ALTER TABLE "tenants" ADD COLUMN "maxDiscountPercentParts" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN "maxDiscountPercentServices" DOUBLE PRECISION DEFAULT 0;
