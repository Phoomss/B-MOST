import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ProductStatus, UserRole } from '@prisma/client';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { ProductStateMachineService } from './product-state-machine.service';
import { BlockchainActionService } from './blockchain-action.service';
import { UserSignedAction } from './dto/blockchain-action.dto';
import { supplyChainRegistryAbi } from './constants/sepolia-abi.constant';

describe('BlockchainActionService', () => {
  const address = '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a';
  const wallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const hash = `0x${'a'.repeat(64)}`;
  const productHash = `0x${'b'.repeat(64)}`;
  const iface = new ethers.Interface(supplyChainRegistryAbi);
  const user = {
    id: 'user-1',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-1',
    walletAddress: wallet,
  };
  const product = {
    id: 'product-1',
    productCode: 'BM-001',
    productHash,
    status: ProductStatus.REGISTERED,
    manufacturerId: 'org-1',
    currentOwnerId: 'org-1',
    manufacturer: { walletAddress: wallet },
    currentOwner: { walletAddress: wallet },
    blockchainProductId: null,
    blockchainChainId: null,
    blockchainContractAddress: null,
  };
  const provider = {
    call: jest.fn(),
    getNetwork: jest.fn(),
    getTransaction: jest.fn(),
    getTransactionReceipt: jest.fn(),
  };
  const tx = {
    shipment: { create: jest.fn() },
    blockchainActionIntent: { create: jest.fn(), update: jest.fn() },
    product: { update: jest.fn() },
    qualityCheck: { findFirst: jest.fn(), create: jest.fn() },
    blockchainTransaction: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    product: { findFirst: jest.fn(), findUnique: jest.fn() },
    blockchainActionIntent: { findUnique: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const blockchain = {
    getStatus: jest.fn(),
    getContractAddress: jest.fn(() => address),
    getReadOnlyContract: jest.fn(() => ({ interface: iface })),
    getProvider: jest.fn(() => provider),
    getProduct: jest.fn(),
  };
  const stateMachine = {
    checkStateMismatch: jest.fn(),
    validateTransition: jest.fn(),
  };
  const service = new BlockchainActionService(
    prisma as unknown as PrismaService,
    blockchain as unknown as BlockchainService,
    stateMachine as unknown as ProductStateMachineService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.product.findFirst.mockResolvedValue(product);
    blockchain.getStatus.mockResolvedValue({
      connected: true,
      chainId: 11155111,
    });
    provider.call.mockResolvedValue('0x');
    prisma.blockchainActionIntent.findFirst.mockResolvedValue(null);
    tx.blockchainActionIntent.create.mockResolvedValue({
      id: 'intent-1',
      entityType: 'Product',
      entityId: product.id,
      expiresAt: new Date(),
    });
  });

  it('prepares a registration from database values and simulates it from the user wallet', async () => {
    const result = await service.prepare(
      { action: UserSignedAction.REGISTER_PRODUCT, entityId: product.id },
      user,
    );
    expect(result).toMatchObject({
      functionName: 'registerProduct',
      args: ['BM-001', productHash],
      expectedWallet: wallet,
    });
    expect(provider.call).toHaveBeenCalledWith({
      to: address,
      from: wallet,
      data: iface.encodeFunctionData('registerProduct', [
        'BM-001',
        productHash,
      ]),
    });
    expect(tx.blockchainActionIntent.create).toHaveBeenCalled();
  });

  it('rejects legacy product IDs without a Sepolia chain and contract identity', async () => {
    prisma.product.findFirst.mockResolvedValueOnce({
      ...product,
      blockchainProductId: '1',
      status: ProductStatus.RECEIVED,
    });
    await expect(
      service.prepare(
        { action: UserSignedAction.STORE_PRODUCT, entityId: product.id },
        {
          ...user,
          role: UserRole.WAREHOUSE,
        },
      ),
    ).rejects.toThrow(ConflictException);
    expect(blockchain.getProduct).not.toHaveBeenCalled();
  });

  it('rejects a wallet that differs from the manufacturer wallet', async () => {
    await expect(
      service.prepare(
        { action: UserSignedAction.REGISTER_PRODUCT, entityId: product.id },
        {
          ...user,
          walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('confirms a matching on-chain registration event before assigning the Sepolia ID', async () => {
    const log = iface.encodeEventLog(iface.getEvent('ProductRegistered')!, [
      1n,
      'BM-001',
      productHash,
      wallet,
      1n,
    ]);
    const input = iface.encodeFunctionData('registerProduct', [
      'BM-001',
      productHash,
    ]);
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      userId: user.id,
      status: 'PENDING',
      action: 'registerProduct',
      entityType: 'Product',
      entityId: product.id,
      functionName: 'registerProduct',
      args: ['BM-001', productHash],
      metadata: {},
    });
    prisma.product.findUnique.mockResolvedValue(product);
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({
      to: address,
      from: wallet,
      data: input,
      value: 0n,
    });
    provider.getTransactionReceipt.mockResolvedValue({
      hash,
      to: address,
      from: wallet,
      status: 1,
      blockNumber: 123,
      logs: [{ address, topics: log.topics, data: log.data }],
    });
    tx.product.update.mockResolvedValue({
      ...product,
      blockchainProductId: '1',
    });
    const result = await service.confirm(
      { intentId: 'intent-1', transactionHash: hash },
      user,
    );
    expect(result).toMatchObject({
      verified: true,
      synced: true,
      transactionHash: hash,
    });
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockchainProductId: '1',
          blockchainChainId: 11155111,
          blockchainContractAddress: address,
        }),
      }),
    );
  });

  it('rejects a transaction sent by a different wallet', async () => {
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      userId: user.id,
      status: 'PENDING',
      action: 'registerProduct',
      entityType: 'Product',
      entityId: product.id,
      functionName: 'registerProduct',
      args: ['BM-001', productHash],
    });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: address, from: address });
    provider.getTransactionReceipt.mockResolvedValue({
      to: address,
      from: address,
      status: 1,
    });
    await expect(
      service.confirm({ intentId: 'intent-1', transactionHash: hash }, user),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a transaction hash already assigned to another intent', async () => {
    prisma.blockchainActionIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      userId: user.id,
      status: 'PENDING',
    });
    prisma.blockchainActionIntent.findFirst.mockResolvedValue({ id: 'intent-2' });
    provider.getNetwork.mockResolvedValue({ chainId: 11155111n });
    provider.getTransaction.mockResolvedValue({ to: address, from: wallet });
    provider.getTransactionReceipt.mockResolvedValue({ hash, to: address, from: wallet, status: 1 });

    await expect(
      service.confirm({ intentId: 'intent-1', transactionHash: hash }, user),
    ).rejects.toThrow(ConflictException);
    expect(tx.product.update).not.toHaveBeenCalled();
  });
});
