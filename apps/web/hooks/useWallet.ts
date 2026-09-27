'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAddress, type Address } from 'viem';
import { connectWallet, getInjectedProvider, SEPOLIA_CHAIN_ID, switchToSepolia } from '../lib/blockchain/wallet';
import { getBlockchainErrorMessage } from '../lib/blockchain/errors';

export function useWallet() {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;
    const onAccounts = (accounts: unknown) => {
      const first = Array.isArray(accounts) ? accounts[0] : null;
      setAccount(typeof first === 'string' ? getAddress(first) : null);
    };
    const onChain = (value: unknown) => setChainId(Number(value));
    void provider.request({ method: 'eth_accounts' }).then(onAccounts).catch(() => setAccount(null));
    void provider.request({ method: 'eth_chainId' }).then(onChain).catch(() => setChainId(null));
    provider.on('accountsChanged', onAccounts);
    provider.on('chainChanged', onChain);
    return () => {
      provider.removeListener('accountsChanged', onAccounts);
      provider.removeListener('chainChanged', onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const address = await connectWallet();
      setAccount(address);
      const value = await getInjectedProvider()?.request({ method: 'eth_chainId' });
      setChainId(Number(value));
    } catch (err) {
      setError(getBlockchainErrorMessage(err));
    }
  }, []);

  const switchChain = useCallback(async () => {
    try {
      setError(null);
      await switchToSepolia();
      setChainId(SEPOLIA_CHAIN_ID);
    } catch (err) {
      setError(getBlockchainErrorMessage(err));
    }
  }, []);

  return { account, chainId, isSepolia: chainId === SEPOLIA_CHAIN_ID, error, connect, switchChain };
}
