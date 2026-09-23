'use client';

import { useEffect, useState, use } from 'react';
import { api, PublicVerifyResponse } from '../../../lib/api';

export default function PublicVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const { code } = resolvedParams;

  const [data, setData] = useState<PublicVerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function verify() {
      try {
        const res = await api.public.verify(code);
        if (!ignore) {
          setData(res);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Verification check failed';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    verify();
    return () => {
      ignore = true;
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-400">Verifying cryptographic signature and blockchain ledger...</p>
      </div>
    );
  }

  const isVerified = data?.verified === true;
  const product = data?.product;
  const blockchain = data?.blockchain;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Banner */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
            B
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">B-MOST</span>
          <span className="text-xs text-slate-500 ml-1">Trust Ledger</span>
        </div>
        <span className="text-xs font-mono text-slate-400">{code}</span>
      </header>

      {/* Main Verification Card */}
      <main className="max-w-xl mx-auto w-full py-8 flex-1">
        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <h1 className="text-lg font-bold text-rose-300 mb-1">Verification Unavailable</h1>
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        ) : isVerified ? (
          <div className="space-y-6">
            {/* Authenticity Badge */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                ✓
              </div>
              <h1 className="text-xl font-bold text-emerald-400 mb-1">
                Authentic Product Verified
              </h1>
              <p className="text-xs text-slate-300">
                This item has been officially registered and verified against the Ethereum smart contract registry.
              </p>
            </div>

            {/* Product Overview Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Product Details
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Name</span>
                  <span className="font-semibold text-white">{product?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Code</span>
                    <span className="font-mono text-xs text-slate-300">{product?.productCode}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Serial</span>
                    <span className="font-mono text-xs text-slate-300">{product?.serialNumber}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Manufacturer</span>
                    <span className="text-slate-200">{product?.manufacturer?.name || 'Verified Partner'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Status</span>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {product?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Blockchain Proof Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 text-xs">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Cryptographic Provenance
              </h2>
              <div>
                <span className="text-slate-500 block mb-0.5">Smart Contract Address</span>
                <span className="font-mono text-slate-300 break-all">{blockchain?.contractAddress}</span>
              </div>
              {blockchain?.blockchainTxHash && (
                <div>
                  <span className="text-slate-500 block mb-0.5">Registration Transaction</span>
                  <span className="font-mono text-blue-400 break-all">{blockchain.blockchainTxHash}</span>
                </div>
              )}
              <div className="pt-2 flex items-center justify-between text-slate-400 border-t border-slate-800/80">
                <span>Cryptographic Hash Match:</span>
                <span className="text-emerald-400 font-bold">VERIFIED (100%)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-amber-400">
              Unverified Product
            </h1>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              This product code could not be verified on the official B-MOST supply chain registry. Please ensure you scanned the correct authentic code.
            </p>
            <div className="pt-2 text-xs font-mono text-slate-400">
              Scanned: {code}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        B-MOST Cryptographic Supply Chain Verification
      </footer>
    </div>
  );
}
