import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import {
  UserRole,
  OrganizationType,
  ProductStatus,
  ShipmentStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { BlockchainIndexerService } from '../src/blockchain/blockchain-indexer.service';

describe('Shipment Management & Ownership Transfer API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let manufacturerToken: string;
  let distributorToken: string;
  let carrierToken: string;
  let _superadminToken: string;
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

  const mockIntruderOrg = {
    id: 'org-intruder-uuid',
    name: 'Rival Tech',
    code: 'RIVAL',
    type: OrganizationType.MANUFACTURER,
    status: 'ACTIVE',
    walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
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
    lastName: 'Shipper',
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

  const mockCarrierUser = {
    id: 'user-carrier-uuid',
    email: 'ops@transexpress.com',
    role: UserRole.ORG_ADMIN,
    organizationId: mockCarrierOrg.id,
    status: 'ACTIVE',
    firstName: 'Charlie',
    lastName: 'Carrier',
    organization: mockCarrierOrg,
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

  const mockIntruderUser = {
    id: 'user-intruder-uuid',
    email: 'spy@rival.com',
    role: UserRole.MANUFACTURER,
    organizationId: mockIntruderOrg.id,
    status: 'ACTIVE',
    firstName: 'Ivan',
    lastName: 'Intruder',
    organization: mockIntruderOrg,
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
    blockchainTxHash: '0x1111111111111111111111111111111111111111',
    productHash:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    status: ProductStatus.QUALITY_CHECKED,
    createdAt: new Date(),
    updatedAt: new Date(),
    manufacturer: mockManufacturerOrg,
    currentOwner: mockManufacturerOrg,
    qualityChecks: [],
    shipments: [],
    blockchainTransactions: [],
  };

  const shipmentsDb: any[] = [];

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockMfgUser.id) return Promise.resolve(mockMfgUser);
        if (where.id === mockDistUser.id) return Promise.resolve(mockDistUser);
        if (where.id === mockCarrierUser.id)
          return Promise.resolve(mockCarrierUser);
        if (where.id === mockSuperAdminUser.id)
          return Promise.resolve(mockSuperAdminUser);
        if (where.id === mockIntruderUser.id)
          return Promise.resolve(mockIntruderUser);
        return Promise.resolve(null);
      }),
    },
    organization: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const id = where?.OR?.[0]?.id || where?.id;
        if (id === mockManufacturerOrg.id || id === mockManufacturerOrg.code)
          return Promise.resolve(mockManufacturerOrg);
        if (id === mockDistributorOrg.id || id === mockDistributorOrg.code)
          return Promise.resolve(mockDistributorOrg);
        if (id === mockCarrierOrg.id || id === mockCarrierOrg.code)
          return Promise.resolve(mockCarrierOrg);
        if (id === mockIntruderOrg.id || id === mockIntruderOrg.code)
          return Promise.resolve(mockIntruderOrg);
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === mockManufacturerOrg.id)
          return Promise.resolve(mockManufacturerOrg);
        if (where.id === mockDistributorOrg.id)
          return Promise.resolve(mockDistributorOrg);
        if (where.id === mockCarrierOrg.id)
          return Promise.resolve(mockCarrierOrg);
        if (where.id === mockIntruderOrg.id)
          return Promise.resolve(mockIntruderOrg);
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
        if (idMatch || where?.id === mockProductRecord.id) {
          return Promise.resolve(mockProductRecord);
        }
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
          currentOwner:
            data.currentOwnerId === mockDistributorOrg.id
              ? mockDistributorOrg
              : mockManufacturerOrg,
        };
        return Promise.resolve(mockProductRecord);
      }),
    },
    shipment: {
      create: jest.fn().mockImplementation(({ data }) => {
        const newShipment = {
          id: `shp-uuid-${shipmentsDb.length + 1}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: mockProductRecord,
          sender: mockManufacturerOrg,
          receiver: mockDistributorOrg,
          carrier: mockCarrierOrg,
        };
        shipmentsDb.push(newShipment);
        return Promise.resolve(newShipment);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.productId && where?.status) {
          const found = shipmentsDb.find(
            (s) =>
              s.productId === where.productId &&
              (Array.isArray(where.status?.in)
                ? where.status.in.includes(s.status)
                : s.status === where.status),
          );
          return Promise.resolve(found || null);
        }
        const targetId = where?.OR?.[0]?.id || where?.id;
        const targetCode = where?.OR?.[1]?.shipmentCode || where?.shipmentCode;
        const found = shipmentsDb.find(
          (s) => s.id === targetId || s.shipmentCode === targetCode,
        );
        return Promise.resolve(found || null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = shipmentsDb.find(
          (s) => s.shipmentCode === where.shipmentCode,
        );
        return Promise.resolve(found || null);
      }),
      findMany: jest.fn().mockImplementation(() => {
        return Promise.resolve(shipmentsDb);
      }),
      count: jest.fn().mockImplementation(() => {
        return Promise.resolve(shipmentsDb.length);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = shipmentsDb.findIndex((s) => s.id === where.id);
        if (idx !== -1) {
          shipmentsDb[idx] = { ...shipmentsDb[idx], ...data };
          return Promise.resolve(shipmentsDb[idx]);
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
    createShipment: jest.fn().mockResolvedValue({
      txHash: '0xshp_created_tx_hash_111',
      blockNumber: 201,
      shipmentId: 1,
    }),
    shipProduct: jest.fn().mockResolvedValue({
      txHash: '0xshp_dispatched_tx_hash_222',
      blockNumber: 202,
    }),
    receiveProduct: jest.fn().mockResolvedValue({
      txHash: '0xshp_received_tx_hash_333',
      blockNumber: 203,
    }),
    transferOwnership: jest.fn().mockResolvedValue({
      txHash: '0xtransfer_tx_hash_444',
      blockNumber: 204,
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
      status: 2, // READY_TO_SHIP
    }),
    getProductHistory: jest.fn().mockResolvedValue([]),
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

    distributorToken = jwtService.sign({
      sub: mockDistUser.id,
      email: mockDistUser.email,
      role: mockDistUser.role,
      organizationId: mockDistUser.organizationId,
    });

    carrierToken = jwtService.sign({
      sub: mockCarrierUser.id,
      email: mockCarrierUser.email,
      role: mockCarrierUser.role,
      organizationId: mockCarrierUser.organizationId,
    });

    _superadminToken = jwtService.sign({
      sub: mockSuperAdminUser.id,
      email: mockSuperAdminUser.email,
      role: mockSuperAdminUser.role,
      organizationId: null,
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

  let createdShipmentId: string;

  describe('1. Shipment Creation (POST /api/shipments)', () => {
    it('creates shipment reference, calls smart contract, sets status to PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/shipments')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          productId: mockProductRecord.id,
          receiverOrganizationId: mockDistributorOrg.id,
          carrierOrganizationId: mockCarrierOrg.id,
          origin: 'Apex Factory 1, Chonburi',
          destination: 'GFD Warehouse 3, Bangkok',
          shipmentCode: 'SHP-APEX-GFD-001',
        })
        .expect(201);

      expect(res.body.shipment).toBeDefined();
      expect(res.body.shipment.shipmentCode).toEqual('SHP-APEX-GFD-001');
      expect(res.body.shipment.status).toEqual(ShipmentStatus.PENDING);
      expect(res.body.blockchain.txHash).toEqual('0xshp_created_tx_hash_111');
      expect(res.body.blockchain.status).toEqual('CONFIRMED');

      createdShipmentId = res.body.shipment.id;
      expect(mockProductRecord.status).toEqual(ProductStatus.READY_TO_SHIP);
    });

    it('rejects shipment creation if product is owned by another organization', async () => {
      await request(app.getHttpServer())
        .post('/api/shipments')
        .set('Authorization', `Bearer ${intruderToken}`)
        .send({
          productId: mockProductRecord.id,
          receiverOrganizationId: mockDistributorOrg.id,
          origin: 'Origin',
          destination: 'Dest',
        })
        .expect(403);
    });

    it('rejects shipment creation if receiver is same as sender organization', async () => {
      await request(app.getHttpServer())
        .post('/api/shipments')
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({
          productId: mockProductRecord.id,
          receiverOrganizationId: mockManufacturerOrg.id, // Self shipment
          origin: 'Origin',
          destination: 'Dest',
        })
        .expect(400);
    });
  });

  describe('2. Shipment Dispatch (POST /api/shipments/:id/ship)', () => {
    it('forbids unrelated third-party organization from dispatching cargo', async () => {
      await request(app.getHttpServer())
        .post(`/api/shipments/${createdShipmentId}/ship`)
        .set('Authorization', `Bearer ${intruderToken}`)
        .send({})
        .expect(403);
    });

    it('allows assigned carrier to dispatch shipment on-chain', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/shipments/${createdShipmentId}/ship`)
        .set('Authorization', `Bearer ${carrierToken}`)
        .send({ notes: 'Picked up by truck' })
        .expect(200);

      expect(res.body.shipment.status).toEqual(ShipmentStatus.SHIPPED);
      expect(res.body.blockchain.txHash).toEqual(
        '0xshp_dispatched_tx_hash_222',
      );
      expect(mockProductRecord.status).toEqual(ProductStatus.SHIPPED);
    });
  });

  describe('3. Shipment Receipt & Ownership Transfer (POST /api/shipments/:id/receive)', () => {
    it('forbids sender from confirming receipt (only receiver allowed)', async () => {
      await request(app.getHttpServer())
        .post(`/api/shipments/${createdShipmentId}/receive`)
        .set('Authorization', `Bearer ${manufacturerToken}`)
        .send({})
        .expect(403);
    });

    it('confirms receipt, marks shipment DELIVERED, and transfers product ownership to distributor', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/shipments/${createdShipmentId}/receive`)
        .set('Authorization', `Bearer ${distributorToken}`)
        .send({ notes: 'Delivered in mint condition' })
        .expect(200);

      expect(res.body.shipment.status).toEqual(ShipmentStatus.DELIVERED);
      expect(res.body.product.status).toEqual(ProductStatus.RECEIVED);
      expect(res.body.product.currentOwnerId).toEqual(mockDistributorOrg.id);
      expect(res.body.blockchain.txHash).toEqual('0xshp_received_tx_hash_333');

      // Acceptance: Product can move between organizations
      expect(mockProductRecord.currentOwnerId).toEqual(mockDistributorOrg.id);
    });
  });

  describe('4. Direct Product Blockchain Endpoints (/api/products/:id/ship & receive)', () => {
    it('allows querying shipments via GET /api/shipments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/shipments')
        .set('Authorization', `Bearer ${distributorToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
    });

    it('allows querying product-specific shipments via GET /api/products/:id/shipments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/products/${mockProductRecord.id}/shipments`)
        .set('Authorization', `Bearer ${distributorToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('5. Manual Ownership Transfer (POST /api/products/:id/transfer)', () => {
    it('transfers product ownership to another organization', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/products/${mockProductRecord.id}/transfer`)
        .set('Authorization', `Bearer ${distributorToken}`) // Current owner is distributor
        .send({
          newOwnerOrganizationId: mockManufacturerOrg.id,
          notes: 'Returned consignment',
        })
        .expect(200);

      expect(res.body.product.currentOwnerId).toEqual(mockManufacturerOrg.id);
      expect(res.body.blockchain.txHash).toEqual('0xtransfer_tx_hash_444');
    });
  });
});
