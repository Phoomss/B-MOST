'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { THAI_USER_ROLE } from '../lib/thai-locale';
import { BuildingIcon } from './Icons';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const wallet = useWallet();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ledgerDropdownOpen, setLedgerDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const ledgerDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (ledgerDropdownRef.current && !ledgerDropdownRef.current.contains(target)) {
        setLedgerDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setLedgerDropdownOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const primaryNavItems = [
    {
      href: '/',
      label: 'ภาพรวมระบบ',
      exact: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/products',
      label: 'สินค้า',
      exact: false,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: '/quality',
      label: 'การตรวจสอบคุณภาพ',
      exact: false,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      href: '/shipments',
      label: 'การจัดส่ง',
      exact: false,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
    },
    {
      href: '/traceability',
      label: 'การติดตามสินค้า',
      exact: false,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
  ];

  const ledgerItems = [
    {
      href: '/blockchain',
      title: 'Blockchain',
      subtitle: 'ธุรกรรมและบล็อกบน EVM Ledger',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      href: '/audit',
      title: 'ประวัติการตรวจสอบ',
      subtitle: 'Audit Log กิจกรรมทั้งหมดในระบบ',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const isLedgerActive = pathname.startsWith('/blockchain') || pathname.startsWith('/audit');

  // Role Badge Color Mapping
  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ORG_ADMIN':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'MANUFACTURER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DISTRIBUTOR':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'WAREHOUSE':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'RETAILER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'AUDITOR':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAvatarBg = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-600 text-white';
      case 'ORG_ADMIN':
        return 'bg-indigo-600 text-white';
      case 'MANUFACTURER':
        return 'bg-blue-600 text-white';
      case 'DISTRIBUTOR':
        return 'bg-amber-600 text-white';
      case 'WAREHOUSE':
        return 'bg-cyan-600 text-white';
      case 'RETAILER':
        return 'bg-emerald-600 text-white';
      case 'AUDITOR':
        return 'bg-violet-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  const roleText = user?.role ? THAI_USER_ROLE[user.role] || user.role : 'ผู้ใช้งาน';
  const userInitial = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';

  const userDisplayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email
      ? user.email.split('@')[0]
      : 'ผู้ใช้งาน';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* 1. Brand Logo */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-base shadow-sm group-hover:scale-105 transition-transform duration-200">
                B
              </div>
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
                <span className="hidden xl:inline-block text-[10px] text-slate-400 font-medium -mt-0.5">
                  Supply Chain Traceability
                </span>
              </div>
            </Link>

            {/* 2. Desktop Navigation Menu */}
            <nav className="hidden lg:flex items-center gap-1">
              {primaryNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Dropdown: การตรวจสอบ */}
              <div className="relative" ref={ledgerDropdownRef}>
                <button
                  type="button"
                  onClick={() => setLedgerDropdownOpen(!ledgerDropdownOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isLedgerActive || ledgerDropdownOpen
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>การตรวจสอบ</span>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      ledgerDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {ledgerDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-lg py-2 z-50 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      การตรวจสอบและบล็อกเชน
                    </div>
                    {ledgerItems.map((sub) => {
                      const isSubActive = pathname.startsWith(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setLedgerDropdownOpen(false)}
                          className={`flex items-start gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition ${
                            isSubActive ? 'bg-blue-50/70' : ''
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">{sub.icon}</div>
                          <div>
                            <div
                              className={`text-xs font-semibold ${
                                isSubActive ? 'text-blue-700' : 'text-slate-800'
                              }`}
                            >
                              {sub.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {sub.subtitle}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* 3. Right Action Tools & User Profile */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user && (
              <div className="hidden md:flex items-center gap-1" title={wallet.error || undefined}>
                <button type="button" onClick={wallet.connect}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                  {wallet.account ? `${wallet.account.slice(0, 6)}…${wallet.account.slice(-4)}` : 'เชื่อมต่อ MetaMask'}
                </button>
                {wallet.account && !wallet.isSepolia && (
                  <button type="button" onClick={wallet.switchChain}
                    className="rounded-lg bg-amber-600 px-2 py-1.5 text-xs text-white">เปลี่ยนเป็น Sepolia</button>
                )}
                {wallet.account && user.walletAddress &&
                  wallet.account.toLowerCase() !== user.walletAddress.toLowerCase() && (
                    <span className="text-xs text-red-700">Wallet ไม่ตรงบัญชี</span>
                  )}
                {wallet.error && <span className="text-xs text-red-700">{wallet.error}</span>}
              </div>
            )}
            {/* Quick Public QR Scanner Link */}
            <Link
              href="/verify"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                pathname.startsWith('/verify')
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200/80'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>สแกน QR</span>
            </Link>

            {/* Quick Action: New Product */}
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">เพิ่มสินค้า</span>
            </Link>

            {/* User Profile Pill or Login Button */}
            {isAuthenticated && user ? (
              <div className="relative pl-1" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                  aria-expanded={userMenuOpen}
                  aria-label="User account menu"
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs ${getAvatarBg(
                      user.role,
                    )}`}
                  >
                    {userInitial}
                  </div>

                  {/* Name and Role text (hidden on small screens) */}
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                      {userDisplayName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight">
                      {roleText}
                    </span>
                  </div>

                  {/* Dropdown Indicator */}
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      userMenuOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Profile Dropdown Popover */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn">
                    {/* Header with User Info */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${getAvatarBg(
                            user.role,
                          )}`}
                        >
                          {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {userDisplayName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadgeStyle(
                            user.role,
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          {roleText}
                        </span>

                        {user.organization?.name && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px] inline-flex items-center gap-1" title={user.organization.name}>
                            <BuildingIcon className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{user.organization.name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Profile Links */}
                    <div className="py-1 text-xs">
                      <Link
                        href="/products"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>จัดการสินค้าของฉัน</span>
                      </Link>

                      <Link
                        href="/shipments"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
                        </svg>
                        <span>รายการจัดส่ง</span>
                      </Link>

                      <Link
                        href="/verify"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition"
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span>เครื่องมือสแกน QR Code</span>
                      </Link>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-1 mt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>ออกจากระบบ (Sign Out)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition"
              >
                เข้าสู่ระบบ
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
              aria-label="เปิดเมนูหลัก"
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

      {/* 4. Responsive Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl animate-fadeIn max-h-[85vh] overflow-y-auto">
          {/* User Card if Authenticated */}
          {isAuthenticated && user && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs ${getAvatarBg(
                    user.role,
                  )}`}
                >
                  {userInitial}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{userDisplayName}</div>
                  <div className="text-[10px] text-slate-500">{user.email}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeStyle(user.role)}`}>
                {roleText}
              </span>
            </div>
          )}

          {/* Primary Operations Group */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-2">
              การจัดการ
            </div>
            <div className="space-y-1">
              {primaryNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Trust & Ledger Group */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-2">
              การตรวจสอบ
            </div>
            <div className="space-y-1">
              {ledgerItems.map((sub) => {
                const isSubActive = pathname.startsWith(sub.href);
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isSubActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="shrink-0">{sub.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-900">{sub.title}</div>
                      <div className="text-[10px] text-slate-400">{sub.subtitle}</div>
                    </div>
                  </Link>
                );
              })}

              <Link
                href="/verify"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200"
              >
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>สแกนตรวจสอบสินค้าผ่าน QR Code</span>
              </Link>
            </div>
          </div>

          {/* Action Buttons in Mobile */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/products/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
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
                className="w-full text-center py-2 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold transition"
              >
                ออกจากระบบ (Sign Out)
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 px-3 rounded-lg border border-slate-300 text-slate-800 text-xs font-semibold transition"
              >
                เข้าสู่ระบบ (Sign In)
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
