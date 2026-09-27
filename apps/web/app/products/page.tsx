'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api, type ProductItem } from '../../lib/api';
import { getProductStatusBadge } from '../../lib/thai-locale';
import { BoxIcon, CheckIcon, PlusIcon, SearchIcon, XIcon } from '../../components/Icons';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'ทุกสถานะสินค้า' },
  { value: 'REGISTERED', label: 'ลงทะเบียนสินค้า' },
  { value: 'QUALITY_CHECKED', label: 'ตรวจสอบคุณภาพแล้ว' },
  { value: 'READY_TO_SHIP', label: 'พร้อมจัดส่ง' },
  { value: 'SHIPPED', label: 'จัดส่งแล้ว' },
  { value: 'IN_TRANSIT', label: 'ระหว่างขนส่ง' },
  { value: 'RECEIVED', label: 'รับสินค้าแล้ว' },
  { value: 'STORED', label: 'จัดเก็บแล้ว' },
  { value: 'SOLD', label: 'จำหน่ายแล้ว' },
  { value: 'RECALLED', label: 'เรียกคืน' },
];

type BlockchainState = 'ALL' | 'PENDING' | 'ON_CHAIN';

function ProductBadges({ product }: { product: ProductItem }) {
  const status = getProductStatusBadge(product.status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.bg}`}>
        {status.text}
      </span>
      {product.blockchainProductId ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
          <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
          บน Blockchain
        </span>
      ) : (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
          รอบันทึกบน Blockchain
        </span>
      )}
    </div>
  );
}

function ProductAction({ product }: { product: ProductItem }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {product.blockchainProductId ? 'ดูรายละเอียด' : 'จัดการสินค้า'}
      <span aria-hidden="true" className="ml-1">→</span>
    </Link>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [blockchainState, setBlockchainState] = useState<BlockchainState>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    api.products.list({
      search: searchQuery || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      blockchainState: blockchainState === 'ALL' ? undefined : blockchainState,
      page,
      limit: 10,
    }).then((result) => {
      if (ignore) return;
      setProducts(result.data || []);
      setTotalPages(Math.max(1, result.meta?.totalPages || 1));
      setTotalCount(result.meta?.total || 0);
      setError(null);
    }).catch(() => {
      if (ignore) return;
      setProducts([]);
      setError('โหลดรายการสินค้าไม่สำเร็จ กรุณาลองอีกครั้ง');
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [searchQuery, statusFilter, blockchainState, page, reloadKey]);

  const hasFilters = Boolean(searchQuery || statusFilter !== 'ALL' || blockchainState !== 'ALL');
  const canClearFilters = Boolean(searchInput || hasFilters);

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setPage(1);
    const next = searchInput.trim();
    if (next === searchQuery && page === 1) setReloadKey((value) => value + 1);
    else setSearchQuery(next);
  };

  const clearFilters = () => {
    setLoading(true);
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('ALL');
    setBlockchainState('ALL');
    setPage(1);
    setReloadKey((value) => value + 1);
  };

  const changePage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">จัดการสินค้า</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">รายการสินค้า</h1>
            <p className="mt-1 text-sm text-slate-600">ค้นหา ติดตามสถานะ และจัดการสินค้าก่อนบันทึกบน Blockchain</p>
          </div>
          <Link href="/products/new" className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:self-auto">
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            เพิ่มสินค้าใหม่
          </Link>
        </div>

        <section aria-label="ค้นหาและกรองสินค้า" className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <form onSubmit={applySearch} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="product-search" className="mb-1.5 block text-xs font-semibold text-slate-700">ค้นหาสินค้า</label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="product-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="รหัสสินค้า ซีเรียล หรือชื่อสินค้า" className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">ค้นหา</button>
            </form>
            <div className="lg:w-56">
              <label htmlFor="product-status" className="mb-1.5 block text-xs font-semibold text-slate-700">สถานะสินค้า</label>
              <select id="product-status" value={statusFilter} onChange={(event) => { setLoading(true); setSearchQuery(searchInput.trim()); setStatusFilter(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-600 focus:outline-none">
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="mr-1 text-xs font-semibold text-slate-600">Blockchain</span>
            {([
              ['ALL', 'ทั้งหมด'],
              ['PENDING', 'รอบันทึก'],
              ['ON_CHAIN', 'บันทึกแล้ว'],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={blockchainState === value} onClick={() => { const nextSearch = searchInput.trim(); if (blockchainState === value && page === 1 && searchQuery === nextSearch) return; setLoading(true); setSearchQuery(nextSearch); setBlockchainState(value); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${blockchainState === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}>
                {label}
              </button>
            ))}
            {canClearFilters && <button type="button" onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800"><XIcon className="h-3.5 w-3.5" aria-hidden="true" />ล้างตัวกรอง</button>}
          </div>
        </section>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p role="status" className="text-sm text-slate-600">
            {loading ? 'กำลังโหลดสินค้า...' : error ? 'โหลดข้อมูลไม่สำเร็จ' : `พบ ${totalCount.toLocaleString('th-TH')} รายการ`}
            {!loading && !error && hasFilters && <span className="text-slate-400"> ตามตัวกรอง</span>}
          </p>
          {!loading && !error && totalCount > 0 && <p className="text-xs text-slate-500">หน้า {page} จาก {totalPages}</p>}
        </div>

        {loading ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true" />
            กำลังโหลดรายการสินค้า...
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">
            <p className="font-semibold">{error}</p>
            <button type="button" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100">ลองใหม่</button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><BoxIcon className="h-6 w-6" aria-hidden="true" /></span>
            <h2 className="font-bold">{hasFilters ? 'ไม่พบสินค้าที่ตรงกับตัวกรอง' : 'ยังไม่มีสินค้าในระบบ'}</h2>
            <p className="mt-1 text-sm text-slate-600">{hasFilters ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง' : 'เพิ่มสินค้าเพื่อเริ่มติดตามข้อมูลและบันทึกบน Blockchain'}</p>
            {hasFilters ? <button type="button" onClick={clearFilters} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">ล้างตัวกรอง</button> : <Link href="/products/new" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">เพิ่มสินค้าใหม่</Link>}
          </div>
        ) : (
          <section aria-label="รายการสินค้า" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100 md:hidden">
              {products.map((product) => (
                <article key={product.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/products/${product.id}`} className="font-semibold text-slate-900 hover:text-blue-700">{product.name}</Link>
                      <p className="mt-0.5 break-all font-mono text-xs text-blue-700">{product.productCode}</p>
                    </div>
                    <ProductAction product={product} />
                  </div>
                  <div className="mt-3"><ProductBadges product={product} /></div>
                  <p className="mt-3 text-xs text-slate-500">ซีเรียล {product.serialNumber} · {product.manufacturer?.name || 'ไม่ระบุผู้ผลิต'}</p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">สินค้า</th>
                    <th scope="col" className="px-5 py-3.5">ผู้ผลิต / เจ้าของ</th>
                    <th scope="col" className="px-5 py-3.5">สถานะ</th>
                    <th scope="col" className="px-5 py-3.5 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <Link href={`/products/${product.id}`} className="font-semibold text-slate-900 hover:text-blue-700 hover:underline">{product.name}</Link>
                        <p className="mt-0.5 font-mono text-xs text-blue-700">{product.productCode} <span className="text-slate-400">· SN {product.serialNumber}</span></p>
                        <p className="mt-1 text-xs text-slate-500">{product.category || 'ไม่ระบุหมวดหมู่'} · {new Date(product.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">{product.manufacturer?.name || 'ไม่ระบุผู้ผลิต'}</p>
                        <p className="mt-1">เจ้าของ: {product.currentOwner?.name || 'ไม่ระบุ'}</p>
                      </td>
                      <td className="px-5 py-4"><ProductBadges product={product} /></td>
                      <td className="px-5 py-4 text-right"><ProductAction product={product} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <nav aria-label="หน้ารายการสินค้า" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs sm:px-5">
                <span className="text-slate-500">หน้า {page} / {totalPages}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">ก่อนหน้า</button>
                  <button type="button" disabled={page >= totalPages} onClick={() => changePage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">ถัดไป</button>
                </div>
              </nav>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
