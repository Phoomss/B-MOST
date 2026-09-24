import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole, OrganizationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { generateProductHash } from '../products/utils/product-hash.util';
import { TraceabilityQueryDto } from './dto/traceability-query.dto';

// Polyfill BigInt serialization
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

function sanitizeBigInt(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return data.toString();
  if (Array.isArray(data)) return data.map(sanitizeBigInt);
  if (typeof data === 'object') {
    const res: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      res[key] = sanitizeBigInt(data[key]);
    }
    return res;
  }
  return data;
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description: string;
  actor: string;
  actorRole?: string;
  organizationName?: string;
  timestamp: string | number;
  blockNumber?: number | string | null;
  blockchainTxHash?: string | null;
  metadata?: Record<string, any>;
  badgeColor?: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple' | 'slate';
}

export interface OwnershipRecord {
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  organizationType: string;
  walletAddress?: string | null;
  acquiredAt: string;
  eventDescription: string;
  txHash?: string | null;
  isCurrentOwner: boolean;
}

@Injectable()
export class TraceabilityService {
  private readonly logger = new Logger(TraceabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Retrieves complete end-to-end traceability history for a product.
   * Matches specification in docs/API.md Section 8 (GET /traceability/:productCode).
   */
  async getTraceability(identifier: string, currentUser: any) {
    if (!identifier?.trim()) {
      throw new NotFoundException('Product identifier is required');
    }

    const cleanIdentifier = identifier.trim();

    // 1. Find product by code, serialNumber, or UUID
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { productCode: cleanIdentifier },
          { serialNumber: cleanIdentifier },
          { id: cleanIdentifier },
        ],
      },
      include: {
        manufacturer: true,
        currentOwner: true,
        qualityChecks: {
          orderBy: { createdAt: 'asc' },
          include: { organization: true },
        },
        shipments: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: true,
            receiver: true,
            carrier: true,
          },
        },
        blockchainTransactions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with identifier '${cleanIdentifier}' not found in traceability registry`,
      );
    }

    // 2. Multi-tenant access verification
    this.assertTraceabilityAccess(product, currentUser);

    // 3. Query Authoritative Smart Contract State & Events
    let onChainData: any = null;
    let onChainEvents: any[] = [];
    let hashMatch = false;
    let computedHash = '';

    computedHash = generateProductHash({
      productCode: product.productCode,
      serialNumber: product.serialNumber,
      manufacturerId: product.manufacturerId,
      name: product.name,
      category: product.category || undefined,
    });

    if (product.blockchainProductId) {
      const onChainId = BigInt(product.blockchainProductId);
      try {
        const [liveProduct, historyEvents] = await Promise.all([
          this.blockchainService.getProduct(onChainId).catch(() => null),
          this.blockchainService.getProductHistory(onChainId).catch(() => []),
        ]);

        onChainData = liveProduct;
        onChainEvents = historyEvents || [];

        if (liveProduct?.productHash) {
          hashMatch =
            liveProduct.productHash.toLowerCase() === computedHash.toLowerCase();
        }
      } catch (err: any) {
        this.logger.warn(
          `On-chain query failed for product ID ${product.blockchainProductId}: ${err.message}`,
        );
      }
    }

    // 4. Construct Unified Chronological Event Timeline
    const timeline: TimelineEvent[] = [];

    // Milestone A: Product Registered
    timeline.push({
      id: `reg-${product.id}`,
      eventType: 'PRODUCT_REGISTERED',
      title: 'Product Registered in Supply Chain Registry',
      description: `Product minted by ${product.manufacturer.name} with serial number ${product.serialNumber}.`,
      actor: product.manufacturer.name,
      actorRole: 'MANUFACTURER',
      organizationName: product.manufacturer.name,
      timestamp: product.createdAt.toISOString(),
      blockNumber: null,
      blockchainTxHash: product.blockchainTxHash || null,
      metadata: {
        productCode: product.productCode,
        serialNumber: product.serialNumber,
        category: product.category,
        productHash: computedHash,
      },
      badgeColor: 'blue',
    });

    // Milestone B: Quality Checks
    for (const qc of product.qualityChecks) {
      const isPassed = qc.result === 'PASSED';
      timeline.push({
        id: `qc-${qc.id}`,
        eventType: 'QUALITY_CHECKED',
        title: `Quality Inspection: ${qc.result}`,
        description: qc.notes || (isPassed ? 'Inspection benchmarks satisfied.' : 'Defects identified.'),
        actor: qc.inspectorName,
        actorRole: 'AUDITOR',
        organizationName: qc.organization.name,
        timestamp: qc.createdAt.toISOString(),
        blockchainTxHash: qc.blockchainTxHash,
        metadata: {
          verdict: qc.result,
          passed: isPassed,
          inspector: qc.inspectorName,
        },
        badgeColor: isPassed ? 'emerald' : 'rose',
      });
    }

    // Milestone C: Shipments (Created, Shipped, Received)
    for (const shp of product.shipments) {
      // 1. Shipment Created
      timeline.push({
        id: `shp-created-${shp.id}`,
        eventType: 'SHIPMENT_CREATED',
        title: `Shipment Created: ${shp.shipmentCode}`,
        description: `Shipment route prepared from ${shp.origin} to ${shp.destination}.`,
        actor: shp.sender.name,
        actorRole: 'SENDER',
        organizationName: shp.sender.name,
        timestamp: shp.createdAt.toISOString(),
        blockchainTxHash: shp.blockchainTxHash,
        metadata: {
          shipmentCode: shp.shipmentCode,
          origin: shp.origin,
          destination: shp.destination,
          carrier: shp.carrier?.name || 'Self-delivery',
        },
        badgeColor: 'amber',
      });

      // 2. Product Shipped
      if (shp.shippedAt) {
        timeline.push({
          id: `shp-dispatched-${shp.id}`,
          eventType: 'PRODUCT_SHIPPED',
          title: `Product Dispatched in Transit`,
          description: `Cargo picked up by ${shp.carrier?.name || shp.sender.name} heading to ${shp.destination}.`,
          actor: shp.carrier?.name || shp.sender.name,
          actorRole: 'CARRIER',
          organizationName: shp.carrier?.name || shp.sender.name,
          timestamp: shp.shippedAt.toISOString(),
          metadata: {
            shipmentCode: shp.shipmentCode,
            status: shp.status,
          },
          badgeColor: 'purple',
        });
      }

      // 3. Product Received & Ownership Transferred
      if (shp.receivedAt) {
        timeline.push({
          id: `shp-received-${shp.id}`,
          eventType: 'PRODUCT_RECEIVED',
          title: `Product Delivered & Custody Transferred`,
          description: `Consignment accepted at ${shp.destination}. Ownership transferred to ${shp.receiver.name}.`,
          actor: shp.receiver.name,
          actorRole: 'RECEIVER',
          organizationName: shp.receiver.name,
          timestamp: shp.receivedAt.toISOString(),
          metadata: {
            shipmentCode: shp.shipmentCode,
            newOwner: shp.receiver.name,
          },
          badgeColor: 'emerald',
        });
      }
    }

    // Milestone D: Terminal States (Recalled or Sold)
    if (product.status === 'RECALLED') {
      timeline.push({
        id: `recalled-${product.id}`,
        eventType: 'PRODUCT_RECALLED',
        title: 'Product Recalled',
        description: 'Product has been recalled from circulation. Supply chain operations locked.',
        actor: 'Compliance & Quality Control',
        timestamp: product.updatedAt.toISOString(),
        badgeColor: 'rose',
      });
    } else if (product.status === 'SOLD') {
      timeline.push({
        id: `sold-${product.id}`,
        eventType: 'PRODUCT_SOLD',
        title: 'Product Sold to Consumer',
        description: 'Product marked as sold at retail endpoint.',
        actor: product.currentOwner.name,
        timestamp: product.updatedAt.toISOString(),
        badgeColor: 'emerald',
      });
    }

    // Sort timeline chronologically (earliest to latest)
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 5. Construct Ownership History Chain
    const ownershipHistory: OwnershipRecord[] = [];

    // Initial owner: Manufacturer
    ownershipHistory.push({
      organizationId: product.manufacturer.id,
      organizationName: product.manufacturer.name,
      organizationCode: product.manufacturer.code,
      organizationType: product.manufacturer.type,
      walletAddress: product.manufacturer.walletAddress,
      acquiredAt: product.createdAt.toISOString(),
      eventDescription: 'Original Manufacturer (Product Registration)',
      txHash: product.blockchainTxHash,
      isCurrentOwner: product.currentOwnerId === product.manufacturerId,
    });

    // Subsequent owners from completed shipments
    for (const shp of product.shipments) {
      if (shp.status === 'DELIVERED' && shp.receivedAt) {
        const isCurrent = product.currentOwnerId === shp.receiverOrganizationId;
        ownershipHistory.push({
          organizationId: shp.receiver.id,
          organizationName: shp.receiver.name,
          organizationCode: shp.receiver.code,
          organizationType: shp.receiver.type,
          walletAddress: shp.receiver.walletAddress,
          acquiredAt: shp.receivedAt.toISOString(),
          eventDescription: `Transferred via Shipment ${shp.shipmentCode}`,
          txHash: shp.blockchainTxHash,
          isCurrentOwner: isCurrent,
        });
      }
    }

    // 6. Build Blockchain Verification Payload
    const blockchainVerification = {
      verified: Boolean(product.blockchainProductId && (hashMatch || onChainData)),
      contractAddress: this.blockchainService.getContractAddress(),
      onChainProductId: product.blockchainProductId
        ? Number(product.blockchainProductId)
        : null,
      productHash: product.productHash || computedHash,
      computedHash,
      hashMatch,
      blockchainTxHash: product.blockchainTxHash,
      onChainStatus: onChainData ? Number(onChainData.status) : null,
      onChainOwner: onChainData ? onChainData.currentOwner : null,
      onChainManufacturer: onChainData ? onChainData.manufacturer : null,
      totalOnChainEvents: onChainEvents.length,
      onChainEvents: sanitizeBigInt(onChainEvents),
    };

    return {
      product: {
        id: product.id,
        productCode: product.productCode,
        serialNumber: product.serialNumber,
        name: product.name,
        category: product.category,
        description: product.description,
        status: product.status,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        blockchainProductId: product.blockchainProductId,
        blockchainTxHash: product.blockchainTxHash,
      },
      currentOwner: product.currentOwner,
      manufacturer: product.manufacturer,
      events: timeline,
      ownershipHistory,
      blockchainVerification,
    };
  }

  /**
   * Search products for quick selection in traceability queries.
   */
  async search(query: TraceabilityQueryDto, currentUser: any) {
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const isAuditor =
      currentUser?.role === UserRole.AUDITOR ||
      currentUser?.organization?.type === OrganizationType.AUDITOR;

    const where: any = {};

    if (!isSuperAdmin && !isAuditor) {
      const orgId = currentUser?.organizationId;
      if (!orgId) {
        throw new ForbiddenException('User does not belong to any organization');
      }
      where.OR = [
        { manufacturerId: orgId },
        { currentOwnerId: orgId },
        { shipments: { some: { senderOrganizationId: orgId } } },
        { shipments: { some: { receiverOrganizationId: orgId } } },
        { shipments: { some: { carrierOrganizationId: orgId } } },
      ];
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { productCode: { contains: term, mode: 'insensitive' } },
            { serialNumber: { contains: term, mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return this.prisma.product.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productCode: true,
        serialNumber: true,
        name: true,
        category: true,
        status: true,
        blockchainProductId: true,
        blockchainTxHash: true,
        createdAt: true,
        currentOwner: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
    });
  }

  /**
   * Assert user is authorized to access full traceability for this product.
   */
  private assertTraceabilityAccess(product: any, currentUser: any) {
    if (
      currentUser?.role === UserRole.SUPER_ADMIN ||
      currentUser?.role === UserRole.AUDITOR ||
      currentUser?.organization?.type === OrganizationType.AUDITOR
    ) {
      return;
    }

    const orgId = currentUser?.organizationId;
    if (!orgId) {
      throw new ForbiddenException('User does not belong to an organization');
    }

    const isMfg = product.manufacturerId === orgId;
    const isOwner = product.currentOwnerId === orgId;
    const isShipmentParty = product.shipments?.some(
      (s: any) =>
        s.senderOrganizationId === orgId ||
        s.receiverOrganizationId === orgId ||
        s.carrierOrganizationId === orgId,
    );
    const isQcInspector = product.qualityChecks?.some(
      (q: any) => q.organizationId === orgId,
    );

    if (!isMfg && !isOwner && !isShipmentParty && !isQcInspector) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view traceability records for another organization’s product',
      );
    }
  }
}
