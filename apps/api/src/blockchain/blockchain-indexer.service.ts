import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { TxStatus, ProductStatus } from '@prisma/client';
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

      // Perform initial historical catch-up sync in the background
      void this.syncHistoricalEvents(0)
        .then((result) => {
          this.logger.log(
            `Initial blockchain catch-up sync completed: ${result.syncedEvents} events indexed up to block ${result.toBlock}`,
          );
        })
        .catch((err: Error) => {
          this.logger.warn(`Initial catch-up sync notice: ${err.message}`);
        });

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
      this.logger.log(
        `Indexing event: ${params.eventName} [tx: ${params.txHash}, block: ${params.blockNumber}]`,
      );

      // Resolve database Product UUID if matched
      let resolvedProductId: string | null = null;
      if (params.entityType === 'Product') {
        const found = await this.prisma.product.findFirst({
          where: {
            OR: [
              { blockchainProductId: params.entityId },
              ...(params.productCode
                ? [{ productCode: params.productCode }]
                : []),
            ],
          },
        });
        if (found) {
          resolvedProductId = found.id;

          // Sync database state according to blockchain event
          await this.syncProductStateFromEvent(found.id, params);
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
        },
      });

      this.logger.log(`Successfully indexed transaction: ${params.txHash}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to index event ${params.eventName} (${params.txHash}): ${err.message}`,
        err.stack,
      );
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
    try {
      const updateData: any = {};

      if (eventParams.eventName === BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED) {
        updateData.blockchainProductId = eventParams.entityId;
        updateData.blockchainTxHash = eventParams.txHash;
        updateData.status = ProductStatus.REGISTERED;
      } else if (eventParams.eventName === BLOCKCHAIN_EVENTS.QUALITY_CHECKED) {
        const passed = eventParams.additionalData?.passed;
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
    } catch (err: any) {
      this.logger.warn(
        `Could not sync product state for ${dbProductId}: ${err.message}`,
      );
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

        if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_REGISTERED) {
          entityType = 'Product';
          entityId = args[0].toString();
          productCode = args[1];
          walletAddress = args[3];
        } else if (eventName === BLOCKCHAIN_EVENTS.QUALITY_CHECKED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[1];
        } else if (eventName === BLOCKCHAIN_EVENTS.SHIPMENT_CREATED) {
          entityType = 'Shipment';
          entityId = args[0].toString();
          walletAddress = args[3];
        } else if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_SHIPPED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[2];
        } else if (eventName === BLOCKCHAIN_EVENTS.SHIPMENT_IN_TRANSIT) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[2];
        } else if (eventName === BLOCKCHAIN_EVENTS.PRODUCT_RECEIVED) {
          entityType = 'Product';
          entityId = args[0].toString();
          walletAddress = args[2];
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

        await this.handleEvent({
          eventName,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          contractAddress: log.address,
          entityType,
          entityId,
          productCode,
          walletAddress,
        });

        count++;
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
