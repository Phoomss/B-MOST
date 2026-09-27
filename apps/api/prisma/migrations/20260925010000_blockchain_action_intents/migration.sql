CREATE TABLE "BlockchainActionIntent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "functionName" TEXT NOT NULL,
  "args" JSONB NOT NULL,
  "metadata" JSONB,
  "transactionHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "BlockchainActionIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlockchainActionIntent_transactionHash_key" ON "BlockchainActionIntent"("transactionHash");
CREATE INDEX "BlockchainActionIntent_userId_status_idx" ON "BlockchainActionIntent"("userId", "status");
CREATE INDEX "BlockchainActionIntent_entityType_entityId_idx" ON "BlockchainActionIntent"("entityType", "entityId");
