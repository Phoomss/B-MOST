import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
  // Write Operations (Transactions)
  // ----------------------------------------------------

  async registerProduct(
    productCode: string,
    productHash: string,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number; productId: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(`Registering product on-chain: code=${productCode}`);
    const tx = await contract.registerProduct(productCode, productHash);
    const receipt = await tx.wait();

    // Extract productId from ProductRegistered event if available
    let productId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
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
    const tx = await contract.recordQualityCheck(productId, passed, notes);
    const receipt = await tx.wait();

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

    this.logger.log(
      `Creating shipment on-chain: code=${shipmentCode}, productId=${productId}`,
    );
    const tx = await contract.createShipment(
      shipmentCode,
      productId,
      receiver,
      carrier,
    );
    const receipt = await tx.wait();

    let shipmentId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed && parsed.name === 'ShipmentCreated') {
          shipmentId = Number(parsed.args[0]);
          break;
        }
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
    const tx = await contract.shipProduct(productId, shipmentId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
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
    const tx = await contract.markInTransit(productId, shipmentId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
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
    const tx = await contract.receiveProduct(productId, shipmentId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async storeProduct(
    productId: number | bigint,
    signerPrivateKey?: string,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const signer = this.getSigner(signerPrivateKey);
    const contract = this.getContract(signer);

    this.logger.log(`Storing product on-chain: productId=${productId}`);
    const tx = await contract.storeProduct(productId);
    const receipt = await tx.wait();

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
    const tx = await contract.transferOwnership(productId, newOwner);
    const receipt = await tx.wait();

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
    const tx = await contract.markAsSold(productId);
    const receipt = await tx.wait();

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
    const tx = await contract.recallProduct(productId, reason);
    const receipt = await tx.wait();

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

