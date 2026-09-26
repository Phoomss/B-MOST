'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api, PublicVerifyResponse, PublicTimelineEvent } from '../../../lib/api';
import { getProductStatusBadge, THAI_PRODUCT_STATUS } from '../../../lib/thai-locale';
import {
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  CopyIcon,
  LinkIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from '../../../components/Icons';

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
          const msg = err instanceof Error ? err.message : 'การตรวจสอบสินค้าล้มเหลว';
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
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">
          กำลังตรวจสอบความถูกต้องของสินค้า
        </h2>
        <p className="text-xs text-slate-500 font-mono">
          ตรวจสอบค่าแฮช Keccak-256 และข้อมูลบน Smart Contract สำหรับ {code}...
        </p>
      </div>
    );
  }

  const isVerified = data?.verified === true;
  const product = data?.product;
  const blockchain = data?.blockchain;
  const timeline: PublicTimelineEvent[] = data?.timeline || [];
  const qrCodeImage = data?.qrCode;

  const getTimelineColorClasses = (color?: string) => {
    switch (color) {
      case 'emerald':
        return {
          bullet: 'bg-emerald-600 text-white ring-4 ring-emerald-100',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'blue':
        return {
          bullet: 'bg-blue-600 text-white ring-4 ring-blue-100',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'purple':
        return {
          bullet: 'bg-purple-600 text-white ring-4 ring-purple-100',
          badge: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'amber':
        return {
          bullet: 'bg-amber-600 text-white ring-4 ring-amber-100',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'rose':
        return {
          bullet: 'bg-red-600 text-white ring-4 ring-red-100',
          badge: 'bg-red-50 text-red-700 border-red-200',
        };
      default:
        return {
          bullet: 'bg-slate-600 text-white ring-4 ring-slate-100',
          badge: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      {/* Top Banner & Navigation */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <Link href="/verify" className="flex items-center gap-2.5 group">
          <img
            src="/icon_logo.png"
            alt="B-MOST"
            className="h-10 w-10 object-contain group-hover:scale-105 transition-transform duration-200"
          />
        
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-slate-900 text-base">
                B-MOST
              </span>
        
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                EVM
              </span>
            </div>
        
            <span className="hidden sm:inline-block text-[10px] text-slate-500 font-medium -mt-0.5">
              ระบบตรวจสอบความถูกต้องสินค้าผ่านบล็อกเชน
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
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs text-slate-700 font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="คัดลอกลิงก์ตรวจสอบ"
          >
            {copiedLink ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-xs">คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 text-slate-500"
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
                <span className="hidden sm:inline">แชร์</span>
              </>
            )}
          </button>

          <Link
            href="/verify"
            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs text-white font-semibold transition flex items-center gap-1 shadow-2xs"
          >
            <span>สแกนชิ้นอื่น</span>
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* Verification Status Card */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2 font-bold">
              <XIcon className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-red-800">
              ไม่สามารถตรวจสอบสินค้าได้
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
            <div className="pt-2">
              <Link
                href="/verify"
                className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition"
              >
                ลองรหัสอื่น &rarr;
              </Link>
            </div>
          </div>
        ) : isVerified ? (
          <div className="space-y-6">
            {/* Authenticity Badge */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 font-bold shadow-xs">
                <CheckIcon className="w-8 h-8" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold tracking-wide uppercase mb-2 border border-emerald-200">
                Official Authenticity Verified
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                ยืนยันสินค้าแท้ผ่านบล็อกเชน
              </h1>
              <p className="text-xs font-semibold text-emerald-800 mb-2">
                Authentic Product Confirmed
              </p>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                สินค้ารายการนี้ได้รับการบันทึกและตรวจสอบบน Ethereum SupplyChainRegistry เรียบร้อยแล้ว
                ค่าลายนิ้วมือดิจิทัล Keccak-256 ตรงกับข้อมูลถาวรบนบล็อกเชนอย่างสมบูรณ์
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                    มาตรฐานการตรวจสอบ
                  </span>
                  <span className="text-emerald-700 font-bold">Keccak-256</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
                    สถานะบล็อกเชน
                  </span>
                  <span className="text-emerald-700 font-bold">Live Validated</span>
                </div>
              </div>
            </div>

            {/* Product Details Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    ข้อมูลคุณลักษณะสินค้า (Product Specification)
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    {product?.name || 'Verified Product'}
                  </h2>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    getProductStatusBadge(product?.status || 'REGISTERED').bg
                  }`}
                >
                  {getProductStatusBadge(product?.status || 'REGISTERED').text}
                </span>
              </div>

              {product?.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-medium">รหัสสินค้า (Product Code)</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-900 font-bold">
                      {product?.productCode}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(product?.productCode || '', 'hash')
                      }
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer inline-flex items-center gap-1"
                      title="คัดลอกรหัส"
                    >
                      {copiedHash === product?.productCode ? (
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        'คัดลอก'
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-medium">หมายเลขซีเรียล (Serial Number)</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-900 font-bold">
                      {product?.serialNumber}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(product?.serialNumber || '', 'hash')
                      }
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer inline-flex items-center gap-1"
                      title="คัดลอกซีเรียล"
                    >
                      {copiedHash === product?.serialNumber ? (
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        'คัดลอก'
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-medium">ผู้ผลิต (Manufacturer)</span>
                  <span className="text-slate-900 font-bold block truncate">
                    {product?.manufacturer?.name || 'Verified Manufacturer'}
                  </span>
                  {product?.manufacturer?.code && (
                    <span className="text-[10px] font-mono text-slate-500">
                      รหัส: {product.manufacturer.code}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1 font-medium">ผู้ครอบครองปัจจุบัน (Current Custodian)</span>
                  <span className="text-slate-900 font-bold block truncate">
                    {product?.currentOwner?.name || product?.manufacturer?.name}
                  </span>
                  {product?.currentOwner?.type && (
                    <span className="text-[10px] font-mono text-slate-500">
                      ประเภท: {product.currentOwner.type}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Supply Chain Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    ลำดับเหตุการณ์ในห่วงโซ่อุปทาน (Supply-Chain Timeline)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ประวัติกิจกรรมสินค้าที่ผ่านการรับรองความถูกต้องบนบล็อกเชน
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono font-medium">
                  {timeline.length} {timeline.length === 1 ? 'รายการ' : 'รายการ'}
                </span>
              </div>

              {timeline.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
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
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 hover:border-slate-300 transition">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="text-xs font-bold text-slate-900">
                              {event.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {event.timestamp
                                ? new Date(event.timestamp).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {event.description}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-xs text-slate-500 flex-wrap gap-2 border-t border-slate-200">
                            {event.organizationName && (
                              <span>
                                องค์กร:{' '}
                                <strong className="text-slate-800 font-semibold">
                                  {event.organizationName}
                                </strong>
                              </span>
                            )}

                            {event.blockchainTxHash && (
                              <button
                                onClick={() =>
                                  copyToClipboard(event.blockchainTxHash || '', 'hash')
                                }
                                className="font-mono text-[10px] text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded transition cursor-pointer inline-flex items-center gap-1"
                                title="คลิกเพื่อคัดลอก Transaction Hash"
                              >
                                {copiedHash === event.blockchainTxHash ? (
                                  <>
                                    <CheckIcon className="w-3 h-3 text-emerald-600" />
                                    <span>คัดลอกแล้ว</span>
                                  </>
                                ) : (
                                  `Tx: ${event.blockchainTxHash.substring(0, 10)}...`
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  ไม่มีประวัติไทม์ไลน์ที่เปิดเผยต่อสาธารณะ
                </p>
              )}
            </div>

            {/* Cryptographic Provenance & Blockchain References */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    หลักฐานทางวิทยาการเข้ารหัสลับ (Blockchain Provenance)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ข้อมูลตรวจสอบสิทธิ์ที่บันทึกบนสมาร์ตคอนแทรกล็อกเชน
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Validated</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {blockchain?.contractAddress && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block mb-0.5 font-medium">
                      Smart Contract Address
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-800 break-all text-[11px]">
                        {blockchain.contractAddress}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(blockchain.contractAddress || '', 'hash')
                        }
                        className="text-[10px] text-blue-600 hover:text-blue-700 ml-2 shrink-0 font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        {copiedHash === blockchain.contractAddress ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-600" />
                            <span>คัดลอกแล้ว</span>
                          </>
                        ) : (
                          'คัดลอก'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {blockchain?.blockchainTxHash && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block mb-0.5 font-medium">
                      Blockchain Registration Tx
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-blue-700 break-all text-[11px]">
                        {blockchain.blockchainTxHash}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(blockchain.blockchainTxHash || '', 'hash')
                        }
                        className="text-[10px] text-blue-600 hover:text-blue-700 ml-2 shrink-0 font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        {copiedHash === blockchain.blockchainTxHash ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-600" />
                            <span>คัดลอกแล้ว</span>
                          </>
                        ) : (
                          'คัดลอก'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block mb-0.5 font-medium">On-Chain Token ID</span>
                    <span className="font-mono text-slate-900 font-bold">
                      Token #{blockchain?.onChainProductId || '1'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block mb-0.5 font-medium">สถานะบนบล็อกเชน</span>
                    <span className="font-bold text-emerald-700">
                      {blockchain?.onChainStatusName || 'REGISTERED'}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-emerald-900 text-xs font-medium">
                    การจับคู่รหัส Keccak-256 Hash:
                  </span>
                  <span className="text-emerald-800 font-bold text-xs">
                    VERIFIED (100% MATCH)
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code and Actions Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
              <div className="flex items-center gap-4">
                {qrCodeImage && (
                  <div
                    onClick={() => setShowQrModal(true)}
                    className="p-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:scale-105 transition shadow-xs shrink-0"
                    title="คลิกเพื่อขยาย QR Code"
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
                  <h3 className="text-sm font-bold text-slate-900">
                    พาสปอร์ตดิจิทัลยืนยันความแท้ (Digital Passport)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    สินค้าแท้ทุกชิ้นจะมี QR Code สากลที่ผูกกับรหัสแฮชบนบล็อกเชน
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {qrCodeImage && (
                  <a
                    href={qrCodeImage}
                    download={`${product?.productCode || code}-qr.png`}
                    className="flex-1 sm:flex-initial py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold text-center transition shadow-2xs"
                  >
                    ดาวน์โหลด QR
                  </a>
                )}
                <Link
                  href={`/traceability?search=${encodeURIComponent(
                    product?.productCode || code
                  )}`}
                  className="flex-1 sm:flex-initial py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold text-center transition shadow-xs"
                >
                  ประวัติย้อนกลับเต็มรูปแบบ &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-2 font-bold">
              <AlertTriangleIcon className="w-8 h-8 text-amber-600" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold tracking-wide uppercase border border-amber-200">
              Unverified Item
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-amber-900">
              Product Not Verified
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {data?.message ||
                `ไม่พบรหัสสินค้า '${code}' ในระบบ หรือการตรวจสอบทางวิทยาการเข้ารหัสลับล้มเหลว กรุณาตรวจสอบกับผู้จัดจำหน่าย`}
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">
              รหัสที่สแกน: <span className="text-slate-900 font-bold">{code}</span>
            </div>
            <div className="pt-4">
              <Link
                href="/verify"
                className="inline-block px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
              >
                สแกนหรือระบุรหัสอื่น &rarr;
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Lightbox Modal */}
      {showQrModal && qrCodeImage && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl"
          >
            <h3 className="text-sm font-bold text-slate-900">
              พาสปอร์ต QR Code ตรวจสอบสินค้าอย่างเป็นทางการ
            </h3>
            <div className="p-4 bg-white border border-slate-200 rounded-xl inline-block shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeImage}
                alt={`QR code for ${product?.productCode || code}`}
                className="w-56 h-56 block mx-auto"
              />
            </div>
            <p className="text-xs font-mono text-slate-600 font-bold">
              {product?.productCode || code}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <a
                href={qrCodeImage}
                download={`${product?.productCode || code}-qr.png`}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs"
              >
                ดาวน์โหลด PNG
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full py-6 border-t border-slate-200 text-center text-xs text-slate-400">
        B-MOST Cryptographic Supply Chain Verification Ledger &bull; Phase 11
      </footer>
    </div>
  );
}
