import { Test, TestingModule } from '@nestjs/testing';
import { TraceabilityService } from './traceability.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  ProductStatus,
  ShipmentStatus,
  QualityCheckResult,
  UserRole,
  OrganizationType,
} from '@prisma/client';
import { generateProductHash } from '../products/utils/product-hash.util';

describe('TraceabilityService', () => {
  let service: TraceabilityService;
  let prisma: any;
  let blockchain: any;

  const mockManufacturerOrg = {
    id: 'org-mfg-1',
    name: 'Apex Manufacturing Corp',
    code: 'APEX',
    type: OrganizationType.MANUFACTURER,
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  };

  const mockDistributorOrg = {
    id: 'org-dist-2',
    name: 'Global Freight Distributor',
    code: 'GFD',
    type: OrganizationType.DISTRIBUTOR,
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  };

  const mockCarrierOrg = {
    id: 'org-carrier-3',
    name: 'FastHaul Logistics',
    code: 'FAST',
    type: OrganizationType.LOGISTICS,
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  };

  const mockAuditorOrg = {
    id: 'org-auditor-4',
    name: 'TUV SGS Inspection Org',
    code: 'TUVSGS',
    type: OrganizationType.AUDITOR,
    walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  };

  const mockUnrelatedOrg = {
    id: 'org-unrelated-99',
    name: 'Unrelated Comp',
    code: 'UNREL',
    type: OrganizationType.RETAILER,
    walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
  };

  const expectedHash = generateProductHash({
    productCode: 'PRD-APEX-001',
    serialNumber: 'SN-APEX-001',
    manufacturerId: mockManufacturerOrg.id,
    name: 'Smart Sensor Node',
    category: 'IoT Hardware',
  });

  const mockProduct = {
    id: 'prod-uuid-1',
    productCode: 'PRD-APEX-001',
    serialNumber: 'SN-APEX-001',
    name: 'Smart Sensor Node',
    category: 'IoT Hardware',
    description: 'Precision temperature & humidity sensor',
    status: ProductStatus.RECEIVED,
    manufacturerId: mockManufacturerOrg.id,
    manufacturer: mockManufacturerOrg,
    currentOwnerId: mockDistributorOrg.id,
    currentOwner: mockDistributorOrg,
    blockchainProductId: '1',
    productHash: expectedHash,
    blockchainTxHash: '0xregtx1234567890abcdef',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-05T12:00:00Z'),
    qualityChecks: [
      {
        id: 'qc-1',
        productId: 'prod-uuid-1',
        organizationId: mockAuditorOrg.id,
        organization: mockAuditorOrg,
        inspectorName: 'Dr. Jane Smith',
        result: QualityCheckResult.PASSED,
        notes: 'Calibration standards passed (ISO 9001:2015)',
        blockchainTxHash: '0xqctx9876543210abcdef',
        createdAt: new Date('2026-01-02T14:30:00Z'),
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
        origin: 'Bangkok High-Tech Zone',
        destination: 'Chiang Mai Distribution Hub',
        status: ShipmentStatus.DELIVERED,
        shippedAt: new Date('2026-01-03T08:00:00Z'),
        receivedAt: new Date('2026-01-04T16:00:00Z'),
        blockchainTxHash: '0xshptx5555555555abcdef',
        createdAt: new Date('2026-01-02T16:00:00Z'),
        updatedAt: new Date('2026-01-04T16:00:00Z'),
      },
    ],
    blockchainTransactions: [
      {
        id: 'tx-1',
        txHash: '0xregtx1234567890abcdef',
        eventType: 'PRODUCT_REGISTERED',
        createdAt: new Date('2026-01-01T10:00:00Z'),
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn().mockResolvedValue(mockProduct),
        findMany: jest.fn().mockResolvedValue([mockProduct]),
      },
    };

    blockchain = {
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
      ]),
      getContractAddress: jest
        .fn()
        .mockReturnValue('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraceabilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<TraceabilityService>(TraceabilityService);
  });

  describe('getTraceability', () => {
    it('throws NotFoundException when identifier is empty', async () => {
      await expect(
        service.getTraceability('', { role: UserRole.SUPER_ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when product does not exist', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.getTraceability('NON-EXISTENT', { role: UserRole.SUPER_ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('denies access to unauthorized third party organization', async () => {
      const unauthorizedUser = {
        id: 'user-unrelated',
        role: UserRole.ORG_ADMIN,
        organizationId: mockUnrelatedOrg.id,
        organization: mockUnrelatedOrg,
      };

      await expect(
        service.getTraceability('PRD-APEX-001', unauthorizedUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows access to SUPER_ADMIN', async () => {
      const superAdminUser = { id: 'admin-1', role: UserRole.SUPER_ADMIN };
      const result = await service.getTraceability('PRD-APEX-001', superAdminUser);
      expect(result).toBeDefined();
      expect(result.product.productCode).toBe('PRD-APEX-001');
    });

    it('allows access to AUDITOR user or auditor organization', async () => {
      const auditorUser = {
        id: 'auditor-1',
        role: UserRole.AUDITOR,
        organizationId: mockAuditorOrg.id,
        organization: mockAuditorOrg,
      };
      const result = await service.getTraceability('PRD-APEX-001', auditorUser);
      expect(result).toBeDefined();
      expect(result.product.productCode).toBe('PRD-APEX-001');
    });

    it('allows access to current owner and original manufacturer', async () => {
      const ownerUser = {
        id: 'owner-1',
        role: UserRole.DISTRIBUTOR,
        organizationId: mockDistributorOrg.id,
        organization: mockDistributorOrg,
      };
      const result = await service.getTraceability('PRD-APEX-001', ownerUser);
      expect(result.currentOwner.id).toBe(mockDistributorOrg.id);

      const mfgUser = {
        id: 'mfg-1',
        role: UserRole.MANUFACTURER,
        organizationId: mockManufacturerOrg.id,
        organization: mockManufacturerOrg,
      };
      const mfgResult = await service.getTraceability('PRD-APEX-001', mfgUser);
      expect(mfgResult.manufacturer.id).toBe(mockManufacturerOrg.id);
    });

    it('allows access to shipment carrier', async () => {
      const carrierUser = {
        id: 'carrier-1',
        role: UserRole.LOGISTICS,
        organizationId: mockCarrierOrg.id,
        organization: mockCarrierOrg,
      };
      const result = await service.getTraceability('PRD-APEX-001', carrierUser);
      expect(result).toBeDefined();
    });

    it('constructs chronological events timeline with all lifecycle milestones', async () => {
      const result = await service.getTraceability('PRD-APEX-001', {
        role: UserRole.SUPER_ADMIN,
      });

      expect(result.events.length).toBeGreaterThanOrEqual(4);
      // Event types check
      const eventTypes = result.events.map((e) => e.eventType);
      expect(eventTypes).toContain('PRODUCT_REGISTERED');
      expect(eventTypes).toContain('QUALITY_CHECKED');
      expect(eventTypes).toContain('SHIPMENT_CREATED');
      expect(eventTypes).toContain('PRODUCT_SHIPPED');
      expect(eventTypes).toContain('PRODUCT_RECEIVED');

      // Verify chronological order
      for (let i = 0; i < result.events.length - 1; i++) {
        const t1 = new Date(result.events[i].timestamp).getTime();
        const t2 = new Date(result.events[i + 1].timestamp).getTime();
        expect(t1).toBeLessThanOrEqual(t2);
      }
    });

    it('constructs ownership provenance chain correctly', async () => {
      const result = await service.getTraceability('PRD-APEX-001', {
        role: UserRole.SUPER_ADMIN,
      });

      expect(result.ownershipHistory).toHaveLength(2);
      // 1. Initial manufacturer
      expect(result.ownershipHistory[0].organizationId).toBe(mockManufacturerOrg.id);
      expect(result.ownershipHistory[0].isCurrentOwner).toBe(false);

      // 2. Transferred receiver
      expect(result.ownershipHistory[1].organizationId).toBe(mockDistributorOrg.id);
      expect(result.ownershipHistory[1].isCurrentOwner).toBe(true);
    });

    it('verifies deterministic on-chain hash and blockchain contract status', async () => {
      const result = await service.getTraceability('PRD-APEX-001', {
        role: UserRole.SUPER_ADMIN,
      });

      expect(result.blockchainVerification).toBeDefined();
      expect(result.blockchainVerification.verified).toBe(true);
      expect(result.blockchainVerification.hashMatch).toBe(true);
      expect(result.blockchainVerification.contractAddress).toBe(
        '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      );
      expect(result.blockchainVerification.computedHash).toBe(expectedHash);
      expect(result.blockchainVerification.onChainProductId).toBe(1);
    });

    it('handles blockchain query failures gracefully without crashing', async () => {
      blockchain.getProduct.mockRejectedValue(new Error('RPC Provider Error'));
      blockchain.getProductHistory.mockRejectedValue(new Error('RPC Provider Error'));

      const result = await service.getTraceability('PRD-APEX-001', {
        role: UserRole.SUPER_ADMIN,
      });

      expect(result).toBeDefined();
      expect(result.product.productCode).toBe('PRD-APEX-001');
      expect(result.blockchainVerification.hashMatch).toBe(false);
    });
  });

  describe('search', () => {
    it('applies multi-tenant filters for non-admin users', async () => {
      const mfgUser = {
        id: 'user-mfg',
        role: UserRole.MANUFACTURER,
        organizationId: mockManufacturerOrg.id,
      };

      await service.search({ search: 'Sensor' }, mfgUser);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { manufacturerId: mockManufacturerOrg.id },
              { currentOwnerId: mockManufacturerOrg.id },
            ]),
          }),
        }),
      );
    });

    it('does not restrict organization filters for SUPER_ADMIN', async () => {
      const adminUser = { role: UserRole.SUPER_ADMIN };
      await service.search({ search: 'Sensor' }, adminUser);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            OR: expect.arrayContaining([{ manufacturerId: expect.anything() }]),
          }),
        }),
      );
    });
  });
});
