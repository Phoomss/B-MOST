import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TxStatus } from '@prisma/client';
import { BlockchainTransactionService } from './blockchain-transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';

describe('BlockchainTransactionService', () => {
  let service: BlockchainTransactionService;

  const mockPrisma = {
    blockchainTransaction: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockBlockchainService = {
    getTransactionReceipt: jest.fn(),
    getContractAddress: jest
      .fn()
      .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainTransactionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<BlockchainTransactionService>(
      BlockchainTransactionService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated transactions with stringified blockNumber', async () => {
      mockPrisma.blockchainTransaction.count.mockResolvedValue(1);
      mockPrisma.blockchainTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-uuid-1',
          txHash: '0x123abc',
          blockNumber: BigInt(100),
          contractAddress: '0xContract',
          eventType: 'ProductRegistered',
          entityType: 'Product',
          entityId: '1',
          productId: 'prod-uuid-1',
          walletAddress: '0xWallet',
          status: TxStatus.CONFIRMED,
          createdAt: new Date(),
          product: {
            id: 'prod-uuid-1',
            productCode: 'PROD-001',
            name: 'Test Product',
          },
        },
      ]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        eventType: 'ProductRegistered',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].blockNumber).toBe('100');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(mockPrisma.blockchainTransaction.findMany).toHaveBeenCalled();
    });

    it('should filter by blockNumber and search term when provided', async () => {
      mockPrisma.blockchainTransaction.count.mockResolvedValue(1);
      mockPrisma.blockchainTransaction.findMany.mockResolvedValue([]);

      await service.findAll({
        blockNumber: '42',
        search: 'PROD-1',
      });

      expect(mockPrisma.blockchainTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            blockNumber: BigInt(42),
            OR: expect.arrayContaining([
              { txHash: { contains: 'PROD-1', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregated counts of transactions by status', async () => {
      mockPrisma.blockchainTransaction.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      const stats = await service.getStats();
      expect(stats.total).toBe(50);
      expect(stats.confirmed).toBe(45);
      expect(stats.pending).toBe(3);
      expect(stats.failed).toBe(2);
    });
  });

  describe('findByHash', () => {
    it('should return transaction record and enrich with on-chain receipt if available', async () => {
      const mockRecord = {
        id: 'tx-uuid-1',
        txHash: '0x123abc',
        blockNumber: BigInt(50),
        contractAddress: '0xContract',
        eventType: 'ProductRegistered',
        entityType: 'Product',
        entityId: '1',
        productId: null,
        walletAddress: '0xSender',
        status: TxStatus.CONFIRMED,
        createdAt: new Date(),
        product: null,
      };

      mockPrisma.blockchainTransaction.findUnique.mockResolvedValue(mockRecord);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        blockNumber: 50,
        status: 1,
        from: '0xSender',
        to: '0xContract',
        gasUsed: BigInt(21000),
      });

      const result = await service.findByHash('0x123abc');
      expect(result.txHash).toBe('0x123abc');
      expect(result.blockNumber).toBe('50');
      expect(result.onChainReceipt).toBeDefined();
      expect(result.onChainReceipt?.gasUsed).toBe('21000');
    });

    it('should fallback to live on-chain receipt if database does not contain record yet', async () => {
      mockPrisma.blockchainTransaction.findUnique.mockResolvedValue(null);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        hash: '0x999onchain',
        blockNumber: 77,
        status: 1,
        from: '0xWalletA',
        to: '0xContractB',
        gasUsed: BigInt(45000),
      });

      const result = await service.findByHash('0x999onchain');
      expect(result.txHash).toBe('0x999onchain');
      expect(result.blockNumber).toBe('77');
      expect(result.status).toBe(TxStatus.CONFIRMED);
    });

    it('should throw NotFoundException if transaction is neither in database nor on chain', async () => {
      mockPrisma.blockchainTransaction.findUnique.mockResolvedValue(null);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue(null);

      await expect(service.findByHash('0xnotfound')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
