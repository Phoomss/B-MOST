import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
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

describe('Phase 16: Complete Supply Chain End-to-End Flow (Integration)', () => {
  let app: INestApplication;

  // Authentication Tokens
  let mfgToken: string;
  let auditorToken: string;
  let distToken: string;
  let warehouseToken: string;
  let retailerToken: string;

  // Shared Lifecycle Entities
  let createdProductId: string;
  const productCode = 'PRD-PH16-FLOW-001';
  const serialNumber = 'SN-PH16-FLOW-001';
  let firstShipmentId: string;
  let secondShipmentId: string;

  // --------------------------------------------------------------------------
  // Mock Organizations
  // --------------------------------------------------------------------------
  const mockManufacturerOrg = {
    id: 'org-mfg-uuid',
    name: 'Apex Semiconductor Mfg Corp',
    code: 'APEX',
    type: OrganizationType.MANUFACTURER,
    status: 'ACTIVE',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuditorOrg = {
    id: 'org-auditor-uuid',
    name: 'Eurofins Global Quality Assurance',
    code: 'EUROFINS',
    type: OrganizationType.AUDITOR,
    status: 'ACTIVE',
    walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDistributorOrg = {
    id: 'org-dist-uuid',
    name: 'Pacific Freight Logistics & Dist',
    code: 'PACIFIC',
    type: OrganizationType.DISTRIBUTOR,
    status: 'ACTIVE',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCarrierOrg = {
    id: 'org-carrier-uuid',
    name: 'SpeedEx Global Freight',
    code: 'SPEEDEX',
    type: OrganizationType.LOGISTICS,
    status: 'ACTIVE',
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWarehouseOrg = {
    id: 'org-wh-uuid',
    name: 'Central Hub Warehousing Ltd',
    code: 'CENTRAL_WH',
    type: OrganizationType.WAREHOUSE,
    status: 'ACTIVE',
    walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRetailerOrg = {
    id: 'org-ret-uuid',
    name: 'Metro Tech Retailers Inc',
    code: 'METRO_RET',
    type: OrganizationType.RETAILER,
    status: 'ACTIVE',
    walletAddress: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const organizationsMap = new Map<string, any>([
    [mockManufacturerOrg.id, mockManufacturerOrg],
    [mockManufacturerOrg.code, mockManufacturerOrg],
    [mockAuditorOrg.id, mockAuditorOrg],
    [mockAuditorOrg.code, mockAuditorOrg],
    [mockDistributorOrg.id, mockDistributorOrg],
    [mockDistributorOrg.code, mockDistributorOrg],
    [mockCarrierOrg.id, mockCarrierOrg],
    [mockCarrierOrg.code, mockCarrierOrg],
    [mockWarehouseOrg.id, mockWarehouseOrg],
    [mockWarehouseOrg.code, mockWarehouseOrg],
    [mockRetailerOrg.id, mockRetailerOrg],
    [mockRetailerOrg.code, mockRetailerOrg],
  ]);

  // --------------------------------------------------------------------------
  // Mock Users (With Bcrypt Password Hashes)
  // --------------------------------------------------------------------------
  const sharedPassword = 'Password123!';
  const passwordHash = bcrypt.hashSync(sharedPassword, 10);

  const mockMfgUser = {
    id: 'user-mfg-uuid',
    email: 'mfg@apex.io',
    passwordHash,
    role: UserRole.MANUFACTURER,
    organizationId: mockManufacturerOrg.id,
    status: 'ACTIVE',
    firstName: 'Marcus',
    lastName: 'Factory',
    organization: mockManufacturerOrg,
  };

  const mockAuditorUser = {
    id: 'user-auditor-uuid',
    email: 'auditor@eurofins.io',
    passwordHash,
    role: UserRole.AUDITOR,
    organizationId: mockAuditorOrg.id,
    status: 'ACTIVE',
    firstName: 'Dr. Elena',
    lastName: 'Rostova',
    organization: mockAuditorOrg,
  };

  const mockDistUser = {
    id: 'user-dist-uuid',
    email: 'dist@pacific.io',
    passwordHash,
    role: UserRole.DISTRIBUTOR,
    organizationId: mockDistributorOrg.id,
    status: 'ACTIVE',
    firstName: 'Daniel',
    lastName: 'Logistics',
    organization: mockDistributorOrg,
  };

  const mockWarehouseUser = {
    id: 'user-wh-uuid',
    email: 'wh@central.io',
    passwordHash,
    role: UserRole.WAREHOUSE,
    organizationId: mockWarehouseOrg.id,
    status: 'ACTIVE',
    firstName: 'Walter',
    lastName: 'Storage',
    organization: mockWarehouseOrg,
  };

  const mockRetailerUser = {
    id: 'user-ret-uuid',
    email: 'retailer@metro.io',
    passwordHash,
    role: UserRole.RETAILER,
    organizationId: mockRetailerOrg.id,
    status: 'ACTIVE',
    firstName: 'Rachel',
    lastName: 'Store',
    organization: mockRetailerOrg,
  };

  const usersList = [
    mockMfgUser,
    mockAuditorUser,
    mockDistUser,
    mockWarehouseUser,
    mockRetailerUser,
  ];

  // --------------------------------------------------------------------------
  // In-Memory Database State
  // --------------------------------------------------------------------------
  let storedProduct: any = null;
  const storedQualityChecks: any[] = [];
  const storedShipments = new Map<string, any>();
  const storedTransactions: any[] = [];
  const storedAuditLogs: any[] = [];

  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),

    user: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where, include: _include }) => {
          const found = usersList.find(
            (u) =>
              (where.id && u.id === where.id) ||
              (where.email &&
                u.email.toLowerCase() === where.email.toLowerCase()),
          );
          return Promise.resolve(found || null);
        }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = usersList.find(
          (u) =>
            (where.id && u.id === where.id) ||
            (where.email &&
              u.email.toLowerCase() === where.email.toLowerCase()),
        );
        return Promise.resolve(found || null);
      }),
    },

    organization: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const key = where.id || where.code;
        return Promise.resolve(organizationsMap.get(key) || null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.OR) {
          for (const condition of where.OR) {
            const key = condition.id || condition.code;
            if (organizationsMap.has(key)) {
              return Promise.resolve(organizationsMap.get(key));
            }
          }
        }
        const key = where.id || where.code;
        return Promise.resolve(organizationsMap.get(key) || null);
      }),
      findMany: jest
        .fn()
        .mockResolvedValue(Array.from(organizationsMap.values())),
    },

    product: {
      create: jest.fn().mockImplementation(({ data }) => {
        const id = 'prod-ph16-uuid';
        storedProduct = {
          id,
          ...data,
          manufacturerId: mockManufacturerOrg.id,
          currentOwnerId: mockManufacturerOrg.id,
          manufacturer: mockManufacturerOrg,
          currentOwner: mockManufacturerOrg,
          qualityChecks: [],
          shipments: [],
          blockchainTransactions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return Promise.resolve(storedProduct);
      }),

      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (!storedProduct) return Promise.resolve(null);
        if (
          where.id === storedProduct.id ||
          where.productCode === storedProduct.productCode ||
          where.serialNumber === storedProduct.serialNumber
        ) {
          const currentOwner =
            organizationsMap.get(storedProduct.currentOwnerId) ||
            mockManufacturerOrg;
          return Promise.resolve({
            ...storedProduct,
            currentOwner,
            qualityChecks: [...storedQualityChecks],
            shipments: Array.from(storedShipments.values()),
            blockchainTransactions: [...storedTransactions],
          });
        }
        return Promise.resolve(null);
      }),

      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (!storedProduct) return Promise.resolve(null);
        if (where?.OR && Array.isArray(where.OR)) {
          const matched = where.OR.some(
            (c: any) =>
              c.id === storedProduct.id ||
              c.productCode === storedProduct.productCode ||
              c.serialNumber === storedProduct.serialNumber,
          );
          if (matched) {
            const currentOwner =
              organizationsMap.get(storedProduct.currentOwnerId) ||
              mockManufacturerOrg;
            return Promise.resolve({
              ...storedProduct,
              currentOwner,
              qualityChecks: [...storedQualityChecks],
              shipments: Array.from(storedShipments.values()),
              blockchainTransactions: [...storedTransactions],
            });
          }
        }
        if (
          (where?.id && storedProduct.id === where.id) ||
          (where?.productCode &&
            storedProduct.productCode === where.productCode)
        ) {
          const currentOwner =
            organizationsMap.get(storedProduct.currentOwnerId) ||
            mockManufacturerOrg;
          return Promise.resolve({
            ...storedProduct,
            currentOwner,
            qualityChecks: [...storedQualityChecks],
            shipments: Array.from(storedShipments.values()),
            blockchainTransactions: [...storedTransactions],
          });
        }
        return Promise.resolve(null);
      }),

      findMany: jest.fn().mockImplementation(() => {
        return Promise.resolve(storedProduct ? [storedProduct] : []);
      }),

      count: jest.fn().mockImplementation(() => {
        return Promise.resolve(storedProduct ? 1 : 0);
      }),

      update: jest.fn().mockImplementation(({ where: _where, data }) => {
        storedProduct = {
          ...storedProduct,
          ...data,
          updatedAt: new Date(),
        };
        if (data.currentOwnerId) {
          storedProduct.currentOwner =
            organizationsMap.get(data.currentOwnerId) ||
            storedProduct.currentOwner;
        }
        return Promise.resolve(storedProduct);
      }),
    },

    qualityCheck: {
      create: jest.fn().mockImplementation(({ data }) => {
        const qc = {
          id: `qc-uuid-${storedQualityChecks.length + 1}`,
          ...data,
          organization: mockAuditorOrg,
          createdAt: new Date(),
        };
        storedQualityChecks.push(qc);
        if (storedProduct) {
          storedProduct.status = ProductStatus.QUALITY_CHECKED;
        }
        return Promise.resolve(qc);
      }),

      findMany: jest.fn().mockImplementation(() => {
        return Promise.resolve(storedQualityChecks);
      }),

      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(
          storedQualityChecks.find((q) => q.id === where.id) || null,
        );
      }),
    },

    shipment: {
      create: jest.fn().mockImplementation(({ data }) => {
        const id = `ship-uuid-${storedShipments.size + 1}`;
        const sender =
          organizationsMap.get(data.senderOrganizationId) ||
          mockManufacturerOrg;
        const receiver =
          organizationsMap.get(data.receiverOrganizationId) ||
          mockDistributorOrg;
        const carrier =
          organizationsMap.get(data.carrierOrganizationId) || mockCarrierOrg;

        const shipmentRecord = {
          id,
          ...data,
          status: ShipmentStatus.PENDING,
          sender,
          receiver,
          carrier,
          product: storedProduct,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        storedShipments.set(id, shipmentRecord);
        storedShipments.set(data.shipmentCode, shipmentRecord);

        if (storedProduct) {
          storedProduct.status = ProductStatus.READY_TO_SHIP;
        }

        return Promise.resolve(shipmentRecord);
      }),

      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.OR && Array.isArray(where.OR)) {
          for (const cond of where.OR) {
            for (const shipment of storedShipments.values()) {
              if (cond.id && shipment.id === cond.id)
                return Promise.resolve(shipment);
              if (
                cond.shipmentCode &&
                shipment.shipmentCode === cond.shipmentCode
              )
                return Promise.resolve(shipment);
            }
          }
        }
        for (const shipment of storedShipments.values()) {
          if (where?.id && shipment.id === where.id)
            return Promise.resolve(shipment);
          if (
            where?.shipmentCode &&
            shipment.shipmentCode === where.shipmentCode
          )
            return Promise.resolve(shipment);
          if (where?.productId && shipment.productId === where.productId) {
            if (where.status) {
              if (Array.isArray(where.status.in)) {
                if (where.status.in.includes(shipment.status))
                  return Promise.resolve(shipment);
              } else if (shipment.status === where.status) {
                return Promise.resolve(shipment);
              }
            } else {
              return Promise.resolve(shipment);
            }
          }
        }
        return Promise.resolve(null);
      }),

      findUnique: jest.fn().mockImplementation(({ where }) => {
        const key = where.id || where.shipmentCode;
        return Promise.resolve(storedShipments.get(key) || null);
      }),

      findMany: jest.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(storedShipments.values()));
      }),

      count: jest.fn().mockImplementation(() => {
        return Promise.resolve(storedShipments.size);
      }),

      update: jest.fn().mockImplementation(({ where, data }) => {
        const key = where.id;
        const existing = storedShipments.get(key);
        if (!existing) return Promise.resolve(null);

        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        storedShipments.set(existing.id, updated);
        storedShipments.set(existing.shipmentCode, updated);

        // When shipment is delivered, update product owner & status
        if (data.status === ShipmentStatus.DELIVERED && storedProduct) {
          storedProduct.status = ProductStatus.RECEIVED;
          storedProduct.currentOwnerId = existing.receiverOrganizationId;
          storedProduct.currentOwner =
            organizationsMap.get(existing.receiverOrganizationId) ||
            existing.receiver;
        } else if (
          (data.status === ShipmentStatus.SHIPPED ||
            data.status === ShipmentStatus.IN_TRANSIT) &&
          storedProduct
        ) {
          storedProduct.status = ProductStatus.SHIPPED;
        }

        return Promise.resolve(updated);
      }),
    },

    blockchainTransaction: {
      upsert: jest
        .fn()
        .mockImplementation(({ create, update, where: _where }) => {
          const tx = {
            ...create,
            ...update,
            id: `tx-${storedTransactions.length + 1}`,
          };
          storedTransactions.push(tx);
          return Promise.resolve(tx);
        }),
      create: jest.fn().mockImplementation(({ data }) => {
        const tx = { ...data, id: `tx-${storedTransactions.length + 1}` };
        storedTransactions.push(tx);
        return Promise.resolve(tx);
      }),
      findMany: jest
        .fn()
        .mockImplementation(() => Promise.resolve(storedTransactions)),
      count: jest
        .fn()
        .mockImplementation(() => Promise.resolve(storedTransactions.length)),
    },

    auditLog: {
      create: jest.fn().mockImplementation(({ data }) => {
        const log = {
          id: `log-${storedAuditLogs.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        storedAuditLogs.push(log);
        return Promise.resolve(log);
      }),
      findMany: jest
        .fn()
        .mockImplementation(() => Promise.resolve(storedAuditLogs)),
    },
  };

  // --------------------------------------------------------------------------
  // Mock Blockchain Service (Tracks On-Chain Contract State)
  // --------------------------------------------------------------------------
  const onChainProductState = {
    productId: 1n,
    productCode,
    productHash: '',
    manufacturer: mockManufacturerOrg.walletAddress,
    currentOwner: mockManufacturerOrg.walletAddress,
    status: 0, // 0 = REGISTERED, 1 = QUALITY_CHECKED, 2 = SHIPPED, 3 = DELIVERED, 4 = SOLD
    registeredAt: 1774300000,
  };

  const mockBlockchainService = {
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      chainId: 31337,
      blockNumber: 4200,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      operatorBalance: '99.854 ETH',
    }),

    getContractAddress: jest
      .fn()
      .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),

    getSigner: jest.fn().mockReturnValue({
      getAddress: jest
        .fn()
        .mockResolvedValue('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
    }),

    registerProduct: jest.fn().mockImplementation((code, hash, _signer) => {
      onChainProductState.productHash = hash;
      onChainProductState.status = 0;
      return Promise.resolve({
        txHash:
          '0x71a938b8d8cf901fa49c30f9c2d1b0981e5b871234907123fa49c30f9c2d1b09',
        blockNumber: 4201,
        productId: 1n,
      });
    }),

    recordQualityCheck: jest.fn().mockImplementation(() => {
      onChainProductState.status = 1; // QUALITY_CHECKED
      return Promise.resolve({
        txHash:
          '0x99bb38b8d8cf901fa49c30f9c2d1b0981e5b871234907123fa49c30f9c2d1b11',
        blockNumber: 4202,
      });
    }),

    createShipment: jest.fn().mockResolvedValue({
      txHash:
        '0xaa1138b8d8cf901fa49c30f9c2d1b0981e5b871234907123fa49c30f9c2d1b22',
      blockNumber: 4203,
      shipmentId: 1n,
    }),

    getShipment: jest.fn().mockImplementation((id) =>
      Promise.resolve({
        shipmentId: Number(id),
        shipmentCode: 'SHP-MOCK-001',
        productId: 1,
        sender: mockManufacturerOrg.walletAddress,
        receiver: mockDistributorOrg.walletAddress,
        carrier: mockCarrierOrg.walletAddress,
        status: 0,
        createdAt: Math.floor(Date.now() / 1000),
        shippedAt: 0,
        receivedAt: 0,
      }),
    ),

    getShipmentByCode: jest.fn().mockImplementation((code) =>
      Promise.resolve({
        shipmentId: 1,
        shipmentCode: code,
        productId: 1,
        sender: mockManufacturerOrg.walletAddress,
        receiver: mockDistributorOrg.walletAddress,
        carrier: mockCarrierOrg.walletAddress,
        status: 0,
        createdAt: Math.floor(Date.now() / 1000),
        shippedAt: 0,
        receivedAt: 0,
      }),
    ),

    verifyShipmentExists: jest.fn().mockResolvedValue(true),

    shipProduct: jest.fn().mockImplementation(() => {
      onChainProductState.status = 2; // SHIPPED
      return Promise.resolve({
        txHash:
          '0xcc2238b8d8cf901fa49c30f9c2d1b0981e5b871234907123fa49c30f9c2d1b33',
        blockNumber: 4204,
      });
    }),

    receiveProduct: jest.fn().mockImplementation(() => {
      onChainProductState.status = 3; // DELIVERED / RECEIVED
      return Promise.resolve({
        txHash:
          '0xbb2238b8d8cf901fa49c30f9c2d1b0981e5b871234907123fa49c30f9c2d1b77',
        blockNumber: 4205,
      });
    }),

    transferOwnership: jest
      .fn()
      .mockImplementation((_prodId, newOwnerAddress) => {
        onChainProductState.currentOwner = newOwnerAddress;
        return Promise.resolve({
          txHash:
            '0xdd3338b8d8cf901fa49c30f9c2d1b0981e5b871234907123fa49c30f9c2d1b44',
          blockNumber: 4206,
        });
      }),

    markAsSold: jest.fn().mockImplementation(() => {
      onChainProductState.status = 4; // SOLD
      return Promise.resolve({
        txHash:
          '0xee4438b8d8cf901fa49c30f9c2d1b0981e5b871234907123fa49c30f9c2d1b55',
        blockNumber: 4207,
      });
    }),

    getProduct: jest.fn().mockImplementation(() => {
      return Promise.resolve({ ...onChainProductState });
    }),

    getProductByCode: jest.fn().mockImplementation(() => {
      return Promise.resolve({ ...onChainProductState });
    }),

    getProductHistory: jest.fn().mockImplementation(() => {
      return Promise.resolve([
        {
          eventType: 'REGISTERED',
          actor: mockManufacturerOrg.walletAddress,
          timestamp: 1774300000,
          details: 'Product registered on blockchain',
        },
        {
          eventType: 'QUALITY_CHECKED',
          actor: mockAuditorOrg.walletAddress,
          timestamp: 1774301000,
          details: 'Quality Inspection PASSED',
        },
        {
          eventType: 'SHIPPED',
          actor: mockManufacturerOrg.walletAddress,
          timestamp: 1774302000,
          details: 'Dispatched to Pacific Freight Dist',
        },
        {
          eventType: 'DELIVERED',
          actor: mockDistributorOrg.walletAddress,
          timestamp: 1774303000,
          details: 'Received by Pacific Freight Dist',
        },
        {
          eventType: 'OWNERSHIP_TRANSFERRED',
          actor: mockDistributorOrg.walletAddress,
          timestamp: 1774304000,
          details: 'Transferred to Central Hub Warehousing',
        },
        {
          eventType: 'SOLD',
          actor: mockRetailerOrg.walletAddress,
          timestamp: 1774305000,
          details: 'Sold to end consumer',
        },
      ]);
    }),

    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  const mockIndexerService = {
    getListenerStatus: jest.fn().mockReturnValue({ isListening: true }),
    syncHistoricalEvents: jest.fn().mockResolvedValue({ syncedEvents: 0 }),
  };

  // --------------------------------------------------------------------------
  // Application Bootstrap
  // --------------------------------------------------------------------------
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
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================================================
  // STEP 1: Manufacturer Login
  // ==========================================================================
  describe('Step 1: Manufacturer & Actor Authentication (POST /api/auth/login)', () => {
    it('authenticates Manufacturer user and returns valid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: mockMfgUser.email,
          password: sharedPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe(UserRole.MANUFACTURER);
      expect(response.body.user.organizationId).toBe(mockManufacturerOrg.id);
      mfgToken = response.body.accessToken;
    });

    it('authenticates Auditor, Distributor, Warehouse, and Retailer users', async () => {
      // Auditor
      const auditRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: mockAuditorUser.email, password: sharedPassword })
        .expect(200);
      auditorToken = auditRes.body.accessToken;
      expect(auditRes.body.user.role).toBe(UserRole.AUDITOR);

      // Distributor
      const distRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: mockDistUser.email, password: sharedPassword })
        .expect(200);
      distToken = distRes.body.accessToken;
      expect(distRes.body.user.role).toBe(UserRole.DISTRIBUTOR);

      // Warehouse
      const whRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: mockWarehouseUser.email, password: sharedPassword })
        .expect(200);
      warehouseToken = whRes.body.accessToken;
      expect(whRes.body.user.role).toBe(UserRole.WAREHOUSE);

      // Retailer
      const retRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: mockRetailerUser.email, password: sharedPassword })
        .expect(200);
      retailerToken = retRes.body.accessToken;
      expect(retRes.body.user.role).toBe(UserRole.RETAILER);
    });
  });

  // ==========================================================================
  // STEP 2: Create Product
  // ==========================================================================
  describe('Step 2: Create Product (POST /api/products)', () => {
    it('creates a new product record as Manufacturer with deterministic Keccak-256 hash', async () => {
      const payload = {
        productCode,
        serialNumber,
        name: 'Enterprise IoT Gateway Pro',
        description:
          'Industrial high-security gateway with hardware HSM and LTE telemetry',
        category: 'Electronics',
      };

      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.productCode).toBe(productCode);
      expect(response.body.serialNumber).toBe(serialNumber);
      expect(response.body.status).toBe(ProductStatus.REGISTERED);
      expect(response.body.manufacturerId).toBe(mockManufacturerOrg.id);
      expect(response.body.currentOwnerId).toBe(mockManufacturerOrg.id);
      expect(response.body.productHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      createdProductId = response.body.id;

      // Verify Keccak-256 deterministic computation
      const expectedHash = generateProductHash({
        productCode,
        serialNumber,
        manufacturerId: mockManufacturerOrg.id,
        name: payload.name,
        category: payload.category,
      });
      expect(response.body.productHash.toLowerCase()).toBe(
        expectedHash.toLowerCase(),
      );
    });
  });

  // ==========================================================================
  // STEP 3: Register Blockchain
  // ==========================================================================
  describe('Step 3: Register Blockchain (POST /api/products/:id/register-blockchain)', () => {
    it('registers the product on the SupplyChainRegistry smart contract', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/products/${createdProductId}/register-blockchain`)
        .set('Authorization', `Bearer ${mfgToken}`)
        .send({})
        .expect(200);

      expect(response.body.blockchainRegistration).toBeDefined();
      expect(response.body.blockchainRegistration.txHash).toMatch(/^0x/);
      expect(response.body.blockchainProductId).toBe('1');
      expect(response.body.blockchainTxHash).toBeDefined();

      expect(mockBlockchainService.registerProduct).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // STEP 4: Quality Check
  // ==========================================================================
  describe('Step 4: Quality Check (POST /api/quality-checks)', () => {
    it('records PASSED quality check inspection by Auditor and advances status', async () => {
      const qcPayload = {
        productId: createdProductId,
        result: QualityCheckResult.PASSED,
        inspectorName: 'Dr. Elena Rostova',
        notes:
          'Passed ISO/IEC 27001, CE RED, and environmental vibration stress testing.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/quality-checks')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send(qcPayload)
        .expect(201);

      expect(response.body.qualityCheck.result).toBe(QualityCheckResult.PASSED);
      expect(response.body.qualityCheck.inspectorName).toBe(
        'Dr. Elena Rostova',
      );
      expect(response.body.blockchain.txHash).toBeDefined();
      expect(mockBlockchainService.recordQualityCheck).toHaveBeenCalledTimes(1);

      // Verify product state moved to QUALITY_CHECKED
      expect(storedProduct.status).toBe(ProductStatus.QUALITY_CHECKED);
    });
  });

  // ==========================================================================
  // STEP 5: Create Shipment (Manufacturer -> Distributor) & Dispatch
  // ==========================================================================
  describe('Step 5: Create Shipment & Dispatch (POST /api/shipments)', () => {
    it('creates initial shipment from Manufacturer to Pacific Distributor', async () => {
      const shipmentPayload = {
        shipmentCode: 'SHIP-PH16-001',
        productId: createdProductId,
        receiverOrganizationId: mockDistributorOrg.id,
        carrierOrganizationId: mockCarrierOrg.id,
        origin: 'Apex Cleanroom Fab 1, Austin TX',
        destination: 'Pacific Freight Logistics Hub, Seattle WA',
      };

      const response = await request(app.getHttpServer())
        .post('/api/shipments')
        .set('Authorization', `Bearer ${mfgToken}`)
        .send(shipmentPayload)
        .expect(201);

      expect(response.body.shipment.shipmentCode).toBe('SHIP-PH16-001');
      expect(response.body.shipment.status).toBe(ShipmentStatus.PENDING);
      expect(response.body.shipment.senderOrganizationId).toBe(
        mockManufacturerOrg.id,
      );
      expect(response.body.shipment.receiverOrganizationId).toBe(
        mockDistributorOrg.id,
      );

      firstShipmentId = response.body.shipment.id;
      expect(storedProduct.status).toBe(ProductStatus.READY_TO_SHIP);
    });

    it('dispatches the shipment on-chain transitioning status to SHIPPED', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/shipments/${firstShipmentId}/ship`)
        .set('Authorization', `Bearer ${mfgToken}`)
        .send({
          notes:
            'Dispatched via air carrier flight SP-802 (Tracking: SPEEDEX-TRACK-99120)',
        })
        .expect(200);

      expect(response.body.shipment.status).toBe(ShipmentStatus.SHIPPED);
      expect(storedProduct.status).toBe(ProductStatus.SHIPPED);
    });
  });

  // ==========================================================================
  // STEP 6: Distributor Receives
  // ==========================================================================
  describe('Step 6: Distributor Receives (POST /api/shipments/:id/receive)', () => {
    it('confirms delivery by Distributor, auto-transferring ownership on-chain', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/shipments/${firstShipmentId}/receive`)
        .set('Authorization', `Bearer ${distToken}`)
        .send({
          notes:
            'Received in perfect factory condition at Pacific Seattle dock',
        })
        .expect(200);

      expect(response.body.shipment.status).toBe(ShipmentStatus.DELIVERED);
      expect(response.body.product.status).toBe(ProductStatus.RECEIVED);
      expect(response.body.product.currentOwnerId).toBe(mockDistributorOrg.id);
      expect(storedProduct.currentOwnerId).toBe(mockDistributorOrg.id);

      // Verify blockchain receipt emitted
      expect(response.body.blockchain.status).toBe('CONFIRMED');
    });
  });

  // ==========================================================================
  // STEP 7: Transfer Ownership (Distributor -> Warehouse)
  // ==========================================================================
  describe('Step 7: Transfer Ownership (POST /api/products/:id/transfer)', () => {
    it('transfers product ownership from Distributor to Central Hub Warehouse', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/products/${createdProductId}/transfer`)
        .set('Authorization', `Bearer ${distToken}`)
        .send({
          newOwnerOrganizationId: mockWarehouseOrg.id,
          notes: 'Inter-enterprise consignment transfer to Central Warehousing',
        })
        .expect(200);

      expect(response.body.product.currentOwnerId).toBe(mockWarehouseOrg.id);
      expect(storedProduct.currentOwnerId).toBe(mockWarehouseOrg.id);
      expect(mockBlockchainService.transferOwnership).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // STEP 8: Warehouse Ships to Retailer & Retailer Receives
  // ==========================================================================
  describe('Step 8: Warehouse Ships to Retailer & Retailer Receives', () => {
    it('creates and dispatches downstream shipment from Warehouse to Retailer', async () => {
      const secondShipmentPayload = {
        shipmentCode: 'SHIP-PH16-002',
        productId: createdProductId,
        receiverOrganizationId: mockRetailerOrg.id,
        carrierOrganizationId: mockCarrierOrg.id,
        origin: 'Central Hub Warehouse Bay 4, Chicago IL',
        destination: 'Metro Tech Retail Store #42, Minneapolis MN',
      };

      const createRes = await request(app.getHttpServer())
        .post('/api/shipments')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send(secondShipmentPayload)
        .expect(201);

      secondShipmentId = createRes.body.shipment.id;

      // Dispatch from Warehouse
      await request(app.getHttpServer())
        .post(`/api/shipments/${secondShipmentId}/ship`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          notes:
            'Dispatched from Central Warehouse (Tracking: SPEEDEX-LOCAL-1022)',
        })
        .expect(200);

      expect(storedProduct.status).toBe(ProductStatus.SHIPPED);
    });

    it('Retailer receives product, taking legal ownership', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/shipments/${secondShipmentId}/receive`)
        .set('Authorization', `Bearer ${retailerToken}`)
        .send({
          notes: 'Stocked on display floor at Metro Tech store #42',
        })
        .expect(200);

      expect(response.body.product.currentOwnerId).toBe(mockRetailerOrg.id);
      expect(response.body.product.status).toBe(ProductStatus.RECEIVED);
      expect(storedProduct.currentOwnerId).toBe(mockRetailerOrg.id);
    });
  });

  // ==========================================================================
  // STEP 9: Sell Product
  // ==========================================================================
  describe('Step 9: Sell Product (POST /api/products/:id/sell)', () => {
    it('marks product as SOLD to end consumer by Retailer', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/products/${createdProductId}/sell`)
        .set('Authorization', `Bearer ${retailerToken}`)
        .send({
          notes:
            'POS Register #3 sale to consumer customer invoice #INV-2026-9921',
        })
        .expect(200);

      expect(response.body.message).toContain('Product marked as sold');
      expect(response.body.product.status).toBe(ProductStatus.SOLD);
      expect(storedProduct.status).toBe(ProductStatus.SOLD);
      expect(mockBlockchainService.markAsSold).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // STEP 10: Customer QR Scan / Public Verification
  // ==========================================================================
  describe('Step 10: Customer QR Scan & Public Verification (GET /api/public/verify/:code)', () => {
    it('verifies product authenticity publicly without requiring authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/public/verify/${productCode}`)
        .expect(200);

      expect(response.body.verified).toBe(true);
      expect(response.body.product.productCode).toBe(productCode);
      expect(response.body.product.serialNumber).toBe(serialNumber);
      expect(response.body.product.status).toBe(ProductStatus.SOLD);
      expect(response.body.product.manufacturer.name).toBe(
        mockManufacturerOrg.name,
      );

      // Cryptographic hash validation
      expect(response.body.blockchain.hashMatch).toBe(true);
      expect(response.body.blockchain.verified).toBe(true);
      expect(response.body.blockchain.registeredOnChain).toBe(true);

      // Quality assurance certification
      expect(response.body.product.qualityChecks).toBeInstanceOf(Array);
      expect(response.body.product.qualityChecks.length).toBeGreaterThanOrEqual(
        1,
      );
      expect(response.body.product.qualityChecks[0].result).toBe(
        QualityCheckResult.PASSED,
      );

      // Public safe timeline
      expect(response.body.timeline).toBeInstanceOf(Array);
      expect(response.body.timeline.length).toBeGreaterThanOrEqual(3);
    });

    it('streams public QR code PNG image stream with correct headers', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/public/verify/${productCode}/qr`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.body).toBeDefined();
    });
  });

  // ==========================================================================
  // STEP 11: Verify Complete Traceability History
  // ==========================================================================
  describe('Step 11: Verify Complete Traceability (GET /api/traceability/:code)', () => {
    it('retrieves full multi-actor audit provenance and chronological timeline', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/traceability/${productCode}`)
        .set('Authorization', `Bearer ${mfgToken}`)
        .expect(200);

      expect(response.body.product.productCode).toBe(productCode);
      expect(response.body.product.status).toBe(ProductStatus.SOLD);

      // Chronological timeline contains all milestones:
      // 1. Manufactured / Registered
      // 2. Quality Checked
      // 3. Multi-hop Shipments
      // 4. Sold
      const eventTypes = response.body.events.map((e: any) => e.eventType);
      expect(eventTypes).toContain('PRODUCT_REGISTERED');
      expect(eventTypes).toContain('QUALITY_CHECKED');
      expect(eventTypes).toContain('PRODUCT_SOLD');

      // Blockchain integrity confirmation
      expect(response.body.blockchainVerification.hashMatch).toBe(true);
      expect(response.body.blockchainVerification.verified).toBe(true);
      expect(response.body.blockchainVerification.onChainProductId).toBe(1);
    });
  });
});
