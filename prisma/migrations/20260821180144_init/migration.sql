-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('BUBBLE_TEA', 'COFFEE', 'FOOD', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SUPPLIES', 'SALARY', 'MARKETING', 'EQUIPMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "category" "ProductCategory" NOT NULL,
    "basePriceIls" DECIMAL(10,2) NOT NULL,
    "costIls" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchProduct" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "priceOverrideIls" DECIMAL(10,2),

    CONSTRAINT "BranchProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL,
    "rateToIls" DECIMAL(10,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SalesEntry" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalIls" DECIMAL(10,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "notes" TEXT,
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLineItem" (
    "id" TEXT NOT NULL,
    "salesEntryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "SalesLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amountOriginal" DECIMAL(10,2) NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "amountIls" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BranchProduct_branchId_productId_key" ON "BranchProduct"("branchId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesEntry_branchId_date_key" ON "SalesEntry"("branchId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProduct" ADD CONSTRAINT "BranchProduct_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProduct" ADD CONSTRAINT "BranchProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesEntry" ADD CONSTRAINT "SalesEntry_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesLineItem" ADD CONSTRAINT "SalesLineItem_salesEntryId_fkey" FOREIGN KEY ("salesEntryId") REFERENCES "SalesEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesLineItem" ADD CONSTRAINT "SalesLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
