import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { UserRole, TxStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { BlockchainIndexerService } from '../src/blockchain/blockchain-indexer.service';

describe('Blockchain API Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let superadminToken: string;
  let regularUserToken: string;

  const mockAdminUser = {
    id: 'user-admin-uuid',
    email: 'superadmin@bmost.io',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockViewerUser = {
    id: 'user-viewer-uuid',
    email: 'viewer@bmost.io',
    firstName: 'Regular',
    lastName: 'Viewer',
    role: UserRole.VIEWER,
    organizationId: 'org-viewer-uuid',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === mockAdminUser.id)
            return Promise.resolve(mockAdminUser);
          if (where.id === mockViewerUser.id)
            return Promise.resolve(mockViewerUser);
          return Promise.resolve(null);
        }),
    },
    blockchainTransaction: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'tx-1',
          txHash:
            '0xabc1234567890123456789012345678901234567890123456789012345678901',
          blockNumber: BigInt(42),
          contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          eventType: 'ProductRegistered',
          entityType: 'Product',
          entityId: '1',
          productId: 'prod-uuid-1',
          walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          status: TxStatus.CONFIRMED,
          createdAt: new Date(),
          product: {
            id: 'prod-uuid-1',
            productCode: 'PROD-2026-0001',
            name: 'Electronic Sensor Module',
          },
        },
      ]),
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { txHash: string } }) => {
          if (
            where.txHash ===
            '0xabc1234567890123456789012345678901234567890123456789012345678901'
          ) {
            return Promise.resolve({
              id: 'tx-1',
              txHash:
                '0xabc1234567890123456789012345678901234567890123456789012345678901',
              blockNumber: BigInt(42),
              contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
              eventType: 'ProductRegistered',
              entityType: 'Product',
              entityId: '1',
              productId: 'prod-uuid-1',
              walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
              status: TxStatus.CONFIRMED,
              createdAt: new Date(),
              product: {
                id: 'prod-uuid-1',
                productCode: 'PROD-2026-0001',
                name: 'Electronic Sensor Module',
              },
            });
          }
          return Promise.resolve(null);
        }),
    },
  };

  const mockBlockchainService = {
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      network: 'hardhat',
      chainId: 31337,
      currentBlock: 42,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      operatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      operatorBalanceEth: '100.0',
    }),
    getContractAddress: jest
      .fn()
      .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
    getTransactionReceipt: jest.fn().mockResolvedValue(null),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  const mockIndexerService = {
    getListenerStatus: jest.fn().mockReturnValue({
      isListening: true,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    }),
    syncHistoricalEvents: jest.fn().mockResolvedValue({
      syncedEvents: 5,
      fromBlock: 0,
      toBlock: 42,
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(BlockchainService)
      .useValue(mockBlockchainService)
      .overrideProvider(BlockchainIndexerService)
      .useValue(mockIndexerService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    jwtService = app.get(JwtService);

    superadminToken = jwtService.sign({
      sub: mockAdminUser.id,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
      organizationId: mockAdminUser.organizationId,
    });

    regularUserToken = jwtService.sign({
      sub: mockViewerUser.id,
      email: mockViewerUser.email,
      role: mockViewerUser.role,
      organizationId: mockViewerUser.organizationId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/blockchain/status', () => {
    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/blockchain/status')
        .expect(401);
    });

    it('returns blockchain status and listener state for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/blockchain/status')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      expect(res.body.connected).toBe(true);
      expect(res.body.chainId).toBe(31337);
      expect(res.body.contractAddress).toBe(
        '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      );
      expect(res.body.listenerActive).toBe(true);
      expect(res.body.operatorAddress).toBe(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      );
    });
  });

  describe('GET /api/blockchain/transactions', () => {
    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/blockchain/transactions')
        .expect(401);
    });

    it('returns paginated transactions with stringified blockNumber', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/blockchain/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].blockNumber).toBe('42');
      expect(res.body.data[0].eventType).toBe('ProductRegistered');
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('GET /api/blockchain/transactions/:txHash', () => {
    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get(
          '/api/blockchain/transactions/0xabc1234567890123456789012345678901234567890123456789012345678901',
        )
        .expect(401);
    });

    it('returns indexed transaction details by txHash', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/blockchain/transactions/0xabc1234567890123456789012345678901234567890123456789012345678901',
        )
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      expect(res.body.txHash).toBe(
        '0xabc1234567890123456789012345678901234567890123456789012345678901',
      );
      expect(res.body.blockNumber).toBe('42');
      expect(res.body.status).toBe(TxStatus.CONFIRMED);
      expect(res.body.product.productCode).toBe('PROD-2026-0001');
    });

    it('returns 404 when transaction is not found', async () => {
      await request(app.getHttpServer())
        .get(
          '/api/blockchain/transactions/0x0000000000000000000000000000000000000000000000000000000000000000',
        )
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(404);
    });
  });

  describe('POST /api/blockchain/sync', () => {
    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/blockchain/sync')
        .send({ fromBlock: 0, toBlock: 50 })
        .expect(401);
    });

    it('rejects non-SUPER_ADMIN user with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/blockchain/sync')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ fromBlock: 0, toBlock: 50 })
        .expect(403);
    });

    it('allows SUPER_ADMIN to trigger historical event sync', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/blockchain/sync')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ fromBlock: 0, toBlock: 42 })
        .expect(200);

      expect(res.body.message).toBe('Blockchain event sync completed');
      expect(res.body.syncedEvents).toBe(5);
      expect(mockIndexerService.syncHistoricalEvents).toHaveBeenCalledWith(
        0,
        42,
      );
    });
  });
});
