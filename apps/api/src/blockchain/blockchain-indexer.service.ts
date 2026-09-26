import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { TxStatus, ProductStatus, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { BLOCKCHAIN_EVENTS } from './constants/events.constant';

@Injectable()
export class BlockchainIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainIndexerService.name);
  private contract: ethers.Contract | null = null;
  private isListening = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async onModuleInit() {
    await this.startListener();
  }

  onModuleDestroy() {
    this.stopListener();
  }

  async startListener(): Promise<boolean> {
    try {
      const status = await this.blockchainService.getStatus();
      if (!status.connected) {
        this.logger.warn(
          'Blockchain node not reachable at startup; live event listener deferred.',
        );
        return false;
      }

      this.contract = this.blockchainService.getReadOnlyContract();
      this.attachEventListeners();
      this.isListening = true;

      this.logger.log(
        `Blockchain event listener active on contract: ${status.contractAddress} (Chain ID: ${status.chainId})`,
      );

      // Historical Sepolia sync requires an explicit deployment block and the real ABI.
      // TODO: Waiting for SupplyChainRegistry ABI.

      return true;
    } catch (err: any) {
      this.logger.warn(
        `Could not initialize blockchain event listener: ${err.message}`,
      );
      return false;
    }
  }

  stopListener() {
    if (this.contract) {
      void this.contract.removeAllListeners();
      this.contract = null;
    }
    this.isListening = false;
    this.logger.log('Blockchain event listeners detached.');
  }

  getListenerStatus(): { isListening: boolean; contractAddress: string } {
    return {
      isListening: this.isListening,
      contractAddress: this.blockchainService.getContractAddress(),
    };
  }

  private attachEventListeners() {
    if (!this.contract) return;

    // Listen to ProductRegistered
    void this.contract.on(
      BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED,
      (
        productId,
        productCode,
        productHash,
        manufacturer,
        timestamp,
        eventPayload,
      ) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          productCode: productCode,
          walletAddress: manufacturer,
          additionalData: { productHash, timestamp: Number(timestamp) },
        });
      },
    );

    // Listen to QualityChecked
    void this.contract.on(
      BLOCKCHAIN_EVENTS.QUALITY_CHECKED,
      (productId, inspector, passed, notes, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.QUALITY_CHECKED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: inspector,
          additionalData: { passed, notes, timestamp: Number(timestamp) },
        });
      },
    );

    // Listen to ShipmentCreated
    void this.contract.on(
      BLOCKCHAIN_EVENTS.SHIPMENT_CREATED,
      (
        shipmentId,
        shipmentCode,
        productId,
        sender,
        receiver,
        carrier,
        timestamp,
        eventPayload,
      ) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.SHIPMENT_CREATED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Shipment',
          entityId: shipmentId.toString(),
          walletAddress: sender,
          additionalData: {
            shipmentCode,
            productId: productId.toString(),
            receiver,
            carrier,
            timestamp: Number(timestamp),
          },
        });
      },
    );

    // Listen to ProductShipped
    void this.contract.on(
      BLOCKCHAIN_EVENTS.PRODUCT_SHIPPED,
      (productId, shipmentId, sender, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.PRODUCT_SHIPPED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: sender,
          additionalData: {
            shipmentId: shipmentId.toString(),
            timestamp: Number(timestamp),
          },
        });
      },
    );

    // Listen to ShipmentInTransit
    void this.contract.on(
      BLOCKCHAIN_EVENTS.SHIPMENT_IN_TRANSIT,
      (productId, shipmentId, carrier, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.SHIPMENT_IN_TRANSIT,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: carrier,
          additionalData: {
            shipmentId: shipmentId.toString(),
            timestamp: Number(timestamp),
          },
        });
      },
    );

    // Listen to ProductReceived
    void this.contract.on(
      BLOCKCHAIN_EVENTS.PRODUCT_RECEIVED,
      (productId, shipmentId, receiver, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.PRODUCT_RECEIVED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: receiver,
          additionalData: {
            shipmentId: shipmentId.toString(),
            timestamp: Number(timestamp),
          },
        });
      },
    );

    // Listen to ProductStored
    void this.contract.on(
      BLOCKCHAIN_EVENTS.PRODUCT_STORED,
      (productId, owner, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.PRODUCT_STORED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: owner,
          additionalData: { timestamp: Number(timestamp) },
        });
      },
    );

    // Listen to OwnershipTransferred
    void this.contract.on(
      BLOCKCHAIN_EVENTS.OWNERSHIP_TRANSFERRED,
      (productId, previousOwner, newOwner, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.OWNERSHIP_TRANSFERRED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: newOwner,
          additionalData: {
            previousOwner,
            newOwner,
            timestamp: Number(timestamp),
          },
        });
      },
    );

    // Listen to ProductSold
    void this.contract.on(
      BLOCKCHAIN_EVENTS.PRODUCT_SOLD,
      (productId, seller, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.PRODUCT_SOLD,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: seller,
          additionalData: { timestamp: Number(timestamp) },
        });
      },
    );

    // Listen to ProductRecalled
    void this.contract.on(
      BLOCKCHAIN_EVENTS.PRODUCT_RECALLED,
      (productId, recalledBy, reason, timestamp, eventPayload) => {
        void this.handleEvent({
          eventName: BLOCKCHAIN_EVENTS.PRODUCT_RECALLED,
          txHash: eventPayload.log.transactionHash,
          blockNumber: eventPayload.log.blockNumber,
          contractAddress: eventPayload.log.address,
          entityType: 'Product',
          entityId: productId.toString(),
          walletAddress: recalledBy,
          additionalData: { reason, timestamp: Number(timestamp) },
        });
      },
    );
  }

  async handleEvent(params: {
    eventName: string;
    txHash: string;
    blockNumber: number | bigint;
    contractAddress: string;
    entityType: string;
    entityId: string;
    walletAddress: string;
    productCode?: string;
    additionalData?: Record<string, any>;
  }) {
    try {
      if (params.contractAddress.toLowerCase() !== this.blockchainService.getContractAddress().toLowerCase()) {
        this.logger.warn(`Ignoring event from another contract: ${params.contractAddress}`);
        return false;
      }
      const network = await this.blockchainService.getProvider().getNetwork();
      if (Number(network.chainId) !== 11155111) {
        this.logger.warn(`Ignoring event from chain ${network.chainId}; Sepolia required`);
        return false;
      }
      this.logger.log(
        `Indexing event: ${params.eventName} [tx: ${params.txHash}, block: ${params.blockNumber}]`,
      );

      // Resolve database Product UUID if matched
      let resolvedProductId: string | null = null;
      if (params.entityType === 'Product') {
        let found: any = null;
        if (params.productCode && this.prisma?.product?.findUnique) {
          found = await this.prisma.product.findUnique({
            where: { productCode: params.productCode },
          });
        }
        if (!found && this.prisma?.product?.findFirst) {
          found = await this.prisma.product.findFirst({
            where: {
              blockchainProductId: params.entityId,
              blockchainChainId: 11155111,
              blockchainContractAddress: this.blockchainService.getContractAddress(),
            },
          });
        }
        if (found) {
          if (found.blockchainProductId &&
              (found.blockchainChainId !== 11155111 ||
               found.blockchainContractAddress?.toLowerCase() !== params.contractAddress.toLowerCase())) {
            this.logger.warn(`Skipping legacy or foreign-chain product ${found.id}`);
            return false;
          }
          resolvedProductId = found.id;

          // Sync database state according to blockchain event
          await this.syncProductStateFromEvent(found.id, params);
        }
      }

      // Resolve database Shipment record if matched
      if (params.entityType === 'Shipment') {
        const shipmentCode = params.additionalData?.shipmentCode;
        if (shipmentCode && this.prisma.shipment) {
          try {
            const foundShipment = await this.prisma.shipment.findUnique({
              where: { shipmentCode },
              include: { product: true, sender: true, receiver: true, carrier: true },
            });
            const matchesShipment = foundShipment &&
              foundShipment.product.blockchainProductId === String(params.additionalData?.productId) &&
              foundShipment.sender.walletAddress?.toLowerCase() === params.walletAddress.toLowerCase() &&
              foundShipment.receiver.walletAddress?.toLowerCase() === String(params.additionalData?.receiver).toLowerCase() &&
              (foundShipment.carrier?.walletAddress || '0x0000000000000000000000000000000000000000').toLowerCase() === String(params.additionalData?.carrier).toLowerCase();
            if (foundShipment && !matchesShipment) {
              this.logger.warn(`ShipmentCreated event ${params.txHash} does not match database shipment ${shipmentCode}`);
              return false;
            }
            if (matchesShipment && (!foundShipment.blockchainShipmentId ||
                foundShipment.blockchainShipmentId === params.entityId) &&
                (!foundShipment.blockchainShipmentId ||
                (foundShipment.blockchainChainId === 11155111 &&
                 foundShipment.blockchainContractAddress?.toLowerCase() === params.contractAddress.toLowerCase()))) {
              resolvedProductId = foundShipment.productId;
              await this.prisma.shipment.update({
                where: { id: foundShipment.id },
                data: {
                  blockchainShipmentId: params.entityId,
                  blockchainTxHash: params.txHash,
                  blockchainChainId: 11155111,
                  blockchainContractAddress: params.contractAddress,
                },
              });
              await this.prisma.product.updateMany({
                where: {
                  id: foundShipment.productId,
                  status: {
                    in: [ProductStatus.REGISTERED, ProductStatus.QUALITY_CHECKED],
                  },
                },
                data: { status: ProductStatus.READY_TO_SHIP },
              });
            }
          } catch (shpErr: any) {
            this.logger.warn(
              `Notice syncing shipment for code ${shipmentCode}: ${shpErr.message}`,
            );
            throw shpErr;
          }
        }
      }

      // Sync shipment lifecycle state from product / shipment events
      if (
        params.additionalData?.shipmentId &&
        this.prisma.shipment?.updateMany
      ) {
        const onChainShpId = params.additionalData.shipmentId.toString();
        let newStatus: ShipmentStatus | null = null;
        const updateShipmentData: any = {};
        if (params.eventName === BLOCKCHAIN_EVENTS.PRODUCT_SHIPPED) {
          newStatus = ShipmentStatus.SHIPPED;
          updateShipmentData.shippedAt = new Date();
        } else if (params.eventName === BLOCKCHAIN_EVENTS.SHIPMENT_IN_TRANSIT) {
          newStatus = ShipmentStatus.IN_TRANSIT;
        } else if (params.eventName === BLOCKCHAIN_EVENTS.PRODUCT_RECEIVED) {
          newStatus = ShipmentStatus.DELIVERED;
          updateShipmentData.receivedAt = new Date();
        }
        if (newStatus) {
          updateShipmentData.status = newStatus;
          try {
            await this.prisma.shipment.updateMany({
              where: { blockchainShipmentId: onChainShpId,
                blockchainChainId: 11155111,
                blockchainContractAddress: this.blockchainService.getContractAddress() },
              data: updateShipmentData,
            });
          } catch (shpErr: any) {
            this.logger.warn(
              `Notice syncing shipment status for blockchainShipmentId ${onChainShpId}: ${shpErr.message}`,
            );
          }
        }
      }

      // Upsert BlockchainTransaction record
      await this.prisma.blockchainTransaction.upsert({
        where: { txHash: params.txHash },
        update: {
          blockNumber: BigInt(params.blockNumber),
          contractAddress: params.contractAddress,
          eventType: params.eventName,
          entityType: params.entityType,
          entityId: params.entityId,
          productId: resolvedProductId,
          walletAddress: params.walletAddress,
          status: TxStatus.CONFIRMED,
          chainId: 11155111,
        },
        create: {
          txHash: params.txHash,
          blockNumber: BigInt(params.blockNumber),
          contractAddress: params.contractAddress,
          eventType: params.eventName,
          entityType: params.entityType,
          entityId: params.entityId,
          productId: resolvedProductId,
          walletAddress: params.walletAddress,
          status: TxStatus.CONFIRMED,
          chainId: 11155111,
        },
      });

      if (['Product', 'Shipment'].includes(params.entityType) && !resolvedProductId) {
        this.logger.warn(`Indexed ${params.eventName} transaction ${params.txHash}, but no matching database ${params.entityType.toLowerCase()} was found`);
        return false;
      }
      this.logger.log(`Successfully indexed and synced transaction: ${params.txHash}`);
      return true;
    } catch (err: any) {
      this.logger.error(
        `Failed to index event ${params.eventName} (${params.txHash}): ${err.message}`,
        err.stack,
      );
      return false;
    }
  }

  private async syncProductStateFromEvent(
    dbProductId: string,
    eventParams: {
      eventName: string;
      entityId: string;
      txHash: string;
      additionalData?: any;
    },
  ) {
    const updateData: any = {};

      if (eventParams.eventName === BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED) {
        let conflict: any = null;
        if (this.prisma.product.findFirst) {
          conflict = await this.prisma.product.findFirst({
            where: { blockchainProductId: eventParams.entityId,
              blockchainChainId: 11155111,
              blockchainContractAddress: this.blockchainService.getContractAddress() },
            select: { id: true, productCode: true },
          });
        }

        if (conflict && conflict.id !== dbProductId) {
          this.logger.warn(
            `Indexer detected conflict: blockchainProductId ${eventParams.entityId} is already held by product ${conflict.productCode} (${conflict.id}). Skipping blockchainProductId assignment on product ${dbProductId} to prevent P2002.`,
          );
        } else {
          updateData.blockchainProductId = eventParams.entityId;
          updateData.blockchainChainId = 11155111;
          updateData.blockchainContractAddress = this.blockchainService.getContractAddress();
        }
        updateData.blockchainTxHash = eventParams.txHash;
        updateData.status = ProductStatus.REGISTERED;
      } else if (eventParams.eventName === BLOCKCHAIN_EVENTS.QUALITY_CHECKED) {
        const passed = eventParams.additionalData?.passed;
        if (typeof passed !== 'boolean') {
          throw new Error('QualityChecked event is missing the passed result');
        }
        updateData.status = passed
          ? ProductStatus.QUALITY_CHECKED
          : ProductStatus.RECALLED;
      } else if (eventParams.eventName === BLOCKCHAIN_EVENTS.PRODUCT_SHIPPED) {
        updateData.status = ProductStatus.SHIPPED;
      } else if (
        eventParams.eventName === BLOCKCHAIN_EVENTS.SHIPMENT_IN_TRANSIT
      ) {
        updateData.status = ProductStatus.IN_TRANSIT;
      } else if (eventParams.eventName === BLOCKCHAIN_EVENTS.PRODUCT_RECEIVED) {
        updateData.status = ProductStatus.RECEIVED;
      } else if (eventParams.eventName === BLOCKCHAIN_EVENTS.PRODUCT_STORED) {
        updateData.status = ProductStatus.STORED;
      } else if (eventParams.eventName === BLOCKCHAIN_EVENTS.PRODUCT_SOLD) {
        updateData.status = ProductStatus.SOLD;
      } else if (eventParams.eventName === BLOCKCHAIN_EVENTS.PRODUCT_RECALLED) {
        updateData.status = ProductStatus.RECALLED;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.product.update({
          where: { id: dbProductId },
          data: updateData,
        });
      }
  }

  async syncHistoricalEvents(
    fromBlock: number = 0,
    toBlock?: number,
  ): Promise<{ syncedEvents: number; fromBlock: number; toBlock: number }> {
    const contract =
      this.contract || this.blockchainService.getReadOnlyContract();
    const provider = this.blockchainService.getProvider();

    const currentBlock =
      toBlock !== undefined ? toBlock : await provider.getBlockNumber();
    this.logger.log(
      `Scanning contract events from block ${fromBlock} to ${currentBlock}`,
    );

    // Query all contract event logs in range
    const logs = await contract.queryFilter('*', fromBlock, currentBlock);
    let count = 0;

    for (const log of logs) {
      try {
        if (!('eventName' in log) || !log.eventName) {
          continue;
        }

        const eventName = log.eventName;
        const args = (log as any).args;
        if (!args) continue;

        let entityType = 'Product';
        let entityId = '';
        let walletAddress = '';
        let productCode: string | undefined;
        let additionalData: Record<string, any> | undefined;

        if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED) {
          entityType = 'Product';
          entityId = args[0].toString();
          productCode = args[1];
          walletAddress = args[3];
        } else if (eventName === BLOCKCHAIN_EVENTS.QUALITY_CHECKED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[1];
          additionalData = {
            passed: Boolean(args[2]),
            notes: String(args[3]),
            timestamp: Number(args[4]),
          };
        } else if (eventName === BLOCKCHAIN_EVENTS.SHIPMENT_CREATED) {
          entityType = 'Shipment';
          entityId = args[0].toString();
          walletAddress = args[3];
          additionalData = {
            shipmentCode: String(args[1]),
            productId: String(args[2]),
            receiver: String(args[4]),
            carrier: String(args[5]),
            timestamp: Number(args[6]),
          };
        } else if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_SHIPPED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[2];
          additionalData = { shipmentId: String(args[1]), timestamp: Number(args[3]) };
        } else if (eventName === BLOCKCHAIN_EVENTS.SHIPMENT_IN_TRANSIT) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[2];
          additionalData = { shipmentId: String(args[1]), timestamp: Number(args[3]) };
        } else if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_RECEIVED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[2];
          additionalData = { shipmentId: String(args[1]), timestamp: Number(args[3]) };
        } else if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_STORED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[1];
        } else if (eventName === BLOCKCHAIN_EVENTS.OWNERSHIP_TRANSFERRED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[2];
        } else if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_SOLD) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[1];
        } else if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_RECALLED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[1];
        } else {
          // General contract events (RoleGranted, etc.)
          entityType = 'Contract';
          entityId = this.blockchainService.getContractAddress();
          walletAddress = (args[1] || args[0] || '').toString();
        }

        const synced = await this.handleEvent({
          eventName,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          contractAddress: log.address,
          entityType,
          entityId,
          productCode,
          walletAddress,
          additionalData,
        });

        if (synced) count++;
      } catch (err: any) {
        this.logger.warn(
          `Error processing log ${log.transactionHash}: ${err.message}`,
        );
      }
    }

    return {
      syncedEvents: count,
      fromBlock,
      toBlock: currentBlock,
    };
  }
}
