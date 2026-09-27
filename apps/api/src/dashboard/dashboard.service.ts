import { Injectable, Logger } from '@nestjs/common';
import {
  ProductStatus,
  ShipmentStatus,
  TxStatus,
  UserRole,
  OrganizationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import {
  DashboardStatisticsResponseDto,
  DashboardChartsResponseDto,
  RecentActivityItem,
} from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Helper to build multi-tenant scoping where-clauses based on the current user's role and organization.
   */
  private getScoping(currentUser?: any) {
    const isGlobal =
      !currentUser ||
      !currentUser.organizationId ||
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.AUDITOR;

    const orgId = currentUser?.organizationId;

    const productWhere = isGlobal
      ? {}
      : {
          OR: [{ manufacturerId: orgId }, { currentOwnerId: orgId }],
        };

    const shipmentWhere = isGlobal
      ? {}
      : {
          OR: [
            { senderOrganizationId: orgId },
            { receiverOrganizationId: orgId },
            { carrierOrganizationId: orgId },
          ],
        };

    return { isGlobal, orgId, productWhere, shipmentWhere };
  }

  /**
   * Returns exact metrics defined in docs/API.md Section 12 (GET /dashboard/statistics).
   * All metrics are strictly calculated from real database records.
   */
  async getStatistics(
    currentUser?: any,
  ): Promise<DashboardStatisticsResponseDto> {
    const { productWhere, shipmentWhere, isGlobal, orgId } =
      this.getScoping(currentUser);

    const [
      totalProducts,
      inTransit,
      received,
      sold,
      recalled,
      activeShipments,
      blockchainTransactions,
    ] = await Promise.all([
      // 1. Total products
      this.prisma.product.count({ where: productWhere }),

      // 2. In Transit products
      this.prisma.product.count({
        where: {
          ...productWhere,
          status: { in: [ProductStatus.SHIPPED, ProductStatus.IN_TRANSIT] },
        },
      }),

      // 3. Received / Stored products
      this.prisma.product.count({
        where: {
          ...productWhere,
          status: { in: [ProductStatus.RECEIVED, ProductStatus.STORED] },
        },
      }),

      // 4. Sold products
      this.prisma.product.count({
        where: {
          ...productWhere,
          status: ProductStatus.SOLD,
        },
      }),

      // 5. Recalled products
      this.prisma.product.count({
        where: {
          ...productWhere,
          status: ProductStatus.RECALLED,
        },
      }),

      // 6. Active shipments (PENDING, SHIPPED, IN_TRANSIT)
      this.prisma.shipment.count({
        where: {
          ...shipmentWhere,
          status: {
            in: [
              ShipmentStatus.PENDING,
              ShipmentStatus.SHIPPED,
              ShipmentStatus.IN_TRANSIT,
            ],
          },
        },
      }),

      // 7. Blockchain transactions
      isGlobal
        ? this.prisma.blockchainTransaction.count({ where: {} })
        : this.prisma.blockchainTransaction.count({
            where: {
              product: {
                OR: [{ manufacturerId: orgId }, { currentOwnerId: orgId }],
              },
            },
          }),
    ]);

    return {
      totalProducts,
      inTransit,
      received,
      sold,
      recalled,
      activeShipments,
      blockchainTransactions,
    };
  }

  /**
   * Returns analytics and distribution charts data for product status, shipment activity,
   * organization ecosystem, and blockchain activity.
   */
  async getCharts(currentUser?: any): Promise<DashboardChartsResponseDto> {
    const { productWhere, shipmentWhere, isGlobal, orgId } =
      this.getScoping(currentUser);

    // 1. Query Product Status breakdown
    const productStatuses = [
      ProductStatus.REGISTERED,
      ProductStatus.QUALITY_CHECKED,
      ProductStatus.SHIPPED,
      ProductStatus.IN_TRANSIT,
      ProductStatus.RECEIVED,
      ProductStatus.SOLD,
      ProductStatus.RECALLED,
    ];

    const productCountsByStatus = await Promise.all(
      productStatuses.map((status) =>
        this.prisma.product.count({
          where: { ...productWhere, status },
        }),
      ),
    );

    const totalProducts = productCountsByStatus.reduce((acc, c) => acc + c, 0);

    const statusLabels: Record<string, string> = {
      REGISTERED: 'Registered',
      QUALITY_CHECKED: 'Quality Passed',
      READY_TO_SHIP: 'Ready to Ship',
      SHIPPED: 'Shipped',
      IN_TRANSIT: 'In Transit',
      RECEIVED: 'Received',
      STORED: 'Stored',
      SOLD: 'Sold to Consumer',
      RECALLED: 'Recalled',
    };

    const productStatus = productStatuses.map((status, index) => {
      const count = productCountsByStatus[index];
      const percentage =
        totalProducts > 0 ? Math.round((count / totalProducts) * 1000) / 10 : 0;
      return {
        status,
        count,
        label: statusLabels[status] || status,
        percentage,
      };
    });

    // 2. Query Shipment Status breakdown
    const shipmentStatuses = [
      ShipmentStatus.PENDING,
      ShipmentStatus.SHIPPED,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.DELIVERED,
      ShipmentStatus.CANCELLED,
    ];

    const shipmentCountsByStatus = await Promise.all(
      shipmentStatuses.map((status) =>
        this.prisma.shipment.count({
          where: { ...shipmentWhere, status },
        }),
      ),
    );

    const totalShipments = shipmentCountsByStatus.reduce(
      (acc, c) => acc + c,
      0,
    );

    const shipmentLabels: Record<string, string> = {
      PENDING: 'Pending Dispatch',
      SHIPPED: 'Dispatched',
      IN_TRANSIT: 'In Transit',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };

    const shipmentActivity = shipmentStatuses.map((status, index) => {
      const count = shipmentCountsByStatus[index];
      const percentage =
        totalShipments > 0
          ? Math.round((count / totalShipments) * 1000) / 10
          : 0;
      return {
        status,
        count,
        label: shipmentLabels[status] || status,
        percentage,
      };
    });

    // 3. Organization Activity breakdown
    const orgTypes = [
      OrganizationType.MANUFACTURER,
      OrganizationType.DISTRIBUTOR,
      OrganizationType.LOGISTICS,
      OrganizationType.RETAILER,
      OrganizationType.AUDITOR,
    ];

    const orgCountsByType = await Promise.all(
      orgTypes.map((type) =>
        this.prisma.organization.count({
          where: { type },
        }),
      ),
    );

    const orgTypeLabels: Record<string, string> = {
      MANUFACTURER: 'Manufacturers',
      DISTRIBUTOR: 'Distributors',
      LOGISTICS: 'Logistics & Carriers',
      RETAILER: 'Retailers',
      AUDITOR: 'Auditors & Inspectors',
    };

    const organizationActivity = orgTypes.map((type, index) => ({
      type,
      count: orgCountsByType[index],
      label: orgTypeLabels[type] || type,
    }));

    // 4. Blockchain Activity metrics
    const txWhere = isGlobal
      ? {}
      : {
          product: {
            OR: [{ manufacturerId: orgId }, { currentOwnerId: orgId }],
          },
        };

    const [
      totalTransactions,
      confirmedTransactions,
      pendingTransactions,
      failedTransactions,
      recentTxList,
    ] = await Promise.all([
      this.prisma.blockchainTransaction.count({ where: txWhere }),
      this.prisma.blockchainTransaction.count({
        where: { ...txWhere, status: TxStatus.CONFIRMED },
      }),
      this.prisma.blockchainTransaction.count({
        where: { ...txWhere, status: TxStatus.PENDING },
      }),
      this.prisma.blockchainTransaction.count({
        where: { ...txWhere, status: TxStatus.FAILED },
      }),
      this.prisma.blockchainTransaction.findMany({
        where: txWhere,
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          txHash: true,
          eventType: true,
          status: true,
          blockNumber: true,
          createdAt: true,
        },
      }),
    ]);

    // Build daily trend for past 7 days
    const dailyTrend: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const count = await this.prisma.blockchainTransaction.count({
        where: {
          ...txWhere,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      dailyTrend.push({ date: dateStr, count });
    }

    const recentTransactions = recentTxList.map((tx) => ({
      id: tx.id,
      txHash: tx.txHash,
      eventType: tx.eventType,
      status: tx.status,
      blockNumber: tx.blockNumber ? tx.blockNumber.toString() : null,
      createdAt: tx.createdAt.toISOString(),
    }));

    return {
      productStatus,
      shipmentActivity,
      organizationActivity,
      blockchainActivity: {
        totalTransactions,
        confirmedTransactions,
        pendingTransactions,
        failedTransactions,
        recentTransactions,
        dailyTrend,
      },
    };
  }

  /**
   * Retrieves a combined stream of latest supply chain activities
   * (products created, quality checks conducted, shipments dispatched/delivered, blockchain txs).
   */
  async getRecentActivity(currentUser?: any): Promise<RecentActivityItem[]> {
    const { productWhere, shipmentWhere } = this.getScoping(currentUser);

    const [recentProducts, recentQualityChecks, recentShipments] =
      await Promise.all([
        this.prisma.product.findMany({
          where: productWhere,
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { manufacturer: { select: { name: true } } },
        }),
        this.prisma.qualityCheck.findMany({
          where: currentUser?.organizationId
            ? { organizationId: currentUser.organizationId }
            : {},
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            organization: { select: { name: true } },
            product: { select: { productCode: true, name: true } },
          },
        }),
        this.prisma.shipment.findMany({
          where: shipmentWhere,
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            sender: { select: { name: true } },
            receiver: { select: { name: true } },
            product: { select: { productCode: true } },
          },
        }),
      ]);

    const activity: RecentActivityItem[] = [];

    // Products
    for (const p of recentProducts) {
      activity.push({
        id: `prod-${p.id}`,
        type: 'PRODUCT_CREATED',
        title: `Product Registered: ${p.productCode}`,
        description: `${p.name} created by ${p.manufacturer.name}`,
        timestamp: p.createdAt.toISOString(),
        actor: p.manufacturer.name,
        organizationName: p.manufacturer.name,
        blockchainTxHash: p.blockchainTxHash,
        badgeColor: 'blue',
      });
    }

    // Quality Checks
    for (const qc of recentQualityChecks) {
      const isPassed = qc.result === 'PASSED';
      activity.push({
        id: `qc-${qc.id}`,
        type: 'QUALITY_CHECK',
        title: `Quality Check ${qc.result}: ${qc.product.productCode}`,
        description: `Inspected by ${qc.inspectorName} (${qc.organization.name})`,
        timestamp: qc.createdAt.toISOString(),
        actor: qc.inspectorName,
        organizationName: qc.organization.name,
        blockchainTxHash: qc.blockchainTxHash,
        badgeColor: isPassed ? 'emerald' : 'rose',
      });
    }

    // Shipments
    for (const s of recentShipments) {
      activity.push({
        id: `shp-${s.id}`,
        type: 'SHIPMENT_UPDATE',
        title: `Shipment ${s.shipmentCode}: ${s.status}`,
        description: `From ${s.sender.name} to ${s.receiver.name}`,
        timestamp: (s.receivedAt || s.shippedAt || s.createdAt).toISOString(),
        actor: s.sender.name,
        organizationName: s.sender.name,
        blockchainTxHash: s.blockchainTxHash,
        badgeColor:
          s.status === ShipmentStatus.DELIVERED ? 'emerald' : 'purple',
      });
    }

    // Sort descending by timestamp
    activity.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return activity.slice(0, 10);
  }
}
