'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { THAI_USER_ROLE } from '../lib/thai-locale';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'ภาพรวมระบบ' },
    { href: '/products', label: 'สินค้า' },
    { href: '/shipments', label: 'การจัดส่ง' },
    { href: '/quality', label: 'ตรวจสอบคุณภาพ' },
    { href: '/traceability', label: 'ตรวจสอบย้อนกลับ' },
    { href: '/blockchain', label: 'Blockchain' },
    { href: '/audit', label: 'ประวัติการตรวจสอบ' },
  ];

  const roleText = user?.role ? THAI_USER_ROLE[user.role] || user.role : '';

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs group-hover:bg-blue-700 transition">
                B
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-slate-900 text-base">B-MOST</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    EVM
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
                  ระบบติดตามและตรวจสอบห่วงโซ่อุปทาน
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
              {navLinks.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold ${
                      isActive
                        ? 'text-blue-700 bg-blue-50 border border-blue-100 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <Link
                href="/verify"
                className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
                  pathname.startsWith('/verify')
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                }`}
              >
                <span>🔍 ตรวจสอบ QR</span>
              </Link>
            </nav>
          </div>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <span>+ เพิ่มสินค้า</span>
            </Link>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{roleText}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-medium transition cursor-pointer"
                  title="ออกจากระบบ"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/verify"
              className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium"
            >
              ตรวจสอบ QR
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="เมนูหลัก"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                pathname === item.href
                  ? 'text-blue-700 bg-blue-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/verify"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50/70"
          >
            🔍 ตรวจสอบสินค้าผ่าน QR Code
          </Link>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/products/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              + เพิ่มสินค้าใหม่
            </Link>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-center py-2 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium"
              >
                ออกจากระบบ ({user?.email})
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 px-3 rounded-lg border border-slate-300 text-slate-800 text-sm font-semibold"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
