import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const SUPPLY_CHAIN_ABI = [
  'function getProduct(uint256 productId) view returns (tuple(uint256 productId, string productCode, bytes32 productHash, address manufacturer, address currentOwner, uint8 status, uint256 registeredAt))',
  'function getProductByCode(string productCode) view returns (tuple(uint256 productId, string productCode, bytes32 productHash, address manufacturer, address currentOwner, uint8 status, uint256 registeredAt))',
];

async function main() {
  console.log('🔍 Starting Blockchain Data Reconciliation...');

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
  const contractAddress =
    process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, SUPPLY_CHAIN_ABI, provider);

  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products in database.`);

  // PASS 1: Identify and clear invalid / unverified blockchainProductIds in DB
  console.log('\n--- PASS 1: Auditing existing DB blockchainProductIds against Smart Contract ---');
  for (const product of products) {
    if (product.blockchainProductId) {
      let valid = false;
      try {
        const onChain = await contract.getProduct(BigInt(product.blockchainProductId));
        if (onChain && onChain.productCode === product.productCode) {
          valid = true;
          console.log(`  ✓ Product ${product.productCode} properly matches on-chain ID ${product.blockchainProductId}`);
        } else {
          console.log(`  ⚠️ Product ${product.productCode} has ID ${product.blockchainProductId}, but on-chain that ID belongs to '${onChain?.productCode}'`);
        }
      } catch {
        console.log(`  ⚠️ Product ${product.productCode} has ID ${product.blockchainProductId}, but it does not exist on-chain.`);
      }

      if (!valid) {
        console.log(`  -> Unlinking invalid blockchainProductId from ${product.productCode}...`);
        await prisma.product.update({
          where: { id: product.id },
          data: {
            blockchainProductId: null,
            blockchainTxHash: null,
          },
        });
        console.log(`  ✅ Unlinked ${product.productCode}`);
      }
    }
  }

  // PASS 2: Sync real on-chain products into DB
  console.log('\n--- PASS 2: Syncing verified on-chain products into DB ---');
  for (const product of products) {
    try {
      const onChain = await contract.getProductByCode(product.productCode);
      if (onChain && Number(onChain.productId) > 0) {
        const realId = onChain.productId.toString();
        console.log(`  ✓ Found ${product.productCode} on blockchain with ID ${realId}. Updating DB...`);
        await prisma.product.update({
          where: { id: product.id },
          data: {
            blockchainProductId: realId,
          },
        });
        console.log(`  ✅ Updated ${product.productCode} -> blockchainProductId: ${realId}`);
      }
    } catch {
      console.log(`  ℹ️ Product ${product.productCode} is not registered on blockchain.`);
    }
  }

  // PASS 3: Reconcile BlockchainTransaction records
  console.log('\n--- PASS 3: Reconciling BlockchainTransaction records ---');
  const registeredEvents = await prisma.blockchainTransaction.findMany({
    where: { eventType: 'ProductRegistered' },
  });

  for (const tx of registeredEvents) {
    if (tx.entityId) {
      try {
        const onChainProd = await contract.getProduct(BigInt(tx.entityId));
        if (onChainProd && onChainProd.productCode) {
          const matchingDbProd = await prisma.product.findUnique({
            where: { productCode: onChainProd.productCode },
          });
          if (matchingDbProd && tx.productId !== matchingDbProd.id) {
            console.log(`  ⚠️ Re-linking tx ${tx.txHash} to correct product ${matchingDbProd.productCode} (${matchingDbProd.id})`);
            await prisma.blockchainTransaction.update({
              where: { id: tx.id },
              data: { productId: matchingDbProd.id },
            });
            console.log(`  ✅ Tx re-linked successfully.`);
          }
        }
      } catch (err: any) {
        console.log(`  Could not verify tx ${tx.txHash}: ${err.message}`);
      }
    }
  }

  console.log('\n🎉 Reconciliation complete!');
}

main()
  .catch((err) => {
    console.error('Error during reconciliation:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
