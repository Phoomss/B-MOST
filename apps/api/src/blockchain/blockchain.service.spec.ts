import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService Sepolia migration boundary', () => {
  let service: BlockchainService;
  beforeEach(() => {
    service = new BlockchainService({ get: (key: string) => ({
      'blockchain.rpcUrl': 'http://127.0.0.1:8545',
      'blockchain.contractAddress': '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a',
    } as Record<string, string>)[key] } as ConfigService);
  });
  afterEach(() => service.onModuleDestroy());

  it('uses the fixed Sepolia address and never creates a backend signer', () => {
    expect(service.getContractAddress().toLowerCase()).toBe('0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a');
    expect(service.getNetworkName()).toBe('sepolia');
    expect(() => service.getSigner()).toThrow(ServiceUnavailableException);
    expect(() => service.getSigner('0xprivate-key-must-never-be-accepted')).toThrow(ServiceUnavailableException);
  });

  it('loads the compiled ABI when readiness is enabled', () => {
    const previous = process.env.BLOCKCHAIN_ABI_READY;
    process.env.BLOCKCHAIN_ABI_READY = 'true';
    try {
      const contract = service.getReadOnlyContract();
      expect(contract.target.toString().toLowerCase()).toBe(service.getContractAddress().toLowerCase());
      for (const name of [
        'registerProduct', 'recordQualityCheck', 'createShipment',
        'shipProduct', 'markInTransit', 'receiveProduct', 'storeProduct',
        'transferOwnership', 'markAsSold', 'recallProduct', 'getProduct',
        'getProductByCode', 'getShipment', 'getShipmentByCode',
        'getQualityChecks', 'getProductHistory', 'grantRole', 'hasRole',
      ]) {
        expect(contract.interface.getFunction(name)).not.toBeNull();
      }
    } finally {
      if (previous === undefined) delete process.env.BLOCKCHAIN_ABI_READY;
      else process.env.BLOCKCHAIN_ABI_READY = previous;
    }
  });

  it('reports a missing production readiness setting', () => {
    const previous = process.env.BLOCKCHAIN_ABI_READY;
    delete process.env.BLOCKCHAIN_ABI_READY;
    try {
      expect(() => service.getReadOnlyContract()).toThrow('BLOCKCHAIN_ABI_READY is not true');
    } finally {
      if (previous !== undefined) process.env.BLOCKCHAIN_ABI_READY = previous;
    }
  });

  it('rejects a local-chain RPC instead of reporting it as Sepolia', async () => {
    jest.spyOn(service.getProvider(), 'getNetwork').mockResolvedValue({ chainId: 31337n, name: 'hardhat' } as any);
    jest.spyOn(service.getProvider(), 'getBlockNumber').mockResolvedValue(7);
    const status = await service.getStatus();
    expect(status.connected).toBe(false);
    expect(status.error).toContain('expected Sepolia');
  });

  it('reports a Sepolia RPC without an operator account', async () => {
    jest.spyOn(service.getProvider(), 'getNetwork').mockResolvedValue({ chainId: 11155111n, name: 'sepolia' } as any);
    jest.spyOn(service.getProvider(), 'getBlockNumber').mockResolvedValue(42);
    const status = await service.getStatus();
    expect(status).toMatchObject({ connected: true, chainId: 11155111, currentBlock: 42 });
    expect(status.operatorAddress).toBeUndefined();
  });
});
