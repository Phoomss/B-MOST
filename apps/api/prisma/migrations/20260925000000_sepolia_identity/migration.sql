-- Schema-only migration. Existing local-chain references remain untouched and
-- must be reviewed before any re-sync to Sepolia.
ALTER TABLE "User" ADD COLUMN "walletAddress" TEXT;
ALTER TABLE "Product" ADD COLUMN "blockchainChainId" INTEGER;
ALTER TABLE "Product" ADD COLUMN "blockchainContractAddress" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "blockchainChainId" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "blockchainContractAddress" TEXT;
ALTER TABLE "BlockchainTransaction" ADD COLUMN "chainId" INTEGER;

-- Several organizations intentionally share Account 2.
DROP INDEX IF EXISTS "Organization_walletAddress_key";
DROP INDEX IF EXISTS "Product_blockchainProductId_key";
CREATE UNIQUE INDEX "Product_blockchainChainId_blockchainContractAddress_blockchainProductId_key"
  ON "Product"("blockchainChainId", "blockchainContractAddress", "blockchainProductId");
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");
