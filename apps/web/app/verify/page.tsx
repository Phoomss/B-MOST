'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';

export default function VerifyLandingPage() {
  const router = useRouter();
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) {
      setError('Please enter a product code or serial number');
      return;
    }
    setError(null);
    router.push(`/verify/${encodeURIComponent(clean.toUpperCase())}`);
  };

  const sampleCodes = [
    { code: 'PRD-2026-0001', label: 'Sample Product 0001' },
    { code: 'PRD-APEX-001', label: 'Apex Microcontroller' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Public Provenance Registry
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Verify Product Authenticity
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Scan the QR code on your product packaging or enter the product code below to verify its
            cryptographic provenance and complete supply-chain timeline on the Ethereum smart contract ledger.
          </p>
        </div>

        {/* Search / Verification Form Card */}
        <div className="w-full max-w-xl bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-950/50 mb-10">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label
                htmlFor="productCodeInput"
                className="block text-xs font-medium text-slate-300 mb-2"
              >
                Product Code or Serial Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                </div>
                <input
                  id="productCodeInput"
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. PRD-2026-0001 or SN-001"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono transition"
                />
              </div>
              {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              <span>Verify Provenance</span>
              <span>&rarr;</span>
            </button>
          </form>

          {/* Quick test sample codes */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400">
            <span className="block mb-2 font-medium text-slate-400">Quick Test Samples:</span>
            <div className="flex flex-wrap gap-2">
              {sampleCodes.map((sample) => (
                <button
                  key={sample.code}
                  type="button"
                  onClick={() => {
                    setInputCode(sample.code);
                    router.push(`/verify/${encodeURIComponent(sample.code)}`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700/60 transition"
                >
                  {sample.code} ({sample.label})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-base mb-3 border border-blue-500/20">
              #
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">
              Deterministic Keccak-256
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every authentic product is fingerprinted with a Keccak-256 cryptographic hash matching serial number, manufacturer identity, and specifications.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-base mb-3 border border-emerald-500/20">
              ⛓️
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">
              On-Chain Immutability
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Registration, quality inspections, and custody transfers are recorded permanently on the Ethereum SupplyChainRegistry contract.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-base mb-3 border border-purple-500/20">
              📱
            </div>
            <h3 className="text-sm font-semibold text-white mb-1.5">
              Instant Smartphone Scan
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No account, login, or special app required. Any standard smartphone camera scans the packaging QR to reveal true authentic history.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        B-MOST Cryptographic Supply Chain Ledger &bull; Phase 11 QR Verification
      </footer>
    </div>
  );
}
