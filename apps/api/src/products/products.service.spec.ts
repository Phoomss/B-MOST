import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { OrganizationType, ProductStatus, UserRole } from '@prisma/client';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let blockchainService: any;

  const mockManufacturerOrg = {
    id: 'org-mfg-uuid',
    name: 'Acme Electronics Ltd',
    code: 'ACME',
    type: OrganizationType.MANUFACTURER,
    status: 'ACTIVE',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  };

  const mockDistributorOrg = {
    id: 'org-dist-uuid',
    name: 'Fast Logistics Hub',
    code: 'LOGI',
    type: OrganizationType.DISTRIBUTOR,
    status: 'ACTIVE',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  };

  const mockManufacturerUser = {
    id: 'user-mfg-uuid',
    email: 'mfg@acme.com',
    role: UserRole.MANUFACTURER,
    organizationId: mockManufacturerOrg.id,
  };

  const mockAdminUser = {
    id: 'user-admin-uuid',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
  };

  const mockAuditorUser = {
    id: 'user-auditor-uuid',
    email: 'auditor@bmost.io',
    role: UserRole.AUDITOR,
    organizationId: 'org-auditor-uuid',
  };

  const mockDistributorUser = {
    id: 'user-dist-uuid',
    email: 'dist@logi.com',
    role: UserRole.DISTRIBUTOR,
    organizationId: mockDistributorOrg.id,
  };

  const sampleProduct = {
    id: 'prod-uuid-1',
    productCode: 'PRD-2026-0001',
    serialNumber: 'SN-001',
    name: 'Industrial Sensor',
    description: 'Precision temperature sensor',
    category: 'Sensors',
    manufacturerId: mockManufacturerOrg.id,
    currentOwnerId: mockManufacturerOrg.id,
    blockchainProductId: null,
    blockchainTxHash: null,
    productHash:
      '0x1234567890123456789012345678901234567890123456789012345678901234',
    status: ProductStatus.REGISTERED,
    createdAt: new Date(),
    updatedAt: new Date(),
    manufacturer: mockManufacturerOrg,
    currentOwner: mockManufacturerOrg,
    qualityChecks: [],
    shipments: [],
    blockchainTransactions: [],
  };

  beforeEach(async () => {
    prisma = {
      product: {
        create: jest.fn().mockResolvedValue(sampleProduct),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([sampleProduct]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(sampleProduct),
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
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      blockchainTransaction: {
        upsert: jest.fn().mockResolvedValue({ id: 'tx-1' }),
      },
    };

    blockchainService = {
      registerProduct: jest.fn().mockResolvedValue({
        txHash:
          '0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
        blockNumber: 101,
        productId: 1,
      }),
      getProduct: jest.fn().mockResolvedValue({
        productId: 1,
        productCode: 'PRD-2026-0001',
        productHash:
          '0x1234567890123456789012345678901234567890123456789012345678901234',
        manufacturer: mockManufacturerOrg.walletAddress,
        currentOwner: mockManufacturerOrg.walletAddress,
        status: 0,
        registeredAt: Math.floor(Date.now() / 1000),
      }),
      getProductByCode: jest.fn().mockResolvedValue({
        productId: 1,
        productCode: 'PRD-2026-0001',
        productHash:
          '0x1234567890123456789012345678901234567890123456789012345678901234',
        manufacturer: mockManufacturerOrg.walletAddress,
        currentOwner: mockManufacturerOrg.walletAddress,
        status: 0,
        registeredAt: Math.floor(Date.now() / 1000),
      }),
      getProductHistory: jest.fn().mockResolvedValue([
        {
          eventType: 'REGISTERED',
          actor: mockManufacturerOrg.walletAddress,
          timestamp: Math.floor(Date.now() / 1000),
          details: 'Product registered',
        },
      ]),
      getContractAddress: jest
        .fn()
        .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
      getSigner: jest.fn().mockReturnValue({
        getAddress: jest
          .fn()
          .mockResolvedValue('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchainService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'NEXT_PUBLIC_WEB_URL') return 'http://localhost:3000';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('successfully creates a product and computes deterministic keccak256 hash', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const dto = {
        productCode: 'PRD-2026-0001',
        serialNumber: 'SN-001',
        name: 'Industrial Sensor',
        category: 'Sensors',
        description: 'Precision temperature sensor',
      };

      const result = await service.create(dto, mockManufacturerUser);

      expect(result).toBeDefined();
      expect(result.productCode).toEqual('PRD-2026-0001');
      expect(result.qrCode).toContain('data:image/png;base64');
      expect(result.verificationUrl).toEqual(
        'http://localhost:3000/verify/PRD-2026-0001',
      );
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productCode: 'PRD-2026-0001',
            serialNumber: 'SN-001',
            manufacturerId: mockManufacturerOrg.id,
            currentOwnerId: mockManufacturerOrg.id,
            status: ProductStatus.REGISTERED,
            productHash: expect.stringMatching(/^0x[0-9a-fA-F]{64}$/),
          }),
        }),
      );
    });

    it('rejects product creation if productCode already exists with ConflictException', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(sampleProduct);

      const dto = {
        productCode: 'PRD-2026-0001',
        serialNumber: 'SN-UNIQUE',
        name: 'Sensor',
      };

      await expect(service.create(dto, mockManufacturerUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects product creation if serialNumber already exists with ConflictException', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(null) // code not found
        .mockResolvedValueOnce(sampleProduct); // serial found

      const dto = {
        productCode: 'PRD-2026-NEW',
        serialNumber: 'SN-001',
        name: 'Sensor',
      };

      await expect(service.create(dto, mockManufacturerUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects product creation if non-SUPER_ADMIN user has no organization', async () => {
      const orphanUser = {
        id: 'u-1',
        role: UserRole.MANUFACTURER,
        organizationId: null,
      };
      const dto = {
        productCode: 'PRD-2026-0001',
        serialNumber: 'SN-001',
        name: 'Sensor',
      };

      await expect(service.create(dto, orphanUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects product creation if organization type is not MANUFACTURER', async () => {
      const dto = {
        productCode: 'PRD-2026-0001',
        serialNumber: 'SN-001',
        name: 'Sensor',
      };

      await expect(service.create(dto, mockDistributorUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows SUPER_ADMIN to explicitly specify manufacturerId', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const dto = {
        productCode: 'PRD-ADMIN-01',
        serialNumber: 'SN-ADMIN-01',
        name: 'Admin Created Sensor',
        manufacturerId: mockManufacturerOrg.id,
      };

      const result = await service.create(dto, mockAdminUser);
      expect(result).toBeDefined();
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            manufacturerId: mockManufacturerOrg.id,
          }),
        }),
      );
    });

    it('automatically registers on blockchain when registerOnBlockchain is true', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(null) // serial check
        .mockResolvedValue(sampleProduct); // register check

      prisma.product.update.mockResolvedValue({
        ...sampleProduct,
        blockchainProductId: '1',
        blockchainTxHash: '0x9876543210',
      });

      const dto = {
        productCode: 'PRD-AUTO-01',
        serialNumber: 'SN-AUTO-01',
        name: 'Auto Chain Sensor',
        registerOnBlockchain: true,
      };

      const result = await service.create(dto, mockManufacturerUser);
      expect(result).toBeDefined();
      expect(blockchainService.registerProduct).toHaveBeenCalled();
    });
  });

  describe('findAll (Tenant Isolation)', () => {
    it('restricts non-admin users to their own organization products', async () => {
      await service.findAll({}, mockManufacturerUser);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { manufacturerId: mockManufacturerOrg.id },
              { currentOwnerId: mockManufacturerOrg.id },
            ],
          }),
        }),
      );
    });

    it('allows SUPER_ADMIN and AUDITOR to query across all organizations', async () => {
      await service.findAll({}, mockAdminUser);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            OR: [
              { manufacturerId: mockManufacturerOrg.id },
              { currentOwnerId: mockManufacturerOrg.id },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('retrieves product and enriches with QR and live blockchain verification', async () => {
      const productWithChain = {
        ...sampleProduct,
        blockchainProductId: '1',
      };
      prisma.product.findUnique.mockResolvedValue(productWithChain);

      const result = await service.findOne('prod-uuid-1', mockManufacturerUser);

      expect(result).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.blockchainData).toBeDefined();
      expect(result.blockchainData.onChain).toBe(true);
      expect(blockchainService.getProduct).toHaveBeenCalledWith(BigInt(1));
    });

    it('throws ForbiddenException when another organization tries to view isolated product', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);

      await expect(
        service.findOne('prod-uuid-1', mockDistributorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows AUDITOR to view any organization product', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);

      const result = await service.findOne('prod-uuid-1', mockAuditorUser);
      expect(result).toBeDefined();
      expect(result.id).toEqual(sampleProduct.id);
    });
  });

  describe('update', () => {
    it('allows current owner to update product metadata', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.product.update.mockResolvedValue({
        ...sampleProduct,
        name: 'Updated Name',
      });

      const result = await service.update(
        'prod-uuid-1',
        { name: 'Updated Name' },
        mockManufacturerUser,
      );

      expect(result.name).toEqual('Updated Name');
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-uuid-1' },
          data: expect.objectContaining({ name: 'Updated Name' }),
        }),
      );
    });

    it('forbids non-owner from updating product metadata', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);

      await expect(
        service.update(
          'prod-uuid-1',
          { name: 'Hacked Name' },
          mockDistributorUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('registerOnBlockchain', () => {
    it('executes smart contract registration and saves blockchainProductId and txHash', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.product.update.mockResolvedValue({
        ...sampleProduct,
        blockchainProductId: '1',
        blockchainTxHash: '0x9876543210',
      });

      const result = await service.registerOnBlockchain(
        'prod-uuid-1',
        mockManufacturerUser,
      );

      expect(result).toBeDefined();
      expect(blockchainService.registerProduct).toHaveBeenCalledWith(
        sampleProduct.productCode,
        sampleProduct.productHash,
        undefined,
      );
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-uuid-1' },
          data: expect.objectContaining({
            blockchainProductId: '1',
            blockchainTxHash:
              '0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
          }),
        }),
      );
    });

    it('throws ConflictException if product is already registered on chain', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...sampleProduct,
        blockchainProductId: '42',
      });

      await expect(
        service.registerOnBlockchain('prod-uuid-1', mockManufacturerUser),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if product is RECALLED', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...sampleProduct,
        status: ProductStatus.RECALLED,
      });

      await expect(
        service.registerOnBlockchain('prod-uuid-1', mockManufacturerUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes unregistered draft product successfully', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...sampleProduct,
        _count: { qualityChecks: 0, shipments: 0 },
      });

      const result = await service.remove('prod-uuid-1', mockManufacturerUser);
      expect(result.success).toBe(true);
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-uuid-1' },
      });
    });

    it('forbids deleting product that has already been registered on blockchain', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...sampleProduct,
        blockchainProductId: '1',
        blockchainTxHash: '0x123',
        _count: { qualityChecks: 0, shipments: 0 },
      });

      await expect(
        service.remove('prod-uuid-1', mockManufacturerUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyPublicProduct', () => {
    it('returns public verification data comparing hash on-chain', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...sampleProduct,
        blockchainProductId: '1',
        blockchainTxHash: '0x98765',
      });

      const result = await service.verifyPublicProduct('PRD-2026-0001');

      expect(result.verified).toBe(true);
      expect(result.product.productCode).toEqual('PRD-2026-0001');
      expect(result.blockchain.registeredOnChain).toBe(true);
      expect(result.blockchain.hashMatch).toBe(true);
      expect(result.timeline).toBeInstanceOf(Array);
      expect(result.qrCode).toContain('data:image/png;base64');
    });

    it('returns rich timeline including quality checks and shipments', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...sampleProduct,
        blockchainProductId: '1',
        blockchainTxHash: '0x98765',
        qualityChecks: [
          {
            id: 'qc-1',
            result: 'PASSED',
            inspectorName: 'Auditor Jane',
            createdAt: new Date('2026-01-02'),
            notes: 'All checks passed',
            organization: { name: 'Audit Corp' },
            blockchainTxHash: '0xqc123',
          },
        ],
        shipments: [
          {
            id: 'shp-1',
            shipmentCode: 'SHP-001',
            origin: 'Factory A',
            destination: 'Warehouse B',
            sender: { name: 'Acme' },
            carrier: { name: 'Speedy' },
            receiver: { name: 'LogiHub' },
            createdAt: new Date('2026-01-03'),
            shippedAt: new Date('2026-01-04'),
            receivedAt: new Date('2026-01-05'),
            blockchainTxHash: '0xshp123',
          },
        ],
      });

      const result = await service.verifyPublicProduct('PRD-2026-0001');
      expect(result.timeline.length).toBe(5); // Reg, QC, Shp-Created, Shp-Dispatched, Shp-Received -> 5 items
      expect(result.timeline.some((t: any) => t.eventType === 'QUALITY_CHECKED')).toBe(true);
      expect(result.timeline.some((t: any) => t.eventType === 'PRODUCT_SHIPPED')).toBe(true);
      expect(result.timeline.some((t: any) => t.eventType === 'PRODUCT_RECEIVED')).toBe(true);
    });

    it('detects hash mismatch when on-chain hash differs from database', async () => {
      blockchainService.getProductByCode.mockResolvedValueOnce({
        productId: 1,
        productCode: 'PRD-2026-0001',
        productHash: '0xTAMPERED_HASH_9999999999999999999999999999999999999999999999999999',
        manufacturer: mockManufacturerOrg.walletAddress,
        currentOwner: mockManufacturerOrg.walletAddress,
        status: 0,
      });

      prisma.product.findUnique.mockResolvedValue({
        ...sampleProduct,
        blockchainProductId: '1',
        blockchainTxHash: '0x98765',
      });

      const result = await service.verifyPublicProduct('PRD-2026-0001');
      expect(result.verified).toBe(false);
      expect(result.blockchain.hashMatch).toBe(false);
    });

    it('verifies product via serial number fallback if productCode does not match', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce(null) // first try with productCode
        .mockResolvedValueOnce({
          ...sampleProduct,
          serialNumber: 'SN-001',
          blockchainProductId: '1',
          blockchainTxHash: '0x98765',
        }); // second try with serialNumber

      const result = await service.verifyPublicProduct('SN-001');
      expect(result.verified).toBe(true);
      expect(result.product.serialNumber).toEqual('SN-001');
    });

    it('returns unverified when product code is not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await service.verifyPublicProduct('UNKNOWN');
      expect(result.verified).toBe(false);
    });
  });

  describe('getQrImageBuffer', () => {
    it('returns a PNG Buffer for valid product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        productCode: 'PRD-2026-0001',
      });

      const buffer = await service.getQrImageBuffer('PRD-2026-0001');
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('throws NotFoundException when product is missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      let error: any;
      try {
        await service.getQrImageBuffer('MISSING');
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(NotFoundException);
    });
  });
});

