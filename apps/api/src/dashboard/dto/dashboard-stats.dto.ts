import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatisticsResponseDto {
  @ApiProperty({ example: 42, description: 'Total products registered in the supply chain' })
  totalProducts: number;

  @ApiProperty({ example: 8, description: 'Total products currently in transit' })
  inTransit: number;

  @ApiProperty({ example: 25, description: 'Total products received / stored' })
  received: number;

  @ApiProperty({ example: 7, description: 'Total products sold to end consumers' })
  sold: number;

  @ApiProperty({ example: 2, description: 'Total products recalled' })
  recalled: number;

  @ApiProperty({ example: 6, description: 'Active shipments currently pending or in transit' })
  activeShipments: number;

  @ApiProperty({ example: 95, description: 'Total blockchain transactions indexed' })
  blockchainTransactions: number;
}

export class ProductStatusMetric {
  @ApiProperty({ example: 'REGISTERED' })
  status: string;

  @ApiProperty({ example: 12 })
  count: number;

  @ApiProperty({ example: 'Registered' })
  label: string;

  @ApiProperty({ example: 28.5 })
  percentage: number;
}

export class ShipmentStatusMetric {
  @ApiProperty({ example: 'IN_TRANSIT' })
  status: string;

  @ApiProperty({ example: 4 })
  count: number;

  @ApiProperty({ example: 'In Transit' })
  label: string;

  @ApiProperty({ example: 25 })
  percentage: number;
}

export class OrganizationTypeMetric {
  @ApiProperty({ example: 'MANUFACTURER' })
  type: string;

  @ApiProperty({ example: 5 })
  count: number;

  @ApiProperty({ example: 'Manufacturers' })
  label: string;
}

export class DailyTransactionMetric {
  @ApiProperty({ example: '2026-09-24' })
  date: string;

  @ApiProperty({ example: 14 })
  count: number;
}

export class RecentTransactionMetric {
  @ApiProperty({ example: 'tx-uuid' })
  id: string;

  @ApiProperty({ example: '0x123abc...' })
  txHash: string;

  @ApiProperty({ example: 'ProductRegistered', required: false })
  eventType?: string | null;

  @ApiProperty({ example: 'CONFIRMED' })
  status: string;

  @ApiProperty({ example: 1045, required: false })
  blockNumber?: number | string | null;

  @ApiProperty({ example: '2026-09-24T10:00:00.000Z' })
  createdAt: string;
}

export class BlockchainActivityMetrics {
  @ApiProperty({ example: 95 })
  totalTransactions: number;

  @ApiProperty({ example: 92 })
  confirmedTransactions: number;

  @ApiProperty({ example: 3 })
  pendingTransactions: number;

  @ApiProperty({ example: 0 })
  failedTransactions: number;

  @ApiProperty({ type: [RecentTransactionMetric] })
  recentTransactions: RecentTransactionMetric[];

  @ApiProperty({ type: [DailyTransactionMetric] })
  dailyTrend: DailyTransactionMetric[];
}

export class DashboardChartsResponseDto {
  @ApiProperty({ type: [ProductStatusMetric] })
  productStatus: ProductStatusMetric[];

  @ApiProperty({ type: [ShipmentStatusMetric] })
  shipmentActivity: ShipmentStatusMetric[];

  @ApiProperty({ type: [OrganizationTypeMetric] })
  organizationActivity: OrganizationTypeMetric[];

  @ApiProperty({ type: BlockchainActivityMetrics })
  blockchainActivity: BlockchainActivityMetrics;
}

export class RecentActivityItem {
  @ApiProperty({ example: 'act-1' })
  id: string;

  @ApiProperty({ example: 'PRODUCT_CREATED', enum: ['PRODUCT_CREATED', 'QUALITY_CHECK', 'SHIPMENT_UPDATE', 'BLOCKCHAIN_TX'] })
  type: 'PRODUCT_CREATED' | 'QUALITY_CHECK' | 'SHIPMENT_UPDATE' | 'BLOCKCHAIN_TX';

  @ApiProperty({ example: 'Product Registered: PRD-2026-0001' })
  title: string;

  @ApiProperty({ example: 'Registered by Acme Electronics' })
  description: string;

  @ApiProperty({ example: '2026-09-24T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 'Acme Electronics', required: false })
  actor?: string;

  @ApiProperty({ example: 'Acme Electronics', required: false })
  organizationName?: string;

  @ApiProperty({ example: '0xabc...', required: false })
  blockchainTxHash?: string | null;

  @ApiProperty({ example: 'blue', enum: ['blue', 'emerald', 'amber', 'purple', 'rose', 'slate'] })
  badgeColor: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
}
