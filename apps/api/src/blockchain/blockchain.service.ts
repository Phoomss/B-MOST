import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { SUPPLY_CHAIN_REGISTRY_ABI } from './constants/contract-abi.constant';
import { CONTRACT_ROLES } from './constants/events.constant';

export interface BlockchainStatus {
  connected: boolean;
  network?: string;
  chainId?: number;
  currentBlock?: number;
  contractAddress: string;
  operatorAddress?: string;
  operatorBalanceEth?: string;
  error?: string;
}

export interface ContractProduct {
  productId: number;
  productCode: string;
  productHash: string;
  manufacturer: string;
  currentOwner: string;
  status: number;
  registeredAt: number;
}

export interface ContractShipment {
  shipmentId: number;
  shipmentCode: string;
  productId: number;
  sender: string;
  receiver: string;
  carrier: string;
  status: number;
  createdAt: number;
  shippedAt: number;
  receivedAt: number;
}

export interface ContractQualityCheck {
  checkId: number;
  productId: number;
  inspector: string;
  passed: boolean;
  notes: string;
  checkedAt: number;
}

export interface ContractProductHistory {
  eventType: string;
  actor: string;
  timestamp: number;
  details: string;
}

@Injectable()
export class BlockchainService implements OnModuleDestroy {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private readonly contractAddress: string;
  private readonly deployerPrivateKey: string;
  private readonly rpcUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.rpcUrl =
      this.configService.get<string>('blockchain.rpcUrl') ||
      this.configService.get<string>('BLOCKCHAIN_RPC_URL') ||
      'http://localhost:8545';

    this.contractAddress =
      this.configService.get<string>('blockchain.contractAddress') ||
      this.configService.get<string>('CONTRACT_ADDRESS') ||
      '0x5FbDB2315678afecb367f032d93F642f64180aa3';

    this.deployerPrivateKey =
      this.configService.get<string>('blockchain.deployerPrivateKey') ||
      this.configService.get<string>('DEPLOYER_PRIVATE_KEY') ||
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const network = new ethers.Network('hardhat', 31337);
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl, network, {
      staticNetwork: network,
    });
  }

  onModuleDestroy() {
    this.provider.destroy();
  }

  getRpcUrl(): string {
    return this.rpcUrl;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getSigner(privateKey?: string): ethers.Wallet {
    const key = privateKey || this.deployerPrivateKey;
    return new ethers.Wallet(key, this.provider);
  }

  getContract(
    signerOrProvider?: ethers.Signer | ethers.Provider,
  ): ethers.Contract {
    const runner = signerOrProvider || this.getSigner();
    return new ethers.Contract(
      this.contractAddress,
      SUPPLY_CHAIN_REGISTRY_ABI,
      runner,
    );
  }

  getReadOnlyContract(): ethers.Contract {
    return new ethers.Contract(
      this.contractAddress,
      SUPPLY_CHAIN_REGISTRY_ABI,
      this.provider,
    );
  }

  async getStatus(): Promise<BlockchainStatus> {
    try {
      const [network, blockNumber] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
      ]);

      const signer = this.getSigner();
      const operatorAddress = await signer.getAddress();
      const balance = await this.provider.getBalance(operatorAddress);

      return {
        connected: true,
        network: network.name,
        chainId: Number(network.chainId),
        currentBlock: blockNumber,
        contractAddress: this.contractAddress,
        operatorAddress,
        operatorBalanceEth: ethers.formatEther(balance),
      };
    } catch (error: any) {
      this.logger.warn(
        `Blockchain node connection status check failed: ${error.message}`,
      );
      return {
        connected: false,
        contractAddress: this.contractAddress,
        error: error.message || 'Unable to connect to blockchain node',
      };
    }
  }

  // ----------------------------------------------------
  // ----------------------------------------------------
  // Write Operations (Transactions)
  // ----------------------------------------------------

  private async sendTransactionWithNonceRetry(
    signer: ethers.Wallet,
    txFn: (overrides?: ethers.Overrides) => Promise<ethers.ContractTransactionResponse>,
    maxRetries = 3,
  ): Promise<ethers.ContractTransactionReceipt> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
          const freshNonce = await this.provider.getTransactionCount(
            await signer.getAddress(),
            'pending',
          );
          const tx = await txFn({ nonce: freshNonce });
          return (await tx.wait())!;
        } else {
          const tx = await txFn();
          return (await tx.wait())!;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        if (
          err?.code === 'NONCE_EXPIRED' ||
          msg.includes('nonce') ||
          msg.includes('Nonce') ||
          msg.includes('replacement transaction underpriced')
        ) {
          this.logger.warn(
            `Nonce collision detected on attempt ${attempt + 1}: ${msg}. Retrying...`,
          );
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  async registerProduct(
    productCode: string,
    productHash: string,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number; productId: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    // If already registered on-chain, retrieve it directly
    try {
      const existing = await this.getProductByCode(productCode);
      if (existing && Number(existing.productId) > 0) {
        this.logger.log(
          `Product ${productCode} is already registered on-chain with ID ${existing.productId}`,
        );
        return {
          txHash: '',
          blockNumber: 0,
          productId: Number(existing.productId),
        };
      }
    } catch {
      // not yet registered on-chain
    }

    this.logger.log(`Registering product on-chain: code=${productCode}`);
    let receipt: ethers.ContractTransactionReceipt;
    try {
      receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
        overrides
          ? contract.registerProduct(productCode, productHash, overrides)
          : contract.registerProduct(productCode, productHash),
      );
    } catch (err: any) {
      // If error indicates product already exists (e.g. race condition), resolve it from contract
      const msg = String(err?.message || '');
      if (
        msg.includes('PRODUCT_ALREADY_EXISTS') ||
        err?.reason === 'PRODUCT_ALREADY_EXISTS'
      ) {
        this.logger.warn(
          `Product ${productCode} already registered on blockchain during concurrent call. Resolving ID...`,
        );
        const existing = await this.getProductByCode(productCode);
        return {
          txHash: '',
          blockNumber: 0,
          productId: Number(existing.productId),
        };
      }
      throw err;
    }

    // Extract productId from ProductRegistered event if available
    let productId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log as any);
        if (parsed && parsed.name === 'ProductRegistered') {
          productId = Number(parsed.args[0]);
          break;
        }
      } catch {
        // Skip logs that do not match contract interface
      }
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      productId,
    };
  }

  async recordQualityCheck(
    productId: number | bigint,
    passed: boolean,
    notes: string,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(
      `Recording QC on-chain: productId=${productId}, passed=${passed}`,
    );
    const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
      overrides
        ? contract.recordQualityCheck(productId, passed, notes, overrides)
        : contract.recordQualityCheck(productId, passed, notes),
    );

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async createShipment(
    shipmentCode: string,
    productId: number | bigint,
    receiver: string,
    carrier: string,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number; shipmentId: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    // If already exists on-chain, retrieve it directly
    try {
      const existing = await this.getShipmentByCode(shipmentCode);
      if (existing && Number(existing.shipmentId) > 0) {
        this.logger.log(
          `Shipment ${shipmentCode} is already registered on-chain with ID ${existing.shipmentId}`,
        );
        return {
          txHash: '',
          blockNumber: 0,
          shipmentId: Number(existing.shipmentId),
        };
      }
    } catch {
      // not yet registered on-chain
    }

    this.logger.log(
      `Creating shipment on-chain: code=${shipmentCode}, productId=${productId}`,
    );
    let receipt: ethers.ContractTransactionReceipt;
    try {
      receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
        overrides
          ? contract.createShipment(shipmentCode, productId, receiver, carrier, overrides)
          : contract.createShipment(shipmentCode, productId, receiver, carrier),
      );
    } catch (err: any) {
      const msg = String(err?.message || '');
      this.logger.error(
        `Failed to create shipment on-chain (code: ${shipmentCode}, productId: ${productId}): ${msg}`,
        err?.stack,
      );
      if (
        msg.includes('SHIPMENT_ALREADY_EXISTS') ||
        err?.reason === 'SHIPMENT_ALREADY_EXISTS'
      ) {
        this.logger.warn(
          `Shipment ${shipmentCode} already registered on blockchain during concurrent call. Resolving ID...`,
        );
        const existing = await this.getShipmentByCode(shipmentCode);
        return {
          txHash: '',
          blockNumber: 0,
          shipmentId: Number(existing.shipmentId),
        };
      }
      if (msg.includes('INVALID_STATE_TRANSITION')) {
        throw new BadRequestException(
          'สินค้าต้องผ่านการตรวจสอบคุณภาพ (Quality Checked) บน Blockchain ก่อนสร้างการจัดส่ง',
        );
      }
      if (msg.includes('NOT_CURRENT_OWNER')) {
        throw new ForbiddenException(
          'ผู้ส่งไม่ใช่เจ้าของสินค้าปัจจุบันบน Smart Contract',
        );
      }
      throw err;
    }

    let shipmentId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log as any);
        if (parsed && parsed.name === 'ShipmentCreated') {
          shipmentId = Number(parsed.args[0]);
          break;
        }
      } catch {
        // ignore
      }
    }

    if (!shipmentId || shipmentId === 0) {
      try {
        const onChain = await this.getShipmentByCode(shipmentCode);
        shipmentId = Number(onChain.shipmentId);
      } catch {
        // ignore
      }
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      shipmentId,
    };
  }

  async shipProduct(
    productId: number | bigint,
    shipmentId: number | bigint,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(
      `Shipping product on-chain: productId=${productId}, shipmentId=${shipmentId}`,
    );
    try {
      const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
        overrides
          ? contract.shipProduct(productId, shipmentId, overrides)
          : contract.shipProduct(productId, shipmentId),
      );

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      const msg = String(err?.message || '');
      this.logger.error(
        `Error executing shipProduct on-chain (productId: ${productId}, shipmentId: ${shipmentId}): ${msg}`,
        err?.stack,
      );

      if (
        msg.includes('SHIPMENT_NOT_FOUND') ||
        err?.reason === 'SHIPMENT_NOT_FOUND' ||
        err?.data === '0x356e4c76' // custom error or reason hash
      ) {
        throw new ConflictException(
          'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
        );
      }
      if (
        msg.includes('SHIPMENT_PRODUCT_MISMATCH') ||
        err?.reason === 'SHIPMENT_PRODUCT_MISMATCH'
      ) {
        throw new BadRequestException(
          'ข้อมูลสินค้าไม่ตรงกับข้อมูลการจัดส่งบน Blockchain',
        );
      }
      if (
        msg.includes('UNAUTHORIZED_ACTION') ||
        err?.reason === 'UNAUTHORIZED_ACTION'
      ) {
        throw new ForbiddenException(
          'ไม่มีสิทธิ์ในการส่งสินค้านี้บน Smart Contract',
        );
      }
      if (
        msg.includes('INVALID_STATE_TRANSITION') ||
        err?.reason === 'INVALID_STATE_TRANSITION'
      ) {
        throw new BadRequestException('สถานะสินค้าไม่ถูกต้องสำหรับการจัดส่ง');
      }
      throw err;
    }
  }

  async markInTransit(
    productId: number | bigint,
    shipmentId: number | bigint,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(
      `Marking shipment in transit on-chain: productId=${productId}, shipmentId=${shipmentId}`,
    );
    try {
      const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
        overrides
          ? contract.markInTransit(productId, shipmentId, overrides)
          : contract.markInTransit(productId, shipmentId),
      );

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      const msg = String(err?.message || '');
      this.logger.error(
        `Error executing markInTransit on-chain (productId: ${productId}, shipmentId: ${shipmentId}): ${msg}`,
        err?.stack,
      );

      if (
        msg.includes('SHIPMENT_NOT_FOUND') ||
        err?.reason === 'SHIPMENT_NOT_FOUND'
      ) {
        throw new ConflictException(
          'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
        );
      }
      if (
        msg.includes('SHIPMENT_PRODUCT_MISMATCH') ||
        err?.reason === 'SHIPMENT_PRODUCT_MISMATCH'
      ) {
        throw new BadRequestException(
          'ข้อมูลสินค้าไม่ตรงกับข้อมูลการจัดส่งบน Blockchain',
        );
      }
      if (
        msg.includes('UNAUTHORIZED_ACTION') ||
        err?.reason === 'UNAUTHORIZED_ACTION'
      ) {
        throw new ForbiddenException(
          'ไม่มีสิทธิ์ในการดำเนินการนี้บน Smart Contract',
        );
      }
      throw err;
    }
  }

  async receiveProduct(
    productId: number | bigint,
    shipmentId: number | bigint,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(
      `Receiving product on-chain: productId=${productId}, shipmentId=${shipmentId}`,
    );
    try {
      const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
        overrides
          ? contract.receiveProduct(productId, shipmentId, overrides)
          : contract.receiveProduct(productId, shipmentId),
      );

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      const msg = String(err?.message || '');
      this.logger.error(
        `Error executing receiveProduct on-chain (productId: ${productId}, shipmentId: ${shipmentId}): ${msg}`,
        err?.stack,
      );

      if (
        msg.includes('SHIPMENT_NOT_FOUND') ||
        err?.reason === 'SHIPMENT_NOT_FOUND'
      ) {
        throw new ConflictException(
          'ไม่พบข้อมูลการจัดส่งบน Blockchain กรุณาตรวจสอบว่าการจัดส่งถูกสร้างขึ้นแล้ว',
        );
      }
      if (
        msg.includes('SHIPMENT_PRODUCT_MISMATCH') ||
        err?.reason === 'SHIPMENT_PRODUCT_MISMATCH'
      ) {
        throw new BadRequestException(
          'ข้อมูลสินค้าไม่ตรงกับข้อมูลการจัดส่งบน Blockchain',
        );
      }
      if (
        msg.includes('UNAUTHORIZED_ACTION') ||
        err?.reason === 'UNAUTHORIZED_ACTION'
      ) {
        throw new ForbiddenException(
          'ไม่มีสิทธิ์ในการรับมอบสินค้านี้บน Smart Contract',
        );
      }
      if (
        msg.includes('INVALID_STATE_TRANSITION') ||
        err?.reason === 'INVALID_STATE_TRANSITION'
      ) {
        throw new BadRequestException('สถานะสินค้าไม่ถูกต้องสำหรับการรับมอบ');
      }
      throw err;
    }
  }

  async storeProduct(
    productId: number | bigint,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(`Storing product on-chain: productId=${productId}`);
    const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
      overrides
        ? contract.storeProduct(productId, overrides)
        : contract.storeProduct(productId),
    );

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async transferOwnership(
    productId: number | bigint,
    newOwner: string,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(
      `Transferring ownership on-chain: productId=${productId}, newOwner=${newOwner}`,
    );
    const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
      overrides
        ? contract.transferOwnership(productId, newOwner, overrides)
        : contract.transferOwnership(productId, newOwner),
    );

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async markAsSold(
    productId: number | bigint,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(`Marking product sold on-chain: productId=${productId}`);
    const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
      overrides
        ? contract.markAsSold(productId, overrides)
        : contract.markAsSold(productId),
    );

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async recallProduct(
    productId: number | bigint,
    reason: string,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(
      `Recalling product on-chain: productId=${productId}, reason=${reason}`,
    );
    const receipt = await this.sendTransactionWithNonceRetry(signer, (overrides) =>
      overrides
        ? contract.recallProduct(productId, reason, overrides)
        : contract.recallProduct(productId, reason),
    );

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  // ----------------------------------------------------
  // Read Operations (Queries)
  // ----------------------------------------------------

  async getProduct(productId: number | bigint): Promise<ContractProduct> {
    const contract = this.getReadOnlyContract();
    const result = await contract.getProduct(productId);
    return {
      productId: Number(result[0]),
      productCode: result[1],
      productHash: result[2],
      manufacturer: result[3],
      currentOwner: result[4],
      status: Number(result[5]),
      registeredAt: Number(result[6]),
    };
  }

  async getProductByCode(productCode: string): Promise<ContractProduct> {
    const contract = this.getReadOnlyContract();
    const result = await contract.getProductByCode(productCode);
    return {
      productId: Number(result[0]),
      productCode: result[1],
      productHash: result[2],
      manufacturer: result[3],
      currentOwner: result[4],
      status: Number(result[5]),
      registeredAt: Number(result[6]),
    };
  }

  async getShipment(shipmentId: number | bigint): Promise<ContractShipment> {
    const contract = this.getReadOnlyContract();
    const result = await contract.getShipment(shipmentId);
    return {
      shipmentId: Number(result[0]),
      shipmentCode: result[1],
      productId: Number(result[2]),
      sender: result[3],
      receiver: result[4],
      carrier: result[5],
      status: Number(result[6]),
      createdAt: Number(result[7]),
      shippedAt: Number(result[8]),
      receivedAt: Number(result[9]),
    };
  }

  async getShipmentByCode(shipmentCode: string): Promise<ContractShipment> {
    const contract = this.getReadOnlyContract();
    const result = await contract.getShipmentByCode(shipmentCode);
    return {
      shipmentId: Number(result[0]),
      shipmentCode: result[1],
      productId: Number(result[2]),
      sender: result[3],
      receiver: result[4],
      carrier: result[5],
      status: Number(result[6]),
      createdAt: Number(result[7]),
      shippedAt: Number(result[8]),
      receivedAt: Number(result[9]),
    };
  }

  async verifyShipmentExists(shipmentId: number | bigint): Promise<boolean> {
    try {
      const id = Number(shipmentId);
      if (!id || id <= 0) return false;
      const total = await this.getTotalShipments();
      if (id > total) return false;
      const shp = await this.getShipment(id);
      return Boolean(shp && shp.shipmentId > 0);
    } catch {
      return false;
    }
  }

  async getQualityChecks(
    productId: number | bigint,
  ): Promise<ContractQualityCheck[]> {
    const contract = this.getReadOnlyContract();
    const results = await contract.getQualityChecks(productId);
    return results.map((r: any) => ({
      checkId: Number(r[0]),
      productId: Number(r[1]),
      inspector: r[2],
      passed: Boolean(r[3]),
      notes: r[4],
      checkedAt: Number(r[5]),
    }));
  }

  async getProductHistory(
    productId: number | bigint,
  ): Promise<ContractProductHistory[]> {
    const contract = this.getReadOnlyContract();
    const results = await contract.getProductHistory(productId);
    return results.map((r: any) => ({
      eventType: r[0],
      actor: r[1],
      timestamp: Number(r[2]),
      details: r[3],
    }));
  }

  async getTotalProducts(): Promise<number> {
    const contract = this.getReadOnlyContract();
    const total = await contract.getTotalProducts();
    return Number(total);
  }

  async getTotalShipments(): Promise<number> {
    const contract = this.getReadOnlyContract();
    const total = await contract.getTotalShipments();
    return Number(total);
  }

  async getTransactionReceipt(
    txHash: string,
  ): Promise<ethers.TransactionReceipt | null> {
    return this.provider.getTransactionReceipt(txHash);
  }

  async getBlock(blockHashOrNumber: number | string): Promise<{
    number: number;
    hash: string | null;
    parentHash: string;
    timestamp: number;
    miner: string;
    gasLimit: string;
    gasUsed: string;
    baseFeePerGas: string | null;
    transactionCount: number;
    transactions: string[];
  } | null> {
    try {
      const target =
        blockHashOrNumber === 'latest'
          ? 'latest'
          : typeof blockHashOrNumber === 'string' &&
            blockHashOrNumber.startsWith('0x')
          ? blockHashOrNumber
          : Number(blockHashOrNumber);
      const block = await this.provider.getBlock(target);
      if (!block) return null;

      return {
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        miner: block.miner,
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        baseFeePerGas: block.baseFeePerGas
          ? block.baseFeePerGas.toString()
          : null,
        transactionCount: block.transactions.length,
        transactions: [...block.transactions],
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to retrieve block ${blockHashOrNumber}: ${error.message}`,
      );
      return null;
    }
  }

  async grantRole(
    roleName: keyof typeof CONTRACT_ROLES,
    account: string,
  ): Promise<string> {
    const signer = this.getSigner();
    const contract = this.getContract(signer);
    const roleHash = await contract[roleName]();
    const tx = await contract.grantRole(roleHash, account);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async hasRole(
    roleName: keyof typeof CONTRACT_ROLES,
    account: string,
  ): Promise<boolean> {
    const contract = this.getReadOnlyContract();
    const roleHash = await contract[roleName]();
    return contract.hasRole(roleHash, account);
  }
}

