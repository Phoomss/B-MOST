import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Suspense } from 'react';
import PublicVerifyPage from '../app/verify/[code]/page';
import { api, PublicVerifyResponse } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    public: {
      verify: vi.fn(),
    },
  },
}));

function createResolvedPromise<T>(val: T): Promise<T> {
  const p = Promise.resolve(val) as any;
  p.status = 'fulfilled';
  p.value = val;
  return p;
}

describe('Public QR Verification Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVerifiedResponse: PublicVerifyResponse = {
    verified: true,
    productCode: 'PROD-VERIFIED-01',
    message: 'Authentic product confirmed on blockchain',
    product: {
      id: 'prod-uuid-1',
      productCode: 'PROD-VERIFIED-01',
      name: 'Smart Healthcare Sensor',
      category: 'Medical Devices',
      status: 'SOLD',
      serialNumber: 'SN-MED-999',
      createdAt: '2026-09-01T00:00:00Z',
      manufacturer: {
        id: 'mfg-1',
        name: 'MediTech Industries',
        code: 'MEDTECH',
        type: 'MANUFACTURER',
        walletAddress: '0x1111111111111111111111111111111111111111',
      },
    },
    blockchain: {
      registeredOnChain: true,
      onChainProductId: 1,
      onChainStatus: 7,
      onChainStatusName: 'SOLD',
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockchainTxHash: '0xabc1234567890123456789012345678901234567890123456789012345678901',
      productHash: '0xhash123',
      computedHash: '0xhash123',
      hashMatch: true,
      verified: true,
    },
    timeline: [
      {
        id: 'evt-1',
        eventType: 'ProductRegistered',
        title: 'Manufactured & Registered',
        description: 'Product registered on-chain with cryptographic fingerprint',
        timestamp: '2026-09-01T10:00:00Z',
        badgeColor: 'emerald',
        verified: true,
      },
    ],
  };

  it('renders verified authenticity badge and product details for genuine product', async () => {
    vi.mocked(api.public.verify).mockResolvedValueOnce(mockVerifiedResponse);

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <PublicVerifyPage
          params={createResolvedPromise({ code: 'PROD-VERIFIED-01' })}
        />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText('Authentic Product Confirmed')).toBeInTheDocument();
      expect(screen.getAllByText('PROD-VERIFIED-01').length).toBeGreaterThan(0);
      expect(screen.getByText('Live Validated')).toBeInTheDocument();
      expect(screen.getAllByText('MediTech Industries').length).toBeGreaterThan(0);
    });
  });

  it('renders warning alert when product cannot be verified or counterfeit', async () => {
    vi.mocked(api.public.verify).mockResolvedValueOnce({
      verified: false,
      productCode: 'PROD-FAKE',
      message: 'Product not registered on blockchain ledger or hash mismatch detected',
      product: {
        productCode: 'PROD-FAKE',
        name: 'Counterfeit Item',
        status: 'UNVERIFIED',
      },
      blockchain: {
        registeredOnChain: false,
        hashMatch: false,
        verified: false,
        error: 'Hash mismatch: Potential tampering detected',
      },
    });

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <PublicVerifyPage
          params={createResolvedPromise({ code: 'PROD-FAKE' })}
        />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText('Product Not Verified')).toBeInTheDocument();
      expect(screen.getByText('Unverified Item')).toBeInTheDocument();
    });
  });
});
