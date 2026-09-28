"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, setAuthToken, setStoredUser, getAuthToken } from "../../lib/api";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const safeRedirectUrl =
    !redirectUrl || redirectUrl === "/" || !redirectUrl.startsWith("/") || redirectUrl.startsWith("//") || redirectUrl === "/login" || redirectUrl.startsWith("/login?") || redirectUrl.startsWith("/login/")
      ? "/dashboard"
      : redirectUrl;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setAuthToken(token);
      router.replace(safeRedirectUrl);
    }
  }, [safeRedirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("กรุณากรอกอีเมลของคุณ");
      return;
    }
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (!password) {
      setError("กรุณากรอกรหัสผ่าน");
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
        throw new Error("ไม่ได้รับ Access Token จากระบบ");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-slate-100 text-slate-900 flex flex-col font-sans">
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-16">
          <div className="hidden lg:block">
            <div className="mb-6 inline-flex items-center rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">B-MOST Platform</div>
            <h2 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-slate-900">ติดตามสินค้าได้ทุกขั้นตอน อย่างมั่นใจ</h2>
            <p className="mt-5 max-w-md text-base leading-8 text-slate-600">จัดการสินค้า ตรวจสอบคุณภาพ และติดตามการขนส่งในที่เดียว พร้อมบันทึกธุรกรรมบนบล็อกเชน</p>
            <div className="mt-8 rounded-2xl border border-blue-100 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">ต้องการตรวจสอบสินค้า?</p>
              <p className="mt-1 text-sm text-slate-600">สแกน QR Code หรือค้นหาสินค้าได้โดยไม่ต้องเข้าสู่ระบบ</p>
              <Link href="/verify" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">ไปหน้าตรวจสอบสินค้า <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg shadow-slate-200/70">
          {/* Logo & Header */}
          <div className="text-center mb-7">
            <div className="contents">
              <Image
                src="/brand_logo.png"
                alt="B-MOST"
                width={160}
                height={80}
                className="inline-block w-36 h-auto object-contain mb-5"
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              เข้าสู่ระบบ
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Sign In to B-MOST
            </p>
            <p className="text-sm text-slate-500 mt-3">
              กรอกอีเมลและรหัสผ่านของบัญชีองค์กร
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              id="login-error"
              role="alert"
              className="p-3.5 mb-5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-2.5"
            >
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="font-semibold text-red-800">
                  เข้าสู่ระบบไม่สำเร็จ
                </div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
            <div>
              <label
                htmlFor="email-input"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                อีเมล (Email) <span className="text-red-500">*</span>
              </label>
              <input
                id="email-input"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                placeholder="user@organization.com"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full min-h-12 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-sm font-semibold text-slate-700"
                >
                  รหัสผ่าน (Password) <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                  placeholder="••••••••"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full min-h-12 px-3.5 py-2.5 pr-12 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-2 rounded-md focus-visible:outline-2 focus-visible:outline-blue-600"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบขององค์กร</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-12 mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition disabled:cursor-wait disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ (Sign In)"}
            </button>
          </form>

          <details className="group mt-7 border-t border-slate-100 pt-5">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg py-1 text-sm font-semibold text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
              ทดลองใช้บัญชีตัวอย่าง
              <span aria-hidden="true" className="text-slate-400 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">เลือกบทบาทเพื่อกรอกอีเมลและรหัสผ่านตัวอย่าง แล้วกดเข้าสู่ระบบ</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("superadmin@bmost.io", "password123")
                }
                className="p-3 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="font-semibold">ผู้ดูแลระบบ (Admin)</div>
                <div className="text-[10px] text-slate-400 truncate">
                  superadmin@bmost.io
                </div>
                <div className="text-[9px] text-indigo-600 font-mono mt-0.5">Account 1</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("orgadmin@bmost.io", "password123")
                }
                className="p-3 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="font-semibold">ผู้ดูแลองค์กร (Org Admin)</div>
                <div className="text-[10px] text-slate-400 truncate">
                  orgadmin@bmost.io
                </div>
                <div className="text-[9px] text-indigo-600 font-mono mt-0.5">Account 1</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("manufacturer@bmost.io", "password123")
                }
                className="p-3 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="font-semibold">ผู้ผลิต (Apex)</div>
                <div className="text-[10px] text-slate-400 truncate">
                  manufacturer@bmost.io
                </div>
                <div className="text-[9px] text-indigo-600 font-mono mt-0.5">Account 1</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("auditor@bmost.io", "password123")
                }
                className="p-3 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="font-semibold">ผู้ตรวจสอบ (Auditor)</div>
                <div className="text-[10px] text-slate-400 truncate">
                  auditor@bmost.io
                </div>
                <div className="text-[9px] text-indigo-600 font-mono mt-0.5">Account 1</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("distributor@bmost.io", "password123")
                }
                className="p-3 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="font-semibold">ผู้จัดจำหน่าย (Nexus)</div>
                <div className="text-[10px] text-slate-400 truncate">
                  distributor@bmost.io
                </div>
                <div className="text-[9px] text-emerald-600 font-mono mt-0.5">Account 2</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("warehouse@bmost.io", "password123")
                }
                className="p-3 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="font-semibold">คลังสินค้า (Warehouse)</div>
                <div className="text-[10px] text-slate-400 truncate">
                  warehouse@bmost.io
                </div>
                <div className="text-[9px] text-emerald-600 font-mono mt-0.5">Account 2</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("retailer@bmost.io", "password123")
                }
                className="p-3 text-left rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-slate-700 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <div className="font-semibold">ร้านค้าปลีก (Retailer)</div>
                <div className="text-[10px] text-slate-400 truncate">
                  retailer@bmost.io
                </div>
                <div className="text-[9px] text-indigo-600 font-mono mt-0.5">Account 1</div>
              </button>
            </div>
          </details>

          {/* Public Verification Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600 lg:hidden">
            <span>ต้องการตรวจสอบสินค้า? </span>
            <Link
              href="/verify"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              ตรวจสอบโดยไม่ต้องเข้าสู่ระบบ &rarr;
            </Link>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50" />}><LoginPageContent /></Suspense>;
}
