-- CreateEnum
CREATE TYPE "AdjustmentDirection" AS ENUM ('INCREASE', 'DECREASE');

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "direction" "AdjustmentDirection";
