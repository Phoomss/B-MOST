'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/Navbar';
import { api } from '../../../lib/api';

export default function CreateProductPage() {
  const router = useRouter();

  const [productCode, setProductCode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [registerOnBlockchain, setRegisterOnBlockchain] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const created = await api.products.create({
        productCode: productCode.trim().toUpperCase(),
        serialNumber: serialNumber.trim(),
        name: name.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        registerOnBlockchain,
      });

      router.push(`/products/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create product';
      setError(msg);
      setLoading(false);
    }
  };

  const handleGenerateCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setProductCode(`PRD-${new Date().getFullYear()}-${randomSuffix}`);
  };

  const handleGenerateSerial = () => {
    const randomSerial = 'SN-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    setSerialNumber(randomSerial);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="mb-6">
          <Link
            href="/products"
            className="text-xs text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1 mb-2"
          >
            &larr; Back to Products
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Register New Product
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create an authentic product entry in the supply chain database and optionally commit to the blockchain smart contract.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm mb-6">
            <div className="font-semibold mb-1">Registration Error</div>
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="border border-slate-800 bg-slate-950/60 rounded-xl p-6 sm:p-8 space-y-6"
        >
          {/* Product Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-200">
                Product Code <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              required
              value={productCode}
              onChange={(e) => setProductCode(e.target.value.toUpperCase())}
              placeholder="e.g. PRD-2026-0001"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Unique identifier used in consumer QR verification and on-chain mapping.
            </p>
          </div>

          {/* Serial Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-200">
                Serial Number <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateSerial}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              required
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-8921473"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Commercial Name */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Industrial IoT Sensor Probe"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Electronics, Pharmaceuticals, Consumer Goods"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Description / Specifications
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief manufacturing specifications or batch details..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Blockchain Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 cursor-pointer transition">
              <input
                type="checkbox"
                checked={registerOnBlockchain}
                onChange={(e) => setRegisterOnBlockchain(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <div>
                <span className="text-sm font-medium text-white block">
                  Register immediately onto Smart Contract
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Submits a transaction to SupplyChainRegistry.sol with deterministic keccak256 hash. You can also register later.
                </span>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <Link
              href="/products"
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Creating...' : 'Register Product'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
