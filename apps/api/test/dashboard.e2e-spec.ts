import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import {
  ProductStatus,
  ShipmentStatus,
  TxStatus,
  UserRole,
  OrganizationType,
} from '@prisma/client';

describe('Dashboard API Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;

  const mockAdminUser = {
    id: 'user-admin-uuid',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
    status: 'ACTIVE',
    organization: null,
  };

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockAdminUser.id || where.email === mockAdminUser.email) {
          return Promise.resolve(mockAdminUser);
        }
        return Promise.resolve(null);
      }),
    },
    organization: {
      count: jest.fn().mockResolvedValue(6),
    },
    product: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.status?.in?.includes(ProductStatus.SHIPPED)) return Promise.resolve(4);
        if (where?.status?.in?.includes(ProductStatus.RECEIVED)) return Promise.resolve(12);
        if (where?.status === ProductStatus.SOLD) return Promise.resolve(5);
        if (where?.status === ProductStatus.RECALLED) return Promise.resolve(1);
        return Promise.resolve(35);
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'p-1',
          productCode: 'PRD-APEX-001',
          name: 'Industrial Sensor',
          createdAt: new Date('2026-09-24T10:00:00Z'),
          manufacturer: { name: 'Acme Corp' },
          blockchainTxHash: '0xtx1',
        },
      ]),
    },
    shipment: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.status?.in) return Promise.resolve(3); // active
        return Promise.resolve(15);
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 's-1',
          shipmentCode: 'SHP-2026-001',
          status: ShipmentStatus.IN_TRANSIT,
          createdAt: new Date('2026-09-24T09:00:00Z'),
          shippedAt: new Date('2026-09-24T09:30:00Z'),
          receivedAt: null,
          sender: { name: 'Acme Corp' },
          receiver: { name: 'Global Logistics' },
          product: { productCode: 'PRD-APEX-001' },
          blockchainTxHash: '0xtx2',
        },
      ]),
    },
    qualityCheck: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'qc-1',
          result: 'PASSED',
          inspectorName: 'Auditor Jane',
          createdAt: new Date('2026-09-24T09:15:00Z'),
          organization: { name: 'Audit Lab' },
          product: { productCode: 'PRD-APEX-001', name: 'Industrial Sensor' },
          blockchainTxHash: '0xtx3',
        },
      ]),
    },
    blockchainTransaction: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.status === TxStatus.CONFIRMED) return Promise.resolve(45);
        if (where?.status === TxStatus.PENDING) return Promise.resolve(2);
        if (where?.status === TxStatus.FAILED) return Promise.resolve(0);
        return Promise.resolve(47);
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'tx-1',
          txHash: '0x123abc',
          eventType: 'ProductRegistered',
          status: TxStatus.CONFIRMED,
          blockNumber: 1042,
          createdAt: new Date('2026-09-24T10:05:00Z'),
        },
      ]),
    },
  };

  const mockBlockchainService = {
    getContractAddress: jest.fn().mockReturnValue('0xMockContractAddress'),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(BlockchainService)
      .useValue(mockBlockchainService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);
    adminToken = jwtService.sign({
      sub: mockAdminUser.id,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
      organizationId: mockAdminUser.organizationId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/dashboard/statistics', () => {
    it('returns operational metrics without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/statistics')
        .expect(200);

      expect(res.body).toHaveProperty('totalProducts', 35);
      expect(res.body).toHaveProperty('inTransit', 4);
      expect(res.body).toHaveProperty('received', 12);
      expect(res.body).toHaveProperty('sold', 5);
      expect(res.body).toHaveProperty('recalled', 1);
      expect(res.body).toHaveProperty('activeShipments', 3);
      expect(res.body).toHaveProperty('blockchainTransactions', 47);
    });

    it('returns operational metrics for authenticated enterprise user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalProducts).toBe(35);
      expect(res.body.blockchainTransactions).toBe(47);
    });
  });

  describe('GET /api/dashboard/charts', () => {
    it('returns datasets for product status, shipments, organizations, and blockchain activity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/charts')
        .expect(200);

      expect(res.body.productStatus).toBeInstanceOf(Array);
      expect(res.body.shipmentActivity).toBeInstanceOf(Array);
      expect(res.body.organizationActivity).toBeInstanceOf(Array);
      expect(res.body.blockchainActivity).toBeDefined();
      expect(res.body.blockchainActivity.totalTransactions).toBe(47);
      expect(res.body.blockchainActivity.confirmedTransactions).toBe(45);
      expect(res.body.blockchainActivity.dailyTrend).toBeInstanceOf(Array);
      expect(res.body.blockchainActivity.dailyTrend.length).toBe(7);
    });
  });

  describe('GET /api/dashboard/recent-activity', () => {
    it('returns recent supply chain activity stream', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/recent-activity')
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('type');
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('timestamp');
    });
  });
});
