import { Test, TestingModule } from '@nestjs/testing';
import { TxStatus, ProductStatus } from '@prisma/client';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { BLOCKCHAIN_EVENTS } from './constants/events.constant';

describe('BlockchainIndexerService', () => {
  let service: BlockchainIndexerService;
  let blockchainService: BlockchainService;

  const mockPrisma = {
    blockchainTransaction: {
      upsert: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockBlockchainService = {
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      chainId: 31337,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    }),
    getContractAddress: jest
      .fn()
      .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
    getReadOnlyContract: jest.fn().mockReturnValue({
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      queryFilter: jest.fn().mockResolvedValue([]),
    }),
    getProvider: jest.fn().mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(100),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainIndexerService,
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

    service = module.get<BlockchainIndexerService>(BlockchainIndexerService);
    blockchainService = module.get<BlockchainService>(BlockchainService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleEvent', () => {
    it('should index ProductRegistered event and update linked PostgreSQL Product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-uuid-1',
        productCode: 'PROD-001',
        blockchainProductId: null,
      });
      mockPrisma.product.update.mockResolvedValue({});
      mockPrisma.blockchainTransaction.upsert.mockResolvedValue({});

      await service.handleEvent({
        eventName: BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED,
        txHash: '0xeventtx',
        blockNumber: 10,
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        entityType: 'Product',
        entityId: '1',
        productCode: 'PROD-001',
        walletAddress: '0xManufacturer',
      });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-uuid-1' },
        data: expect.objectContaining({
          blockchainProductId: '1',
          blockchainTxHash: '0xeventtx',
          status: ProductStatus.REGISTERED,
        }),
      });

      expect(mockPrisma.blockchainTransaction.upsert).toHaveBeenCalledWith({
        where: { txHash: '0xeventtx' },
        update: expect.objectContaining({
          blockNumber: BigInt(10),
          eventType: BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED,
          status: TxStatus.CONFIRMED,
        }),
        create: expect.objectContaining({
          txHash: '0xeventtx',
          blockNumber: BigInt(10),
          eventType: BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED,
          status: TxStatus.CONFIRMED,
        }),
      });
    });

    it('should index QualityChecked event and update product status to QUALITY_CHECKED when passed is true', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-uuid-2',
        blockchainProductId: '2',
      });
      mockPrisma.product.update.mockResolvedValue({});
      mockPrisma.blockchainTransaction.upsert.mockResolvedValue({});

      await service.handleEvent({
        eventName: BLOCKCHAIN_EVENTS.QUALITY_CHECKED,
        txHash: '0xqctx',
        blockNumber: 15,
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        entityType: 'Product',
        entityId: '2',
        walletAddress: '0xAuditor',
        additionalData: { passed: true, notes: 'All tests passed' },
      });

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-uuid-2' },
        data: expect.objectContaining({
          status: ProductStatus.QUALITY_CHECKED,
        }),
      });
    });
  });

  describe('syncHistoricalEvents', () => {
    it('should query contract logs and index them sequentially', async () => {
      const mockLogs = [
        {
          eventName: BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED,
          transactionHash: '0xlog1',
          blockNumber: 1,
          address: '0xContract',
          args: [
            BigInt(1),
            'PROD-A',
            '0xHash',
            '0xManufacturer',
            BigInt(1700000),
          ],
        },
      ];

      const mockContract = {
        queryFilter: jest.fn().mockResolvedValue(mockLogs),
      };
      (blockchainService.getReadOnlyContract as jest.Mock).mockReturnValue(
        mockContract,
      );

      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.blockchainTransaction.upsert.mockResolvedValue({});

      const result = await service.syncHistoricalEvents(0, 5);

      expect(mockContract.queryFilter).toHaveBeenCalledWith('*', 0, 5);
      expect(result.syncedEvents).toBe(1);
      expect(result.fromBlock).toBe(0);
      expect(result.toBlock).toBe(5);
    });
  });
});
