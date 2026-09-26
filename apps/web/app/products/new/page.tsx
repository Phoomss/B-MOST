'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { executeUserSignedAction } from '../../../lib/blockchain/wallet';

const PRODUCT_CATEGORIES = [
  { value: '', label: '-- เลือกหมวดหมู่สินค้า --' },
  { value: 'Electronics', label: 'อิเล็กทรอนิกส์และอุปกรณ์ (Electronics)' },
  { value: 'Medical & Pharmaceuticals', label: 'ยาและเวชภัณฑ์ (Medical & Pharmaceuticals)' },
  { value: 'Food & Beverage', label: 'อาหารและเครื่องดื่ม (Food & Beverage)' },
  { value: 'Automotive & Parts', label: 'ยานยนต์และชิ้นส่วน (Automotive & Spare Parts)' },
  { value: 'Consumer Goods', label: 'สินค้าอุปโภคบริโภค (Consumer Goods)' },
  { value: 'Industrial Machinery', label: 'เครื่องจักรและอุปกรณ์อุตสาหกรรม (Industrial Machinery)' },
  { value: 'Chemicals & Materials', label: 'เคมีภัณฑ์และวัตถุดิบ (Chemicals & Raw Materials)' },
  { value: 'Agriculture', label: 'สินค้าเกษตรและแปรรูป (Agriculture & Agri-food)' },
  { value: 'Luxury & Jewelry', label: 'สินค้าลักชัวรีและอัญมณี (Luxury & Jewelry)' },
  { value: 'Cosmetics', label: 'เครื่องสำอางและเวชสำอาง (Cosmetics & Personal Care)' },
  { value: 'Other', label: 'หมวดหมู่อื่นๆ (Other - ระบุเอง)' },
];

export default function CreateProductPage() {
  const router = useRouter();

  const [productCode, setProductCode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [registerOnBlockchain, setRegisterOnBlockchain] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createdProductId) {
      router.push(`/products/${createdProductId}`);
      return;
    }
    setError(null);
    setLoading(true);

    const resolvedCategory =
      selectedCategory === 'Other' ? customCategory.trim() : selectedCategory.trim();

    try {
      const created = await api.products.create({
        productCode: productCode.trim().toUpperCase(),
        serialNumber: serialNumber.trim(),
        name: name.trim(),
        category: resolvedCategory || undefined,
        description: description.trim() || undefined,
        registerOnBlockchain: false,
      });
      setCreatedProductId(created.id);
      if (registerOnBlockchain) {
        await executeUserSignedAction({ action: 'registerProduct', entityId: created.id });
      }
      router.push(`/products/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลงทะเบียนสินค้า';
      setError(msg);
      setLoading(false);
    }
  };

  const handleGenerateCode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setProductCode(`PRD-${new Date().getFullYear()}-${randomSuffix}`);
  };

  const handleGenerateSerial = () => {
    const randomSerial = 'SN-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    setSerialNumber(randomSerial);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="mb-6">
          <Link
            href="/products"
            className="text-xs text-slate-500 hover:text-blue-600 transition inline-flex items-center gap-1 mb-2 font-medium"
          >
            &larr; กลับหน้ารายการสินค้า
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ลงทะเบียนสินค้าใหม่
            </h1>
            <span className="sr-only">Register New Product</span>
            <span className="text-xs text-slate-400 font-normal">
              (Register New Product)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            สร้างข้อมูลสินค้าในระบบห่วงโซ่อุปทาน คำนวณรหัสแฮช และบันทึกยืนยันลงบนบล็อกเชน
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm mb-6">
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <span>เกิดข้อผิดพลาดในการลงทะเบียน</span>
              <span className="sr-only">Registration Error</span>
              <span className="text-xs font-mono text-red-600">(Registration Error)</span>
            </div>
            <div>{error}</div>
            {createdProductId && (
              <Link href={`/products/${createdProductId}`} className="underline font-semibold">
                สินค้าถูกสร้างในฐานข้อมูลแล้ว เปิดหน้าสินค้าเพื่อลองบันทึกบน Blockchain อีกครั้ง
              </Link>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="border border-slate-200 bg-white rounded-xl p-6 sm:p-8 space-y-6 shadow-2xs"
        >
          {/* Product Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="prod-code-input" className="text-xs sm:text-sm font-semibold text-slate-800">
                รหัสสินค้า (Product Code) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                สร้างอัตโนมัติ (Auto-generate)
              </button>
            </div>
            <input
              id="prod-code-input"
              type="text"
              required
              value={productCode}
              onChange={(e) => setProductCode(e.target.value.toUpperCase())}
              placeholder="e.g. PRD-2026-0001"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              รหัสเฉพาะสำหรับใช้สร้าง QR Code เพื่อให้ผู้บริโภคตรวจสอบ และเชื่อมโยงบนบล็อกเชน
            </p>
          </div>

          {/* Serial Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="serial-input" className="text-xs sm:text-sm font-semibold text-slate-800">
                หมายเลขซีเรียล (Serial Number) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateSerial}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                สร้างอัตโนมัติ (Auto-generate)
              </button>
            </div>
            <input
              id="serial-input"
              type="text"
              required
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-8921473"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Commercial Name */}
          <div>
            <label htmlFor="name-input" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              ชื่อสินค้า (Product Name) <span className="text-red-500">*</span>
            </label>
            <input
              id="name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Industrial IoT Sensor Probe"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category-select" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              หมวดหมู่สินค้า (Category)
            </label>
            <div className="space-y-2">
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {selectedCategory === 'Other' && (
                <div className="pt-1">
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="กรุณาระบุหมวดหมู่สินค้า เช่น เครื่องใช้ไฟฟ้า, สิ่งทอ, อุปกรณ์ประมง..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              เลือกหมวดหมู่ที่ตรงกับลักษณะสินค้าเพื่อช่วยในการจัดกลุ่มและสืบค้นในห่วงโซ่อุปทาน
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="desc-input" className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5">
              รายละเอียด / สเปคสินค้า (Description)
            </label>
            <textarea
              id="desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ข้อมูลจำเพาะทางเทคนิค หรือรายละเอียดของล็อตการผลิต..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Blockchain Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer transition">
              <input
                type="checkbox"
                checked={registerOnBlockchain}
                onChange={(e) => setRegisterOnBlockchain(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-900 block">
                  บันทึกลง Smart Contract ทันที (Register immediately onto smart contract)
                </span>
                <span className="text-xs text-slate-500 block mt-0.5 leading-relaxed">
                  ส่งธุรกรรมไปยัง SupplyChainRegistry.sol พร้อมแฮช keccak256 เพื่อยืนยันความถูกต้องของข้อมูล (สามารถลงทะเบียนภายหลังได้)
                </span>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Link
              href="/products"
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'กำลังบันทึกสินค้า...' : 'บันทึกสินค้า (Register Product)'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
