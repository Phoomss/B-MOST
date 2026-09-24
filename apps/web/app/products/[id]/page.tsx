'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Navbar } from '../../../components/Navbar';
import {
  api,
  ProductItem,
  ProductHistoryResponse,
} from '../../../lib/api';
import {
  getProductStatusBadge,
  THAI_PRODUCT_STATUS,
} from '../../../lib/thai-locale';
import {
  LinkIcon,
  ShieldCheckIcon,
  TruckIcon,
  DocumentTextIcon,
  DownloadIcon,
  SearchIcon,
} from '../../../components/Icons';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [history, setHistory] = useState<ProductHistoryResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [prod, hist, qrRes] = await Promise.all([
          api.products.get(id),
          api.products.getHistory(id).catch(() => null),
          api.products.getQr(id).catch(() => null),
        ]);
        if (!ignore) {
          setProduct(prod);
          setHistory(hist);
          if (qrRes?.qrCodeDataUrl) {
            setQrDataUrl(qrRes.qrCodeDataUrl);
          }
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
      setRegisterSuccess('บันทึกข้อมูลสินค้าลงบน Ethereum Smart Contract สำเร็จ!');
      const hist = await api.products.getHistory(product.id).catch(() => null);
      setHistory(hist);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลงทะเบียนบนบล็อกเชน';
      setError(msg);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="max-w-6xl mx-auto px-6 py-20 flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูลสินค้าและสถานะบนบล็อกเชน...</p>
        </main>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-20 flex-1 text-center">
          <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-700 mb-6">
            <h2 className="text-lg font-bold mb-2">เกิดข้อผิดพลาดในการโหลดสินค้า</h2>
            <p className="text-sm">{error}</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition"
          >
            &larr; กลับหน้ารายการสินค้า
          </Link>
        </main>
      </div>
    );
  }

  if (!product) return null;

  const statusBadge = getProductStatusBadge(product.status);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <Link
              href="/products"
              className="text-xs text-slate-500 hover:text-blue-600 transition inline-flex items-center gap-1 mb-2 font-medium"
            >
              &larr; กลับหน้ารายการสินค้า
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {product.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.bg}`}>
                {statusBadge.text}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">
              รหัสสินค้า: <span className="text-slate-800 font-semibold">{product.productCode}</span> | ซีเรียล:{' '}
              <span className="text-slate-800 font-semibold">{product.serialNumber}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!product.blockchainProductId ? (
              <button
                onClick={handleRegisterBlockchain}
                disabled={registering}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                {registering ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังลงทะเบียน...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>บันทึกลง Blockchain</span>
                  </>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ยืนยันบนบล็อกเชน (ID #{product.blockchainProductId})
              </span>
            )}

            {product.status !== 'RECALLED' && product.status !== 'SOLD' && (
              <Link
                href={`/quality?productId=${encodeURIComponent(product.id)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>ตรวจสอบคุณภาพ</span>
              </Link>
            )}

            {(product.status === 'QUALITY_CHECKED' ||
              product.status === 'STORED' ||
              product.status === 'READY_TO_SHIP') && (
              <Link
                href={`/shipments?productId=${encodeURIComponent(product.id)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <TruckIcon className="w-3.5 h-3.5" />
                <span>จัดส่งสินค้า</span>
              </Link>
            )}

            <Link
              href={`/verify/${encodeURIComponent(product.productCode)}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              หน้าตรวจสอบสาธารณะ &rarr;
            </Link>
          </div>
        </div>

        {registerSuccess && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
            {registerSuccess}
          </div>
        )}

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Main Info & Blockchain */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information Card */}
            <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-2xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-600 shrink-0" />
                <span>ข้อมูลจำเพาะของสินค้า (Product Specifications)</span>
              </h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 font-medium">ชื่อสินค้า</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{product.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">หมวดหมู่</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {product.category || 'ไม่ระบุหมวดหมู่'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">รหัสสินค้า</dt>
                  <dd className="font-mono font-semibold text-blue-600 mt-0.5">{product.productCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">หมายเลขซีเรียล</dt>
                  <dd className="font-mono text-slate-800 mt-0.5">{product.serialNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">โรงงานผู้ผลิต</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {product.manufacturer?.name || product.manufacturerId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 font-medium">ผู้ถือครองปัจจุบัน</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {product.currentOwner?.name || product.currentOwnerId}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500 font-medium">รายละเอียดเพิ่มเติม</dt>
                  <dd className="text-slate-600 mt-0.5 text-xs leading-relaxed">
                    {product.description || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Blockchain Details Card */}
            <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-2xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>ข้อมูลบล็อกเชนและการเข้ารหัส (Blockchain &amp; Cryptography)</span>
              </h2>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block mb-1">
                    รหัสแฮชเพื่อความโปร่งใส (Deterministic Keccak-256 Hash)
                  </span>
                  <div className="p-2.5 rounded-lg bg-slate-50 font-mono text-slate-700 break-all border border-slate-200 text-[11px]">
                    {product.productHash || 'ยังไม่ได้สร้างรหัสแฮช'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 font-medium block mb-1">รหัสสินค้าบน Smart Contract</span>
                    <span className="font-mono text-slate-900 font-bold text-sm">
                      {product.blockchainProductId ? `#${product.blockchainProductId}` : 'ยังไม่ลงทะเบียน'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block mb-1">สถานะธุรกรรม</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded font-mono text-xs font-semibold ${
                        product.blockchainTxHash
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {product.blockchainTxHash ? 'CONFIRMED (ยืนยันแล้ว)' : 'PENDING'}
                    </span>
                  </div>
                </div>

                {product.blockchainTxHash && (
                  <div className="pt-1">
                    <span className="text-slate-500 font-medium block mb-1">Transaction Hash</span>
                    <div className="p-2.5 rounded-lg bg-slate-50 font-mono text-blue-700 break-all border border-slate-200 text-[11px]">
                      {product.blockchainTxHash}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: QR Code & Verification */}
          <div className="space-y-6">
            <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-2xs text-center">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                QR Code สำหรับตรวจสอบ
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                สแกนด้วยสมาร์ทโฟนเพื่อตรวจสอบความแท้จริงของสินค้า
              </p>

              {qrDataUrl ? (
                <div className="inline-block p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${product.productCode}`}
                    className="w-44 h-44 mx-auto"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 mx-auto bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-400">
                  กำลังสร้าง QR Code...
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <a
                  href={`/api/public/verify/${encodeURIComponent(product.productCode)}/qr`}
                  download={`${product.productCode}-QR.png`}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดภาพ QR Code</span>
                </a>
                <Link
                  href={`/verify/${encodeURIComponent(product.productCode)}`}
                  className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <SearchIcon className="w-3.5 h-3.5" />
                  <span>เปิดหน้าตรวจสอบสินค้า</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Provenance & History Timeline */}
        <div className="border border-slate-200 bg-white rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ประวัติเส้นทางสินค้าในห่วงโซ่อุปทาน (Provenance Timeline)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                บันทึกขั้นตอนการผลิต ตรวจสอบคุณภาพ และการเปลี่ยนมือของสินค้า
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {history?.blockchainHistory?.length || 0} เหตุการณ์
            </span>
          </div>

          {history?.blockchainHistory && history.blockchainHistory.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.blockchainHistory.map((evt, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[1.625rem] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        {THAI_PRODUCT_STATUS[evt.eventType] || evt.eventType}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(typeof evt.timestamp === 'number' && evt.timestamp < 1e11 ? evt.timestamp * 1000 : evt.timestamp).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      ผู้ดำเนินการ: <span className="font-semibold text-slate-800">{evt.actor}</span>
                    </div>
                    {evt.details && (
                      <div className="text-xs text-slate-500 mt-1 italic">
                        {evt.details}
                      </div>
                    )}
                    {(evt as any).transactionHash && (
                      <div className="mt-2 text-[10px] font-mono text-blue-600 truncate">
                        Tx: {(evt as any).transactionHash}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              ยังไม่มีบันทึกประวัติการดำเนินการของสินค้านี้
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
