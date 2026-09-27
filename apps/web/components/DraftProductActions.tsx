'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, type ProductItem } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

type DraftFields = {
  productCode: string;
  serialNumber: string;
  name: string;
  category: string;
  description: string;
};

function fieldsFromProduct(product: ProductItem): DraftFields {
  return {
    productCode: product.productCode,
    serialNumber: product.serialNumber,
    name: product.name,
    category: product.category || '',
    description: product.description || '',
  };
}

function getDraftError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('รหัสสินค้าหรือหมายเลขซีเรียลนี้ถูกใช้งานแล้ว') || message.includes('already exists')) {
    return 'รหัสสินค้าหรือหมายเลขซีเรียลนี้ถูกใช้งานแล้ว';
  }
  if (message.includes('สถานะสินค้าถูกเปลี่ยนแล้ว') || message.includes('Blockchain แล้วไม่สามารถแก้ไขได้')) {
    return 'สถานะสินค้าเปลี่ยนแล้ว กรุณาโหลดหน้าใหม่ก่อนทำรายการ';
  }
  return 'ไม่สามารถทำรายการได้ กรุณาลองใหม่อีกครั้ง';
}

export function DraftProductActions({ product, onUpdated }: { product: ProductItem; onUpdated: (product: ProductItem) => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fields, setFields] = useState<DraftFields>(() => fieldsFromProduct(product));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = user?.role === 'SUPER_ADMIN' ||
    (user?.organizationId === product.manufacturerId && ['ORG_ADMIN', 'MANUFACTURER'].includes(user?.role || ''));
  if (!canManage || product.blockchainProductId || product.blockchainTxHash) return null;

  const updateField = (field: keyof DraftFields, value: string) => {
    setFields((previous) => ({ ...previous, [field]: value }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.products.update(product.id, {
        productCode: fields.productCode.trim().toUpperCase(),
        serialNumber: fields.serialNumber.trim(),
        name: fields.name.trim(),
        category: fields.category.trim(),
        description: fields.description.trim(),
      });
      onUpdated(updated);
      setEditing(false);
    } catch (cause) {
      setError(getDraftError(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.products.remove(product.id);
      router.push('/products');
    } catch (cause) {
      setError(getDraftError(cause));
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">สินค้ายังไม่บันทึกบน Blockchain</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">คุณแก้ไขข้อมูลหรือลบสินค้านี้ได้ก่อนยืนยันธุรกรรมใน MetaMask</p>
        </div>
        {!editing && !confirmDelete && (
          <div className="flex gap-2">
            <button type="button" onClick={() => { setFields(fieldsFromProduct(product)); setError(null); setEditing(true); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50">แก้ไขข้อมูล</button>
            <button type="button" onClick={() => { setError(null); setConfirmDelete(true); }} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">ลบสินค้า</button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}

      {editing && (
        <form onSubmit={save} className="mt-4 grid gap-3 border-t border-amber-200 pt-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold">รหัสสินค้า
            <input required minLength={3} maxLength={50} pattern="[A-Za-z0-9_-]+" value={fields.productCode} onChange={(event) => updateField('productCode', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-xs font-semibold">หมายเลขซีเรียล
            <input required minLength={3} maxLength={100} value={fields.serialNumber} onChange={(event) => updateField('serialNumber', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-xs font-semibold">ชื่อสินค้า
            <input required minLength={2} maxLength={150} value={fields.name} onChange={(event) => updateField('name', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-xs font-semibold">หมวดหมู่
            <input maxLength={100} value={fields.category} onChange={(event) => updateField('category', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">รายละเอียด
            <textarea maxLength={2000} rows={3} value={fields.description} onChange={(event) => updateField('description', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</button>
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setError(null); }} className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white">ยกเลิก</button>
          </div>
        </form>
      )}

      {confirmDelete && (
        <div className="mt-4 border-t border-amber-200 pt-4">
          <p className="font-semibold text-red-800">ยืนยันการลบสินค้า {product.productCode}?</p>
          <p className="mt-1 text-xs text-slate-600">ข้อมูลสินค้านี้จะถูกลบจากระบบและไม่สามารถกู้คืนได้</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={deleting} onClick={remove} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{deleting ? 'กำลังลบ...' : 'ยืนยันลบสินค้า'}</button>
            <button type="button" disabled={deleting} onClick={() => { setConfirmDelete(false); setError(null); }} className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white">ยกเลิก</button>
          </div>
        </div>
      )}
    </section>
  );
}
