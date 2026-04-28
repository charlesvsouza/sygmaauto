-- CreateEnum para UserRole
CREATE TYPE "UserRole" AS ENUM ('MASTER', 'ADMIN', 'PRODUTIVO', 'FINANCEIRO');

-- Adicionar campos de quota em subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "osCreatedThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "subscriptions" ADD COLUMN "osMonthResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Alterar coluna role em users de String para enum
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PRODUTIVO';

-- Adicionar coluna invitedBy em users (para auditoria)
ALTER TABLE "users" ADD COLUMN "invitedBy" TEXT;
