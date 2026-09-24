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
      setError('กรุณาระบุรหัสสินค้าหรือหมายเลขซีเรียล');
      return;
    }
    setError(null);
    router.push(`/verify/${encodeURIComponent(clean.toUpperCase())}`);
  };

  const sampleCodes = [
    { code: 'PRD-2026-0001', label: 'สินค้าทดสอบ 0001' },
    { code: 'PRD-APEX-001', label: 'Apex Microcontroller' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ระบบตรวจสอบสินค้าสาธารณะ (Public Provenance Registry)
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            ตรวจสอบความถูกต้องของสินค้า
          </h1>

          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            สแกน QR Code บนบรรจุภัณฑ์สินค้า หรือระบุรหัสสินค้าด้านล่างเพื่อตรวจสอบประวัติห่วงโซ่อุปทาน
            และความแท้จริงของสินค้าผ่านระบบบล็อกเชนแบบเรียลไทม์
          </p>
        </div>

        {/* Search / Verification Form Card */}
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs mb-10">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label
                htmlFor="productCodeInput"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                รหัสสินค้า หรือ หมายเลขซีเรียล (Product Code / Serial Number)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                  placeholder="เช่น PRD-2026-0001 หรือ SN-001"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono transition"
                />
              </div>
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ตรวจสอบข้อมูลสินค้า</span>
              <span>&rarr;</span>
            </button>
          </form>

          {/* Quick test sample codes */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500">
            <span className="block mb-2 font-semibold text-slate-700">รหัสสินค้าตัวอย่างสำหรับทดสอบ:</span>
            <div className="flex flex-wrap gap-2">
              {sampleCodes.map((sample) => (
                <button
                  key={sample.code}
                  type="button"
                  onClick={() => {
                    setInputCode(sample.code);
                    router.push(`/verify/${encodeURIComponent(sample.code)}`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200 transition cursor-pointer"
                >
                  {sample.code} ({sample.label})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base mb-3 border border-blue-200">
              #
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">
              Deterministic Keccak-256
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              สินค้าแท้ทุกชิ้นจะถูกคำนวณรหัสแฮช Keccak-256 จากข้อมูลประจำตัวและคุณลักษณะ เพื่อยืนยันว่าไม่มีการปลอมแปลง
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base mb-3 border border-emerald-200">
              ⛓️
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">
              On-Chain Immutability
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              การลงทะเบียนสินค้า ตรวจสอบคุณภาพ และเปลี่ยนสิทธิ์การครอบครองถูกบันทึกอย่างถาวรบน Smart Contract
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base mb-3 border border-purple-200">
              📱
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">
              Instant Smartphone Scan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ไม่ต้องดาวน์โหลดแอปพลิเคชันหรือลงทะเบียน สามารถใช้กล้องสมาร์ทโฟนสแกน QR Code บนกล่องสินค้าเพื่อตรวจสอบได้ทันที
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        B-MOST Cryptographic Supply Chain Ledger &bull; Phase 11 Public QR Verification
      </footer>
    </div>
  );
}
