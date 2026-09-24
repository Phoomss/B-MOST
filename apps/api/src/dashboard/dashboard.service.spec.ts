import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import {
  ProductStatus,
  ShipmentStatus,
  TxStatus,
  UserRole,
  OrganizationType,
} from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;
  let blockchainService: any;

  const mockAdminUser = {
    id: 'user-admin-1',
    email: 'admin@bmost.io',
    role: UserRole.SUPER_ADMIN,
    organizationId: null,
  };

  const mockMfgUser = {
    id: 'user-mfg-1',
    email: 'mfg@acme.com',
    role: UserRole.MANUFACTURER,
    organizationId: 'org-mfg-1',
  };

  beforeEach(async () => {
    prisma = {
      product: {
        count: jest.fn().mockImplementation(({ where }) => {
          if (where?.status?.in?.includes(ProductStatus.SHIPPED))
            return Promise.resolve(5);
          if (where?.status?.in?.includes(ProductStatus.RECEIVED))
            return Promise.resolve(10);
          if (where?.status === ProductStatus.SOLD) return Promise.resolve(3);
          if (where?.status === ProductStatus.RECALLED)
            return Promise.resolve(1);
          if (where?.status === ProductStatus.REGISTERED)
            return Promise.resolve(8);
          if (where?.status === ProductStatus.QUALITY_CHECKED)
            return Promise.resolve(4);
          if (where?.status === ProductStatus.IN_TRANSIT)
            return Promise.resolve(3);
          return Promise.resolve(25); // totalProducts
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p-1',
            productCode: 'PRD-001',
            name: 'Microcontroller',
            createdAt: new Date('2026-09-24T10:00:00Z'),
            manufacturer: { name: 'Acme Corp' },
            blockchainTxHash: '0xhash1',
          },
        ]),
      },
      shipment: {
        count: jest.fn().mockImplementation(({ where }) => {
          if (where?.status?.in) return Promise.resolve(4); // active shipments
          if (where?.status === ShipmentStatus.DELIVERED)
            return Promise.resolve(12);
          if (where?.status === ShipmentStatus.PENDING)
            return Promise.resolve(2);
          if (where?.status === ShipmentStatus.SHIPPED)
            return Promise.resolve(1);
          if (where?.status === ShipmentStatus.IN_TRANSIT)
            return Promise.resolve(1);
          if (where?.status === ShipmentStatus.CANCELLED)
            return Promise.resolve(0);
          return Promise.resolve(16);
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 's-1',
            shipmentCode: 'SHP-001',
            status: ShipmentStatus.IN_TRANSIT,
            createdAt: new Date('2026-09-24T09:00:00Z'),
            shippedAt: new Date('2026-09-24T09:30:00Z'),
            receivedAt: null,
            sender: { name: 'Acme Corp' },
            receiver: { name: 'Distro Hub' },
            product: { productCode: 'PRD-001' },
            blockchainTxHash: '0xhash2',
          },
        ]),
      },
      organization: {
        count: jest.fn().mockImplementation(({ where }) => {
          if (where?.type === OrganizationType.MANUFACTURER)
            return Promise.resolve(4);
          if (where?.type === OrganizationType.DISTRIBUTOR)
            return Promise.resolve(3);
          if (where?.type === OrganizationType.LOGISTICS)
            return Promise.resolve(2);
          if (where?.type === OrganizationType.RETAILER)
            return Promise.resolve(5);
          if (where?.type === OrganizationType.AUDITOR)
            return Promise.resolve(1);
          return Promise.resolve(15);
        }),
      },
      blockchainTransaction: {
        count: jest.fn().mockImplementation((args) => {
          const where = args?.where;
          if (where?.status === TxStatus.CONFIRMED) return Promise.resolve(30);
          if (where?.status === TxStatus.PENDING) return Promise.resolve(2);
          if (where?.status === TxStatus.FAILED) return Promise.resolve(0);
          if (where?.createdAt?.gte) return Promise.resolve(4);
          return Promise.resolve(32); // total txs
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'tx-1',
            txHash: '0x123abc',
            eventType: 'ProductRegistered',
            status: TxStatus.CONFIRMED,
            blockNumber: 100,
            createdAt: new Date('2026-09-24T10:05:00Z'),
          },
        ]),
      },
      qualityCheck: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'qc-1',
            result: 'PASSED',
            inspectorName: 'Inspector Alice',
            createdAt: new Date('2026-09-24T09:15:00Z'),
            organization: { name: 'Quality Lab' },
            product: { productCode: 'PRD-001', name: 'Microcontroller' },
            blockchainTxHash: '0xhash3',
          },
        ]),
      },
    };

    blockchainService = {
      getContractAddress: jest.fn().mockReturnValue('0xContractAddress123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchainService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getStatistics', () => {
    it('returns platform-wide metrics for SUPER_ADMIN', async () => {
      const stats = await service.getStatistics(mockAdminUser);

      expect(stats.totalProducts).toBe(25);
      expect(stats.inTransit).toBe(5);
      expect(stats.received).toBe(10);
      expect(stats.sold).toBe(3);
      expect(stats.recalled).toBe(1);
      expect(stats.activeShipments).toBe(4);
      expect(stats.blockchainTransactions).toBe(32);
    });

    it('returns organization-scoped metrics for regular organization user', async () => {
      const stats = await service.getStatistics(mockMfgUser);

      expect(prisma.product.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { manufacturerId: 'org-mfg-1' },
              { currentOwnerId: 'org-mfg-1' },
            ],
          }),
        }),
      );
      expect(stats.totalProducts).toBeDefined();
      expect(stats.activeShipments).toBeDefined();
    });

    it('works for unauthenticated public visitor returning platform metrics', async () => {
      const stats = await service.getStatistics(null);

      expect(stats.totalProducts).toBe(25);
      expect(stats.blockchainTransactions).toBe(32);
    });
  });

  describe('getCharts', () => {
    it('returns complete charts data structure', async () => {
      const charts = await service.getCharts(mockAdminUser);

      expect(charts.productStatus).toBeInstanceOf(Array);
      expect(charts.productStatus.length).toBeGreaterThan(0);
      expect(charts.productStatus[0]).toHaveProperty('status');
      expect(charts.productStatus[0]).toHaveProperty('percentage');

      expect(charts.shipmentActivity).toBeInstanceOf(Array);
      expect(charts.shipmentActivity.length).toBe(5);

      expect(charts.organizationActivity).toBeInstanceOf(Array);
      expect(charts.organizationActivity.length).toBe(5);

      expect(charts.blockchainActivity).toBeDefined();
      expect(charts.blockchainActivity.totalTransactions).toBe(32);
      expect(charts.blockchainActivity.confirmedTransactions).toBe(30);
      expect(charts.blockchainActivity.recentTransactions).toBeInstanceOf(
        Array,
      );
      expect(charts.blockchainActivity.dailyTrend).toBeInstanceOf(Array);
      expect(charts.blockchainActivity.dailyTrend.length).toBe(7);
    });
  });

  describe('getRecentActivity', () => {
    it('returns combined, chronologically sorted activity feed', async () => {
      const activity = await service.getRecentActivity(mockAdminUser);

      expect(activity).toBeInstanceOf(Array);
      expect(activity.length).toBeGreaterThan(0);
      expect(activity[0]).toHaveProperty('type');
      expect(activity[0]).toHaveProperty('title');
      expect(activity[0]).toHaveProperty('timestamp');
      expect(activity[0]).toHaveProperty('badgeColor');

      // Check sorting descending
      for (let i = 0; i < activity.length - 1; i++) {
        const t1 = new Date(activity[i].timestamp).getTime();
        const t2 = new Date(activity[i + 1].timestamp).getTime();
        expect(t1).toBeGreaterThanOrEqual(t2);
      }
    });
  });
});
