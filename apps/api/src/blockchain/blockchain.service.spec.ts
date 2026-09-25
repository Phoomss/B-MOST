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

  it('rejects contract calls until the deployed ABI is supplied', () => {
    expect(() => service.getReadOnlyContract()).toThrow('TODO: Waiting for SupplyChainRegistry ABI');
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
