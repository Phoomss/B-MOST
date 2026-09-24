import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import {
  UserRole,
  OrganizationType,
  ProductStatus,
  ShipmentStatus,
  QualityCheckResult,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { BlockchainIndexerService } from '../src/blockchain/blockchain-indexer.service';
import { generateProductHash } from '../src/products/utils/product-hash.util';

describe('Traceability API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let manufacturerToken: string;
  let distributorToken: string;
  let auditorToken: string;
  let superadminToken: string;
  let intruderToken: string;

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

  const mockDistributorOrg = {
    id: 'org-dist-uuid',
    name: 'Global Freight Dist',
    code: 'GFD',
    type: OrganizationType.DISTRIBUTOR,
    status: 'ACTIVE',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCarrierOrg = {
    id: 'org-carrier-uuid',
    name: 'TransExpress Logistics',
    code: 'TEX',
    type: OrganizationType.LOGISTICS,
    status: 'ACTIVE',
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuditorOrg = {
    id: 'org-auditor-uuid',
    name: 'TUV SGS Quality Auditor',
    code: 'TUVAUD',
    type: OrganizationType.AUDITOR,
    status: 'ACTIVE',
    walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIntruderOrg = {
    id: 'org-intruder-uuid',
    name: 'Rival Tech Corp',
    code: 'RIVAL',
    type: OrganizationType.MANUFACTURER,
    status: 'ACTIVE',
    walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
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
    lastName: 'Maker',
    organization: mockManufacturerOrg,
  };

  const mockDistUser = {
    id: 'user-dist-uuid',
    email: 'dist@gfd.com',
    role: UserRole.DISTRIBUTOR,
    organizationId: mockDistributorOrg.id,
    status: 'ACTIVE',
    firstName: 'Bob',
    lastName: 'Receiver',
    organization: mockDistributorOrg,
  };

  const mockAuditorUser = {
    id: 'user-auditor-uuid',
    email: 'auditor@tuv.com',
    role: UserRole.AUDITOR,
    organizationId: mockAuditorOrg.id,
    status: 'ACTIVE',
    firstName: 'Carol',
    lastName: 'Inspector',
    organization: mockAuditorOrg,
  };

  const mockSuperAdminUser = {
    id: 'user-super-uuid',
    email: 'admin@b-most.internal',
    role: UserRole.SUPER_ADMIN,
    organizationId: mockManufacturerOrg.id,
    status: 'ACTIVE',
    firstName: 'System',
    lastName: 'Admin',
    organization: mockManufacturerOrg,
  };

  const mockIntruderUser = {
    id: 'user-intruder-uuid',
    email: 'intruder@rival.com',
    role: UserRole.MANUFACTURER,
    organizationId: mockIntruderOrg.id,
    status: 'ACTIVE',
    firstName: 'Ivan',
    lastName: 'Intruder',
    organization: mockIntruderOrg,
  };

  const expectedHash = generateProductHash({
    productCode: 'PRD-APEX-001',
    serialNumber: 'SN-APEX-001',
    manufacturerId: mockManufacturerOrg.id,
    name: 'Industrial Microcontroller MCU-X',
    category: 'Microcontrollers',
  });

  const mockProductRecord: any = {
    id: 'prod-uuid-1',
    productCode: 'PRD-APEX-001',
    serialNumber: 'SN-APEX-001',
    name: 'Industrial Microcontroller MCU-X',
    description: 'Arm Cortex-M4 microcontroller for telemetry',
    category: 'Microcontrollers',
    manufacturerId: mockManufacturerOrg.id,
    currentOwnerId: mockDistributorOrg.id,
    blockchainProductId: '1',
    blockchainTxHash: '0x1111111111111111111111111111111111111111',
    productHash: expectedHash,
    status: ProductStatus.RECEIVED,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-05T12:00:00Z'),
    manufacturer: mockManufacturerOrg,
    currentOwner: mockDistributorOrg,
    qualityChecks: [
      {
        id: 'qc-1',
        productId: 'prod-uuid-1',
        organizationId: mockAuditorOrg.id,
        organization: mockAuditorOrg,
        inspectorName: 'Carol Inspector',
        result: QualityCheckResult.PASSED,
        notes: 'Passed ISO-9001 verification',
        blockchainTxHash: '0x2222222222222222222222222222222222222222',
        createdAt: new Date('2026-01-02T11:00:00Z'),
      },
    ],
    shipments: [
      {
        id: 'shp-1',
        shipmentCode: 'SHP-2026-001',
        productId: 'prod-uuid-1',
        senderOrganizationId: mockManufacturerOrg.id,
        sender: mockManufacturerOrg,
        receiverOrganizationId: mockDistributorOrg.id,
        receiver: mockDistributorOrg,
        carrierOrganizationId: mockCarrierOrg.id,
        carrier: mockCarrierOrg,
        origin: 'Bangkok Hub',
        destination: 'Chiang Mai Depot',
        status: ShipmentStatus.DELIVERED,
        shippedAt: new Date('2026-01-03T09:00:00Z'),
        receivedAt: new Date('2026-01-04T15:00:00Z'),
        blockchainTxHash: '0x3333333333333333333333333333333333333333',
        createdAt: new Date('2026-01-02T14:00:00Z'),
        updatedAt: new Date('2026-01-04T15:00:00Z'),
      },
    ],
    blockchainTransactions: [
      {
        id: 'tx-1',
        txHash: '0x1111111111111111111111111111111111111111',
        eventType: 'PRODUCT_REGISTERED',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      },
    ],
  };

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockMfgUser.id) return Promise.resolve(mockMfgUser);
        if (where.id === mockDistUser.id) return Promise.resolve(mockDistUser);
        if (where.id === mockAuditorUser.id) return Promise.resolve(mockAuditorUser);
        if (where.id === mockSuperAdminUser.id) return Promise.resolve(mockSuperAdminUser);
        if (where.id === mockIntruderUser.id) return Promise.resolve(mockIntruderUser);
        return Promise.resolve(null);
      }),
    },
    organization: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const id = where?.OR?.[0]?.id || where?.id;
        if (id === mockManufacturerOrg.id) return Promise.resolve(mockManufacturerOrg);
        if (id === mockDistributorOrg.id) return Promise.resolve(mockDistributorOrg);
        if (id === mockCarrierOrg.id) return Promise.resolve(mockCarrierOrg);
        if (id === mockAuditorOrg.id) return Promise.resolve(mockAuditorOrg);
        if (id === mockIntruderOrg.id) return Promise.resolve(mockIntruderOrg);
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockManufacturerOrg.id) return Promise.resolve(mockManufacturerOrg);
        if (where.id === mockDistributorOrg.id) return Promise.resolve(mockDistributorOrg);
        if (where.id === mockCarrierOrg.id) return Promise.resolve(mockCarrierOrg);
        if (where.id === mockAuditorOrg.id) return Promise.resolve(mockAuditorOrg);
        if (where.id === mockIntruderOrg.id) return Promise.resolve(mockIntruderOrg);
        return Promise.resolve(null);
      }),
    },
    product: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const term = where?.OR?.[0]?.productCode || where?.productCode || where?.id;
        if (
          term === mockProductRecord.productCode ||
          term === mockProductRecord.serialNumber ||
          term === mockProductRecord.id
        ) {
          return Promise.resolve(mockProductRecord);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: mockProductRecord.id,
          productCode: mockProductRecord.productCode,
          serialNumber: mockProductRecord.serialNumber,
          name: mockProductRecord.name,
          category: mockProductRecord.category,
          status: mockProductRecord.status,
          blockchainProductId: mockProductRecord.blockchainProductId,
          blockchainTxHash: mockProductRecord.blockchainTxHash,
          createdAt: mockProductRecord.createdAt,
          currentOwner: {
            id: mockDistributorOrg.id,
            name: mockDistributorOrg.name,
            code: mockDistributorOrg.code,
            type: mockDistributorOrg.type,
          },
        },
      ]),
    },
  };

  const mockBlockchain = {
    isConfigured: jest.fn().mockReturnValue(true),
    getContractAddress: jest
      .fn()
      .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
    getProduct: jest.fn().mockResolvedValue({
      id: 1n,
      productCode: 'PRD-APEX-001',
      serialNumber: 'SN-APEX-001',
      manufacturer: mockManufacturerOrg.walletAddress,
      currentOwner: mockDistributorOrg.walletAddress,
      status: 4, // DELIVERED
      productHash: expectedHash,
    }),
    getProductHistory: jest.fn().mockResolvedValue([
      {
        eventType: 'ProductRegistered',
        operator: mockManufacturerOrg.walletAddress,
        timestamp: 1767261600n,
      },
      {
        eventType: 'QualityChecked',
        operator: mockAuditorOrg.walletAddress,
        timestamp: 1767351600n,
      },
    ]),
  };

  const mockIndexer = {
    startListening: jest.fn().mockResolvedValue(undefined),
    stopListening: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(BlockchainService)
      .useValue(mockBlockchain)
      .overrideProvider(BlockchainIndexerService)
      .useValue(mockIndexer)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    manufacturerToken = jwtService.sign({
      sub: mockMfgUser.id,
      email: mockMfgUser.email,
      role: mockMfgUser.role,
      organizationId: mockMfgUser.organizationId,
    });

    distributorToken = jwtService.sign({
      sub: mockDistUser.id,
      email: mockDistUser.email,
      role: mockDistUser.role,
      organizationId: mockDistUser.organizationId,
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
      organizationId: mockSuperAdminUser.organizationId,
    });

    intruderToken = jwtService.sign({
      sub: mockIntruderUser.id,
      email: mockIntruderUser.email,
      role: mockIntruderUser.role,
      organizationId: mockIntruderUser.organizationId,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/traceability/PRD-APEX-001')
        .expect(401);
    });

    it('rejects access from unauthorized third party organization with 403', async () => {
      await request(app.getHttpServer())
        .get('/traceability/PRD-APEX-001')
        .set('Authorization', `Bearer ${intruderToken}`)
        .expect(403);
    });
  });

  describe('GET /traceability (Search)', () => {
    it('returns list of products matching search term', async () => {
      const res = await request(app.getHttpServer())
        .get('/traceability?search=PRD')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].productCode).toBe('PRD-APEX-001');
    });
  });

  describe('GET /traceability/:productCode', () => {
    it('returns 404 when product code is unknown', async () => {
      await request(app.getHttpServer())
        .get('/traceability/NON_EXISTENT_CODE')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(404);
    });

    it('returns full traceability timeline and blockchain verification for Manufacturer', async () => {
      const res = await request(app.getHttpServer())
        .get('/traceability/PRD-APEX-001')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('product');
      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('ownershipHistory');
      expect(res.body).toHaveProperty('blockchainVerification');

      // Product fields
      expect(res.body.product.productCode).toBe('PRD-APEX-001');
      expect(res.body.product.serialNumber).toBe('SN-APEX-001');
      expect(res.body.product.status).toBe('RECEIVED');

      // Timeline events
      const events = res.body.events;
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(4);
      expect(events[0].eventType).toBe('PRODUCT_REGISTERED');

      // Ownership history
      expect(res.body.ownershipHistory).toHaveLength(2);
      expect(res.body.ownershipHistory[0].organizationName).toBe(mockManufacturerOrg.name);
      expect(res.body.ownershipHistory[1].organizationName).toBe(mockDistributorOrg.name);
      expect(res.body.ownershipHistory[1].isCurrentOwner).toBe(true);

      // Blockchain verification
      const bcv = res.body.blockchainVerification;
      expect(bcv.verified).toBe(true);
      expect(bcv.hashMatch).toBe(true);
      expect(bcv.contractAddress).toBe('0x5FbDB2315678afecb367f032d93F642f64180aa3');
      expect(bcv.onChainProductId).toBe(1);
    });

    it('allows Auditor to inspect any product traceability', async () => {
      const res = await request(app.getHttpServer())
        .get('/traceability/PRD-APEX-001')
        .set('Authorization', `Bearer ${auditorToken}`)
        .expect(200);

      expect(res.body.product.productCode).toBe('PRD-APEX-001');
    });

    it('allows Current Owner (Distributor) to inspect product traceability', async () => {
      const res = await request(app.getHttpServer())
        .get('/traceability/PRD-APEX-001')
        .set('Authorization', `Bearer ${distributorToken}`)
        .expect(200);

      expect(res.body.product.productCode).toBe('PRD-APEX-001');
    });

    it('allows Super Admin full access to inspect product traceability', async () => {
      const res = await request(app.getHttpServer())
        .get('/traceability/PRD-APEX-001')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.product.productCode).toBe('PRD-APEX-001');
    });
  });
});
