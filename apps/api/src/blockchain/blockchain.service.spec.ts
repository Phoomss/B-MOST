import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  const mockConfig: Record<string, string> = {
    'blockchain.rpcUrl': 'http://localhost:8545',
    'blockchain.contractAddress': '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    'blockchain.deployerPrivateKey':
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should expose configured RPC URL and Contract Address', () => {
    expect(service.getRpcUrl()).toBe('http://localhost:8545');
    expect(service.getContractAddress()).toBe(
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    );
  });

  it('should instantiate an ethers JsonRpcProvider and Signer', () => {
    const provider = service.getProvider();
    expect(provider).toBeInstanceOf(ethers.JsonRpcProvider);

    const signer = service.getSigner();
    expect(signer).toBeInstanceOf(ethers.Wallet);
    expect(signer.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  });

  it('should return connected false when node is unreachable', async () => {
    jest
      .spyOn(service.getProvider(), 'getNetwork')
      .mockRejectedValueOnce(new Error('Network error'));

    const status = await service.getStatus();
    expect(status.connected).toBe(false);
    expect(status.contractAddress).toBe(
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    );
    expect(status.error).toContain('Network error');
  });

  it('should return connected true with block and operator info when node is reachable', async () => {
    jest.spyOn(service.getProvider(), 'getNetwork').mockResolvedValueOnce({
      name: 'hardhat',
      chainId: BigInt(31337),
    } as any);
    jest
      .spyOn(service.getProvider(), 'getBlockNumber')
      .mockResolvedValueOnce(42);
    jest
      .spyOn(service.getProvider(), 'getBalance')
      .mockResolvedValueOnce(ethers.parseEther('100.0'));

    const status = await service.getStatus();
    expect(status.connected).toBe(true);
    expect(status.chainId).toBe(31337);
    expect(status.currentBlock).toBe(42);
    expect(status.operatorAddress).toBe(
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    );
    expect(status.operatorBalanceEth).toBe('100.0');
  });

  describe('Contract Call Execution', () => {
    it('should invoke registerProduct on contract and parse emitted event', async () => {
      const mockWait = jest.fn().mockResolvedValue({
        hash: '0x123abc',
        blockNumber: 10,
        logs: [],
      });
      const mockContract = {
        registerProduct: jest.fn().mockResolvedValue({
          wait: mockWait,
        }),
        interface: {
          parseLog: jest.fn(),
        },
      };

      jest.spyOn(service, 'getContract').mockReturnValue(mockContract as any);

      const result = await service.registerProduct('PROD-001', '0xabc123');
      expect(mockContract.registerProduct).toHaveBeenCalledWith(
        'PROD-001',
        '0xabc123',
      );
      expect(result.txHash).toBe('0x123abc');
      expect(result.blockNumber).toBe(10);
    });

    it('should invoke recordQualityCheck on contract', async () => {
      const mockWait = jest.fn().mockResolvedValue({
        hash: '0x456def',
        blockNumber: 11,
      });
      const mockContract = {
        recordQualityCheck: jest.fn().mockResolvedValue({
          wait: mockWait,
        }),
      };

      jest.spyOn(service, 'getContract').mockReturnValue(mockContract as any);

      const result = await service.recordQualityCheck(
        1,
        true,
        'Inspected passed',
      );
      expect(mockContract.recordQualityCheck).toHaveBeenCalledWith(
        1,
        true,
        'Inspected passed',
      );
      expect(result.txHash).toBe('0x456def');
      expect(result.blockNumber).toBe(11);
    });

    it('should invoke createShipment on contract and return shipmentId', async () => {
      const mockWait = jest.fn().mockResolvedValue({
        hash: '0x789ghi',
        blockNumber: 12,
        logs: [],
      });
      const mockContract = {
        createShipment: jest.fn().mockResolvedValue({
          wait: mockWait,
        }),
        interface: {
          parseLog: jest.fn(),
        },
      };

      jest.spyOn(service, 'getContract').mockReturnValue(mockContract as any);

      const result = await service.createShipment(
        'SHIP-001',
        1,
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      );
      expect(mockContract.createShipment).toHaveBeenCalled();
      expect(result.txHash).toBe('0x789ghi');
      expect(result.blockNumber).toBe(12);
    });

    it('should invoke shipProduct on contract', async () => {
      const mockWait = jest.fn().mockResolvedValue({
        hash: '0xship',
        blockNumber: 13,
      });
      const mockContract = {
        shipProduct: jest.fn().mockResolvedValue({
          wait: mockWait,
        }),
      };
      jest.spyOn(service, 'getContract').mockReturnValue(mockContract as any);

      const res = await service.shipProduct(1, 1);
      expect(mockContract.shipProduct).toHaveBeenCalledWith(1, 1);
      expect(res.txHash).toBe('0xship');
    });

    it('should invoke receiveProduct on contract', async () => {
      const mockWait = jest.fn().mockResolvedValue({
        hash: '0xrecv',
        blockNumber: 14,
      });
      const mockContract = {
        receiveProduct: jest.fn().mockResolvedValue({
          wait: mockWait,
        }),
      };
      jest.spyOn(service, 'getContract').mockReturnValue(mockContract as any);

      const res = await service.receiveProduct(1, 1);
      expect(mockContract.receiveProduct).toHaveBeenCalledWith(1, 1);
      expect(res.txHash).toBe('0xrecv');
    });

    it('should invoke recallProduct on contract', async () => {
      const mockWait = jest.fn().mockResolvedValue({
        hash: '0xrecall',
        blockNumber: 15,
      });
      const mockContract = {
        recallProduct: jest.fn().mockResolvedValue({
          wait: mockWait,
        }),
      };
      jest.spyOn(service, 'getContract').mockReturnValue(mockContract as any);

      const res = await service.recallProduct(1, 'Defect found');
      expect(mockContract.recallProduct).toHaveBeenCalledWith(
        1,
        'Defect found',
      );
      expect(res.txHash).toBe('0xrecall');
    });

    it('should query getProduct from contract and format result', async () => {
      const mockContract = {
        getProduct: jest
          .fn()
          .mockResolvedValue([
            BigInt(1),
            'PROD-001',
            '0x123',
            '0xManufacturer',
            '0xCurrentOwner',
            BigInt(0),
            BigInt(1700000000),
          ]),
      };
      jest
        .spyOn(service, 'getReadOnlyContract')
        .mockReturnValue(mockContract as any);

      const product = await service.getProduct(1);
      expect(product.productId).toBe(1);
      expect(product.productCode).toBe('PROD-001');
      expect(product.manufacturer).toBe('0xManufacturer');
    });

    it('should query getTotalProducts and getTotalShipments', async () => {
      const mockContract = {
        getTotalProducts: jest.fn().mockResolvedValue(BigInt(5)),
        getTotalShipments: jest.fn().mockResolvedValue(BigInt(3)),
      };
      jest
        .spyOn(service, 'getReadOnlyContract')
        .mockReturnValue(mockContract as any);

      expect(await service.getTotalProducts()).toBe(5);
      expect(await service.getTotalShipments()).toBe(3);
    });

    it('should query getBlock from provider and format block details', async () => {
      const mockBlock = {
        number: 10,
        hash: '0xblock10',
        parentHash: '0xblock9',
        timestamp: 1700000000,
        miner: '0xMiner',
        gasLimit: BigInt(30000000),
        gasUsed: BigInt(21000),
        baseFeePerGas: BigInt(1000000000),
        transactions: ['0xtx1', '0xtx2'],
      };

      jest
        .spyOn(service.getProvider(), 'getBlock')
        .mockResolvedValueOnce(mockBlock as any);

      const block = await service.getBlock(10);
      expect(block).toBeDefined();
      expect(block?.number).toBe(10);
      expect(block?.hash).toBe('0xblock10');
      expect(block?.transactionCount).toBe(2);
      expect(block?.gasUsed).toBe('21000');
    });

    it('should return null when getBlock fails or block is not found', async () => {
      jest.spyOn(service.getProvider(), 'getBlock').mockResolvedValueOnce(null);

      const block = await service.getBlock('latest');
      expect(block).toBeNull();
    });
  });
});
