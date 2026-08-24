-- AlterTable
ALTER TABLE "Currency" ADD COLUMN     "isAutoUpdated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3);
