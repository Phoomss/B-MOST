'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api, ProductItem } from '../../lib/api';
import { THAI_PRODUCT_STATUS, getProductStatusBadge } from '../../lib/thai-locale';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'สถานะทั้งหมด' },
  { value: 'REGISTERED', label: 'ลงทะเบียนแล้ว' },
  { value: 'QUALITY_CHECKED', label: 'ตรวจสอบคุณภาพแล้ว' },
  { value: 'READY_TO_SHIP', label: 'พร้อมจัดส่ง' },
  { value: 'SHIPPED', label: 'จัดส่งแล้ว' },
  { value: 'IN_TRANSIT', label: 'อยู่ระหว่างการขนส่ง' },
  { value: 'RECEIVED', label: 'รับสินค้าแล้ว' },
  { value: 'STORED', label: 'จัดเก็บแล้ว' },
  { value: 'SOLD', label: 'จำหน่ายแล้ว' },
  { value: 'RECALLED', label: 'เรียกคืน' },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.products.list({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 10,
      });
      setProducts(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลสินค้าได้';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await api.products.list({
          search: search.trim() || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          page,
          limit: 10,
        });
        if (!ignore) {
          setProducts(res.data || []);
          setTotalPages(res.meta?.totalPages || 1);
          setTotalCount(res.meta?.total || 0);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลสินค้าได้';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [search, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                รายการสินค้า
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                ทั้งหมด {totalCount} รายการ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              จัดการสินค้าในห่วงโซ่อุปทาน คำนวณรหัสแฮชเพื่อความโปร่งใส และบันทึกข้อมูลลงบนบล็อกเชน
            </p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition self-start sm:self-auto cursor-pointer"
          >
            <span>+ เพิ่มสินค้าใหม่</span>
          </Link>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารหัสสินค้า, ซีเรียล, หรือชื่อสินค้า..."
              className="bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 w-full"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition cursor-pointer"
            >
              ค้นหา
            </button>
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-medium shrink-0">สถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer w-full md:w-auto"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Table / Cards */}
        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchProducts()}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-semibold transition cursor-pointer"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {loading ? (
          <div className="border border-slate-200 bg-white rounded-xl p-12 text-center shadow-2xs">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-slate-500">กำลังโหลดข้อมูลสินค้าจากฐานข้อมูลและบล็อกเชน...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-white rounded-xl p-12 text-center shadow-2xs">
            <div className="text-slate-400 text-4xl mb-3">📦</div>
            <h3 className="text-base font-bold text-slate-900 mb-1">ยังไม่มีสินค้าในระบบ</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              เริ่มต้นด้วยการเพิ่มสินค้าเข้าสู่ระบบเพื่อเริ่มติดตามแหล่งกำเนิดและบันทึกประวัติลงบนบล็อกเชน
            </p>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
            >
              + เพิ่มสินค้า
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-5 py-3.5">รหัสสินค้า</th>
                  <th scope="col" className="px-5 py-3.5">ชื่อสินค้า</th>
                  <th scope="col" className="px-5 py-3.5">ผู้ผลิต</th>
                  <th scope="col" className="px-5 py-3.5">เจ้าของปัจจุบัน</th>
                  <th scope="col" className="px-5 py-3.5">สถานะ</th>
                  <th scope="col" className="px-5 py-3.5">Blockchain</th>
                  <th scope="col" className="px-5 py-3.5">วันที่สร้าง</th>
                  <th scope="col" className="px-5 py-3.5 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const badge = getProductStatusBadge(p.status);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4 font-mono font-semibold text-blue-600 text-xs">
                        <Link href={`/products/${p.id}`} className="hover:underline">
                          {p.productCode}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-mono font-normal">
                          SN: {p.serialNumber}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {p.name}
                        {p.category && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            หมวดหมู่: {p.category}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {p.manufacturer?.name || '-'}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {p.currentOwner?.name || '-'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}
                        >
                          {badge.text}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {p.blockchainProductId ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                            <span>✓</span> บนบล็อกเชน (#{p.blockchainProductId})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">รอการลงทะเบียน</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 font-mono">
                        {new Date(p.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/products/${p.id}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold transition"
                        >
                          ดูรายละเอียด &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  หน้า {page} จาก {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
                  >
                    &larr; ก่อนหน้า
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
                  >
                    ถัดไป &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
