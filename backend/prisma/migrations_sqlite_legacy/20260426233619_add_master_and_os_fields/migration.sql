-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN "equipmentBrand" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "equipmentModel" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "observations" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "serialNumber" TEXT;
ALTER TABLE "service_orders" ADD COLUMN "technicalReport" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "taxId" TEXT,
    "companyType" TEXT NOT NULL DEFAULT 'CNPJ',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_tenants" ("address", "createdAt", "document", "email", "id", "logo", "name", "phone", "updatedAt") SELECT "address", "createdAt", "document", "email", "id", "logo", "name", "phone", "updatedAt" FROM "tenants";
DROP TABLE "tenants";
ALTER TABLE "new_tenants" RENAME TO "tenants";
CREATE UNIQUE INDEX "tenants_document_key" ON "tenants"("document");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
