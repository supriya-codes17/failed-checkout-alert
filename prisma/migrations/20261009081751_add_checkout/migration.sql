-- CreateTable
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "totalPrice" TEXT NOT NULL DEFAULT '0',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "checkoutUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "alertedAt" DATETIME,
    "recoveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_token_key" ON "Checkout"("token");
