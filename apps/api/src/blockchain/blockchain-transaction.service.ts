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
      blockNumber,
      search,
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
    if (blockNumber) {
      try {
        where.blockNumber = BigInt(blockNumber);
      } catch {
        // ignore invalid bigint
      }
    }
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { txHash: { contains: term, mode: 'insensitive' } },
        { walletAddress: { contains: term, mode: 'insensitive' } },
        { eventType: { contains: term, mode: 'insensitive' } },
        { entityId: { contains: term, mode: 'insensitive' } },
      ];
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

  async getStats(): Promise<{
    total: number;
    confirmed: number;
    pending: number;
    failed: number;
  }> {
    const [total, confirmed, pending, failed] = await Promise.all([
      this.prisma.blockchainTransaction.count(),
      this.prisma.blockchainTransaction.count({
        where: { status: TxStatus.CONFIRMED },
      }),
      this.prisma.blockchainTransaction.count({
        where: { status: TxStatus.PENDING },
      }),
      this.prisma.blockchainTransaction.count({
        where: { status: TxStatus.FAILED },
      }),
    ]);

    return { total, confirmed, pending, failed };
  }

  async findByHash(txHash: string): Promise<
    FormattedTransaction & {
      onChainReceipt?: {
        blockNumber: number;
        status: number | null;
        from: string;
        to: string | null;
        gasUsed: string;
        gasPrice?: string | null;
        nonce?: number | null;
        inputData?: string | null;
        logsCount?: number;
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

      let tx: any = null;
      try {
        if (typeof this.blockchainService.getProvider === 'function') {
          const provider = this.blockchainService.getProvider();
          if (provider && typeof provider.getTransaction === 'function') {
            tx = await provider.getTransaction(txHash);
          }
        }
      } catch {
        tx = null;
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
          gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
          gasPrice: receipt.gasPrice
            ? receipt.gasPrice.toString()
            : tx?.gasPrice
              ? tx.gasPrice.toString()
              : null,
          nonce: tx?.nonce ?? null,
          inputData: tx?.data && tx.data !== '0x' ? tx.data : null,
          logsCount: receipt.logs ? receipt.logs.length : 0,
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
      gasPrice?: string | null;
      nonce?: number | null;
      inputData?: string | null;
      logsCount?: number;
    } | null = null;
    try {
      const receipt =
        await this.blockchainService.getTransactionReceipt(txHash);
      if (receipt) {
        let tx: any = null;
        try {
          if (typeof this.blockchainService.getProvider === 'function') {
            const provider = this.blockchainService.getProvider();
            if (provider && typeof provider.getTransaction === 'function') {
              tx = await provider.getTransaction(txHash);
            }
          }
        } catch {
          tx = null;
        }

        onChainReceipt = {
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          from: receipt.from,
          to: receipt.to,
          gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
          gasPrice: receipt.gasPrice
            ? receipt.gasPrice.toString()
            : tx?.gasPrice
              ? tx.gasPrice.toString()
              : null,
          nonce: tx?.nonce ?? null,
          inputData: tx?.data && tx.data !== '0x' ? tx.data : null,
          logsCount: receipt.logs ? receipt.logs.length : 0,
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
