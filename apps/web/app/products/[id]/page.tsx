'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Navbar } from '../../../components/Navbar';
import { api, ProductItem, ProductHistoryResponse, HistoryEventRecord } from '../../../lib/api';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [history, setHistory] = useState<ProductHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [prod, hist] = await Promise.all([
          api.products.get(id),
          api.products.getHistory(id).catch(() => null),
        ]);
        if (!ignore) {
          setProduct(prod);
          setHistory(hist);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load product details';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleRegisterBlockchain = async () => {
    if (!product) return;
    try {
      setRegistering(true);
      setRegisterSuccess(null);
      setError(null);
      const res = await api.products.registerOnBlockchain(product.id);
      setProduct(res);
      setRegisterSuccess('Successfully registered on the Ethereum Smart Contract!');
      const hist = await api.products.getHistory(product.id).catch(() => null);
      setHistory(hist);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register product on blockchain';
      setError(msg);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <main className="max-w-6xl mx-auto px-6 py-20 flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-slate-400">Loading product details and blockchain state...</p>
        </main>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-20 flex-1 text-center">
          <div className="p-6 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 mb-6">
            <h2 className="text-lg font-semibold mb-2">Error Loading Product</h2>
            <p className="text-sm">{error}</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition"
          >
            &larr; Back to Products
          </Link>
        </main>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/products"
              className="text-xs text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1 mb-2"
            >
              &larr; Back to Products
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {product.name}
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {product.status}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Code: <span className="text-slate-200 font-semibold">{product.productCode}</span> | Serial:{' '}
              <span className="text-slate-200">{product.serialNumber}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!product.blockchainProductId ? (
              <button
                onClick={handleRegisterBlockchain}
                disabled={registering}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
              >
                {registering ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing Tx...
                  </>
                ) : (
                  <>🔗 Register on Blockchain</>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Ledger Confirmed (ID #{product.blockchainProductId})
              </span>
            )}

            <Link
              href={`/verify/${encodeURIComponent(product.productCode)}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Public Verification &rarr;
            </Link>
          </div>
        </div>

        {registerSuccess && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
            {registerSuccess}
          </div>
        )}

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Main Info & Blockchain */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information Card */}
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <span>📋</span> Product Specifications
              </h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Product Name</dt>
                  <dd className="font-medium text-slate-200 mt-0.5">{product.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Category</dt>
                  <dd className="font-medium text-slate-200 mt-0.5">
                    {product.category || 'Uncategorized'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Product Code</dt>
                  <dd className="font-mono text-slate-200 mt-0.5">{product.productCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Serial Number</dt>
                  <dd className="font-mono text-slate-200 mt-0.5">{product.serialNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Manufacturer</dt>
                  <dd className="font-medium text-slate-200 mt-0.5">
                    {product.manufacturer?.name || product.manufacturerId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Current Owner</dt>
                  <dd className="font-medium text-slate-200 mt-0.5">
                    {product.currentOwner?.name || product.currentOwnerId}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Description</dt>
                  <dd className="text-slate-300 mt-0.5 text-xs leading-relaxed">
                    {product.description || 'No description provided.'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Blockchain Details Card */}
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <span>⛓️</span> Smart Contract & Cryptography
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Deterministic Keccak-256 Hash</span>
                  <div className="p-2.5 rounded bg-slate-900 font-mono text-slate-300 break-all border border-slate-800/80">
                    {product.productHash || 'Hash not generated'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-500 block mb-0.5">On-Chain Product ID</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {product.blockchainProductId ? `#${product.blockchainProductId}` : 'Not Registered'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Transaction Status</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-mono text-xs ${
                        product.blockchainTxHash
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {product.blockchainTxHash ? 'CONFIRMED' : 'PENDING'}
                    </span>
                  </div>
                </div>

                {product.blockchainTxHash && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-0.5">Transaction Hash</span>
                    <div className="p-2.5 rounded bg-slate-900 font-mono text-blue-400 break-all border border-slate-800/80">
                      {product.blockchainTxHash}
                    </div>
                  </div>
                )}

                {product.blockchainData?.onChain && (
                  <div className="mt-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-slate-300 space-y-1">
                    <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span>✓ Authoritative EVM Node State</span>
                    </div>
                    <div>Owner Address: {product.blockchainData.currentOwner}</div>
                    <div>Manufacturer: {product.blockchainData.manufacturer}</div>
                    <div>
                      Hash Verification:{' '}
                      <span className="text-emerald-400 font-semibold">MATCHED (Authentic)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: QR Code Card */}
          <div className="space-y-6">
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-6 text-center">
              <h2 className="text-base font-semibold text-white mb-2">Product QR Code</h2>
              <p className="text-xs text-slate-400 mb-4">
                Scan with any smartphone camera to view public verification and provenance history.
              </p>

              {product.qrCode ? (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-white rounded-xl shadow-lg inline-block mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.qrCode}
                      alt={`QR code for ${product.productCode}`}
                      className="w-48 h-48 block"
                    />
                  </div>

                  <a
                    href={product.qrCode}
                    download={`${product.productCode}-qr.png`}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    Download PNG
                  </a>
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
                  QR Code not available
                </div>
              )}
            </div>

            {/* Verification Link Card */}
            <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4 text-xs">
              <span className="text-slate-500 block mb-1">Public Verification URL</span>
              <a
                href={`/verify/${encodeURIComponent(product.productCode)}`}
                target="_blank"
                className="text-blue-400 hover:text-blue-300 font-mono break-all transition block"
              >
                /verify/{product.productCode}
              </a>
            </div>
          </div>
        </div>

        {/* Traceability Timeline Section */}
        <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-6 mt-6">
          <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
            <span>⏱️</span> Traceability Timeline & Audit Trail
          </h2>

          <div className="relative pl-6 border-l border-slate-800 space-y-8">
            {/* Step 1: Registered */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-slate-900"></div>
              <div>
                <span className="text-xs font-mono text-slate-400">
                  {new Date(product.createdAt).toLocaleString()}
                </span>
                <h3 className="text-sm font-semibold text-white mt-0.5">Product Registered</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Product created in PostgreSQL database by {product.manufacturer?.name || 'Manufacturer'}.
                </p>
              </div>
            </div>

            {/* Step 2: Blockchain Registration if present */}
            {product.blockchainTxHash && (
              <div className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-slate-900"></div>
                <div>
                  <span className="text-xs font-mono text-slate-400">On-Chain Event</span>
                  <h3 className="text-sm font-semibold text-white mt-0.5 flex items-center gap-2">
                    Committed to SupplyChainRegistry Smart Contract
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-1 break-all">
                    Tx: {product.blockchainTxHash}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Events from On-chain History */}
            {history?.blockchainHistory?.map((evt: HistoryEventRecord, idx: number) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-slate-900"></div>
                <div>
                  <span className="text-xs font-mono text-slate-400">
                    {new Date(evt.timestamp * 1000).toLocaleString()}
                  </span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">
                    {evt.eventType}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Actor: <span className="font-mono">{evt.actor}</span> — {evt.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
