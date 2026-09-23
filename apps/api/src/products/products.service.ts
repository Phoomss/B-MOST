import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { generateProductHash } from './utils/product-hash.util';
import { generateProductQr } from './utils/qr-code.util';
import {
  OrganizationType,
  ProductStatus,
  TxStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
  ) {
    this.webUrl =
      this.configService.get<string>('NEXT_PUBLIC_WEB_URL') ||
      this.configService.get<string>('WEB_URL') ||
      'http://localhost:3000';
  }

  /**
   * Creates a new product record in PostgreSQL and optionally registers it on-chain.
   */
  async create(createDto: CreateProductDto, currentUser: any) {
    // 1. Role verification
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    let targetManufacturerId = createDto.manufacturerId;

    if (!isSuperAdmin) {
      if (!currentUser?.organizationId) {
        throw new ForbiddenException(
          'User must belong to an organization to create products',
        );
      }
      targetManufacturerId = currentUser.organizationId;
    } else {
      if (!targetManufacturerId) {
        if (currentUser?.organizationId) {
          targetManufacturerId = currentUser.organizationId;
        } else {
          throw new BadRequestException(
            'manufacturerId is required when creating a product as SUPER_ADMIN without an assigned organization',
          );
        }
      }
    }

    if (!targetManufacturerId) {
      throw new BadRequestException('manufacturerId could not be determined');
    }
    const manufacturerId: string = targetManufacturerId;

    // 2. Validate manufacturer organization
    const manufacturerOrg = await this.prisma.organization.findUnique({
      where: { id: manufacturerId },
    });

    if (!manufacturerOrg) {
      throw new NotFoundException(
        `Manufacturer organization with ID '${manufacturerId}' not found`,
      );
    }

    if (manufacturerOrg.type !== OrganizationType.MANUFACTURER) {
      throw new BadRequestException(
        `Organization '${manufacturerOrg.name}' is not of type MANUFACTURER`,
      );
    }

    if (manufacturerOrg.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Manufacturer organization '${manufacturerOrg.name}' is not ACTIVE`,
      );
    }

    // 3. Normalization and uniqueness checks
    const formattedCode = createDto.productCode.trim().toUpperCase();
    const formattedSerial = createDto.serialNumber.trim();

    const existingCode = await this.prisma.product.findUnique({
      where: { productCode: formattedCode },
    });
    if (existingCode) {
      throw new ConflictException(
        `Product with code '${formattedCode}' already exists`,
      );
    }

    const existingSerial = await this.prisma.product.findUnique({
      where: { serialNumber: formattedSerial },
    });
    if (existingSerial) {
      throw new ConflictException(
        `Product with serial number '${formattedSerial}' already exists`,
      );
    }

    // 4. Deterministic Product Hash (keccak256 bytes32)
    const productHash = generateProductHash({
      productCode: formattedCode,
      serialNumber: formattedSerial,
      manufacturerId,
      name: createDto.name,
      category: createDto.category,
    });

    // 5. Store in PostgreSQL
    const product = await this.prisma.product.create({
      data: {
        productCode: formattedCode,
        serialNumber: formattedSerial,
        name: createDto.name.trim(),
        description: createDto.description?.trim(),
        category: createDto.category?.trim(),
        manufacturerId,
        currentOwnerId: manufacturerId, // Initial owner is manufacturer
        productHash,
        status: ProductStatus.REGISTERED,
      },
      include: {
        manufacturer: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            walletAddress: true,
          },
        },
        currentOwner: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            walletAddress: true,
          },
        },
      },
    });

    // 6. Audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: currentUser?.id,
          organizationId: targetManufacturerId,
          action: 'PRODUCT_CREATED',
          entityType: 'Product',
          entityId: product.id,
          metadata: {
            productCode: product.productCode,
            serialNumber: product.serialNumber,
            productHash: product.productHash,
            createdById: currentUser?.id,
          },
        },
      })
      .catch(() => {});

    // 7. Optional automatic blockchain registration
    if (createDto.registerOnBlockchain) {
      try {
        return await this.registerOnBlockchain(product.id, currentUser);
      } catch (error: any) {
        this.logger.warn(
          `Product created in DB, but blockchain auto-registration failed: ${error.message}`,
        );
      }
    }

    // 8. Generate QR code
    const qr = await generateProductQr(product.productCode, this.webUrl);

    return {
      ...product,
      qrCode: qr.qrCodeDataUrl,
      verificationUrl: qr.verificationUrl,
    };
  }

  /**
   * Retrieves paginated products, strictly enforcing multi-tenant isolation.
   */
  async findAll(query: QueryProductDto, currentUser: any) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Multi-tenant organization isolation:
    // SUPER_ADMIN and AUDITOR can see all products.
    // Other roles can ONLY see products that belong to or originate from their organization.
    const isAuditorOrAdmin =
      currentUser?.role === UserRole.SUPER_ADMIN ||
      currentUser?.role === UserRole.AUDITOR;

    if (!isAuditorOrAdmin) {
      if (!currentUser?.organizationId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      where.OR = [
        { manufacturerId: currentUser.organizationId },
        { currentOwnerId: currentUser.organizationId },
      ];
    } else {
      if (query.organizationId) {
        where.OR = [
          { manufacturerId: query.organizationId },
          { currentOwnerId: query.organizationId },
        ];
      }
      if (query.manufacturerId) {
        where.manufacturerId = query.manufacturerId;
      }
      if (query.currentOwnerId) {
        where.currentOwnerId = query.currentOwnerId;
      }
    }

    // Additional filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    if (query.search) {
      const searchClause = [
        { productCode: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchClause }];
      } else {
        where.OR = searchClause;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          manufacturer: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              walletAddress: true,
            },
          },
          currentOwner: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              walletAddress: true,
            },
          },
          _count: {
            select: {
              qualityChecks: true,
              shipments: true,
              blockchainTransactions: true,
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
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single product details including QR code and live blockchain status.
   */
  async findOne(id: string, currentUser: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        currentOwner: true,
        qualityChecks: {
          orderBy: { createdAt: 'desc' },
          include: { organization: true },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          include: {
            sender: true,
            receiver: true,
            carrier: true,
          },
        },
        blockchainTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Tenant isolation verification
    this.assertProductAccess(product, currentUser);

    // QR Code generation
    const qr = await generateProductQr(product.productCode, this.webUrl);

    // Live On-Chain Data verification if registered
    let blockchainData: any = null;
    if (product.blockchainProductId) {
      try {
        const onChainProduct = await this.blockchainService.getProduct(
          BigInt(product.blockchainProductId),
        );
        blockchainData = {
          onChain: true,
          ...onChainProduct,
          hashMatches: onChainProduct.productHash === product.productHash,
        };
      } catch (err: any) {
        this.logger.debug(
          `On-chain query failed for productId ${product.blockchainProductId}: ${err.message}`,
        );
        blockchainData = {
          onChain: false,
          error: err.message,
        };
      }
    }

    return {
      ...product,
      qrCode: qr.qrCodeDataUrl,
      verificationUrl: qr.verificationUrl,
      blockchainData,
    };
  }

  /**
   * Finds a product by its unique product code.
   */
  async findByCode(productCode: string, currentUser?: any) {
    const formattedCode = productCode.trim().toUpperCase();
    const product = await this.prisma.product.findUnique({
      where: { productCode: formattedCode },
      include: {
        manufacturer: true,
        currentOwner: true,
        qualityChecks: true,
        shipments: true,
        blockchainTransactions: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with code '${formattedCode}' not found`,
      );
    }

    if (currentUser) {
      this.assertProductAccess(product, currentUser);
    }

    const qr = await generateProductQr(product.productCode, this.webUrl);

    return {
      ...product,
      qrCode: qr.qrCodeDataUrl,
      verificationUrl: qr.verificationUrl,
    };
  }

  /**
   * Updates non-immutable metadata for a product.
   */
  async update(id: string, updateDto: UpdateProductDto, currentUser: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Role and ownership check
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin) {
      if (
        !currentUser?.organizationId ||
        currentUser.organizationId !== product.currentOwnerId
      ) {
        throw new ForbiddenException(
          'Only the current owning organization or SUPER_ADMIN can update product metadata',
        );
      }
    }

    const updateData: any = {};
    if (updateDto.name !== undefined) updateData.name = updateDto.name.trim();
    if (updateDto.description !== undefined)
      updateData.description = updateDto.description.trim();
    if (updateDto.category !== undefined)
      updateData.category = updateDto.category.trim();

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    // Audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: currentUser?.id,
          organizationId: product.currentOwnerId,
          action: 'PRODUCT_UPDATED',
          entityType: 'Product',
          entityId: product.id,
          metadata: {
            updatedFields: Object.keys(updateData),
            updatedById: currentUser?.id,
          },
        },
      })
      .catch(() => {});

    return updated;
  }

  /**
   * Registers a product on the EVM Smart Contract (SupplyChainRegistry).
   */
  async registerOnBlockchain(
    id: string,
    currentUser: any,
    signerPrivateKey?: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { manufacturer: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Authorization
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin) {
      if (
        !currentUser?.organizationId ||
        (currentUser.organizationId !== product.manufacturerId &&
          currentUser.organizationId !== product.currentOwnerId)
      ) {
        throw new ForbiddenException(
          'Only the manufacturer, current owner, or SUPER_ADMIN can register this product on the blockchain',
        );
      }
    }

    if (product.blockchainProductId) {
      throw new ConflictException(
        `Product '${product.productCode}' is already registered on blockchain (ID: ${product.blockchainProductId})`,
      );
    }

    if (product.status === ProductStatus.RECALLED) {
      throw new BadRequestException(
        'Cannot register a recalled product on the blockchain',
      );
    }

    // Ensure productHash exists
    const productHash =
      product.productHash ||
      generateProductHash({
        productCode: product.productCode,
        serialNumber: product.serialNumber,
        manufacturerId: product.manufacturerId,
        name: product.name,
        category: product.category || undefined,
      });

    this.logger.log(
      `Executing blockchain registration for product ${product.productCode} with hash ${productHash}`,
    );

    // Call smart contract
    const receipt = await this.blockchainService.registerProduct(
      product.productCode,
      productHash,
      signerPrivateKey,
    );

    // Update database record
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        blockchainProductId: receipt.productId.toString(),
        blockchainTxHash: receipt.txHash,
        productHash,
      },
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    // Record BlockchainTransaction record
    const operatorAddress = await this.blockchainService
      .getSigner(signerPrivateKey)
      .getAddress()
      .catch(() => '0x0000000000000000000000000000000000000000');

    await this.prisma.blockchainTransaction
      .upsert({
        where: { txHash: receipt.txHash },
        update: {
          blockNumber: BigInt(receipt.blockNumber),
          productId: product.id,
          status: TxStatus.CONFIRMED,
        },
        create: {
          txHash: receipt.txHash,
          blockNumber: BigInt(receipt.blockNumber),
          contractAddress: this.blockchainService.getContractAddress(),
          eventType: 'ProductRegistered',
          entityType: 'Product',
          entityId: product.id,
          productId: product.id,
          walletAddress: operatorAddress,
          status: TxStatus.CONFIRMED,
        },
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to persist BlockchainTransaction record: ${err.message}`,
        );
      });

    // Record audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: currentUser?.id,
          organizationId: product.manufacturerId,
          action: 'PRODUCT_REGISTERED_ON_BLOCKCHAIN',
          entityType: 'Product',
          entityId: product.id,
          metadata: {
            productCode: product.productCode,
            productId: receipt.productId,
            txHash: receipt.txHash,
            blockNumber: receipt.blockNumber,
            productHash,
            registeredById: currentUser?.id,
          },
        },
      })
      .catch(() => {});

    const qr = await generateProductQr(product.productCode, this.webUrl);

    return {
      ...updatedProduct,
      blockchainRegistration: receipt,
      qrCode: qr.qrCodeDataUrl,
      verificationUrl: qr.verificationUrl,
    };
  }

  /**
   * Retrieves complete traceability history (on-chain records, audit logs, and status transitions).
   */
  async getHistory(id: string, currentUser: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        currentOwner: true,
        qualityChecks: {
          orderBy: { createdAt: 'desc' },
          include: { organization: true },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          include: { sender: true, receiver: true, carrier: true },
        },
        blockchainTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    this.assertProductAccess(product, currentUser);

    let onChainHistory: any[] = [];
    if (product.blockchainProductId) {
      try {
        onChainHistory = await this.blockchainService.getProductHistory(
          BigInt(product.blockchainProductId),
        );
      } catch (err: any) {
        this.logger.debug(
          `Failed to load on-chain history for productId ${product.blockchainProductId}: ${err.message}`,
        );
      }
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'Product',
        entityId: product.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        organization: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
    });

    return {
      product: {
        id: product.id,
        productCode: product.productCode,
        name: product.name,
        status: product.status,
        blockchainProductId: product.blockchainProductId,
        blockchainTxHash: product.blockchainTxHash,
        manufacturer: product.manufacturer,
        currentOwner: product.currentOwner,
      },
      blockchainHistory: onChainHistory,
      blockchainTransactions: product.blockchainTransactions,
      qualityChecks: product.qualityChecks,
      shipments: product.shipments,
      auditLogs,
    };
  }

  /**
   * Retrieves downloadable QR code payload for a product.
   */
  async getQr(id: string, currentUser: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    this.assertProductAccess(product, currentUser);

    const qr = await generateProductQr(product.productCode, this.webUrl);

    return {
      productCode: product.productCode,
      name: product.name,
      ...qr,
    };
  }

  /**
   * Safely deletes an unregistered draft product. Products already written to blockchain cannot be deleted.
   */
  async remove(id: string, currentUser: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { qualityChecks: true, shipments: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    // Role verification
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin) {
      if (
        !currentUser?.organizationId ||
        currentUser.organizationId !== product.manufacturerId
      ) {
        throw new ForbiddenException(
          'Only the manufacturer or SUPER_ADMIN can delete an unregistered product',
        );
      }
    }

    // Immutability check
    if (product.blockchainProductId || product.blockchainTxHash) {
      throw new BadRequestException(
        'Immutability Violation: Cannot delete a product that has been permanently committed to the blockchain ledger',
      );
    }

    if (product._count.qualityChecks > 0 || product._count.shipments > 0) {
      throw new BadRequestException(
        'Cannot delete product that has associated quality checks or shipments',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    // Audit log
    await this.prisma.auditLog
      .create({
        data: {
          userId: currentUser?.id,
          organizationId: product.manufacturerId,
          action: 'PRODUCT_DELETED',
          entityType: 'Product',
          entityId: product.id,
          metadata: {
            productCode: product.productCode,
            name: product.name,
            deletedById: currentUser?.id,
          },
        },
      })
      .catch(() => {});

    return {
      success: true,
      message: `Product '${product.productCode}' deleted successfully`,
    };
  }

  /**
   * Public verification endpoint (accessible without login) for consumer QR scanning.
   */
  async verifyPublicProduct(productCode: string) {
    const formattedCode = productCode.trim().toUpperCase();
    const product = await this.prisma.product.findUnique({
      where: { productCode: formattedCode },
      include: {
        manufacturer: {
          select: {
            name: true,
            code: true,
            type: true,
            walletAddress: true,
          },
        },
        currentOwner: {
          select: {
            name: true,
            code: true,
            type: true,
            walletAddress: true,
          },
        },
        qualityChecks: {
          where: { result: 'PASSED' },
          select: {
            result: true,
            inspectorName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      return {
        verified: false,
        productCode: formattedCode,
        message: 'Product not registered in B-MOST supply chain registry',
      };
    }

    let blockchainVerification: any = {
      registeredOnChain: false,
      hashMatch: false,
    };

    if (product.blockchainProductId) {
      try {
        const onChainProduct = await this.blockchainService.getProductByCode(
          product.productCode,
        );
        const hashMatch = onChainProduct.productHash === product.productHash;

        blockchainVerification = {
          registeredOnChain: true,
          onChainProductId: onChainProduct.productId,
          onChainStatus: onChainProduct.status,
          manufacturerAddress: onChainProduct.manufacturer,
          currentOwnerAddress: onChainProduct.currentOwner,
          contractAddress: this.blockchainService.getContractAddress(),
          blockchainTxHash: product.blockchainTxHash,
          hashMatch,
          verified: hashMatch,
        };
      } catch {
        blockchainVerification = {
          registeredOnChain: true,
          blockchainTxHash: product.blockchainTxHash,
          error: 'Blockchain node currently unavailable for live verification',
          hashMatch: false,
          verified: false,
        };
      }
    }

    return {
      verified:
        blockchainVerification.registeredOnChain &&
        blockchainVerification.hashMatch !== false,
      product: {
        productCode: product.productCode,
        serialNumber: product.serialNumber,
        name: product.name,
        category: product.category,
        description: product.description,
        status: product.status,
        createdAt: product.createdAt,
        manufacturer: product.manufacturer,
        currentOwner: product.currentOwner,
        qualityChecks: product.qualityChecks,
      },
      blockchain: blockchainVerification,
    };
  }

  /**
   * Helper to verify if the current user has rights to access a specific product.
   */
  private assertProductAccess(product: any, currentUser: any) {
    if (
      currentUser?.role === UserRole.SUPER_ADMIN ||
      currentUser?.role === UserRole.AUDITOR
    ) {
      return;
    }

    const orgId = currentUser?.organizationId;
    if (!orgId) {
      throw new ForbiddenException(
        'Access denied: User does not belong to any organization',
      );
    }

    const isManufacturer = product.manufacturerId === orgId;
    const isCurrentOwner = product.currentOwnerId === orgId;
    const isPartyToShipment = product.shipments?.some(
      (s: any) =>
        s.senderOrganizationId === orgId ||
        s.receiverOrganizationId === orgId ||
        s.carrierOrganizationId === orgId,
    );

    if (!isManufacturer && !isCurrentOwner && !isPartyToShipment) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to access another organization’s product',
      );
    }
  }
}
