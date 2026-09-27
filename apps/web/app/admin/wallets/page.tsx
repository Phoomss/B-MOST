'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { isAddress } from 'viem';
import { Navbar } from '../../../components/Navbar';
import { useAuth } from '../../../hooks/useAuth';
import { api, type OrganizationItem, type UserWalletItem } from '../../../lib/api';

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export default function WalletManagementPage() {
  const { user, loading: authLoading } = useAuth({ requireAuth: true });
  const [users, setUsers] = useState<UserWalletItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [organization, setOrganization] = useState<OrganizationItem | null>(null);
  const [address, setAddress] = useState('');
  const [syncOrganization, setSyncOrganization] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedUser = users.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    let active = true;
    setLoading(true);
    api.auth.listUserWallets()
      .then((items) => {
        if (!active) return;
        setUsers(items);
        setSelectedId((current) => current || items[0]?.id || '');
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?.role]);

  useEffect(() => {
    if (!selectedUser) return;
    let active = true;
    setOrganization(null);
    setAddress(selectedUser.walletAddress || '');
    setSyncOrganization(false);
    setError(null);
    setSuccess(null);
    if (selectedUser.organizationId) {
      api.organizations.get(selectedUser.organizationId)
        .then((item) => {
          if (!active) return;
          setOrganization(item);
          setAddress(selectedUser.walletAddress || item.walletAddress || '');
          setSyncOrganization(!item.walletAddress);
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลองค์กรไม่สำเร็จ');
        });
    }
    return () => { active = false; };
  }, [selectedUser?.id, selectedUser?.organizationId]);

  const normalizedAddress = address.trim();
  const addressValid = ADDRESS_PATTERN.test(normalizedAddress) && isAddress(normalizedAddress);
  const organizationMismatch = Boolean(
    organization?.walletAddress &&
    addressValid &&
    organization.walletAddress.toLowerCase() !== normalizedAddress.toLowerCase(),
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || !addressValid) return;
    if (selectedUser.organizationId && !organization) {
      setError('ยังโหลดข้อมูลองค์กรไม่เสร็จ กรุณาลองอีกครั้ง');
      return;
    }
    if (organizationMismatch && !syncOrganization) {
      setError('wallet ขององค์กรไม่ตรงกัน กรุณาเลือกอัปเดต wallet องค์กรด้วย');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.auth.setUserWallet(
        selectedUser.id,
        normalizedAddress,
        Boolean(selectedUser.organizationId && syncOrganization),
      );
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (organization && syncOrganization) {
        setOrganization({ ...organization, walletAddress: updated.walletAddress || normalizedAddress });
      }
      setSuccess(`บันทึก public wallet address ของ ${updated.email} สำเร็จ${syncOrganization && organization ? ' และอัปเดตองค์กรแล้ว' : ''}`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'บันทึก wallet ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className="text-sm text-blue-700 hover:underline">← กลับหน้าหลัก</Link>
        <h1 className="mt-4 text-2xl font-bold">จัดการ Wallet ผู้ใช้</h1>
        <p className="mt-2 text-sm text-slate-600">
          กำหนด public address ที่ตรงกับบัญชี MetaMask ของผู้ใช้ เพื่อทำธุรกรรมบน Sepolia
        </p>

        {!authLoading && user?.role !== 'SUPER_ADMIN' ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            หน้านี้ใช้ได้เฉพาะ Super Admin กรุณาให้ผู้ดูแลระบบตั้งค่า wallet ให้บัญชีของคุณ
          </div>
        ) : authLoading || loading ? (
          <p className="mt-6 text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <form onSubmit={handleSave} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-sm">
            {error && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            {success && <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{success}</div>}

            <div>
              <label htmlFor="wallet-user" className="block text-sm font-semibold mb-1">บัญชีผู้ใช้</label>
              <select id="wallet-user" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-lg border border-slate-300 p-2.5 text-sm">
                {users.map((item) => (
                  <option key={item.id} value={item.id}>{item.email} ({item.role})</option>
                ))}
              </select>
              {selectedUser && <p className="mt-1 text-xs text-slate-500">สถานะ: {selectedUser.status} · Wallet ปัจจุบัน: {selectedUser.walletAddress || 'ยังไม่กำหนด'}</p>}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-semibold">องค์กร</div>
              <div className="mt-1">{organization ? `${organization.name} (${organization.code})` : selectedUser?.organizationId ? 'กำลังโหลด...' : 'บัญชีนี้ไม่มีองค์กร'}</div>
              {organization && <div className="mt-1 text-xs text-slate-600 break-all">Wallet องค์กรปัจจุบัน: {organization.walletAddress || 'ยังไม่กำหนด'}</div>}
            </div>

            <div>
              <label htmlFor="wallet-address" className="block text-sm font-semibold mb-1">Public wallet address</label>
              <input id="wallet-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." autoComplete="off" spellCheck={false} className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-sm" />
              <p className="mt-1 text-xs text-slate-500">คัดลอก Address จาก MetaMask ของผู้ใช้ ห้ามกรอก private key หรือ recovery phrase</p>
              {address && !addressValid && <p className="mt-1 text-xs text-red-700">ต้องเป็น Ethereum address รูปแบบ 0x ตามด้วยอักขระฐานสิบหก 40 ตัว</p>}
            </div>

            {organization && (
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm cursor-pointer">
                <input type="checkbox" checked={syncOrganization} onChange={(event) => setSyncOrganization(event.target.checked)} className="mt-1" />
                <span>
                  <span className="font-semibold">ตั้ง wallet เดียวกันให้องค์กรด้วย</span>
                  <span className="block text-xs text-slate-500">จำเป็นเมื่อ wallet องค์กรยังว่างหรือไม่ตรงกับผู้ใช้ การเปลี่ยนค่านี้อาจกระทบผู้ใช้อื่นในองค์กรเดียวกัน</span>
                </span>
              </label>
            )}
            {organizationMismatch && !syncOrganization && <p className="text-sm text-amber-700">Wallet ใหม่ต่างจากองค์กร กรุณาเลือกตั้ง wallet องค์กรด้วยเพื่อให้ทำธุรกรรมได้</p>}

            <button type="submit" disabled={!selectedUser || !addressValid || saving || Boolean(selectedUser.organizationId && !organization) || (organizationMismatch && !syncOrganization)} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer">
              {saving ? 'กำลังบันทึก...' : 'บันทึก Wallet'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
