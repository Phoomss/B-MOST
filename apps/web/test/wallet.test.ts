import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SEPOLIA_CONTRACT_ADDRESS,
  writeSupplyChainAction,
} from '../lib/blockchain/wallet';

describe('Sepolia wallet writes', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(window, 'ethereum');
  });

  it('rejects an account switch before sending a transaction', async () => {
    const expectedWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const otherWallet = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    vi.stubEnv('NEXT_PUBLIC_CHAIN_ID', '11155111');
    vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', SEPOLIA_CONTRACT_ADDRESS);
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_chainId') return '0xaa36a7';
      if (method === 'eth_accounts') return [otherWallet];
      throw new Error(`Unexpected wallet request: ${method}`);
    });
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      value: { request },
    });

    await expect(
      writeSupplyChainAction({
        account: expectedWallet,
        expectedWallet,
        functionName: 'registerProduct',
        args: [],
      }),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'eth_sendTransaction' }),
    );
  });
});
