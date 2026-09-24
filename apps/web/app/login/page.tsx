'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
// import { Navbar } from '../../components/Navbar';
import { api, setAuthToken, setStoredUser, getAuthToken } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  let redirectUrl = '/';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const searchParams = typeof useSearchParams === 'function' ? useSearchParams() : null;
    if (searchParams) {
      redirectUrl = searchParams.get('redirect') || '/';
    }
  } catch {
    redirectUrl = '/';
  }

  const safeRedirectUrl =
    !redirectUrl || redirectUrl === '/login' || redirectUrl.startsWith('/login')
      ? '/'
      : redirectUrl;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (getAuthToken()) {
      router.replace(safeRedirectUrl);
    }
  }, [safeRedirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('กรุณากรอกอีเมลของคุณ');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);

    try {
      const res = await api.auth.login({
        email: cleanEmail,
        password,
      });

      if (res.accessToken) {
        setAuthToken(res.accessToken);
        if (res.user) {
          setStoredUser(res.user);
        }
        router.push(safeRedirectUrl);
        router.refresh?.();
      } else {
        throw new Error('ไม่ได้รับ Access Token จากระบบ');
      }
    } catch (err: any) {
      const msg = err.message || '';
      setError(msg || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-bold text-2xl mb-3 shadow-xs">
              B
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              เข้าสู่ระบบ
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Sign In to B-MOST
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              ระบบติดตามและตรวจสอบห่วงโซ่อุปทานด้วยเทคโนโลยีบล็อกเชน
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="p-3.5 mb-5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="font-semibold text-red-800">เข้าสู่ระบบไม่สำเร็จ</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                อีเมล (Email) <span className="text-red-500">*</span>
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@organization.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password-input" className="block text-xs font-semibold text-slate-700">
                  รหัสผ่าน (Password) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">ลืมรหัสผ่าน?</span>
              </div>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}
            </button>
          </form>

          {/* Demo Credentials Quick-Select */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              บัญชีทดสอบระบบ (คลิกเพื่อกรอกอัตโนมัติ)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin@bmost.io', 'password123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700"
              >
                <div className="font-semibold">ผู้ดูแลระบบ (Admin)</div>
                <div className="text-[10px] text-slate-400 truncate">superadmin@bmost.io</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('manufacturer@bmost.io', 'password123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700"
              >
                <div className="font-semibold">ผู้ผลิต (Apex)</div>
                <div className="text-[10px] text-slate-400 truncate">manufacturer@bmost.io</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('auditor@bmost.io', 'password123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700"
              >
                <div className="font-semibold">ผู้ตรวจสอบ (Auditor)</div>
                <div className="text-[10px] text-slate-400 truncate">auditor@bmost.io</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('distributor@bmost.io', 'password123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700"
              >
                <div className="font-semibold">ผู้จัดจำหน่าย (Nexus)</div>
                <div className="text-[10px] text-slate-400 truncate">distributor@bmost.io</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('warehouse@bmost.io', 'password123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700"
              >
                <div className="font-semibold">คลังสินค้า (Warehouse)</div>
                <div className="text-[10px] text-slate-400 truncate">warehouse@bmost.io</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('retailer@bmost.io', 'password123')}
                className="p-2 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700"
              >
                <div className="font-semibold">ร้านค้าปลีก (Retailer)</div>
                <div className="text-[10px] text-slate-400 truncate">retailer@bmost.io</div>
              </button>
            </div>
          </div>

          {/* Public Verification Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>ตรวจสอบสินค้าโดยไม่ต้องเข้าสู่ระบบ? </span>
            <Link href="/verify" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              สแกน QR Code ตรวจสอบ &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
