import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  QualityCheckResult,
  ProductStatus,
  TxStatus,
  UserRole,
  OrganizationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreateQualityCheckDto } from './dto/create-quality-check.dto';
import { QueryQualityCheckDto } from './dto/query-quality-check.dto';

@Injectable()
export class QualityChecksService {
  private readonly logger = new Logger(QualityChecksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Executes a quality control inspection on a product.
   * Records verification result in PostgreSQL, signs the transaction to the
   * SupplyChainRegistry smart contract, and transitions product status.
   */
  async performQualityCheck(
    productIdOrCode: string,
    dto: CreateQualityCheckDto,
    currentUser: any,
  ) {
    if (!productIdOrCode && !dto.productId) {
      throw new BadRequestException('Product ID or Product Code is required');
    }

    const targetId = productIdOrCode || dto.productId;

    // Retrieve product with manufacturer and current owner
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: targetId }, { productCode: targetId }],
      },
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product identified by '${targetId}' was not found`,
      );
    }

    // Role & Organization permissions check
    this.assertQualityCheckAccess(product, currentUser);

    // Validate product lifecycle state
    if (product.status === ProductStatus.RECALLED) {
      throw new BadRequestException(
        `Cannot perform quality check: Product '${product.productCode}' has been recalled`,
      );
    }

    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException(
        `Cannot perform quality check: Product '${product.productCode}' has already been sold`,
      );
    }

    // Normalize result verdict
    const { normalizedResult, passed } = this.normalizeResult(dto.result);

    const inspectorName =
      dto.inspectorName?.trim() ||
      (currentUser.firstName && currentUser.lastName
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.email || 'Authorized Quality Inspector');

    // Ensure product is registered on-chain before recording inspection
    if (!product.blockchainProductId) {
      throw new BadRequestException(
        'Product has not been registered on blockchain (สินค้ายังไม่ได้ลงทะเบียนบน Blockchain กรุณาลงทะเบียนสินค้าก่อนบันทึกการตรวจสอบคุณภาพ)',
      );
    }

    const onChainProductIdNum = Number(product.blockchainProductId);
    if (!onChainProductIdNum || onChainProductIdNum <= 0) {
      throw new BadRequestException(
        'Product has not been registered on blockchain (รหัส Blockchain Product ID ไม่ถูกต้อง)',
      );
    }

    // Existence check on blockchain before transaction
    const exists =
      await this.blockchainService.verifyProductExists(onChainProductIdNum);
    if (!exists) {
      this.logger.error(
        `Product exists in database but not found on blockchain (Product DB ID: ${product.id}, Blockchain ID: ${product.blockchainProductId}, Code: ${product.productCode})`,
      );
      throw new ConflictException(
        'Product exists in database but not found on blockchain (ไม่พบสินค้าใน Blockchain กรุณาตรวจสอบ Blockchain Product ID และสถานะของ Blockchain)',
      );
    }

    // Structured logging before blockchain transaction
    this.blockchainService.logTransactionAttempt({
      productDbId: product.id,
      productBlockchainId: product.blockchainProductId,
      productCode: product.productCode,
      functionName: 'recordQualityCheck',
    });

    // Call Smart Contract: recordQualityCheck
    this.logger.log(
      `Invoking smart contract recordQualityCheck for product ID ${product.blockchainProductId} (passed=${passed})`,
    );

    const onChainReceipt = await this.blockchainService.recordQualityCheck(
      BigInt(product.blockchainProductId),
      passed,
      dto.notes || '',
      dto.signerPrivateKey,
    );

    const callerWalletAddress = await this.blockchainService
      .getSigner(dto.signerPrivateKey)
      .getAddress()
      .catch(() => '0x0000000000000000000000000000000000000000');

    // Target organization ID for the QC record
    const qcOrgId = currentUser.organizationId || product.manufacturerId;

    // Create QualityCheck in PostgreSQL
    const qualityCheck = await this.prisma.qualityCheck.create({
      data: {
        productId: product.id,
        organizationId: qcOrgId,
        inspectorName,
        result: normalizedResult,
        notes: dto.notes?.trim() || null,
        blockchainTxHash: onChainReceipt.txHash,
      },
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            name: true,
            status: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
      },
    });

    // Update Product Status in database
    const newStatus = passed
      ? ProductStatus.QUALITY_CHECKED
      : ProductStatus.RECALLED;

    const updatedProduct = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        status: newStatus,
      },
      include: {
        manufacturer: {
          select: { id: true, name: true, code: true, type: true },
        },
        currentOwner: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
    });

    // Index BlockchainTransaction
    await this.prisma.blockchainTransaction.upsert({
      where: { txHash: onChainReceipt.txHash },
      update: {
        blockNumber: BigInt(onChainReceipt.blockNumber),
        productId: product.id,
        status: TxStatus.CONFIRMED,
      },
      create: {
        txHash: onChainReceipt.txHash,
        blockNumber: BigInt(onChainReceipt.blockNumber),
        contractAddress: this.blockchainService.getContractAddress(),
        eventType: 'QualityChecked',
        entityType: 'Product',
        entityId: product.blockchainProductId,
        productId: product.id,
        walletAddress: callerWalletAddress,
        status: TxStatus.CONFIRMED,
      },
    });

    // Write AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: currentUser.id || null,
        organizationId: currentUser.organizationId || null,
        action: 'QUALITY_CHECK',
        entityType: 'Product',
        entityId: product.id,
        metadata: {
          qualityCheckId: qualityCheck.id,
          result: normalizedResult,
          passed,
          inspectorName,
          notes: dto.notes || null,
          txHash: onChainReceipt.txHash,
          blockNumber: onChainReceipt.blockNumber,
          previousStatus: product.status,
          newStatus,
        },
      },
    });

    this.logger.log(
      `Quality check successfully recorded: ID=${qualityCheck.id}, product=${product.productCode}, status=${newStatus}, tx=${onChainReceipt.txHash}`,
    );

    return {
      message: passed
        ? 'Quality check passed and verified on blockchain'
        : 'Quality check failed. Product status transitioned to RECALLED',
      qualityCheck,
      product: updatedProduct,
      blockchain: {
        txHash: onChainReceipt.txHash,
        blockNumber: onChainReceipt.blockNumber,
        status: 'CONFIRMED',
        onChainProductId: product.blockchainProductId,
      },
    };
  }

  /**
   * Retrieves paginated list of Quality Checks with isolation & filters.
   */
  async findAll(query: QueryQualityCheckDto, currentUser: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.QualityCheckWhereInput = {};

    // Multi-tenant isolation filter
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const isAuditor =
      currentUser?.role === UserRole.AUDITOR ||
      currentUser?.organization?.type === OrganizationType.AUDITOR;

    if (!isSuperAdmin && !isAuditor) {
      const orgId = currentUser?.organizationId;
      if (!orgId) {
        throw new ForbiddenException(
          'User must belong to an organization to view quality checks',
        );
      }
      where.OR = [
        { organizationId: orgId },
        { product: { manufacturerId: orgId } },
        { product: { currentOwnerId: orgId } },
      ];
    }

    if (query.productId) {
      where.OR = [
        { productId: query.productId },
        { product: { productCode: query.productId } },
      ];
    }

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.result) {
      const upper = query.result.toUpperCase();
      if (upper === 'PASS' || upper === 'PASSED') {
        where.result = QualityCheckResult.PASSED;
      } else if (upper === 'FAIL' || upper === 'FAILED') {
        where.result = QualityCheckResult.FAILED;
      } else if (upper === 'PENDING') {
        where.result = QualityCheckResult.PENDING;
      }
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { inspectorName: { contains: term, mode: 'insensitive' } },
            { notes: { contains: term, mode: 'insensitive' } },
            {
              product: { productCode: { contains: term, mode: 'insensitive' } },
            },
            { product: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.qualityCheck.count({ where }),
      this.prisma.qualityCheck.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              productCode: true,
              name: true,
              status: true,
              blockchainProductId: true,
              blockchainTxHash: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single QualityCheck by UUID.
   */
  async findOne(id: string, currentUser: any) {
    const qc = await this.prisma.qualityCheck.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            manufacturer: true,
            currentOwner: true,
          },
        },
        organization: true,
      },
    });

    if (!qc) {
      throw new NotFoundException(`Quality check with ID '${id}' not found`);
    }

    // Authorization check
    this.assertQualityCheckViewAccess(qc, currentUser);

    return qc;
  }

  /**
   * Retrieves quality checks for a specific product.
   */
  async findByProductId(productId: string, currentUser: any) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { productCode: productId }],
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    return this.findAll({ productId: product.id }, currentUser);
  }

  /**
   * Helper to normalize result input to Prisma enum and boolean verdict.
   */
  private normalizeResult(result: string): {
    normalizedResult: QualityCheckResult;
    passed: boolean;
  } {
    const upper = String(result).toUpperCase().trim();
    if (upper === 'PASS' || upper === 'PASSED') {
      return { normalizedResult: QualityCheckResult.PASSED, passed: true };
    }
    if (upper === 'FAIL' || upper === 'FAILED') {
      return { normalizedResult: QualityCheckResult.FAILED, passed: false };
    }
    if (upper === 'PENDING') {
      return { normalizedResult: QualityCheckResult.PENDING, passed: false };
    }
    throw new BadRequestException(
      `Invalid quality check result '${result}'. Expected 'PASSED' (or 'PASS') or 'FAILED' (or 'FAIL').`,
    );
  }

  /**
   * Assert user is authorized to perform inspection on the product.
   */
  private assertQualityCheckAccess(product: any, currentUser: any) {
    if (
      currentUser?.role === UserRole.SUPER_ADMIN ||
      currentUser?.role === UserRole.AUDITOR ||
      currentUser?.organization?.type === OrganizationType.AUDITOR
    ) {
      return;
    }

    const orgId = currentUser?.organizationId;
    if (!orgId) {
      throw new ForbiddenException(
        'Access denied: You must be affiliated with an active organization to perform quality checks',
      );
    }

    const isManufacturer = product.manufacturerId === orgId;
    const isCurrentOwner = product.currentOwnerId === orgId;

    if (!isManufacturer && !isCurrentOwner) {
      throw new ForbiddenException(
        'Access denied: Quality checks can only be performed by an independent Auditor, the Manufacturer, or current Owner',
      );
    }
  }

  /**
   * Assert user has access to view a specific QC inspection.
   */
  private assertQualityCheckViewAccess(qc: any, currentUser: any) {
    if (
      currentUser?.role === UserRole.SUPER_ADMIN ||
      currentUser?.role === UserRole.AUDITOR ||
      currentUser?.organization?.type === OrganizationType.AUDITOR
    ) {
      return;
    }

    const orgId = currentUser?.organizationId;
    if (!orgId) {
      throw new ForbiddenException(
        'Access denied: User does not belong to any organization',
      );
    }

    const isInspectorOrg = qc.organizationId === orgId;
    const isProductMfg = qc.product?.manufacturerId === orgId;
    const isProductOwner = qc.product?.currentOwnerId === orgId;

    if (!isInspectorOrg && !isProductMfg && !isProductOwner) {
      throw new ForbiddenException(
        'Access denied: Cannot view quality inspection for another organization’s product',
      );
    }
  }
}
