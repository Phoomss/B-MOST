/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { TxStatus } from '@prisma/client';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { BlockchainTransactionService } from './blockchain-transaction.service';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { BlockchainVerificationService } from './blockchain-verification.service';

describe('BlockchainController', () => {
  let controller: BlockchainController;
  let blockchainService: BlockchainService;
  let transactionService: BlockchainTransactionService;
  let indexerService: BlockchainIndexerService;

  const mockBlockchainService = {
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      network: 'hardhat',
      chainId: 31337,
      currentBlock: 10,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    }),
  };

  const mockTransactionService = {
    findAll: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'tx-1',
          txHash: '0x123',
          blockNumber: '10',
          contractAddress: '0xContract',
          eventType: 'ProductRegistered',
          entityType: 'Product',
          entityId: '1',
          productId: null,
          walletAddress: '0xWallet',
          status: TxStatus.CONFIRMED,
          createdAt: new Date(),
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    }),
    findByHash: jest.fn().mockResolvedValue({
      id: 'tx-1',
      txHash: '0x123',
      blockNumber: '10',
      contractAddress: '0xContract',
      eventType: 'ProductRegistered',
      entityType: 'Product',
      entityId: '1',
      productId: null,
      walletAddress: '0xWallet',
      status: TxStatus.CONFIRMED,
      createdAt: new Date(),
    }),
  };

  const mockIndexerService = {
    getListenerStatus: jest.fn().mockReturnValue({
      isListening: true,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    }),
    syncHistoricalEvents: jest.fn().mockResolvedValue({
      syncedEvents: 3,
      fromBlock: 0,
      toBlock: 10,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockchainController],
      providers: [
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        {
          provide: BlockchainTransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: BlockchainIndexerService,
          useValue: mockIndexerService,
        },
        {
          provide: BlockchainVerificationService,
          useValue: { verifyTransaction: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<BlockchainController>(BlockchainController);
    blockchainService = module.get<BlockchainService>(BlockchainService);
    transactionService = module.get<BlockchainTransactionService>(
      BlockchainTransactionService,
    );
    indexerService = module.get<BlockchainIndexerService>(
      BlockchainIndexerService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return connection status with listener info', async () => {
      const result = await controller.getStatus();
      expect(result.connected).toBe(true);
      expect(result.chainId).toBe(31337);
      expect(result.listenerActive).toBe(true);
      expect(blockchainService.getStatus).toHaveBeenCalled();
    });
  });

  describe('getTransactions', () => {
    it('should return list of indexed transactions', async () => {
      const result = await controller.getTransactions({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(transactionService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getTransaction', () => {
    it('should return transaction by txHash', async () => {
      const result = await controller.getTransaction('0x123');
      expect(result.txHash).toBe('0x123');
      expect(transactionService.findByHash).toHaveBeenCalledWith('0x123');
    });
  });

  describe('syncEvents', () => {
    it('should invoke indexer syncHistoricalEvents and return confirmation', async () => {
      const result = await controller.syncEvents({ fromBlock: 0, toBlock: 10 });
      expect(result.message).toBe('Blockchain event sync completed');
      expect(result.syncedEvents).toBe(3);
      expect(indexerService.syncHistoricalEvents).toHaveBeenCalledWith(0, 10);
    });
  });

  describe('getStats', () => {
    it('should return transaction statistics from service', async () => {
      mockTransactionService.getStats = jest.fn().mockResolvedValue({
        total: 10,
        confirmed: 8,
        pending: 2,
        failed: 0,
      });

      const stats = await controller.getStats();
      expect(stats.total).toBe(10);
      expect(stats.confirmed).toBe(8);
      expect(mockTransactionService.getStats).toHaveBeenCalled();
    });
  });

  describe('getBlock', () => {
    it('should return block details when found', async () => {
      mockBlockchainService.getBlock = jest.fn().mockResolvedValue({
        number: 42,
        hash: '0xblockhash',
        parentHash: '0xparenthash',
        timestamp: 1672531199,
        miner: '0xminer',
        gasLimit: '30000000',
        gasUsed: '21000',
        baseFeePerGas: '1000000000',
        transactionCount: 1,
        transactions: ['0x123'],
      });

      const block = await controller.getBlock('42');
      expect(block.number).toBe(42);
      expect(block.hash).toBe('0xblockhash');
      expect(mockBlockchainService.getBlock).toHaveBeenCalledWith('42');
    });

    it('should throw NotFoundException when block is not found', async () => {
      mockBlockchainService.getBlock = jest.fn().mockResolvedValue(null);

      await expect(controller.getBlock('999')).rejects.toThrow(
        'Block 999 not found',
      );
    });
  });
});
