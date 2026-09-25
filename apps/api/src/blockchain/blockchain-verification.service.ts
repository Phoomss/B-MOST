import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';

@Injectable()
export class BlockchainVerificationService {
  constructor(private readonly blockchain: BlockchainService) {}

  async verifyTransaction(
    transactionHash: string,
    expectedWallet: string | null | undefined,
  ) {
    if (!expectedWallet || !ethers.isAddress(expectedWallet)) {
      throw new ForbiddenException(
        'บัญชีผู้ใช้งานยังไม่ได้กำหนด walletAddress ที่ถูกต้อง',
      );
    }
    const provider = this.blockchain.getProvider();
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 11155111) {
      throw new BadRequestException('RPC ไม่ได้เชื่อมต่อกับ Sepolia');
    }
    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(transactionHash),
      provider.getTransactionReceipt(transactionHash),
    ]);
    if (!transaction || !receipt) {
      throw new NotFoundException(
        'ยังไม่พบธุรกรรมที่ได้รับการยืนยันบน Sepolia',
      );
    }
    const contract = ethers.getAddress(this.blockchain.getContractAddress());
    if (
      transaction.to?.toLowerCase() !== contract.toLowerCase() ||
      receipt.to?.toLowerCase() !== contract.toLowerCase()
    ) {
      throw new BadRequestException(
        'ธุรกรรมนี้ไม่ได้ส่งไปยัง SupplyChainRegistry ที่กำหนด',
      );
    }
    if (
      transaction.from.toLowerCase() !==
        ethers.getAddress(expectedWallet).toLowerCase() ||
      receipt.from.toLowerCase() !==
        ethers.getAddress(expectedWallet).toLowerCase()
    ) {
      throw new ForbiddenException(
        'wallet ผู้ส่งธุรกรรมไม่ตรงกับบัญชีผู้ใช้งาน',
      );
    }
    if (receipt.status !== 1) {
      throw new BadRequestException('ธุรกรรมบน Blockchain ล้มเหลว');
    }
    // TODO: Waiting for SupplyChainRegistry ABI. Decode the expected event,
    // derive on-chain IDs from the receipt, then atomically sync PostgreSQL.
    // Never accept IDs or success flags supplied by the browser.
    return {
      verified: true,
      synced: false,
      transactionHash: receipt.hash,
      from: transaction.from,
      to: contract,
      chainId: 11155111,
      blockNumber: receipt.blockNumber,
      status: 'CONFIRMED',
      pendingAbi: true,
    };
  }
}
