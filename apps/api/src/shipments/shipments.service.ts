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
  ShipmentStatus,
  ProductStatus,
  TxStatus,
  UserRole,
  OrganizationType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { QueryShipmentDto } from './dto/query-shipment.dto';
import { DispatchShipmentDto } from './dto/dispatch-shipment.dto';
import { ReceiveShipmentDto } from './dto/receive-shipment.dto';
import { TransferOwnershipDto } from '../products/dto/transfer-ownership.dto';
import { generateProductHash } from '../products/utils/product-hash.util';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Creates a new shipment reference and commits it onto the EVM smart contract.
   * Product state advances to READY_TO_SHIP.
   */
  async create(dto: CreateShipmentDto, currentUser: any) {
    // 1. Fetch Product
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: dto.productId }, { productCode: dto.productId }],
      },
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product identified by '${dto.productId}' was not found`,
      );
    }

    // 2. Authorization check - Only current owner or super admin can ship product
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const userOrgId = currentUser?.organizationId;

    if (!isSuperAdmin) {
      if (!userOrgId || userOrgId !== product.currentOwnerId) {
        throw new ForbiddenException(
          'Access denied: Only the current owning organization can create a shipment for this product',
        );
      }
    }

    // 3. State validation
    if (product.status === ProductStatus.RECALLED) {
      throw new BadRequestException('Cannot ship a recalled product');
    }
    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException('Cannot ship an already sold product');
    }
    if (
      product.status === ProductStatus.SHIPPED ||
      product.status === ProductStatus.IN_TRANSIT
    ) {
      throw new BadRequestException(
        `Product '${product.productCode}' is currently already in an active shipment`,
      );
    }

    // 4. Resolve Receiver Organization
    const receiverOrg = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { id: dto.receiverOrganizationId },
          { code: dto.receiverOrganizationId },
        ],
      },
    });

    if (!receiverOrg) {
      throw new NotFoundException(
        `Receiver organization '${dto.receiverOrganizationId}' not found`,
      );
    }

    if (receiverOrg.status !== 'ACTIVE') {
      throw new BadRequestException('Receiver organization is not active');
    }

    if (receiverOrg.id === product.currentOwnerId) {
      throw new BadRequestException(
        'Receiver organization cannot be the same as the current product owner',
      );
    }

    // 5. Resolve Carrier Organization (Optional)
    let carrierOrg: any = null;
    if (dto.carrierOrganizationId) {
      carrierOrg = await this.prisma.organization.findFirst({
        where: {
          OR: [
            { id: dto.carrierOrganizationId },
            { code: dto.carrierOrganizationId },
          ],
        },
      });
      if (!carrierOrg) {
        throw new NotFoundException(
          `Carrier organization '${dto.carrierOrganizationId}' not found`,
        );
      }
    }

    // 6. Ensure unique shipment code
    const shipmentCode =
      dto.shipmentCode?.trim() ||
      `SHP-${Date.now().toString(36).toUpperCase()}-${Math.floor(
        1000 + Math.random() * 9000,
      )}`;

    const existingShipment = await this.prisma.shipment.findUnique({
      where: { shipmentCode },
    });
    if (existingShipment) {
      throw new ConflictException(
        `Shipment code '${shipmentCode}' already exists`,
      );
    }

    // 7. Ensure product is registered on blockchain
    if (!product.blockchainProductId) {
      // Concurrency check: refresh product from DB in case another process already registered it
      const freshProduct = await this.prisma.product.findUnique({
        where: { id: product.id },
      });
      if (freshProduct?.blockchainProductId) {
        product.blockchainProductId = freshProduct.blockchainProductId;
        product.blockchainTxHash = freshProduct.blockchainTxHash;
        product.productHash = freshProduct.productHash;
      }
    }

    if (!product.blockchainProductId) {
      this.logger.log(
        `Product ${product.productCode} is not registered on blockchain in DB. Checking on-chain status...`,
      );
      const productHash =
        product.productHash ||
        generateProductHash({
          productCode: product.productCode,
          serialNumber: product.serialNumber,
          manufacturerId: product.manufacturerId,
          name: product.name,
          category: product.category || undefined,
        });

      let onChainProductId: string | null = null;
      let onChainTxHash: string | null = product.blockchainTxHash || null;

      try {
        const onChainProduct = await this.blockchainService.getProductByCode(
          product.productCode,
        );
        if (onChainProduct && Number(onChainProduct.productId) > 0) {
          onChainProductId = onChainProduct.productId.toString();
          this.logger.log(
            `Product ${product.productCode} already found on blockchain with ID ${onChainProductId}`,
          );
        }
      } catch {
        // Not on-chain yet
      }

      if (!onChainProductId) {
        try {
          const regReceipt = await this.blockchainService.registerProduct(
            product.productCode,
            productHash,
            dto.signerPrivateKey,
          );
          onChainProductId = regReceipt.productId.toString();
          onChainTxHash = regReceipt.txHash;
        } catch (regErr: any) {
          if (
            regErr?.message?.includes('PRODUCT_ALREADY_EXISTS') ||
            regErr?.reason === 'PRODUCT_ALREADY_EXISTS'
          ) {
            this.logger.warn(
              `Product ${product.productCode} was already registered on blockchain. Syncing ID...`,
            );
            const onChainProduct = await this.blockchainService.getProductByCode(
              product.productCode,
            );
            onChainProductId = onChainProduct.productId.toString();
          } else {
            throw regErr;
          }
        }
      }

      // If productId was not captured in receipt logs (e.g. 0), sync from on-chain contract
      if (!onChainProductId || onChainProductId === '0') {
        const onChainProduct = await this.blockchainService.getProductByCode(
          product.productCode,
        );
        onChainProductId = onChainProduct.productId.toString();
      }

      // Validate against duplicate assignment before attempting database update
      const conflict = await this.prisma.product.findUnique({
        where: { blockchainProductId: onChainProductId },
        select: { id: true, productCode: true },
      });

      if (conflict && conflict.id !== product.id) {
        this.logger.error(
          `Unique constraint conflict: blockchainProductId '${onChainProductId}' is already held by product '${conflict.productCode}' (${conflict.id}) in database`,
        );
        throw new ConflictException(
          `Blockchain Product ID ${onChainProductId} is already assigned to another product (${conflict.productCode})`,
        );
      }

      try {
        await this.prisma.product.update({
          where: { id: product.id },
          data: {
            blockchainProductId: onChainProductId,
            blockchainTxHash: onChainTxHash,
            productHash,
          },
        });
        product.blockchainProductId = onChainProductId;
        product.blockchainTxHash = onChainTxHash;
        product.productHash = productHash;
      } catch (updateErr: any) {
        if (
          updateErr instanceof Prisma.PrismaClientKnownRequestError &&
          updateErr.code === 'P2002'
        ) {
          const recheck = await this.prisma.product.findUnique({
            where: { id: product.id },
            select: { blockchainProductId: true },
          });
          if (recheck?.blockchainProductId === onChainProductId) {
            product.blockchainProductId = onChainProductId;
          } else {
            throw new ConflictException(
              `Blockchain Product ID ${onChainProductId} is already assigned to another product`,
            );
          }
        } else {
          throw updateErr;
        }
      }
    }

    // Ensure product is in valid status on-chain to create shipment
    try {
      const onChainProd = await this.blockchainService.getProduct(
        Number(product.blockchainProductId),
      );
      if (
        onChainProd &&
        onChainProd.status !== 1 && // QUALITY_CHECKED
        onChainProd.status !== 6 && // STORED
        onChainProd.status !== 2 // READY_TO_SHIP
      ) {
        // If product in DB has passed quality check, sync to blockchain
        const passedQc = await this.prisma.qualityCheck.findFirst({
          where: { productId: product.id, result: 'PASSED' },
          orderBy: { createdAt: 'desc' },
        });
        if (passedQc && onChainProd.status === 0) {
          this.logger.log(
            `Syncing passed QC on-chain for product ${product.productCode} before shipment creation...`,
          );
          await this.blockchainService.recordQualityCheck(
            Number(product.blockchainProductId),
            true,
            passedQc.notes || 'Auto-synced quality check pass before shipment',
            dto.signerPrivateKey,
          );
        } else if (onChainProd.status === 0) {
          throw new BadRequestException(
            'สินค้าต้องผ่านการตรวจสอบคุณภาพ (Quality Checked) บน Blockchain ก่อนสร้างการจัดส่ง',
          );
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(
        `Notice checking on-chain status before creating shipment: ${err.message}`,
      );
    }

    // 8. Resolve Ethereum addresses for smart contract
    const receiverWallet =
      receiverOrg.walletAddress || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'; // Standard test wallet fallback
    const carrierWallet =
      carrierOrg?.walletAddress || '0x0000000000000000000000000000000000000000';

    this.logger.log(
      `Creating smart contract shipment: code=${shipmentCode}, productId=${product.blockchainProductId}, receiver=${receiverWallet}`,
    );

    // Call Smart Contract: createShipment
    const onChainReceipt = await this.blockchainService.createShipment(
      shipmentCode,
      BigInt(product.blockchainProductId),
      receiverWallet,
      carrierWallet,
      dto.signerPrivateKey,
    );

    let blockchainShipmentIdStr = onChainReceipt.shipmentId.toString();
    if (!onChainReceipt.shipmentId || onChainReceipt.shipmentId === 0) {
      try {
        const onChainShp = await this.blockchainService.getShipmentByCode(
          shipmentCode,
        );
        if (onChainShp && onChainShp.shipmentId > 0) {
          blockchainShipmentIdStr = onChainShp.shipmentId.toString();
        }
      } catch {
        // ignore
      }
    }

    // 9. Persist Shipment in PostgreSQL
    const shipment = await this.prisma.shipment.create({
      data: {
        shipmentCode,
        productId: product.id,
        senderOrganizationId: product.currentOwnerId,
        receiverOrganizationId: receiverOrg.id,
        carrierOrganizationId: carrierOrg ? carrierOrg.id : null,
        origin: dto.origin.trim(),
        destination: dto.destination.trim(),
        status: ShipmentStatus.PENDING,
        blockchainShipmentId: blockchainShipmentIdStr,
        blockchainTxHash: onChainReceipt.txHash,
      },
      include: {
        product: {
          select: { id: true, productCode: true, name: true, status: true },
        },
        sender: {
          select: { id: true, name: true, code: true, type: true },
        },
        receiver: {
          select: { id: true, name: true, code: true, type: true },
        },
        carrier: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
    });

    // 10. Transition product status to READY_TO_SHIP
    await this.prisma.product.update({
      where: { id: product.id },
      data: { status: ProductStatus.READY_TO_SHIP },
    });

    // 11. Record BlockchainTransaction and AuditLog
    const callerAddress = await this.blockchainService
      .getSigner(dto.signerPrivateKey)
      .getAddress()
      .catch(() => '0x0000000000000000000000000000000000000000');

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
        eventType: 'ShipmentCreated',
        entityType: 'Shipment',
        entityId: onChainReceipt.shipmentId.toString(),
        productId: product.id,
        walletAddress: callerAddress,
        status: TxStatus.CONFIRMED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUser?.id || null,
        organizationId: userOrgId || null,
        action: 'CREATE_SHIPMENT',
        entityType: 'Shipment',
        entityId: shipment.id,
        metadata: {
          shipmentCode,
          productId: product.id,
          senderId: product.currentOwnerId,
          receiverId: receiverOrg.id,
          txHash: onChainReceipt.txHash,
          onChainShipmentId: onChainReceipt.shipmentId,
        },
      },
    });

    return {
      message: 'Shipment created and registered on blockchain smart contract',
      shipment,
      blockchain: {
        txHash: onChainReceipt.txHash,
        blockNumber: onChainReceipt.blockNumber,
        shipmentId: onChainReceipt.shipmentId,
        status: 'CONFIRMED',
      },
    };
  }

  /**
   * Confirms shipment dispatch.
   * Product and Shipment status transition to SHIPPED.
   */
  async ship(
    shipmentIdOrCode: string,
    dto: DispatchShipmentDto,
    currentUser: any,
  ) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        OR: [{ id: shipmentIdOrCode }, { shipmentCode: shipmentIdOrCode }],
      },
      include: {
        product: true,
        sender: true,
        receiver: true,
        carrier: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Shipment '${shipmentIdOrCode}' was not found`,
      );
    }

    if (shipment.status !== ShipmentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot dispatch shipment in status '${shipment.status}'`,
      );
    }

    // Authorization: Must be sender, carrier, logistics role, or admin
    this.assertShipmentActionAccess(shipment, currentUser, 'SHIP');

    // Resolve on-chain product ID
    let onChainProductIdStr = shipment.product.blockchainProductId;
    if (!onChainProductIdStr) {
      try {
        const onChainProd = await this.blockchainService.getProductByCode(
          shipment.product.productCode,
        );
        if (onChainProd && Number(onChainProd.productId) > 0) {
          onChainProductIdStr = onChainProd.productId.toString();
          await this.prisma.product.update({
            where: { id: shipment.productId },
            data: { blockchainProductId: onChainProductIdStr },
          });
          shipment.product.blockchainProductId = onChainProductIdStr;
        }
      } catch {
        // not found
      }
    }

    if (!onChainProductIdStr || Number(onChainProductIdStr) <= 0) {
      this.logger.error(
        `Product '${shipment.product.productCode}' is not registered on blockchain`,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลสินค้าบน Blockchain กรุณาตรวจสอบว่าสินค้าได้รับการลงทะเบียนแล้ว',
      );
    }

    // Resolve on-chain shipment ID
    let onChainShipmentIdStr = shipment.blockchainShipmentId;
    if (!onChainShipmentIdStr) {
      try {
        const onChainShp = await this.blockchainService.getShipmentByCode(
          shipment.shipmentCode,
        );
        if (onChainShp && Number(onChainShp.shipmentId) > 0) {
          onChainShipmentIdStr = onChainShp.shipmentId.toString();
          await this.prisma.shipment.update({
            where: { id: shipment.id },
            data: { blockchainShipmentId: onChainShipmentIdStr },
          });
          shipment.blockchainShipmentId = onChainShipmentIdStr;
        }
      } catch {
        // not found
      }
    }

    if (!onChainShipmentIdStr || Number(onChainShipmentIdStr) <= 0) {
      this.logger.error(
        `Shipment '${shipment.shipmentCode}' (ID: ${shipment.id}) does not exist on blockchain`,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
      );
    }

    // Pre-verify shipment existence on the smart contract before dispatch
    const blockchainShipmentIdNum = Number(onChainShipmentIdStr);
    let onChainShipmentData: any;
    try {
      onChainShipmentData = await this.blockchainService.getShipment(
        blockchainShipmentIdNum,
      );
    } catch (err: any) {
      this.logger.error(
        `Smart contract verification failed for shipment ID ${blockchainShipmentIdNum} (${shipment.shipmentCode}): ${err.message}`,
        err.stack,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
      );
    }

    if (!onChainShipmentData || onChainShipmentData.shipmentId === 0) {
      this.logger.error(
        `Shipment ID ${blockchainShipmentIdNum} has shipmentId 0 on smart contract`,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
      );
    }

    const blockchainProductIdNum = Number(onChainProductIdStr);
    if (onChainShipmentData.productId !== blockchainProductIdNum) {
      this.logger.error(
        `Shipment product mismatch on chain: shipment ${blockchainShipmentIdNum} belongs to product ${onChainShipmentData.productId}, but expected product is ${blockchainProductIdNum}`,
      );
      throw new BadRequestException(
        'ข้อมูลสินค้าไม่ตรงกับข้อมูลการจัดส่งบน Blockchain',
      );
    }

    const onChainProduct = BigInt(blockchainProductIdNum);
    const onChainShipment = BigInt(blockchainShipmentIdNum);

    // Call Smart Contract: shipProduct
    this.logger.log(
      `Executing on-chain dispatch for shipment ${shipment.shipmentCode} (blockchainShipmentId: ${onChainShipmentIdStr})`,
    );

    const onChainReceipt = await this.blockchainService.shipProduct(
      onChainProduct,
      onChainShipment,
      dto.signerPrivateKey,
    );

    // Update database
    const updatedShipment = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: ShipmentStatus.SHIPPED,
        shippedAt: new Date(),
      },
      include: {
        product: true,
        sender: true,
        receiver: true,
        carrier: true,
      },
    });

    await this.prisma.product.update({
      where: { id: shipment.productId },
      data: { status: ProductStatus.SHIPPED },
    });

    const callerAddress = await this.blockchainService
      .getSigner(dto.signerPrivateKey)
      .getAddress()
      .catch(() => '0x0000000000000000000000000000000000000000');

    await this.prisma.blockchainTransaction.upsert({
      where: { txHash: onChainReceipt.txHash },
      update: {
        blockNumber: BigInt(onChainReceipt.blockNumber),
        productId: shipment.productId,
        status: TxStatus.CONFIRMED,
      },
      create: {
        txHash: onChainReceipt.txHash,
        blockNumber: BigInt(onChainReceipt.blockNumber),
        contractAddress: this.blockchainService.getContractAddress(),
        eventType: 'ProductShipped',
        entityType: 'Shipment',
        entityId: shipment.blockchainShipmentId || shipment.id,
        productId: shipment.productId,
        walletAddress: callerAddress,
        status: TxStatus.CONFIRMED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUser?.id || null,
        organizationId: currentUser?.organizationId || null,
        action: 'SHIP_PRODUCT',
        entityType: 'Shipment',
        entityId: shipment.id,
        metadata: {
          shipmentCode: shipment.shipmentCode,
          productId: shipment.productId,
          notes: dto.notes || null,
          txHash: onChainReceipt.txHash,
        },
      },
    });

    return {
      message: 'Product dispatched. Status transitioned to SHIPPED',
      shipment: updatedShipment,
      blockchain: {
        txHash: onChainReceipt.txHash,
        blockNumber: onChainReceipt.blockNumber,
        status: 'CONFIRMED',
      },
    };
  }

  /**
   * Confirms shipment arrival and receipt.
   * Product ownership transfers to the receiving organization.
   */
  async receive(
    shipmentIdOrCode: string,
    dto: ReceiveShipmentDto,
    currentUser: any,
  ) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        OR: [{ id: shipmentIdOrCode }, { shipmentCode: shipmentIdOrCode }],
      },
      include: {
        product: true,
        sender: true,
        receiver: true,
        carrier: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Shipment '${shipmentIdOrCode}' was not found`,
      );
    }

    if (
      shipment.status !== ShipmentStatus.SHIPPED &&
      shipment.status !== ShipmentStatus.IN_TRANSIT
    ) {
      throw new BadRequestException(
        `Cannot receive shipment in status '${shipment.status}'. Must be SHIPPED or IN_TRANSIT.`,
      );
    }

    // Authorization: Must be receiving organization or super admin
    this.assertShipmentActionAccess(shipment, currentUser, 'RECEIVE');

    // Resolve on-chain product ID
    let onChainProductIdStr = shipment.product.blockchainProductId;
    if (!onChainProductIdStr) {
      try {
        const onChainProd = await this.blockchainService.getProductByCode(
          shipment.product.productCode,
        );
        if (onChainProd && Number(onChainProd.productId) > 0) {
          onChainProductIdStr = onChainProd.productId.toString();
          await this.prisma.product.update({
            where: { id: shipment.productId },
            data: { blockchainProductId: onChainProductIdStr },
          });
          shipment.product.blockchainProductId = onChainProductIdStr;
        }
      } catch {
        // not found
      }
    }

    if (!onChainProductIdStr || Number(onChainProductIdStr) <= 0) {
      this.logger.error(
        `Product '${shipment.product.productCode}' is not registered on blockchain`,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลสินค้าบน Blockchain กรุณาตรวจสอบว่าสินค้าได้รับการลงทะเบียนแล้ว',
      );
    }

    // Resolve on-chain shipment ID
    let onChainShipmentIdStr = shipment.blockchainShipmentId;
    if (!onChainShipmentIdStr) {
      try {
        const onChainShp = await this.blockchainService.getShipmentByCode(
          shipment.shipmentCode,
        );
        if (onChainShp && Number(onChainShp.shipmentId) > 0) {
          onChainShipmentIdStr = onChainShp.shipmentId.toString();
          await this.prisma.shipment.update({
            where: { id: shipment.id },
            data: { blockchainShipmentId: onChainShipmentIdStr },
          });
          shipment.blockchainShipmentId = onChainShipmentIdStr;
        }
      } catch {
        // not found
      }
    }

    if (!onChainShipmentIdStr || Number(onChainShipmentIdStr) <= 0) {
      this.logger.error(
        `Shipment '${shipment.shipmentCode}' (ID: ${shipment.id}) does not exist on blockchain`,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
      );
    }

    // Pre-verify shipment existence on the smart contract before receiving
    const blockchainShipmentIdNum = Number(onChainShipmentIdStr);
    let onChainShipmentData: any;
    try {
      onChainShipmentData = await this.blockchainService.getShipment(
        blockchainShipmentIdNum,
      );
    } catch (err: any) {
      this.logger.error(
        `Smart contract verification failed for shipment ID ${blockchainShipmentIdNum} (${shipment.shipmentCode}): ${err.message}`,
        err.stack,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
      );
    }

    if (!onChainShipmentData || onChainShipmentData.shipmentId === 0) {
      this.logger.error(
        `Shipment ID ${blockchainShipmentIdNum} has shipmentId 0 on smart contract`,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
      );
    }

    const blockchainProductIdNum = Number(onChainProductIdStr);
    if (onChainShipmentData.productId !== blockchainProductIdNum) {
      this.logger.error(
        `Shipment product mismatch on chain: shipment ${blockchainShipmentIdNum} belongs to product ${onChainShipmentData.productId}, but expected product is ${blockchainProductIdNum}`,
      );
      throw new BadRequestException(
        'ข้อมูลสินค้าไม่ตรงกับข้อมูลการจัดส่งบน Blockchain',
      );
    }

    const onChainProduct = BigInt(blockchainProductIdNum);
    const onChainShipment = BigInt(blockchainShipmentIdNum);

    // Call Smart Contract: receiveProduct
    this.logger.log(
      `Executing on-chain receipt & ownership transfer for shipment ${shipment.shipmentCode} (blockchainShipmentId: ${onChainShipmentIdStr})`,
    );

    const onChainReceipt = await this.blockchainService.receiveProduct(
      onChainProduct,
      onChainShipment,
      dto.signerPrivateKey,
    );

    // Update Shipment to DELIVERED
    const updatedShipment = await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: ShipmentStatus.DELIVERED,
        receivedAt: new Date(),
      },
      include: {
        product: true,
        sender: true,
        receiver: true,
        carrier: true,
      },
    });

    // Update Product: status = RECEIVED, currentOwnerId = receiverOrganizationId
    const updatedProduct = await this.prisma.product.update({
      where: { id: shipment.productId },
      data: {
        status: ProductStatus.RECEIVED,
        currentOwnerId: shipment.receiverOrganizationId,
      },
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    const callerAddress = await this.blockchainService
      .getSigner(dto.signerPrivateKey)
      .getAddress()
      .catch(() => '0x0000000000000000000000000000000000000000');

    await this.prisma.blockchainTransaction.upsert({
      where: { txHash: onChainReceipt.txHash },
      update: {
        blockNumber: BigInt(onChainReceipt.blockNumber),
        productId: shipment.productId,
        status: TxStatus.CONFIRMED,
      },
      create: {
        txHash: onChainReceipt.txHash,
        blockNumber: BigInt(onChainReceipt.blockNumber),
        contractAddress: this.blockchainService.getContractAddress(),
        eventType: 'ProductReceived',
        entityType: 'Shipment',
        entityId: shipment.blockchainShipmentId || shipment.id,
        productId: shipment.productId,
        walletAddress: callerAddress,
        status: TxStatus.CONFIRMED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUser?.id || null,
        organizationId: currentUser?.organizationId || null,
        action: 'RECEIVE_SHIPMENT_AND_TRANSFER_OWNERSHIP',
        entityType: 'Product',
        entityId: shipment.productId,
        metadata: {
          shipmentCode: shipment.shipmentCode,
          previousOwnerId: shipment.senderOrganizationId,
          newOwnerId: shipment.receiverOrganizationId,
          notes: dto.notes || null,
          txHash: onChainReceipt.txHash,
        },
      },
    });

    return {
      message:
        'Shipment received successfully. Ownership transferred to recipient organization on blockchain',
      shipment: updatedShipment,
      product: updatedProduct,
      blockchain: {
        txHash: onChainReceipt.txHash,
        blockNumber: onChainReceipt.blockNumber,
        status: 'CONFIRMED',
      },
    };
  }

  /**
   * Dispatches shipment by product UUID or product code.
   */
  async shipByProductId(
    productId: string,
    dto: DispatchShipmentDto,
    currentUser: any,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { productCode: productId }],
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    const shipment = await this.prisma.shipment.findFirst({
      where: {
        productId: product.id,
        status: ShipmentStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!shipment) {
      throw new NotFoundException(
        `No pending shipment found for product '${product.productCode}'`,
      );
    }

    return this.ship(shipment.id, dto, currentUser);
  }

  /**
   * Confirms receipt by product UUID or product code.
   */
  async receiveByProductId(
    productId: string,
    dto: ReceiveShipmentDto,
    currentUser: any,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { productCode: productId }],
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    const shipment = await this.prisma.shipment.findFirst({
      where: {
        productId: product.id,
        status: { in: [ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!shipment) {
      throw new NotFoundException(
        `No dispatched in-transit shipment found for product '${product.productCode}'`,
      );
    }

    return this.receive(shipment.id, dto, currentUser);
  }

  /**
   * Direct manual ownership transfer for a product.
   */
  async transferOwnership(
    productId: string,
    dto: TransferOwnershipDto,
    currentUser: any,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { productCode: productId }],
      },
      include: {
        manufacturer: true,
        currentOwner: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }

    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin) {
      if (
        !currentUser?.organizationId ||
        currentUser.organizationId !== product.currentOwnerId
      ) {
        throw new ForbiddenException(
          'Only the current owner or super admin can transfer ownership',
        );
      }
    }

    const targetOrg = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { id: dto.newOwnerOrganizationId },
          { code: dto.newOwnerOrganizationId },
        ],
      },
    });

    if (!targetOrg) {
      throw new NotFoundException(
        `Target organization '${dto.newOwnerOrganizationId}' not found`,
      );
    }

    if (targetOrg.id === product.currentOwnerId) {
      throw new BadRequestException('Cannot transfer ownership to yourself');
    }

    const targetWallet =
      targetOrg.walletAddress || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

    let onChainProductIdStr = product.blockchainProductId;
    if (!onChainProductIdStr) {
      try {
        const onChainProd = await this.blockchainService.getProductByCode(
          product.productCode,
        );
        if (onChainProd && Number(onChainProd.productId) > 0) {
          onChainProductIdStr = onChainProd.productId.toString();
          await this.prisma.product.update({
            where: { id: product.id },
            data: { blockchainProductId: onChainProductIdStr },
          });
          product.blockchainProductId = onChainProductIdStr;
        }
      } catch {
        // not found
      }
    }

    if (!onChainProductIdStr || Number(onChainProductIdStr) <= 0) {
      this.logger.error(
        `Product '${product.productCode}' is not registered on blockchain`,
      );
      throw new ConflictException(
        'ไม่พบข้อมูลสินค้าบน Blockchain กรุณาตรวจสอบว่าสินค้าได้รับการลงทะเบียนแล้ว',
      );
    }

    const onChainProduct = BigInt(onChainProductIdStr);

    const onChainReceipt = await this.blockchainService.transferOwnership(
      onChainProduct,
      targetWallet,
      dto.signerPrivateKey,
    );

    const updatedProduct = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        currentOwnerId: targetOrg.id,
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
        action: 'TRANSFER_OWNERSHIP',
        entityType: 'Product',
        entityId: product.id,
        metadata: {
          previousOwnerId: product.currentOwnerId,
          newOwnerId: targetOrg.id,
          txHash: onChainReceipt.txHash,
          notes: dto.notes || null,
        },
      },
    });

    return {
      message: `Ownership successfully transferred to '${targetOrg.name}'`,
      product: updatedProduct,
      blockchain: {
        txHash: onChainReceipt.txHash,
        blockNumber: onChainReceipt.blockNumber,
        status: 'CONFIRMED',
      },
    };
  }

  /**
   * Retrieves paginated shipments with data isolation.
   */
  async findAll(query: QueryShipmentDto, currentUser: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ShipmentWhereInput = {};

    // Multi-tenant isolation filter
    const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
    const isAuditor =
      currentUser?.role === UserRole.AUDITOR ||
      currentUser?.organization?.type === OrganizationType.AUDITOR;

    if (!isSuperAdmin && !isAuditor) {
      const orgId = currentUser?.organizationId;
      if (!orgId) {
        throw new ForbiddenException(
          'User must belong to an organization to view shipments',
        );
      }
      where.OR = [
        { senderOrganizationId: orgId },
        { receiverOrganizationId: orgId },
        { carrierOrganizationId: orgId },
      ];
    }

    if (query.productId) {
      where.OR = [
        { productId: query.productId },
        { product: { productCode: query.productId } },
      ];
    }

    if (query.senderId) {
      where.senderOrganizationId = query.senderId;
    }
    if (query.receiverId) {
      where.receiverOrganizationId = query.receiverId;
    }
    if (query.carrierId) {
      where.carrierOrganizationId = query.carrierId;
    }
    if (query.status) {
      where.status = query.status.toUpperCase() as ShipmentStatus;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { shipmentCode: { contains: term, mode: 'insensitive' } },
            { origin: { contains: term, mode: 'insensitive' } },
            { destination: { contains: term, mode: 'insensitive' } },
            {
              product: { productCode: { contains: term, mode: 'insensitive' } },
            },
            { product: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({
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
            },
          },
          sender: {
            select: { id: true, name: true, code: true, type: true },
          },
          receiver: {
            select: { id: true, name: true, code: true, type: true },
          },
          carrier: {
            select: { id: true, name: true, code: true, type: true },
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
   * Retrieves single shipment by ID or shipment code.
   */
  async findOne(idOrCode: string, currentUser: any) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        OR: [{ id: idOrCode }, { shipmentCode: idOrCode }],
      },
      include: {
        product: {
          include: {
            manufacturer: true,
            currentOwner: true,
          },
        },
        sender: true,
        receiver: true,
        carrier: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment '${idOrCode}' not found`);
    }

    // Authorization
    this.assertShipmentViewAccess(shipment, currentUser);

    return shipment;
  }

  /**
   * Retrieves shipments for a specific product.
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
   * Assert user is authorized to perform action (SHIP or RECEIVE) on shipment.
   */
  private assertShipmentActionAccess(
    shipment: any,
    currentUser: any,
    action: 'SHIP' | 'RECEIVE',
  ) {
    if (currentUser?.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const orgId = currentUser?.organizationId;
    if (!orgId) {
      throw new ForbiddenException(
        'User must belong to an organization to perform shipment operations',
      );
    }

    if (action === 'SHIP') {
      const isSender = shipment.senderOrganizationId === orgId;
      const isCarrier = shipment.carrierOrganizationId === orgId;
      const isLogisticsOrg =
        currentUser.organization?.type === OrganizationType.LOGISTICS;

      if (!isSender && !isCarrier && !isLogisticsOrg) {
        throw new ForbiddenException(
          'Access denied: Only sender or assigned carrier can dispatch the shipment',
        );
      }
    } else if (action === 'RECEIVE') {
      const isReceiver = shipment.receiverOrganizationId === orgId;
      if (!isReceiver) {
        throw new ForbiddenException(
          'Access denied: Only the specified receiving organization can confirm receipt of this shipment',
        );
      }
    }
  }

  /**
   * Assert user has access to view a specific shipment.
   */
  private assertShipmentViewAccess(shipment: any, currentUser: any) {
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
        'Access denied: User belongs to no organization',
      );
    }

    const isParty =
      shipment.senderOrganizationId === orgId ||
      shipment.receiverOrganizationId === orgId ||
      shipment.carrierOrganizationId === orgId;

    if (!isParty) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view shipments for another organization',
      );
    }
  }
}
