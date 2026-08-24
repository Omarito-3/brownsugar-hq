-- Restructures stock around StockLocation (warehouses + branches) and adds
-- internal stock requests.
--
-- This migration is DATA-PRESERVING and hand-written: the auto-generated version
-- would have dropped BranchStock and StockMovement.branchId outright. Every
-- existing quantity and movement row is carried across to the new location model
-- before the old columns/tables are removed.

-- CreateEnum
CREATE TYPE "StockLocationType" AS ENUM ('WAREHOUSE', 'BRANCH');

-- CreateEnum
CREATE TYPE "StockRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED');

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" "StockLocationType" NOT NULL,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DATA: one BRANCH-type location per existing branch, carrying the branch's own
-- name and active flag so nothing changes visually for existing branches.
INSERT INTO "StockLocation" ("id", "name", "nameAr", "type", "branchId", "isActive", "createdAt")
SELECT gen_random_uuid()::text, b."name", NULL, 'BRANCH', b."id", b."isActive", CURRENT_TIMESTAMP
FROM "Branch" b;

-- DATA: seed the initial warehouse.
INSERT INTO "StockLocation" ("id", "name", "nameAr", "type", "branchId", "isActive", "createdAt")
VALUES (gen_random_uuid()::text, 'Main Warehouse', 'المستودع الرئيسي', 'WAREHOUSE', NULL, true, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "LocationStock" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "currentQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minimumQuantity" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "LocationStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationStock_locationId_stockItemId_key" ON "LocationStock"("locationId", "stockItemId");

-- AddForeignKey
ALTER TABLE "LocationStock" ADD CONSTRAINT "LocationStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationStock" ADD CONSTRAINT "LocationStock_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DATA: carry every BranchStock row over to its branch's new location.
-- minimumQuantity starts at 0, meaning "fall back to StockItem.lowStockThreshold".
INSERT INTO "LocationStock" ("id", "locationId", "stockItemId", "currentQuantity", "minimumQuantity")
SELECT gen_random_uuid()::text, sl."id", bs."stockItemId", bs."currentQuantity", 0
FROM "BranchStock" bs
JOIN "StockLocation" sl ON sl."branchId" = bs."branchId" AND sl."type" = 'BRANCH';

-- Guard: every BranchStock row must have been carried across.
DO $$
DECLARE old_count INT; new_count INT;
BEGIN
  SELECT COUNT(*) INTO old_count FROM "BranchStock";
  SELECT COUNT(*) INTO new_count FROM "LocationStock";
  IF old_count <> new_count THEN
    RAISE EXCEPTION 'LocationStock migration lost rows: % BranchStock -> % LocationStock', old_count, new_count;
  END IF;
END $$;

-- StockMovement: add locationId, backfill from branchId, then retire branchId.
ALTER TABLE "StockMovement" ADD COLUMN "locationId" TEXT;

UPDATE "StockMovement" sm
SET "locationId" = sl."id"
FROM "StockLocation" sl
WHERE sl."branchId" = sm."branchId" AND sl."type" = 'BRANCH';

-- Guard: no movement may be left without a location before we drop branchId.
DO $$
DECLARE orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM "StockMovement" WHERE "locationId" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'StockMovement migration left % rows without a locationId', orphan_count;
  END IF;
END $$;

ALTER TABLE "StockMovement" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_branchId_fkey";
ALTER TABLE "StockMovement" DROP COLUMN "branchId";

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Old table is now fully superseded by LocationStock.
DROP TABLE "BranchStock";

-- CreateTable
CREATE TABLE "StockRequest" (
    "id" TEXT NOT NULL,
    "requestingLocationId" TEXT NOT NULL,
    "fulfillingLocationId" TEXT NOT NULL,
    "status" "StockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "StockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockRequestItem" (
    "id" TEXT NOT NULL,
    "stockRequestId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantityRequested" DECIMAL(10,2) NOT NULL,
    "quantityFulfilled" DECIMAL(10,2),

    CONSTRAINT "StockRequestItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_requestingLocationId_fkey" FOREIGN KEY ("requestingLocationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_fulfillingLocationId_fkey" FOREIGN KEY ("fulfillingLocationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_stockRequestId_fkey" FOREIGN KEY ("stockRequestId") REFERENCES "StockRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
