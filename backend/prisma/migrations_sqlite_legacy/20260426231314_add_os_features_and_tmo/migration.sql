-- AlterTable
ALTER TABLE "services" ADD COLUMN "hourlyRate" REAL;
ALTER TABLE "services" ADD COLUMN "tmo" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_service_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL DEFAULT 'ORCAMENTO',
    "status" TEXT NOT NULL DEFAULT 'ORCAMENTO',
    "complaint" TEXT,
    "diagnosis" TEXT,
    "kmEntrada" INTEGER,
    "kmSaida" INTEGER,
    "kmDiferenca" INTEGER,
    "testeRodagem" BOOLEAN NOT NULL DEFAULT false,
    "approvalToken" TEXT,
    "approvalStatus" TEXT,
    "approvalTokenExpires" DATETIME,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "reserveStock" BOOLEAN NOT NULL DEFAULT false,
    "diagnosticCost" REAL NOT NULL DEFAULT 0,
    "totalParts" REAL NOT NULL DEFAULT 0,
    "totalServices" REAL NOT NULL DEFAULT 0,
    "totalLabor" REAL NOT NULL DEFAULT 0,
    "totalDiscount" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "scheduledDate" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "deliveredAt" DATETIME,
    "paidAt" DATETIME,
    "notes" TEXT,
    "mechanicId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "service_orders_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "service_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_orders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_service_orders" ("approvalStatus", "approvalToken", "approvalTokenExpires", "approvedAt", "approvedBy", "complaint", "completedAt", "createdAt", "customerId", "deliveredAt", "diagnosis", "id", "kmDiferenca", "kmEntrada", "kmSaida", "mechanicId", "notes", "orderType", "paidAt", "scheduledDate", "startedAt", "status", "tenantId", "testeRodagem", "totalCost", "totalDiscount", "totalLabor", "totalParts", "totalServices", "updatedAt", "vehicleId") SELECT "approvalStatus", "approvalToken", "approvalTokenExpires", "approvedAt", "approvedBy", "complaint", "completedAt", "createdAt", "customerId", "deliveredAt", "diagnosis", "id", "kmDiferenca", "kmEntrada", "kmSaida", "mechanicId", "notes", "orderType", "paidAt", "scheduledDate", "startedAt", "status", "tenantId", "testeRodagem", "totalCost", "totalDiscount", "totalLabor", "totalParts", "totalServices", "updatedAt", "vehicleId" FROM "service_orders";
DROP TABLE "service_orders";
ALTER TABLE "new_service_orders" RENAME TO "service_orders";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
