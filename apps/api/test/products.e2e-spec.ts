import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { UserRole, OrganizationType, ProductStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { BlockchainIndexerService } from '../src/blockchain/blockchain-indexer.service';

describe('Product Management API Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let manufacturerToken: string;
  let distributorToken: string;
  let superadminToken: string;
  let viewerToken: string;

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

  const mockMfgUser = {
    id: 'user-mfg-uuid',
    email: 'mfg@apex.com',
    role: UserRole.MANUFACTURER,
    organizationId: mockManufacturerOrg.id,
    status: 'ACTIVE',
    organization: mockManufacturerOrg,
  };

  const mockDistUser = {
    id: 'user-dist-uuid',
    email: 'dist@gfd.com',
    role: UserRole.DISTRIBUTOR,
    organizationId: mockDistributorOrg.id,
    status: 'ACTIVE',
    organization: mockDistributorOrg,
  };

  const mockSuperAdminUser = {
    id: 'user-admin-uuid',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
    status: 'ACTIVE',
    organization: null,
  };

  const mockViewerUser = {
    id: 'user-viewer-uuid',
    email: 'viewer@bmost.io',
    role: UserRole.VIEWER,
    organizationId: mockManufacturerOrg.id,
    status: 'ACTIVE',
    organization: mockManufacturerOrg,
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
    blockchainProductId: null,
    blockchainTxHash: null,
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

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockMfgUser.id) return Promise.resolve(mockMfgUser);
        if (where.id === mockDistUser.id) return Promise.resolve(mockDistUser);
        if (where.id === mockSuperAdminUser.id)
          return Promise.resolve(mockSuperAdminUser);
        if (where.id === mockViewerUser.id)
          return Promise.resolve(mockViewerUser);
        return Promise.resolve(null);
      }),
    },
    organization: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockManufacturerOrg.id)
          return Promise.resolve(mockManufacturerOrg);
        if (where.id === mockDistributorOrg.id)
          return Promise.resolve(mockDistributorOrg);
        return Promise.resolve(null);
      }),
    },
    product: {
      create: jest.fn().mockImplementation(({ data }) => {
        mockProductRecord = {
          ...mockProductRecord,
          ...data,
          manufacturer: mockManufacturerOrg,
          currentOwner: mockManufacturerOrg,
        };
        return Promise.resolve(mockProductRecord);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (
          where.id === 'prod-uuid-1' ||
          where.productCode === 'PRD-APEX-001'
        ) {
          return Promise.resolve(mockProductRecord);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([mockProductRecord]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockImplementation(({ _where, data }) => {
        mockProductRecord = {
          ...mockProductRecord,
          ...data,
        };
        return Promise.resolve(mockProductRecord);
      }),
      delete: jest.fn().mockResolvedValue(mockProductRecord),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    blockchainTransaction: {
      upsert: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const mockBlockchainService = {
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    }),
    getContractAddress: jest
      .fn()
      .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
    getSigner: jest.fn().mockReturnValue({
      getAddress: jest
        .fn()
        .mockResolvedValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
    }),
    registerProduct: jest.fn().mockResolvedValue({
      txHash:
        '0x5555555555555555555555555555555555555555555555555555555555555555',
      blockNumber: 50,
      productId: 1,
    }),
    getProduct: jest.fn().mockResolvedValue({
      productId: 1,
      productCode: 'PRD-APEX-001',
      productHash:
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      manufacturer: mockManufacturerOrg.walletAddress,
      currentOwner: mockManufacturerOrg.walletAddress,
      status: 0,
      registeredAt: 1774300000,
    }),
    getProductByCode: jest.fn().mockImplementation(() =>
      Promise.resolve({
        productId: 1,
        productCode: 'PRD-APEX-001',
        productHash: mockProductRecord.productHash,
        manufacturer: mockManufacturerOrg.walletAddress,
        currentOwner: mockManufacturerOrg.walletAddress,
        status: 0,
        registeredAt: 1774300000,
      }),
    ),
    getProductHistory: jest.fn().mockResolvedValue([
      {
        eventType: 'REGISTERED',
        actor: mockManufacturerOrg.walletAddress,
        timestamp: 1774300000,
        details: 'Product registered on blockchain',
      },
    ]),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  const mockIndexerService = {
    getListenerStatus: jest.fn().mockReturnValue({ isListening: true }),
    syncHistoricalEvents: jest.fn().mockResolvedValue({ syncedEvents: 0 }),
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/products (Product Creation)', () => {
    it('creates product for manufacturer and computes deterministic hash', async () => {
      mockPrisma.product.findUnique.mockResolvedValueOnce(null); // uniqueness check

      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          productCode: 'PRD-APEX-001',
          serialNumber: 'SN-APEX-001',
          name: 'Industrial Microcontroller MCU-X',
          description: 'Arm Cortex-M4 microcontroller for telemetry',
          category: 'Microcontrollers',
        })
        .expect(201);

      expect(res.body.productCode).toEqual('PRD-APEX-001');
      expect(res.body.productHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(res.body.qrCode).toContain('data:image/png;base64');
      expect(res.body.status).toEqual(ProductStatus.REGISTERED);
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .send({
          productCode: 'PRD-NOAUTH-01',
          serialNumber: 'SN-NOAUTH-01',
          name: 'Unauthorized Sensor',
        })
        .expect(401);
    });

    it('rejects unauthorized role (e.g. VIEWER) with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          productCode: 'PRD-VIEWER-01',
          serialNumber: 'SN-VIEWER-01',
          name: 'Sensor',
        })
        .expect(403);
    });

    it('rejects invalid productCode format with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          productCode: 'INVALID CODE WITH SPACES!@#',
          serialNumber: 'SN-001',
          name: 'Invalid Sensor',
        })
        .expect(400);
    });
  });

  describe('GET /api/products (Product Listing)', () => {
    it('returns paginated list of products for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/products/:id (Product Details & Tenant Isolation)', () => {
    it('returns product details including QR code and live blockchain status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products/prod-uuid-1')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body.id).toEqual('prod-uuid-1');
      expect(res.body.qrCode).toBeDefined();
    });

    it('forbids distributor from viewing manufacturer isolated product', async () => {
      await request(app.getHttpServer())
        .get('/api/products/prod-uuid-1')
        .set('Authorization', `Bearer ${distributorToken}`)
        .expect(403);
    });

    it('allows SUPER_ADMIN to inspect any organization product', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products/prod-uuid-1')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.id).toEqual('prod-uuid-1');
    });
  });

  describe('PATCH /api/products/:id (Metadata Update)', () => {
    it('allows current owner to update metadata', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/products/prod-uuid-1')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          name: 'Industrial Microcontroller MCU-X (Revision 2)',
          description: 'Updated firmware and pinout',
        })
        .expect(200);

      expect(res.body.name).toEqual(
        'Industrial Microcontroller MCU-X (Revision 2)',
      );
    });

    it('forbids non-owner from updating metadata', async () => {
      await request(app.getHttpServer())
        .patch('/api/products/prod-uuid-1')
        .set('Authorization', `Bearer ${distributorToken}`)
        .send({ name: 'Tampered' })
        .expect(403);
    });
  });

  describe('POST /api/products/:id/register-blockchain (Smart Contract Registration)', () => {
    it('successfully registers product on-chain and stores txHash and blockchainProductId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/products/prod-uuid-1/register-blockchain')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({})
        .expect(200);

      expect(res.body.blockchainProductId).toEqual('1');
      expect(res.body.blockchainTxHash).toEqual(
        '0x5555555555555555555555555555555555555555555555555555555555555555',
      );
      expect(res.body.blockchainRegistration).toBeDefined();
    });

    it('rejects registration if already registered on blockchain with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/products/prod-uuid-1/register-blockchain')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({})
        .expect(409);
    });
  });

  describe('GET /api/products/:id/history (Traceability History)', () => {
    it('returns combined traceability timeline', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products/prod-uuid-1/history')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('product');
      expect(res.body).toHaveProperty('blockchainHistory');
      expect(Array.isArray(res.body.blockchainHistory)).toBe(true);
    });
  });

  describe('GET /api/products/:id/qr (Downloadable QR Code)', () => {
    it('returns downloadable QR code payload and verification url', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products/prod-uuid-1/qr')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .expect(200);

      expect(res.body.qrCodeDataUrl).toContain('data:image/png;base64');
      expect(res.body.verificationUrl).toContain('/verify/PRD-APEX-001');
    });
  });

  describe('GET /api/public/verify/:productCode (Consumer Public Verification)', () => {
    it('verifies product without any authentication header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/verify/PRD-APEX-001')
        .expect(200);

      expect(res.body.verified).toBe(true);
      expect(res.body.product.productCode).toEqual('PRD-APEX-001');
      expect(res.body.blockchain.registeredOnChain).toBe(true);
      expect(res.body.blockchain.hashMatch).toBe(true);
      // Ensure sensitive internal IDs like password hashes are absent
      expect(res.body.product).not.toHaveProperty('passwordHash');
    });

    it('returns verified: false for non-existent product code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/verify/NON-EXISTENT-CODE')
        .expect(200);

      expect(res.body.verified).toBe(false);
    });
  });
});
