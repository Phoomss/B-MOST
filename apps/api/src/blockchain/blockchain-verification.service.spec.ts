import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BlockchainVerificationService } from './blockchain-verification.service';
import { BlockchainService } from './blockchain.service';

describe('BlockchainVerificationService', () => {
  const wallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const contract = '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a';
  const hash = `0x${'a'.repeat(64)}`;
  const provider = {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 11155111n }),
    getTransaction: jest.fn().mockResolvedValue({ from: wallet, to: contract }),
    getTransactionReceipt: jest.fn().mockResolvedValue({ hash, from: wallet, to: contract, status: 1, blockNumber: 123 }),
  };
  const blockchain = { getProvider: () => provider, getContractAddress: () => contract } as unknown as BlockchainService;
  const service = new BlockchainVerificationService(blockchain);

  beforeEach(() => jest.clearAllMocks());

  it('checks RPC chain, recipient, sender and receipt before returning an unsynced confirmation', async () => {
    await expect(service.verifyTransaction(hash, wallet)).resolves.toMatchObject({
      verified: true, synced: false, chainId: 11155111, pendingAbi: true,
    });
  });

  it('rejects a transaction from another account', async () => {
    provider.getTransaction.mockResolvedValueOnce({ from: contract, to: contract });
    await expect(service.verifyTransaction(hash, wallet)).rejects.toThrow(ForbiddenException);
  });

  it('rejects a transaction targeting another contract', async () => {
    provider.getTransaction.mockResolvedValueOnce({ from: wallet, to: wallet });
    await expect(service.verifyTransaction(hash, wallet)).rejects.toThrow(BadRequestException);
  });

  it('rejects a local-chain RPC', async () => {
    provider.getNetwork.mockResolvedValueOnce({ chainId: 31337n });
    await expect(service.verifyTransaction(hash, wallet)).rejects.toThrow(BadRequestException);
  });
});
