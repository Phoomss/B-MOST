import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import {
  UserRole,
  OrganizationType,
  ProductStatus,
  QualityCheckResult,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { BlockchainIndexerService } from '../src/blockchain/blockchain-indexer.service';

describe('Quality Control API Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let manufacturerToken: string;
  let auditorToken: string;
  let superadminToken: string;
  let viewerToken: string;
  let otherOrgToken: string;

  const mockManufacturerOrg = {
    id: 'org-mfg-uuid',
    name: 'Apex Semiconductor',
    code: 'APEX',
    type: OrganizationType.MANUFACTURER,
    status: 'ACTIVE',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuditorOrg = {
    id: 'org-auditor-uuid',
    name: 'Global Standards Audit Corp',
    code: 'GSAC',
    type: OrganizationType.AUDITOR,
    status: 'ACTIVE',
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOtherOrg = {
    id: 'org-other-uuid',
    name: 'Competitor Corp',
    code: 'COMP',
    type: OrganizationType.MANUFACTURER,
    status: 'ACTIVE',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMfgUser = {
    id: 'user-mfg-uuid',
    email: 'mfg@apex.com',
    role: UserRole.MANUFACTURER,
    organizationId: mockManufacturerOrg.id,
    status: 'ACTIVE',
    firstName: 'Alice',
    lastName: 'Engineer',
    organization: mockManufacturerOrg,
  };

  const mockAuditorUser = {
    id: 'user-auditor-uuid',
    email: 'auditor@gsac.io',
    role: UserRole.AUDITOR,
    organizationId: mockAuditorOrg.id,
    status: 'ACTIVE',
    firstName: 'Robert',
    lastName: 'Auditor',
    organization: mockAuditorOrg,
  };

  const mockSuperAdminUser = {
    id: 'user-admin-uuid',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
    status: 'ACTIVE',
    firstName: 'Super',
    lastName: 'Admin',
    organization: null,
  };

  const mockViewerUser = {
    id: 'user-viewer-uuid',
    email: 'viewer@apex.com',
    role: UserRole.VIEWER,
    organizationId: mockManufacturerOrg.id,
    status: 'ACTIVE',
    firstName: 'Victor',
    lastName: 'Viewer',
    organization: mockManufacturerOrg,
  };

  const mockOtherUser = {
    id: 'user-other-uuid',
    email: 'user@competitor.com',
    role: UserRole.MANUFACTURER,
    organizationId: mockOtherOrg.id,
    status: 'ACTIVE',
    firstName: 'Chris',
    lastName: 'Competitor',
    organization: mockOtherOrg,
  };

  let mockProductRecord: any = {
    id: 'prod-uuid-1',
    productCode: 'PRD-APEX-001',
    serialNumber: 'SN-APEX-001',
    name: 'Industrial Microcontroller MCU-X',
    description: 'Arm Cortex-M4 microcontroller for telemetry',
    category: 'Microcontrollers',
    manufacturerId: mockManufacturerOrg.id,
    currentOwnerId: mockManufacturerOrg.id,
    blockchainProductId: '1',
    blockchainTxHash:
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    productHash:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    status: ProductStatus.REGISTERED,
    createdAt: new Date(),
    updatedAt: new Date(),
    manufacturer: mockManufacturerOrg,
    currentOwner: mockManufacturerOrg,
    qualityChecks: [],
    shipments: [],
    blockchainTransactions: [],
  };

  const qualityChecksDb: any[] = [];

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockMfgUser.id) return Promise.resolve(mockMfgUser);
        if (where.id === mockAuditorUser.id)
          return Promise.resolve(mockAuditorUser);
        if (where.id === mockSuperAdminUser.id)
          return Promise.resolve(mockSuperAdminUser);
        if (where.id === mockViewerUser.id)
          return Promise.resolve(mockViewerUser);
        if (where.id === mockOtherUser.id)
          return Promise.resolve(mockOtherUser);
        return Promise.resolve(null);
      }),
    },
    organization: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockManufacturerOrg.id)
          return Promise.resolve(mockManufacturerOrg);
        if (where.id === mockAuditorOrg.id)
          return Promise.resolve(mockAuditorOrg);
        if (where.id === mockOtherOrg.id) return Promise.resolve(mockOtherOrg);
        return Promise.resolve(null);
      }),
    },
    product: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const idMatch = where?.OR?.some(
          (o: any) =>
            o.id === mockProductRecord.id ||
            o.productCode === mockProductRecord.productCode,
        );
        if (idMatch) return Promise.resolve(mockProductRecord);
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (
          where.id === mockProductRecord.id ||
          where.productCode === mockProductRecord.productCode
        ) {
          return Promise.resolve(mockProductRecord);
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        mockProductRecord = {
          ...mockProductRecord,
          ...data,
        };
        return Promise.resolve(mockProductRecord);
      }),
    },
    qualityCheck: {
      create: jest.fn().mockImplementation(({ data }) => {
        const newQc = {
          id: `qc-uuid-${qualityChecksDb.length + 1}`,
          ...data,
          createdAt: new Date(),
          product: {
            id: mockProductRecord.id,
            productCode: mockProductRecord.productCode,
            name: mockProductRecord.name,
            status: mockProductRecord.status,
          },
          organization: mockAuditorOrg,
        };
        qualityChecksDb.push(newQc);
        return Promise.resolve(newQc);
      }),
      findMany: jest.fn().mockImplementation(() => {
        return Promise.resolve(qualityChecksDb);
      }),
      count: jest.fn().mockImplementation(() => {
        return Promise.resolve(qualityChecksDb.length);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = qualityChecksDb.find((q) => q.id === where.id);
        if (found) {
          return Promise.resolve({
            ...found,
            product: mockProductRecord,
            organization: mockAuditorOrg,
          });
        }
        return Promise.resolve(null);
      }),
    },
    blockchainTransaction: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockBlockchainService = {
    recordQualityCheck: jest.fn().mockResolvedValue({
      txHash:
        '0xqc99999999999999999999999999999999999999999999999999999999999999',
      blockNumber: 105,
    }),
    registerProduct: jest.fn().mockResolvedValue({
      txHash:
        '0xreg88888888888888888888888888888888888888888888888888888888888888',
      blockNumber: 104,
      productId: 1,
    }),
    getContractAddress: jest
      .fn()
      .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
    getSigner: jest.fn().mockReturnValue({
      getAddress: jest
        .fn()
        .mockResolvedValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
    }),
    getProduct: jest.fn().mockResolvedValue({
      productId: 1,
      productCode: 'PRD-APEX-001',
      status: 1,
    }),
    getProductHistory: jest.fn().mockResolvedValue([
      {
        eventType: 'QUALITY_CHECKED',
        actor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        timestamp: Math.floor(Date.now() / 1000),
        details: 'Passed QC',
      },
    ]),
  };

  const mockBlockchainIndexer = {
    getLiveStatus: jest.fn().mockReturnValue({ isConnected: true }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(BlockchainService)
      .useValue(mockBlockchainService)
      .overrideProvider(BlockchainIndexerService)
      .useValue(mockBlockchainIndexer)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);

    manufacturerToken = jwtService.sign({
      sub: mockMfgUser.id,
      email: mockMfgUser.email,
      role: mockMfgUser.role,
      organizationId: mockMfgUser.organizationId,
    });

    auditorToken = jwtService.sign({
      sub: mockAuditorUser.id,
      email: mockAuditorUser.email,
      role: mockAuditorUser.role,
      organizationId: mockAuditorUser.organizationId,
    });

    superadminToken = jwtService.sign({
      sub: mockSuperAdminUser.id,
      email: mockSuperAdminUser.email,
      role: mockSuperAdminUser.role,
      organizationId: null,
    });

    viewerToken = jwtService.sign({
      sub: mockViewerUser.id,
      email: mockViewerUser.email,
      role: mockViewerUser.role,
      organizationId: mockViewerUser.organizationId,
    });

    otherOrgToken = jwtService.sign({
      sub: mockOtherUser.id,
      email: mockOtherUser.email,
      role: mockOtherUser.role,
      organizationId: mockOtherUser.organizationId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/products/:id/quality-check (Quality Control Inspection)', () => {
    it('successfully records PASSED inspection, commits on-chain, and updates status to QUALITY_CHECKED', async () => {
      mockProductRecord.status = ProductStatus.REGISTERED;

      const res = await request(app.getHttpServer())
        .post(`/api/products/${mockProductRecord.id}/quality-check`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          result: 'PASS',
          inspectorName: 'Dr. Robert Auditor',
          notes: 'Thermal and cryptographic self-test passed without anomaly.',
        })
        .expect(200);

      expect(res.body.qualityCheck).toBeDefined();
      expect(res.body.qualityCheck.result).toEqual(QualityCheckResult.PASSED);
      expect(res.body.qualityCheck.inspectorName).toEqual('Dr. Robert Auditor');
      expect(res.body.product.status).toEqual(ProductStatus.QUALITY_CHECKED);
      expect(res.body.blockchain.txHash).toEqual(
        '0xqc99999999999999999999999999999999999999999999999999999999999999',
      );
      expect(res.body.blockchain.status).toEqual('CONFIRMED');
    });

    it('successfully records FAILED inspection and marks product as RECALLED', async () => {
      // Reset product to REGISTERED for this test
      mockProductRecord.status = ProductStatus.REGISTERED;

      const res = await request(app.getHttpServer())
        .post(`/api/products/${mockProductRecord.id}/quality-check`)
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          result: 'FAIL',
          notes: 'Voltage regulator exceeded safe tolerance threshold.',
        })
        .expect(200);

      expect(res.body.qualityCheck.result).toEqual(QualityCheckResult.FAILED);
      expect(res.body.product.status).toEqual(ProductStatus.RECALLED);
    });

    it('rejects inspection on already RECALLED product with 400 Bad Request', async () => {
      mockProductRecord.status = ProductStatus.RECALLED;

      await request(app.getHttpServer())
        .post(`/api/products/${mockProductRecord.id}/quality-check`)
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          result: 'PASS',
          notes: 'Attempting to inspect recalled product',
        })
        .expect(400);
    });

    it('rejects unauthorized VIEWER role with 403 Forbidden', async () => {
      mockProductRecord.status = ProductStatus.REGISTERED;

      await request(app.getHttpServer())
        .post(`/api/products/${mockProductRecord.id}/quality-check`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          result: 'PASS',
        })
        .expect(403);
    });

    it('rejects unrelated organization tenant with 403 Forbidden', async () => {
      mockProductRecord.status = ProductStatus.REGISTERED;

      await request(app.getHttpServer())
        .post(`/api/products/${mockProductRecord.id}/quality-check`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .send({
          result: 'PASS',
        })
        .expect(403);
    });

    it('returns 404 Not Found for non-existent product', async () => {
      await request(app.getHttpServer())
        .post('/api/products/non-existent-uuid/quality-check')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send({
          result: 'PASS',
        })
        .expect(404);
    });
  });

  describe('POST /api/quality-checks (Direct Quality Check Resource)', () => {
    it('creates inspection via direct POST /api/quality-checks', async () => {
      mockProductRecord.status = ProductStatus.REGISTERED;

      const res = await request(app.getHttpServer())
        .post('/api/quality-checks')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          productId: mockProductRecord.id,
          result: 'PASSED',
          inspectorName: 'Admin Auditor',
          notes: 'Batch audit passed.',
        })
        .expect(201);

      expect(res.body.qualityCheck).toBeDefined();
      expect(res.body.qualityCheck.result).toEqual(QualityCheckResult.PASSED);
    });
  });

  describe('GET /api/quality-checks (List Quality Checks)', () => {
    it('returns paginated quality control inspections for auditor', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/quality-checks')
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('GET /api/products/:id/quality-checks', () => {
    it('retrieves QC history for a specific product', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/${mockProductRecord.id}/quality-checks`)
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });
});
