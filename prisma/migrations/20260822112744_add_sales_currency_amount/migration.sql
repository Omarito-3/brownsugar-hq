-- CreateTable
CREATE TABLE "SalesCurrencyAmount" (
    "id" TEXT NOT NULL,
    "salesEntryId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "amountOriginal" DECIMAL(10,2) NOT NULL,
    "amountIls" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "SalesCurrencyAmount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesCurrencyAmount_salesEntryId_currencyCode_key" ON "SalesCurrencyAmount"("salesEntryId", "currencyCode");

-- AddForeignKey
ALTER TABLE "SalesCurrencyAmount" ADD CONSTRAINT "SalesCurrencyAmount_salesEntryId_fkey" FOREIGN KEY ("salesEntryId") REFERENCES "SalesEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCurrencyAmount" ADD CONSTRAINT "SalesCurrencyAmount_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
