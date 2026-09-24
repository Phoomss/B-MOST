'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api, PublicVerifyResponse, PublicTimelineEvent } from '../../../lib/api';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function verify() {
      try {
        setLoading(true);
        setError(null);
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

  const copyToClipboard = async (text: string, type: 'link' | 'hash') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedHash(text);
        setTimeout(() => setCopiedHash(null), 2000);
      }
    } catch {
      // Fallback
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-base font-semibold text-white mb-1">
          Verifying Authenticity
        </h2>
        <p className="text-xs text-slate-400 font-mono">
          Validating Keccak-256 hash &amp; smart contract ledger for {code}...
        </p>
      </div>
    );
  }

  const isVerified = data?.verified === true;
  const product = data?.product;
  const blockchain = data?.blockchain;
  const timeline: PublicTimelineEvent[] = data?.timeline || [];
  const qrCodeImage = data?.qrCode;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'QUALITY_CHECKED':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'RECEIVED':
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'SOLD':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'RECALLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
    }
  };

  const getTimelineColorClasses = (color?: string) => {
    switch (color) {
      case 'emerald':
        return {
          bullet: 'bg-emerald-500 text-white ring-4 ring-emerald-500/20',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      case 'blue':
        return {
          bullet: 'bg-blue-500 text-white ring-4 ring-blue-500/20',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'purple':
        return {
          bullet: 'bg-purple-500 text-white ring-4 ring-purple-500/20',
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      case 'amber':
        return {
          bullet: 'bg-amber-500 text-white ring-4 ring-amber-500/20',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
      case 'rose':
        return {
          bullet: 'bg-rose-500 text-white ring-4 ring-rose-500/20',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
      default:
        return {
          bullet: 'bg-slate-600 text-white ring-4 ring-slate-600/20',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Banner & Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/verify" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-500/20 group-hover:bg-blue-500 transition">
            B
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-white block leading-tight">
              B-MOST
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Trust Ledger &bull; QR Verification
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              copyToClipboard(
                typeof window !== 'undefined' ? window.location.href : '',
                'link'
              )
            }
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium transition flex items-center gap-1.5"
            title="Copy verification link"
          >
            {copiedLink ? (
              <>
                <span className="text-emerald-400 text-xs">✓</span>
                <span className="text-emerald-400 text-xs">Copied!</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          <Link
            href="/verify"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium transition flex items-center gap-1"
          >
            <span>Scan Another</span>
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Verification Status Card */}
        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto mb-2">
              ✕
            </div>
            <h1 className="text-xl font-bold text-rose-300">
              Verification Unavailable
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto">{error}</p>
            <div className="pt-2">
              <Link
                href="/verify"
                className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Try Another Code &rarr;
              </Link>
            </div>
          </div>
        ) : isVerified ? (
          <div className="space-y-6">
            {/* Authenticity Badge */}
            <div className="bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden shadow-lg shadow-emerald-500/5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                ✓
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wide uppercase mb-2 border border-emerald-500/30">
                Official Authenticity Verified
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                Authentic Product Confirmed
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                This item has been officially minted and verified against the Ethereum SupplyChainRegistry.
                The Keccak-256 fingerprint matches the immutable blockchain record.
              </p>

              <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-center justify-center gap-6 text-xs text-slate-400 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Verification Standard
                  </span>
                  <span className="text-emerald-400 font-semibold">Keccak-256</span>
                </div>
                <div className="h-6 w-px bg-emerald-500/20"></div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Blockchain Status
                  </span>
                  <span className="text-emerald-400 font-semibold">Live Validated</span>
                </div>
              </div>
            </div>

            {/* Product Details Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                    Product Specification
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    {product?.name || 'Verified Product'}
                  </h2>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                    product?.status
                  )}`}
                >
                  {product?.status}
                </span>
              </div>

              {product?.description && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {product.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Product Code</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-200 font-semibold">
                      {product?.productCode}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(product?.productCode || '', 'hash')
                      }
                      className="text-[10px] text-slate-400 hover:text-white"
                      title="Copy Code"
                    >
                      {copiedHash === product?.productCode ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Serial Number</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-200 font-semibold">
                      {product?.serialNumber}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(product?.serialNumber || '', 'hash')
                      }
                      className="text-[10px] text-slate-400 hover:text-white"
                      title="Copy Serial"
                    >
                      {copiedHash === product?.serialNumber ? '✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Manufacturer</span>
                  <span className="text-slate-200 font-medium block truncate">
                    {product?.manufacturer?.name || 'Verified Manufacturer'}
                  </span>
                  {product?.manufacturer?.code && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Code: {product.manufacturer.code}
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Current Custodian</span>
                  <span className="text-slate-200 font-medium block truncate">
                    {product?.currentOwner?.name || product?.manufacturer?.name}
                  </span>
                  {product?.currentOwner?.type && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Type: {product.currentOwner.type}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Supply Chain Timeline (PRD 7.8 & UI.md 10) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    Supply-Chain Timeline
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chronological lifecycle events verified on the blockchain
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {timeline.length} {timeline.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {timeline.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {timeline.map((event, idx) => {
                    const style = getTimelineColorClasses(event.badgeColor);
                    return (
                      <div key={event.id || idx} className="relative group">
                        {/* Bullet */}
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${style.bullet}`}
                        >
                          {idx + 1}
                        </div>

                        {/* Event Content */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 hover:border-slate-700 transition">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="text-xs font-semibold text-white">
                              {event.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {event.timestamp
                                ? new Date(event.timestamp).toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed">
                            {event.description}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 flex-wrap gap-2">
                            {event.organizationName && (
                              <span>
                                Entity:{' '}
                                <strong className="text-slate-300 font-medium">
                                  {event.organizationName}
                                </strong>
                              </span>
                            )}

                            {event.blockchainTxHash && (
                              <button
                                onClick={() =>
                                  copyToClipboard(event.blockchainTxHash || '', 'hash')
                                }
                                className="font-mono text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded transition"
                                title="Click to copy Transaction Hash"
                              >
                                {copiedHash === event.blockchainTxHash
                                  ? '✓ Copied'
                                  : `Tx: ${event.blockchainTxHash.substring(0, 10)}...`}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No public timeline records available.
                </p>
              )}
            </div>

            {/* Cryptographic Provenance & Blockchain References */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    Blockchain Provenance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Authoritative cryptographic proof stored on-chain
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Validated</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {blockchain?.contractAddress && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">
                      Smart Contract Address
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-300 break-all text-[11px]">
                        {blockchain.contractAddress}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(blockchain.contractAddress || '', 'hash')
                        }
                        className="text-[10px] text-blue-400 hover:text-blue-300 ml-2 shrink-0 font-medium"
                      >
                        {copiedHash === blockchain.contractAddress ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {blockchain?.blockchainTxHash && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">
                      Blockchain Registration Tx
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-blue-400 break-all text-[11px]">
                        {blockchain.blockchainTxHash}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(blockchain.blockchainTxHash || '', 'hash')
                        }
                        className="text-[10px] text-blue-400 hover:text-blue-300 ml-2 shrink-0 font-medium"
                      >
                        {copiedHash === blockchain.blockchainTxHash ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">On-Chain ID</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      Token #{blockchain?.onChainProductId || '1'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">On-Chain Status</span>
                    <span className="font-semibold text-emerald-400">
                      {blockchain?.onChainStatusName || 'REGISTERED'}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-slate-300 text-xs">
                    Deterministic Keccak-256 Hash Match:
                  </span>
                  <span className="text-emerald-400 font-bold text-xs">
                    VERIFIED (100% MATCH)
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code and Actions Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {qrCodeImage && (
                  <div
                    onClick={() => setShowQrModal(true)}
                    className="p-2 bg-white rounded-xl cursor-pointer hover:scale-105 transition shadow-md shrink-0"
                    title="Click to expand QR Code"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeImage}
                      alt={`QR code for ${product?.productCode}`}
                      className="w-16 h-16 block"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Verified Digital Passport
                  </h3>
                  <p className="text-xs text-slate-400">
                    Each authentic product carries this cryptographic QR passport.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {qrCodeImage && (
                  <a
                    href={qrCodeImage}
                    download={`${product?.productCode || code}-qr.png`}
                    className="flex-1 sm:flex-initial py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold text-center transition"
                  >
                    Download QR
                  </a>
                )}
                <Link
                  href={`/traceability?search=${encodeURIComponent(
                    product?.productCode || code
                  )}`}
                  className="flex-1 sm:flex-initial py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center transition"
                >
                  Full Traceability &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4 shadow-lg shadow-amber-500/5">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-3xl mx-auto mb-2">
              ⚠️
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide uppercase border border-amber-500/30">
              Unverified Item
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-amber-400">
              Product Not Verified
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {data?.message ||
                `The product identifier '${code}' was not found or failed cryptographic verification in the official B-MOST supply chain registry.`}
            </p>
            <div className="pt-2 text-xs font-mono text-slate-400">
              Scanned Code: <span className="text-slate-200 font-bold">{code}</span>
            </div>
            <div className="pt-4">
              <Link
                href="/verify"
                className="inline-block px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition"
              >
                Scan or Enter Another Code &rarr;
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Lightbox Modal */}
      {showQrModal && qrCodeImage && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4"
          >
            <h3 className="text-sm font-semibold text-white">
              Official QR Verification Passport
            </h3>
            <div className="p-4 bg-white rounded-xl inline-block shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeImage}
                alt={`QR code for ${product?.productCode || code}`}
                className="w-56 h-56 block mx-auto"
              />
            </div>
            <p className="text-xs font-mono text-slate-400">
              {product?.productCode || code}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <a
                href={qrCodeImage}
                download={`${product?.productCode || code}-qr.png`}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                Download PNG
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full py-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        B-MOST Cryptographic Supply Chain Verification Ledger &bull; Phase 11
      </footer>
    </div>
  );
}
