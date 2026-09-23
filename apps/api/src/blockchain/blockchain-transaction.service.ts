import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { Prisma, TxStatus } from '@prisma/client';

export interface FormattedTransaction {
  id: string;
  txHash: string;
  blockNumber: string | null;
  contractAddress: string;
  eventType: string;
  entityType: string;
  entityId: string;
  productId: string | null;
  product?: {
    id: string;
    productCode: string;
    name: string;
  } | null;
  walletAddress: string;
  status: TxStatus;
  createdAt: Date;
}

@Injectable()
export class BlockchainTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async findAll(query: QueryTransactionsDto): Promise<{
    data: FormattedTransaction[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const {
      eventType,
      entityType,
      entityId,
      productId,
      walletAddress,
      status,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.BlockchainTransactionWhereInput = {};

    if (eventType) {
      where.eventType = { contains: eventType, mode: 'insensitive' };
    }
    if (entityType) {
      where.entityType = { equals: entityType, mode: 'insensitive' };
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (productId) {
      where.productId = productId;
    }
    if (walletAddress) {
      where.walletAddress = { equals: walletAddress, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    const [total, records] = await Promise.all([
      this.prisma.blockchainTransaction.count({ where }),
      this.prisma.blockchainTransaction.findMany({
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
            },
          },
        },
      }),
    ]);

    const formatted: FormattedTransaction[] = records.map((record) => ({
      ...record,
      blockNumber: record.blockNumber ? record.blockNumber.toString() : null,
    }));

    return {
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findByHash(txHash: string): Promise<
    FormattedTransaction & {
      onChainReceipt?: {
        blockNumber: number;
        status: number | null;
        from: string;
        to: string | null;
        gasUsed: string;
      } | null;
    }
  > {
    const record = await this.prisma.blockchainTransaction.findUnique({
      where: { txHash },
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            name: true,
          },
        },
      },
    });

    if (!record) {
      // Check if on-chain receipt exists even if not indexed yet
      const receipt =
        await this.blockchainService.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new NotFoundException(
          `Blockchain transaction with hash ${txHash} not found`,
        );
      }

      return {
        id: '',
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
          ? receipt.blockNumber.toString()
          : null,
        contractAddress:
          receipt.to || this.blockchainService.getContractAddress(),
        eventType: 'ON_CHAIN',
        entityType: 'Transaction',
        entityId: txHash,
        productId: null,
        product: null,
        walletAddress: receipt.from,
        status: receipt.status === 1 ? TxStatus.CONFIRMED : TxStatus.FAILED,
        createdAt: new Date(),
        onChainReceipt: {
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed.toString(),
        },
      };
    }

    // Try fetching live on-chain receipt for additional verification
    let onChainReceipt: {
      blockNumber: number;
      status: number | null;
      from: string;
      to: string | null;
      gasUsed: string;
    } | null = null;
    try {
      const receipt =
        await this.blockchainService.getTransactionReceipt(txHash);
      if (receipt) {
        onChainReceipt = {
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed.toString(),
        };
      }
    } catch {
      // Ignore if node is temporarily unreachable
    }

    return {
      ...record,
      blockNumber: record.blockNumber ? record.blockNumber.toString() : null,
      onChainReceipt,
    };
  }
}
