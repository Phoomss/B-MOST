import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  QualityCheckResult,
  ShipmentStatus,
  TxStatus,
  UserRole,
} from '@prisma/client';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import {
  BlockchainAction,
  ProductStateMachineService,
} from './product-state-machine.service';
import {
  ConfirmBlockchainActionDto,
  PrepareBlockchainActionDto,
  PrepareRoleChangeDto,
  UserSignedAction,
} from './dto/blockchain-action.dto';

const ZERO_ADDRESS = ethers.ZeroAddress;
const EVENTS: Record<UserSignedAction, string> = {
  [UserSignedAction.REGISTER_PRODUCT]: 'ProductRegistered',
  [UserSignedAction.QUALITY_CHECK]: 'QualityChecked',
  [UserSignedAction.CREATE_SHIPMENT]: 'ShipmentCreated',
  [UserSignedAction.SHIP_PRODUCT]: 'ProductShipped',
  [UserSignedAction.MARK_IN_TRANSIT]: 'ShipmentInTransit',
  [UserSignedAction.RECEIVE_PRODUCT]: 'ProductReceived',
  [UserSignedAction.STORE_PRODUCT]: 'ProductStored',
  [UserSignedAction.MARK_SOLD]: 'ProductSold',
  [UserSignedAction.TRANSFER_OWNERSHIP]: 'OwnershipTransferred',
  [UserSignedAction.RECALL_PRODUCT]: 'ProductRecalled',
};

const NEXT_STATUS: Partial<Record<UserSignedAction, ProductStatus>> = {
  [UserSignedAction.REGISTER_PRODUCT]: ProductStatus.REGISTERED,
  [UserSignedAction.CREATE_SHIPMENT]: ProductStatus.READY_TO_SHIP,
  [UserSignedAction.SHIP_PRODUCT]: ProductStatus.SHIPPED,
  [UserSignedAction.MARK_IN_TRANSIT]: ProductStatus.IN_TRANSIT,
  [UserSignedAction.RECEIVE_PRODUCT]: ProductStatus.RECEIVED,
  [UserSignedAction.STORE_PRODUCT]: ProductStatus.STORED,
  [UserSignedAction.MARK_SOLD]: ProductStatus.SOLD,
  [UserSignedAction.RECALL_PRODUCT]: ProductStatus.RECALLED,
};

type AuthUser = {
  id: string;
  role: UserRole;
  organizationId: string | null;
  walletAddress: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
};

@Injectable()
export class BlockchainActionService {
  private readonly logger = new Logger(BlockchainActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly stateMachine: ProductStateMachineService,
  ) {}

  private wallet(user: AuthUser): string {
    if (!user.walletAddress || !ethers.isAddress(user.walletAddress)) {
      throw new ForbiddenException(
        'กรุณากำหนด walletAddress ให้บัญชีผู้ใช้ก่อนทำธุรกรรม',
      );
    }
    return ethers.getAddress(user.walletAddress);
  }

  private sameAddress(a: string | null | undefined, b: string): boolean {
    return Boolean(
      a && ethers.isAddress(a) && ethers.getAddress(a) === ethers.getAddress(b),
    );
  }

  private assertRole(user: AuthUser, allowed: UserRole[]) {
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException('บทบาทผู้ใช้ไม่อนุญาตให้ทำรายการนี้');
    }
  }

  private assertOrganization(
    user: AuthUser,
    orgId: string,
    orgWallet: string | null,
    wallet: string,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN && user.organizationId !== orgId) {
      throw new ForbiddenException('องค์กรของผู้ใช้ไม่ตรงกับรายการนี้');
    }
    if (!this.sameAddress(orgWallet, wallet)) {
      throw new ConflictException(
        'walletAddress ขององค์กรไม่ตรงกับบัญชีผู้ใช้',
      );
    }
  }

  private assertReference(
    entity: {
      blockchainChainId: number | null;
      blockchainContractAddress: string | null;
      blockchainProductId?: string | null;
      blockchainShipmentId?: string | null;
    },
    id: string | null | undefined,
  ) {
    if (
      !id ||
      entity.blockchainChainId !== 11155111 ||
      entity.blockchainContractAddress?.toLowerCase() !==
        this.blockchain.getContractAddress().toLowerCase()
    ) {
      throw new ConflictException(
        'BLOCKCHAIN_NETWORK_MISMATCH: ข้อมูลอ้างอิง Blockchain ไม่ใช่สัญญา Sepolia ปัจจุบัน',
      );
    }
  }

  private async product(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id }, { productCode: id }] },
      include: { manufacturer: true, currentOwner: true },
    });
    if (!product) throw new NotFoundException('ไม่พบสินค้า');
    return product;
  }

  private async shipment(id: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { OR: [{ id }, { shipmentCode: id }] },
      include: {
        product: { include: { manufacturer: true, currentOwner: true } },
        sender: true,
        receiver: true,
        carrier: true,
      },
    });
    if (!shipment) throw new NotFoundException('ไม่พบการจัดส่ง');
    return shipment;
  }

  private async onChainProduct(
    product: Awaited<ReturnType<BlockchainActionService['product']>>,
    action: UserSignedAction,
  ) {
    this.assertReference(product, product.blockchainProductId);
    const live = await this.blockchain.getProduct(
      BigInt(product.blockchainProductId!),
    );
    if (
      live.productCode !== product.productCode ||
      (product.productHash &&
        live.productHash.toLowerCase() !== product.productHash.toLowerCase())
    ) {
      throw new ConflictException(
        'BLOCKCHAIN_PRODUCT_MISMATCH: สินค้าบน Blockchain ไม่ตรงกับฐานข้อมูล',
      );
    }
    this.stateMachine.checkStateMismatch(
      product.status,
      Number(live.status),
      product.productCode,
      product.id,
      product.blockchainProductId || undefined,
      action as BlockchainAction,
      this.blockchain.getContractAddress(),
    );
    this.stateMachine.validateTransition(
      Number(live.status),
      action as BlockchainAction,
      product.productCode,
      product.id,
      product.blockchainProductId!,
      product.status,
      this.blockchain.getContractAddress(),
    );
    return live;
  }

  private async onChainShipment(
    shipment: Awaited<ReturnType<BlockchainActionService['shipment']>>,
  ) {
    this.assertReference(shipment, shipment.blockchainShipmentId);
    const live = await this.blockchain.getShipment(
      BigInt(shipment.blockchainShipmentId!),
    );
    if (
      String(live.productId) !== shipment.product.blockchainProductId ||
      live.shipmentCode !== shipment.shipmentCode
    ) {
      throw new ConflictException(
        'SHIPMENT_PRODUCT_MISMATCH: การจัดส่งบน Blockchain ไม่ตรงกับฐานข้อมูล',
      );
    }
    return live;
  }

  private mapRevert(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Sepolia simulation rejected: ${message}`);
    const known: Record<string, string> = {
      PRODUCT_NOT_FOUND: 'ไม่พบสินค้าบน Blockchain',
      SHIPMENT_NOT_FOUND: 'ไม่พบการจัดส่งบน Blockchain',
      INVALID_STATE_TRANSITION: 'สถานะสินค้าปัจจุบันไม่รองรับการดำเนินการนี้',
      NOT_CURRENT_OWNER: 'wallet ที่เชื่อมต่อไม่ใช่เจ้าของสินค้าปัจจุบัน',
      UNAUTHORIZED_ACTION: 'wallet นี้ไม่มีสิทธิ์ทำรายการบนสัญญา',
      SHIPMENT_PRODUCT_MISMATCH: 'สินค้าไม่ตรงกับรายการจัดส่ง',
      CANNOT_TRANSFER_TO_SELF: 'ไม่สามารถโอนสินค้าให้ wallet เดิมได้',
      INVALID_RECIPIENT: 'wallet ผู้รับไม่ถูกต้อง',
    };
    for (const [code, translated] of Object.entries(known)) {
      if (message.includes(code))
        throw new BadRequestException(`${code}: ${translated}`);
    }
    throw new BadRequestException(
      'สัญญาไม่ยอมรับรายการนี้ กรุณาตรวจสถานะสินค้า สิทธิ์ wallet และ Sepolia ETH',
    );
  }

  async getRoles(targetWallet: string) {
    if (!ethers.isAddress(targetWallet)) throw new BadRequestException('walletAddress ไม่ถูกต้อง');
    const contract = this.blockchain.getReadOnlyContract();
    const roles = ['DISTRIBUTOR_ROLE', 'WAREHOUSE_ROLE', 'RETAILER_ROLE'] as const;
    const entries = await Promise.all(roles.map(async (role) => {
      const roleHash: string = await contract[role]();
      const granted: boolean = await contract.hasRole(roleHash, targetWallet);
      return [role, granted] as const;
    }));
    return { targetWallet: ethers.getAddress(targetWallet), roles: Object.fromEntries(entries) };
  }

  async prepareRoleChange(dto: PrepareRoleChangeDto, user: AuthUser) {
    this.assertRole(user, [UserRole.SUPER_ADMIN]);
    const wallet = this.wallet(user);
    const contract = this.blockchain.getReadOnlyContract();
    const roleHash: string = await contract[dto.role]();
    const adminHash: string = await contract.DEFAULT_ADMIN_ROLE();
    if (!(await contract.hasRole(adminHash, wallet))) {
      throw new ForbiddenException('wallet ของผู้ดูแลระบบไม่มี DEFAULT_ADMIN_ROLE บนสัญญา');
    }
    const target = ethers.getAddress(dto.targetWallet);
    const current: boolean = await contract.hasRole(roleHash, target);
    if ((dto.action === 'grantRole' && current) || (dto.action === 'revokeRole' && !current)) {
      throw new ConflictException('บทบาทของ wallet นี้อยู่ในสถานะที่ร้องขอแล้ว');
    }
    const data = contract.interface.encodeFunctionData(dto.action, [roleHash, target]);
    try {
      await this.blockchain.getProvider().call({ to: this.blockchain.getContractAddress(), from: wallet, data });
    } catch (error) {
      this.mapRevert(error);
    }
    return {
      functionName: dto.action,
      args: [roleHash, target],
      expectedWallet: wallet,
      contractAddress: this.blockchain.getContractAddress(),
      chainId: 11155111,
      role: dto.role,
      targetWallet: target,
    };
  }

  async prepare(dto: PrepareBlockchainActionDto, user: AuthUser) {
    const wallet = this.wallet(user);
    const status = await this.blockchain.getStatus();
    if (!status.connected || status.chainId !== 11155111) {
      throw new BadRequestException('RPC ต้องเชื่อมต่อ Sepolia ก่อนทำธุรกรรม');
    }

    let product: Awaited<ReturnType<BlockchainActionService['product']>>;
    let shipment: Awaited<
      ReturnType<BlockchainActionService['shipment']>
    > | null = null;
    if (
      [
        UserSignedAction.SHIP_PRODUCT,
        UserSignedAction.MARK_IN_TRANSIT,
        UserSignedAction.RECEIVE_PRODUCT,
      ].includes(dto.action)
    ) {
      shipment = await this.shipment(dto.entityId);
      product = shipment.product;
    } else {
      product = await this.product(dto.entityId);
    }

    let args: string[] = [];
    let metadata: Record<string, string> = {};
    let draftShipment: { id: string } | null = null;
    let liveStatus: number | null = null;
    const productId = product.blockchainProductId;
    const ownerWallet = product.currentOwner.walletAddress;

    if (dto.action === UserSignedAction.REGISTER_PRODUCT) {
      this.assertRole(user, [UserRole.SUPER_ADMIN, UserRole.MANUFACTURER]);
      this.assertOrganization(
        user,
        product.manufacturerId,
        product.manufacturer.walletAddress,
        wallet,
      );
      if (productId)
        throw new ConflictException('สินค้าลงทะเบียนบน Blockchain แล้ว');
      if (!product.productHash)
        throw new ConflictException('สินค้าไม่มี productHash');
      args = [product.productCode, product.productHash];
    } else {
      const live = await this.onChainProduct(product, dto.action);
      liveStatus = Number(live.status);
      if (dto.action === UserSignedAction.QUALITY_CHECK) {
        this.assertRole(user, [
          UserRole.SUPER_ADMIN,
          UserRole.MANUFACTURER,
          UserRole.AUDITOR,
        ]);
        if (
          user.role !== UserRole.SUPER_ADMIN &&
          user.organizationId !== product.manufacturerId &&
          user.organizationId !== product.currentOwnerId
        ) {
          throw new ForbiddenException('องค์กรนี้ตรวจคุณภาพสินค้านี้ไม่ได้');
        }
        if (typeof dto.passed !== 'boolean')
          throw new BadRequestException('กรุณาระบุผลการตรวจคุณภาพ');
        args = [productId!, String(dto.passed), dto.notes?.trim() || ''];
      } else if (dto.action === UserSignedAction.CREATE_SHIPMENT) {
        this.assertRole(user, [
          UserRole.SUPER_ADMIN,
          UserRole.MANUFACTURER,
          UserRole.DISTRIBUTOR,
          UserRole.WAREHOUSE,
        ]);
        this.assertOrganization(
          user,
          product.currentOwnerId,
          ownerWallet,
          wallet,
        );
        if (
          !dto.receiverOrganizationId ||
          !dto.origin?.trim() ||
          !dto.destination?.trim()
        ) {
          throw new BadRequestException(
            'กรุณาระบุองค์กรผู้รับ ต้นทาง และปลายทาง',
          );
        }
        const receiver = await this.prisma.organization.findUnique({
          where: { id: dto.receiverOrganizationId },
        });
        if (
          !receiver ||
          !receiver.walletAddress ||
          !ethers.isAddress(receiver.walletAddress)
        ) {
          throw new BadRequestException(
            'องค์กรผู้รับยังไม่มี walletAddress ที่ถูกต้อง',
          );
        }
        if (this.sameAddress(receiver.walletAddress, wallet)) {
          throw new BadRequestException(
            'ไม่สามารถสร้างการจัดส่งให้ wallet เดิม',
          );
        }
        const carrier = dto.carrierOrganizationId
          ? await this.prisma.organization.findUnique({
              where: { id: dto.carrierOrganizationId },
            })
          : null;
        if (
          dto.carrierOrganizationId &&
          (!carrier ||
            !carrier.walletAddress ||
            !ethers.isAddress(carrier.walletAddress))
        ) {
          throw new BadRequestException(
            'walletAddress ขององค์กรขนส่งไม่ถูกต้อง',
          );
        }
        const shipmentCode =
          dto.shipmentCode?.trim() ||
          `SHP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (
          await this.prisma.shipment.findUnique({ where: { shipmentCode } })
        ) {
          throw new ConflictException('รหัสการจัดส่งซ้ำ');
        }
        args = [
          shipmentCode,
          productId!,
          receiver.walletAddress,
          carrier?.walletAddress || ZERO_ADDRESS,
        ];
        metadata = {
          receiverOrganizationId: receiver.id,
          carrierOrganizationId: carrier?.id || '',
          origin: dto.origin.trim(),
          destination: dto.destination.trim(),
        };
      } else if (shipment) {
        this.assertReference(shipment, shipment.blockchainShipmentId);
        const liveShipment = await this.onChainShipment(shipment);
        const expectedShipmentStatus =
          dto.action === UserSignedAction.SHIP_PRODUCT
            ? 0
            : dto.action === UserSignedAction.MARK_IN_TRANSIT
              ? 1
              : null;
        if (
          expectedShipmentStatus !== null &&
          Number(liveShipment.status) !== expectedShipmentStatus
        ) {
          throw new ConflictException(
            'BLOCKCHAIN_STATE_MISMATCH: สถานะการจัดส่งไม่ตรงกับขั้นตอนที่ร้องขอ',
          );
        }
        if (dto.action === UserSignedAction.RECEIVE_PRODUCT) {
          this.assertRole(user, [
            UserRole.SUPER_ADMIN,
            UserRole.DISTRIBUTOR,
            UserRole.WAREHOUSE,
            UserRole.RETAILER,
          ]);
          this.assertOrganization(
            user,
            shipment.receiverOrganizationId,
            shipment.receiver.walletAddress,
            wallet,
          );
        } else {
          this.assertRole(user, [
            UserRole.SUPER_ADMIN,
            UserRole.MANUFACTURER,
            UserRole.DISTRIBUTOR,
            UserRole.WAREHOUSE,
          ]);
          if (
            !this.sameAddress(shipment.sender.walletAddress, wallet) &&
            !this.sameAddress(shipment.carrier?.walletAddress, wallet)
          ) {
            throw new ForbiddenException('wallet ไม่ใช่ผู้ส่งหรือผู้ขนส่ง');
          }
        }
        args = [productId!, shipment.blockchainShipmentId!];
      } else if (
        dto.action === UserSignedAction.STORE_PRODUCT ||
        dto.action === UserSignedAction.MARK_SOLD
      ) {
        this.assertRole(
          user,
          dto.action === UserSignedAction.STORE_PRODUCT
            ? [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE]
            : [UserRole.SUPER_ADMIN, UserRole.RETAILER],
        );
        // Distributor, Warehouse and Retailer may share Account 2; app role remains JWT based.
        if (
          !this.sameAddress(ownerWallet, wallet) ||
          !this.sameAddress(live.currentOwner, wallet)
        ) {
          throw new ForbiddenException('wallet ไม่ใช่เจ้าของสินค้าปัจจุบัน');
        }
        args = [productId!];
      } else if (dto.action === UserSignedAction.TRANSFER_OWNERSHIP) {
        this.assertRole(user, [
          UserRole.SUPER_ADMIN,
          UserRole.MANUFACTURER,
          UserRole.DISTRIBUTOR,
          UserRole.WAREHOUSE,
          UserRole.RETAILER,
        ]);
        this.assertOrganization(
          user,
          product.currentOwnerId,
          ownerWallet,
          wallet,
        );
        const target = dto.newOwnerOrganizationId
          ? await this.prisma.organization.findUnique({
              where: { id: dto.newOwnerOrganizationId },
            })
          : null;
        if (
          !target ||
          !target.walletAddress ||
          !ethers.isAddress(target.walletAddress)
        ) {
          throw new BadRequestException(
            'องค์กรผู้รับโอนยังไม่มี walletAddress',
          );
        }
        if (this.sameAddress(target.walletAddress, wallet))
          throw new BadRequestException('ไม่สามารถโอนให้ wallet เดิม');
        args = [productId!, target.walletAddress];
        metadata = { newOwnerOrganizationId: target.id };
      } else if (dto.action === UserSignedAction.RECALL_PRODUCT) {
        this.assertRole(user, [
          UserRole.SUPER_ADMIN,
          UserRole.MANUFACTURER,
          UserRole.AUDITOR,
        ]);
        if (!dto.notes?.trim())
          throw new BadRequestException('กรุณาระบุเหตุผลการเรียกคืน');
        args = [productId!, dto.notes.trim()];
      }
    }

    const contract = this.blockchain.getReadOnlyContract();
    const data = contract.interface.encodeFunctionData(
      dto.action,
      args.map((value, index) => {
        const input = contract.interface.getFunction(dto.action)?.inputs[index];
        if (input?.type.startsWith('uint')) return BigInt(value);
        if (input?.type === 'bool') return value === 'true';
        return value;
      }),
    );
    try {
      await this.blockchain
        .getProvider()
        .call({ to: this.blockchain.getContractAddress(), from: wallet, data });
    } catch (error) {
      this.mapRevert(error);
    }

    const prepared = await this.prisma.$transaction(async (tx) => {
      if (dto.action === UserSignedAction.CREATE_SHIPMENT) {
        draftShipment = await tx.shipment.create({
          data: {
            shipmentCode: args[0],
            productId: product.id,
            senderOrganizationId: product.currentOwnerId,
            receiverOrganizationId: metadata.receiverOrganizationId,
            carrierOrganizationId: metadata.carrierOrganizationId || null,
            origin: metadata.origin,
            destination: metadata.destination,
            status: ShipmentStatus.PENDING,
          },
        });
      }
      return tx.blockchainActionIntent.create({
        data: {
          userId: user.id,
          action: dto.action,
          entityType:
            dto.action === UserSignedAction.CREATE_SHIPMENT || shipment
              ? 'Shipment'
              : 'Product',
          entityId: draftShipment?.id || shipment?.id || product.id,
          functionName: dto.action,
          args,
          metadata,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    });
    this.logger.log(
      `Prepared ${dto.action}: productDbId=${product.id}, blockchainProductId=${productId || 'N/A'}, code=${product.productCode}, dbStatus=${product.status}, blockchainStatus=${liveStatus ?? 'N/A'}, contract=${this.blockchain.getContractAddress()}`,
    );
    return {
      intentId: prepared.id,
      functionName: dto.action,
      args,
      expectedWallet: wallet,
      chainId: 11155111,
      contractAddress: this.blockchain.getContractAddress(),
      productDbId: product.id,
      shipmentDbId:
        prepared.entityType === 'Shipment' ? prepared.entityId : null,
      expiresAt: prepared.expiresAt,
    };
  }

  async confirm(dto: ConfirmBlockchainActionDto, user: AuthUser) {
    const wallet = this.wallet(user);
    const intent = await this.prisma.blockchainActionIntent.findUnique({
      where: { id: dto.intentId },
    });
    if (!intent || intent.userId !== user.id)
      throw new NotFoundException('ไม่พบคำขอธุรกรรม');
    if (intent.status === 'CONFIRMED') {
      if (
        intent.transactionHash?.toLowerCase() !==
        dto.transactionHash.toLowerCase()
      ) {
        throw new ConflictException('คำขอนี้ผูกกับธุรกรรมอื่นแล้ว');
      }
      return {
        verified: true,
        synced: true,
        transactionHash: intent.transactionHash,
      };
    }
    if (intent.status !== 'PENDING')
      throw new ConflictException('คำขอธุรกรรมนี้ใช้งานไม่ได้');
    const provider = this.blockchain.getProvider();
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n)
      throw new BadRequestException('RPC ไม่ใช่ Sepolia');
    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(dto.transactionHash),
      provider.getTransactionReceipt(dto.transactionHash),
    ]);
    if (!transaction || !receipt)
      throw new NotFoundException('ธุรกรรมยังไม่ยืนยันบน Sepolia');
    const previousIntent = await this.prisma.blockchainActionIntent.findFirst({
      where: { transactionHash: receipt.hash, id: { not: intent.id } },
      select: { id: true },
    });
    if (previousIntent) {
      throw new ConflictException('ธุรกรรมนี้ถูกใช้ยืนยันคำขออื่นแล้ว');
    }
    const address = this.blockchain.getContractAddress();
    if (
      transaction.to?.toLowerCase() !== address.toLowerCase() ||
      receipt.to?.toLowerCase() !== address.toLowerCase() ||
      !this.sameAddress(transaction.from, wallet) ||
      !this.sameAddress(receipt.from, wallet) ||
      receipt.status !== 1
    ) {
      throw new ForbiddenException(
        'ธุรกรรมไม่สำเร็จหรือผู้ส่ง/สัญญาไม่ตรงกับคำขอ',
      );
    }
    const contract = this.blockchain.getReadOnlyContract();
    const decoded = contract.interface.parseTransaction({
      data: transaction.data,
      value: transaction.value,
    });
    if (!decoded || decoded.name !== intent.functionName)
      throw new ConflictException('ฟังก์ชันในธุรกรรมไม่ตรงกับคำขอ');
    const args = intent.args as string[];
    const encoded = contract.interface.encodeFunctionData(
      intent.functionName,
      args.map((value, index) => {
        const input = contract.interface.getFunction(intent.functionName)
          ?.inputs[index];
        if (input?.type.startsWith('uint')) return BigInt(value);
        if (input?.type === 'bool') return value === 'true';
        return value;
      }),
    );
    if (encoded.toLowerCase() !== transaction.data.toLowerCase()) {
      throw new ConflictException('ข้อมูลธุรกรรมไม่ตรงกับคำขอที่เตรียมไว้');
    }
    const expectedEvent = EVENTS[intent.action as UserSignedAction];
    const logs = receipt.logs
      .filter((log) => log.address.toLowerCase() === address.toLowerCase())
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      });
    const event = logs.find((log) => log?.name === expectedEvent);
    if (!event)
      throw new ConflictException(`ไม่พบ event ${expectedEvent} จากสัญญา`);
    const action = intent.action as UserSignedAction;
    const product =
      intent.entityType === 'Product'
        ? await this.prisma.product.findUnique({
            where: { id: intent.entityId },
          })
        : (
            await this.prisma.shipment.findUnique({
              where: { id: intent.entityId },
              include: { product: true },
            })
          )?.product;
    if (!product) throw new NotFoundException('ไม่พบสินค้าที่ผูกกับธุรกรรม');
    const eventProductId = BigInt(event.args.productId);
    if (action === UserSignedAction.REGISTER_PRODUCT) {
      if (
        event.args.productCode !== product.productCode ||
        String(event.args.productHash).toLowerCase() !==
          product.productHash?.toLowerCase() ||
        !this.sameAddress(event.args.manufacturer, wallet)
      ) {
        throw new ConflictException('ProductRegistered event ไม่ตรงกับสินค้า');
      }
    } else if (eventProductId.toString() !== product.blockchainProductId) {
      throw new ConflictException('Product ID ใน event ไม่ตรงกับฐานข้อมูล');
    }
    if (action === UserSignedAction.CREATE_SHIPMENT) {
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: intent.entityId },
      });
      if (
        !shipment ||
        event.args.shipmentCode !== shipment.shipmentCode ||
        String(event.args.receiver).toLowerCase() !== args[2].toLowerCase() ||
        String(event.args.carrier).toLowerCase() !== args[3].toLowerCase() ||
        !this.sameAddress(event.args.sender, wallet)
      ) {
        throw new ConflictException(
          'ShipmentCreated event ไม่ตรงกับรายการจัดส่ง',
        );
      }
    }
    if (
      action === UserSignedAction.QUALITY_CHECK &&
      (Boolean(event.args.passed) !== (args[1] === 'true') ||
        String(event.args.notes) !== args[2] ||
        !this.sameAddress(event.args.inspector, wallet))
    ) {
      throw new ConflictException('QualityChecked event ไม่ตรงกับคำขอ');
    }
    if (
      action === UserSignedAction.RECEIVE_PRODUCT &&
      !this.sameAddress(event.args.receiver, wallet)
    ) {
      throw new ConflictException('ProductReceived event ไม่ตรงกับผู้รับ');
    }
    if (
      [
        UserSignedAction.SHIP_PRODUCT,
        UserSignedAction.MARK_IN_TRANSIT,
        UserSignedAction.RECEIVE_PRODUCT,
      ].includes(action) &&
      String(event.args.shipmentId) !== args[1]
    ) {
      throw new ConflictException('Shipment ID ใน event ไม่ตรงกับคำขอ');
    }
    const metadata = (intent.metadata || {}) as Record<string, string>;
    const nextStatus =
      action === UserSignedAction.QUALITY_CHECK
        ? args[1] === 'true'
          ? ProductStatus.QUALITY_CHECKED
          : ProductStatus.RECALLED
        : NEXT_STATUS[action];
    const result = await this.prisma.$transaction(async (tx) => {
      const productData: Prisma.ProductUpdateInput = {};
      if (nextStatus) productData.status = nextStatus;
      if (action === UserSignedAction.REGISTER_PRODUCT) {
        productData.blockchainProductId = eventProductId.toString();
        productData.blockchainChainId = 11155111;
        productData.blockchainContractAddress = address;
        productData.blockchainTxHash = receipt.hash;
      }
      if (action === UserSignedAction.RECEIVE_PRODUCT) {
        const shipment = await tx.shipment.findUnique({
          where: { id: intent.entityId },
        });
        if (!shipment) throw new NotFoundException('ไม่พบการจัดส่ง');
        productData.currentOwner = {
          connect: { id: shipment.receiverOrganizationId },
        };
      }
      if (action === UserSignedAction.TRANSFER_OWNERSHIP) {
        productData.currentOwner = {
          connect: { id: metadata.newOwnerOrganizationId },
        };
      }
      const updatedProduct = Object.keys(productData).length
        ? await tx.product.update({
            where: { id: product.id },
            data: productData,
          })
        : product;
      if (action === UserSignedAction.QUALITY_CHECK) {
        const existing = await tx.qualityCheck.findFirst({
          where: { blockchainTxHash: receipt.hash },
        });
        if (!existing)
          await tx.qualityCheck.create({
            data: {
              productId: product.id,
              organizationId: user.organizationId || product.manufacturerId,
              inspectorName:
                [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                user.email ||
                'Inspector',
              result:
                args[1] === 'true'
                  ? QualityCheckResult.PASSED
                  : QualityCheckResult.FAILED,
              notes: args[2] || null,
              blockchainTxHash: receipt.hash,
            },
          });
      }
      if (action === UserSignedAction.CREATE_SHIPMENT) {
        await tx.shipment.update({
          where: { id: intent.entityId },
          data: {
            blockchainShipmentId: String(event.args.shipmentId),
            blockchainChainId: 11155111,
            blockchainContractAddress: address,
            blockchainTxHash: receipt.hash,
          },
        });
      } else if (intent.entityType === 'Shipment') {
        const shipmentData: Prisma.ShipmentUpdateInput = {};
        if (action === UserSignedAction.SHIP_PRODUCT) {
          shipmentData.status = ShipmentStatus.SHIPPED;
          shipmentData.shippedAt = new Date();
        } else if (action === UserSignedAction.MARK_IN_TRANSIT) {
          shipmentData.status = ShipmentStatus.IN_TRANSIT;
        } else if (action === UserSignedAction.RECEIVE_PRODUCT) {
          shipmentData.status = ShipmentStatus.DELIVERED;
          shipmentData.receivedAt = new Date();
        }
        if (Object.keys(shipmentData).length) {
          await tx.shipment.update({
            where: { id: intent.entityId },
            data: shipmentData,
          });
        }
      }
      await tx.blockchainTransaction.upsert({
        where: { txHash: receipt.hash },
        create: {
          txHash: receipt.hash,
          blockNumber: BigInt(receipt.blockNumber),
          contractAddress: address,
          chainId: 11155111,
          eventType: expectedEvent,
          entityType: intent.entityType,
          entityId: intent.entityId,
          productId: product.id,
          walletAddress: wallet,
          status: TxStatus.CONFIRMED,
        },
        update: {
          chainId: 11155111,
          contractAddress: address,
          status: TxStatus.CONFIRMED,
          productId: product.id,
        },
      });
      await tx.blockchainActionIntent.update({
        where: { id: intent.id },
        data: {
          status: 'CONFIRMED',
          transactionHash: receipt.hash,
          confirmedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: `BLOCKCHAIN_${action.toUpperCase()}`,
          entityType: intent.entityType,
          entityId: intent.entityId,
          metadata: {
            transactionHash: receipt.hash,
            chainId: 11155111,
            contractAddress: address,
          },
        },
      });
      return updatedProduct;
    });
    return {
      verified: true,
      synced: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      chainId: 11155111,
      product: result,
      shipmentDbId: intent.entityType === 'Shipment' ? intent.entityId : null,
    };
  }
}
