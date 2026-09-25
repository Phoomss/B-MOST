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
import { ProductStateMachineService } from '../blockchain/product-state-machine.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { SellProductDto } from './dto/sell-product.dto';
import { generateProductHash } from './utils/product-hash.util';
import {
  generateProductQr,
  generateProductQrBuffer,
} from './utils/qr-code.util';
import {
  Prisma,
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
    private readonly stateMachine: ProductStateMachineService,
  ) {
    this.webUrl =
      this.configService.get<string>('NEXT_PUBLIC_WEB_URL') ||
      this.configService.get<string>('WEB_URL') ||
      'http://localhost:3000';
  }

  async storeProduct(id: string, dto: SellProductDto, currentUser: any) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id }, { productCode: id }] },
      include: { currentOwner: true },
    });
    if (!product) throw new NotFoundException(`Product '${id}' not found`);
    if (currentUser?.role !== UserRole.SUPER_ADMIN && currentUser?.organizationId !== product.currentOwnerId) {
      throw new ForbiddenException('เฉพาะองค์กรเจ้าของสินค้าปัจจุบันเท่านั้นที่จัดเก็บสินค้าได้');
    }
    if (!product.blockchainProductId) {
      throw new ConflictException('BLOCKCHAIN_ID_MISSING: สินค้ายังไม่ผูกกับ Blockchain');
    }
    const onChainProduct = await this.blockchainService.getProduct(Number(product.blockchainProductId));
    if (onChainProduct.productCode !== product.productCode) {
      throw new ConflictException('BLOCKCHAIN_PRODUCT_MISMATCH: รหัสสินค้าบน Blockchain ไม่ตรงกับฐานข้อมูล');
    }
    this.stateMachine.checkStateMismatch(product.status, onChainProduct.status, product.productCode, product.id,
      product.blockchainProductId, 'storeProduct', this.blockchainService.getContractAddress());
    this.stateMachine.validateTransition(onChainProduct.status, 'storeProduct', product.productCode, product.id,
      product.blockchainProductId, product.status, this.blockchainService.getContractAddress());
    const signer = await this.blockchainService.getSigner(dto?.signerPrivateKey).getAddress();
    if (onChainProduct.currentOwner.toLowerCase() !== signer.toLowerCase() ||
        product.currentOwner.walletAddress?.toLowerCase() !== signer.toLowerCase()) {
      throw new ConflictException('BLOCKCHAIN_OWNER_MISMATCH: wallet ผู้ลงนามไม่ใช่เจ้าของสินค้าปัจจุบัน');
    }
    this.blockchainService.logTransactionAttempt({ productDbId: product.id,
      productBlockchainId: product.blockchainProductId, productCode: product.productCode,
      functionName: 'storeProduct' });
    const receipt = await this.blockchainService.storeProduct(BigInt(product.blockchainProductId), dto?.signerPrivateKey);
    const updatedProduct = await this.prisma.product.update({ where: { id: product.id }, data: { status: ProductStatus.STORED } });
    return { product: updatedProduct, blockchain: { ...receipt, status: 'CONFIRMED' } };
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
          const defaultMfg = await this.prisma.organization.findFirst({
            where: { type: OrganizationType.MANUFACTURER, status: 'ACTIVE' },
          });
          if (defaultMfg) {
            targetManufacturerId = defaultMfg.id;
          } else {
            throw new BadRequestException(
              'manufacturerId is required when creating a product as SUPER_ADMIN without an assigned organization',
            );
          }
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

    // Structured logging before blockchain transaction
    this.blockchainService.logTransactionAttempt({
      productDbId: product.id,
      productBlockchainId: 'N/A (Pending Registration)',
      productCode: product.productCode,
      functionName: 'registerProduct',
    });

    // Call smart contract
    let receipt: { txHash: string; blockNumber: number; productId: number };
    try {
      receipt = await this.blockchainService.registerProduct(
        product.productCode,
        productHash,
        signerPrivateKey,
      );
    } catch (regErr: any) {
      if (
        regErr?.message?.includes('PRODUCT_ALREADY_EXISTS') ||
        regErr?.reason === 'PRODUCT_ALREADY_EXISTS'
      ) {
        this.logger.warn(
          `Product ${product.productCode} already registered on blockchain. Syncing state...`,
        );
        const onChainProduct = await this.blockchainService.getProductByCode(
          product.productCode,
        );
        receipt = {
          txHash:
            product.blockchainTxHash ||
            '0x0000000000000000000000000000000000000000000000000000000000000000',
          blockNumber: 0,
          productId: onChainProduct.productId,
        };
      } else {
        throw regErr;
      }
    }

    const onChainIdStr = receipt.productId.toString();

    // Check for duplicate assignment before updating database
    const conflict = await this.prisma.product.findUnique({
      where: { blockchainProductId: onChainIdStr },
      select: { id: true, productCode: true },
    });

    if (conflict && conflict.id !== id) {
      this.logger.error(
        `Unique constraint conflict: blockchainProductId '${onChainIdStr}' is already held by product '${conflict.productCode}' (${conflict.id}) in database`,
      );
      throw new ConflictException(
        `Blockchain Product ID ${onChainIdStr} is already assigned to another product (${conflict.productCode})`,
      );
    }

    // Update database record
    let updatedProduct: any;
    try {
      updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          blockchainProductId: onChainIdStr,
          blockchainTxHash: receipt.txHash,
          productHash,
        },
        include: {
          manufacturer: true,
          currentOwner: true,
        },
      });
    } catch (updateErr: any) {
      if (
        updateErr instanceof Prisma.PrismaClientKnownRequestError &&
        updateErr.code === 'P2002'
      ) {
        const recheck = await this.prisma.product.findUnique({
          where: { id },
          include: {
            manufacturer: true,
            currentOwner: true,
          },
        });
        if (recheck?.blockchainProductId === onChainIdStr) {
          updatedProduct = recheck;
        } else {
          throw new ConflictException(
            `Blockchain Product ID ${onChainIdStr} is already assigned to another product`,
          );
        }
      } else {
        throw updateErr;
      }
    }

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
   * Marks a product as sold to an end consumer (retail point of sale).
   * Submits markAsSold to the SupplyChainRegistry smart contract and transitions database status to SOLD.
   */
  async sellProduct(id: string, dto: SellProductDto, currentUser: any) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id }, { productCode: id }],
      },
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${id}' not found`);
    }

    // Authorization: User must be SUPER_ADMIN or belong to the current owner organization
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin) {
      if (
        !currentUser?.organizationId ||
        currentUser.organizationId !== product.currentOwnerId
      ) {
        throw new ForbiddenException(
          'Access denied: Only the current owning organization or super admin can mark this product as sold',
        );
      }
    }

    // State check
    if (product.status === ProductStatus.RECALLED) {
      throw new BadRequestException('Cannot sell a recalled product');
    }
    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException('Product is already marked as sold');
    }

    let txHash: string | null = null;
    let blockNumber: number | null = null;

    if (product.blockchainProductId) {
      const onChainProductIdNum = Number(product.blockchainProductId);
      if (onChainProductIdNum > 0) {
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

        // Pre-flight on-chain state validation for markAsSold
        const onChainProductData =
          await this.blockchainService.getProduct(onChainProductIdNum);
        if (onChainProductData.productCode !== product.productCode) {
          throw new ConflictException('BLOCKCHAIN_PRODUCT_MISMATCH: รหัสสินค้าบน Blockchain ไม่ตรงกับฐานข้อมูล');
        }
        const onChainStatusNum = Number(onChainProductData.status);

        // Log state comparison (DB vs Blockchain)
        this.stateMachine.checkStateMismatch(
          product.status as string,
          onChainStatusNum,
          product.productCode,
          product.id,
          product.blockchainProductId,
          'markAsSold',
          this.blockchainService.getContractAddress(),
        );

        // Validate the transition is allowed by the smart contract state machine
        this.stateMachine.validateTransition(
          onChainStatusNum,
          'markAsSold',
          product.productCode,
          product.id,
          product.blockchainProductId,
          product.status,
          this.blockchainService.getContractAddress(),
        );

        const senderWallet = await this.blockchainService.getSigner(dto?.signerPrivateKey).getAddress();
        if (onChainProductData.currentOwner.toLowerCase() !== senderWallet.toLowerCase() ||
            product.currentOwner.walletAddress?.toLowerCase() !== senderWallet.toLowerCase()) {
          throw new ConflictException('BLOCKCHAIN_OWNER_MISMATCH: wallet ผู้ลงนามไม่ใช่เจ้าของสินค้าปัจจุบัน');
        }

        this.blockchainService.logTransactionAttempt({
          productDbId: product.id,
          productBlockchainId: product.blockchainProductId,
          productCode: product.productCode,
          functionName: 'markAsSold',
        });
      }

      const receipt = await this.blockchainService.markAsSold(
        BigInt(product.blockchainProductId),
        dto?.signerPrivateKey,
      );
      txHash = receipt.txHash;
      blockNumber = receipt.blockNumber;

      const operatorAddress = await this.blockchainService
        .getSigner(dto?.signerPrivateKey)
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
            eventType: 'ProductSold',
            entityType: 'Product',
            entityId: product.id,
            productId: product.id,
            walletAddress: operatorAddress,
            status: TxStatus.CONFIRMED,
          },
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to persist BlockchainTransaction for sell: ${err.message}`,
          );
        });
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        status: ProductStatus.SOLD,
      },
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUser?.id || null,
        organizationId: currentUser?.organizationId || null,
        action: 'PRODUCT_SOLD',
        entityType: 'Product',
        entityId: product.id,
        metadata: {
          productCode: product.productCode,
          txHash,
          notes: dto?.notes || null,
        },
      },
    });

    return {
      message: 'Product marked as sold successfully',
      product: updatedProduct,
      blockchain: txHash
        ? {
            txHash,
            blockNumber,
            status: 'CONFIRMED',
          }
        : null,
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
   * Compares deterministic Keccak-256 cryptographic hash with live smart contract state.
   * Formats sanitized, customer-friendly supply-chain timeline without sensitive internal data.
   */
  async verifyPublicProduct(productCode: string) {
    const formattedCode = productCode.trim().toUpperCase();

    // 1. Find product by productCode or serialNumber
    const includeQuery = {
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
      qualityChecks: {
        where: { result: 'PASSED' as const },
        orderBy: { createdAt: 'asc' as const },
        select: {
          id: true,
          result: true,
          inspectorName: true,
          blockchainTxHash: true,
          createdAt: true,
          notes: true,
          organization: {
            select: {
              name: true,
              code: true,
              type: true,
            },
          },
        },
      },
      shipments: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          sender: {
            select: {
              name: true,
              code: true,
              type: true,
            },
          },
          receiver: {
            select: {
              name: true,
              code: true,
              type: true,
            },
          },
          carrier: {
            select: {
              name: true,
              code: true,
              type: true,
            },
          },
        },
      },
    };

    let product = await this.prisma.product.findUnique({
      where: { productCode: formattedCode },
      include: includeQuery,
    });

    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { serialNumber: formattedCode },
        include: includeQuery,
      });
    }

    if (!product) {
      return {
        verified: false,
        productCode: formattedCode,
        message: 'Product not registered in B-MOST supply chain registry',
      };
    }

    // 2. Deterministic Hash Computation & Blockchain Verification
    const computedHash = generateProductHash({
      productCode: product.productCode,
      serialNumber: product.serialNumber,
      manufacturerId:
        product.manufacturerId || (product.manufacturer as any)?.id || '',
      name: product.name,
      category: product.category ?? undefined,
    });

    let blockchainVerification: any = {
      registeredOnChain: false,
      hashMatch: false,
      verified: false,
      computedHash,
    };

    if (product.blockchainProductId) {
      try {
        const onChainProduct = await this.blockchainService.getProductByCode(
          product.productCode,
        );

        const statusNames = [
          'REGISTERED',
          'QUALITY_CHECKED',
          'SHIPPED',
          'DELIVERED',
          'SOLD',
          'RECALLED',
        ];

        const hashMatch =
          Boolean(onChainProduct.productHash) &&
          (onChainProduct.productHash.toLowerCase() ===
            product.productHash?.toLowerCase() ||
            onChainProduct.productHash.toLowerCase() ===
              computedHash.toLowerCase());

        blockchainVerification = {
          registeredOnChain: true,
          onChainProductId:
            onChainProduct.productId?.toString?.() ?? onChainProduct.productId,
          onChainStatus: onChainProduct.status,
          onChainStatusName:
            statusNames[Number(onChainProduct.status)] || 'UNKNOWN',
          manufacturerAddress: onChainProduct.manufacturer,
          currentOwnerAddress: onChainProduct.currentOwner,
          contractAddress: this.blockchainService.getContractAddress(),
          blockchainTxHash: product.blockchainTxHash,
          productHash: product.productHash,
          computedHash,
          onChainHash: onChainProduct.productHash,
          hashMatch,
          verified: hashMatch,
        };
      } catch (err: any) {
        this.logger.warn(
          `Live blockchain check failed for ${product.productCode}: ${err.message}`,
        );
        blockchainVerification = {
          registeredOnChain: true,
          blockchainTxHash: product.blockchainTxHash,
          contractAddress: this.blockchainService.getContractAddress(),
          error: 'Blockchain node currently unavailable for live verification',
          hashMatch: false,
          verified: false,
        };
      }
    }

    // 3. Build Public Safe Supply-Chain Timeline
    const timeline: any[] = [];

    // Milestone A: Manufactured & Registered
    timeline.push({
      id: `reg-${product.id}`,
      eventType: 'PRODUCT_REGISTERED',
      title: 'Product Manufactured & Registered',
      description: `Manufactured by ${product.manufacturer?.name || 'Authorized Manufacturer'} with unique serial ${product.serialNumber}.`,
      actor: product.manufacturer?.name || 'Manufacturer',
      organizationName: product.manufacturer?.name,
      timestamp: product.createdAt,
      blockchainTxHash: product.blockchainTxHash || null,
      badgeColor: 'blue',
      verified: Boolean(product.blockchainTxHash),
    });

    // Milestone B: Quality Checks (Passed)
    if (product.qualityChecks && Array.isArray(product.qualityChecks)) {
      for (const qc of product.qualityChecks) {
        timeline.push({
          id: `qc-${qc.id}`,
          eventType: 'QUALITY_CHECKED',
          title: `Quality Inspection: ${qc.result}`,
          description:
            qc.notes ||
            'Inspection passed all quality and technical standards.',
          actor: qc.inspectorName || qc.organization?.name || 'Auditor',
          organizationName: qc.organization?.name,
          timestamp: qc.createdAt,
          blockchainTxHash: qc.blockchainTxHash || null,
          badgeColor: 'emerald',
          verified: Boolean(qc.blockchainTxHash),
        });
      }
    }

    // Milestone C: Shipments
    if (product.shipments && Array.isArray(product.shipments)) {
      for (const shp of product.shipments) {
        timeline.push({
          id: `shp-created-${shp.id}`,
          eventType: 'SHIPMENT_CREATED',
          title: `Shipment Created: ${shp.shipmentCode}`,
          description: `Dispatched from ${shp.origin} to ${shp.destination}.`,
          actor: shp.sender?.name || 'Sender',
          organizationName: shp.sender?.name,
          timestamp: shp.createdAt,
          blockchainTxHash: shp.blockchainTxHash || null,
          badgeColor: 'amber',
          verified: Boolean(shp.blockchainTxHash),
        });

        if (shp.shippedAt) {
          timeline.push({
            id: `shp-dispatched-${shp.id}`,
            eventType: 'PRODUCT_SHIPPED',
            title: 'Dispatched in Transit',
            description: `Cargo picked up by ${shp.carrier?.name || shp.sender?.name || 'Carrier'} en route to ${shp.destination}.`,
            actor: shp.carrier?.name || shp.sender?.name || 'Carrier',
            organizationName: shp.carrier?.name || shp.sender?.name,
            timestamp: shp.shippedAt,
            blockchainTxHash: shp.blockchainTxHash || null,
            badgeColor: 'purple',
            verified: Boolean(shp.blockchainTxHash),
          });
        }

        if (shp.receivedAt) {
          timeline.push({
            id: `shp-received-${shp.id}`,
            eventType: 'PRODUCT_RECEIVED',
            title: 'Delivered & Custody Transferred',
            description: `Consignment accepted at ${shp.destination} by ${shp.receiver?.name}.`,
            actor: shp.receiver?.name || 'Receiver',
            organizationName: shp.receiver?.name,
            timestamp: shp.receivedAt,
            blockchainTxHash: shp.blockchainTxHash || null,
            badgeColor: 'emerald',
            verified: Boolean(shp.blockchainTxHash),
          });
        }
      }
    }

    // Milestone D: Sold or Recalled
    if (product.status === ProductStatus.SOLD) {
      timeline.push({
        id: `sold-${product.id}`,
        eventType: 'PRODUCT_SOLD',
        title: 'Sold to Consumer',
        description: `Product retailed to consumer by ${product.currentOwner?.name || 'Retailer'}.`,
        actor: product.currentOwner?.name || 'Retailer',
        organizationName: product.currentOwner?.name,
        timestamp: product.updatedAt,
        badgeColor: 'blue',
        verified: true,
      });
    } else if (product.status === ProductStatus.RECALLED) {
      timeline.push({
        id: `recalled-${product.id}`,
        eventType: 'PRODUCT_RECALLED',
        title: 'Product Recalled',
        description:
          'Notice: Product has been officially recalled from circulation.',
        actor: product.manufacturer?.name || 'Safety Authority',
        organizationName: product.manufacturer?.name,
        timestamp: product.updatedAt,
        badgeColor: 'rose',
        verified: true,
      });
    }

    // Sort timeline ascending by timestamp
    timeline.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // 4. Generate QR code for this product
    let qr: any = { qrCodeDataUrl: '', verificationUrl: '' };
    try {
      qr = await generateProductQr(product.productCode, this.webUrl);
    } catch {
      // Fallback
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
        manufacturer: {
          name: product.manufacturer?.name,
          code: product.manufacturer?.code,
          type: product.manufacturer?.type,
          walletAddress: product.manufacturer?.walletAddress,
        },
        currentOwner: {
          name: product.currentOwner?.name,
          code: product.currentOwner?.code,
          type: product.currentOwner?.type,
          walletAddress: product.currentOwner?.walletAddress,
        },
        qualityChecks: product.qualityChecks?.map((qc: any) => ({
          result: qc.result,
          inspectorName: qc.inspectorName,
          createdAt: qc.createdAt,
          notes: qc.notes,
          organizationName: qc.organization?.name,
          blockchainTxHash: qc.blockchainTxHash,
        })),
      },
      timeline,
      blockchain: blockchainVerification,
      qrCode: qr.qrCodeDataUrl,
      verificationUrl: qr.verificationUrl,
    };
  }

  /**
   * Generates a raw PNG QR code buffer for streaming.
   */
  async getQrImageBuffer(productCode: string): Promise<Buffer> {
    const formattedCode = productCode.trim().toUpperCase();
    let product = await this.prisma.product.findUnique({
      where: { productCode: formattedCode },
      select: { productCode: true },
    });
    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { serialNumber: formattedCode },
        select: { productCode: true },
      });
    }
    if (!product) {
      throw new NotFoundException(`Product ${formattedCode} not found`);
    }
    return generateProductQrBuffer(product.productCode, this.webUrl);
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
