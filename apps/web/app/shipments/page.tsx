'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import {
  api,
  ProductItem,
  OrganizationItem,
  ShipmentItem,
} from '../../lib/api';
import {
  getShipmentStatusBadge,
  THAI_SHIPMENT_STATUS,
  THAI_PRODUCT_STATUS,
} from '../../lib/thai-locale';
import {
  TruckIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  BoxIcon,
  PlusIcon,
} from '../../components/Icons';

function ShipmentsPageContent() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('productId') || '';

  // Form states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(Boolean(preselectedProductId));
  const [confirmReceiveShipment, setConfirmReceiveShipment] = useState<ShipmentItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProductId);
  const [receiverOrgId, setReceiverOrgId] = useState<string>('');
  const [carrierOrgId, setCarrierOrgId] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [customShipmentCode, setCustomShipmentCode] = useState<string>('');

  // Execution states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    details: string;
    txHash?: string;
  } | null>(null);

  // List & Filter states
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [prodRes, orgsRes, shpRes] = await Promise.all([
          api.products.list({ limit: 50 }).catch(() => ({ data: [] })),
          api.organizations.list().catch(() => []),
          api.shipments.list({ limit: 50 }).catch(() => ({ data: [] })),
        ]);

        if (!ignore) {
          setProducts(prodRes.data || []);
          setOrganizations(orgsRes || []);
          setShipments(shpRes.data || []);
          if (preselectedProductId && !selectedProductId) {
            setSelectedProductId(preselectedProductId);
            setShowCreateModal(true);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลการจัดส่งได้';
          setErrorMessage(msg);
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
  }, [preselectedProductId, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      const ownerId = prod.currentOwnerId || prod.manufacturerId;
      if (receiverOrgId === ownerId) {
        setReceiverOrgId('');
      }
      if (!origin.trim()) {
        setOrigin(prod.currentOwner?.name || prod.manufacturer?.name || '');
      }
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMessage('กรุณาเลือกสินค้าที่ต้องการจัดส่ง');
      return;
    }
    if (!selectedProduct || !['QUALITY_CHECKED', 'STORED'].includes(selectedProduct.status)) {
      setErrorMessage('สินค้าต้องผ่านการตรวจสอบคุณภาพหรืออยู่ในคลังก่อนสร้างการจัดส่ง');
      return;
    }
    if (!receiverOrgId) {
      setErrorMessage('กรุณาเลือกองค์กรผู้รับสินค้า');
      return;
    }
    if (
      selectedProduct &&
      (receiverOrgId === selectedProduct.currentOwnerId ||
        receiverOrgId === selectedProduct.manufacturerId)
    ) {
      setErrorMessage(
        'องค์กรผู้รับสินค้าไม่สามารถเป็นองค์กรเดียวกับเจ้าของสินค้าปัจจุบันได้ กรุณาเลือกองค์กรปลายทางอื่น เช่น Global Express Distribution (Distributor) หรือ SafeHub Storage (Warehouse)',
      );
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      setErrorMessage('กรุณากรอกสถานที่ต้นทางและปลายทาง');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const res = await api.shipments.create({
        productId: selectedProductId,
        receiverOrganizationId: receiverOrgId,
        carrierOrganizationId: carrierOrgId || undefined,
        origin: origin.trim(),
        destination: destination.trim(),
        shipmentCode: customShipmentCode.trim() || undefined,
      });

      setSuccessMessage({
        title: 'สร้างใบจัดส่งสินค้าเรียบร้อยแล้ว',
        details: `รหัสการจัดส่ง: ${res.shipment.shipmentCode}`,
        txHash: res.blockchain?.txHash,
      });

      setShowCreateModal(false);
      setSelectedProductId('');
      setReceiverOrgId('');
      setCarrierOrgId('');
      setOrigin('');
      setDestination('');
      setCustomShipmentCode('');

      // Refresh shipments list
      const shpRes = await api.shipments.list({ limit: 50 });
      setShipments(shpRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างใบจัดส่งสินค้า';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShip = async (shipmentId: string) => {
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      const res = await api.shipments.ship(shipmentId);

      setSuccessMessage({
        title: 'จัดส่งสินค้าเรียบร้อยแล้ว (Dispatched)',
        details: `สถานะสินค้าเปลี่ยนเป็น SHIPPED`,
        txHash: res.blockchain?.txHash,
      });

      const shpRes = await api.shipments.list({ limit: 50 });
      setShipments(shpRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการจัดส่งสินค้า';
      setErrorMessage(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReceive = async (shipmentId: string) => {
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      const res = await api.shipments.receive(shipmentId);

      setSuccessMessage({
        title: 'รับมอบสินค้าและโอนกรรมสิทธิ์เรียบร้อยแล้ว (Delivered & Ownership Transferred)',
        details: `สถานะสินค้าเปลี่ยนเป็น RECEIVED และกรรมสิทธิ์ถูกโอนไปยังองค์กรผู้รับ`,
        txHash: res.blockchain?.txHash,
      });

      const shpRes = await api.shipments.list({ limit: 50 });
      setShipments(shpRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการรับสินค้า';
      setErrorMessage(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleInTransit = async (shipmentId: string) => {
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      await api.shipments.markInTransit(shipmentId);
      const shpRes = await api.shipments.list({ limit: 50 });
      setShipments(shpRes.data || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะเป็นระหว่างขนส่งได้');
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredShipments = shipments.filter((shp) => {
    if (statusFilter === 'ALL') return true;
    return shp.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                การจัดส่งและโลจิสติกส์
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                ทั้งหมด {shipments.length} รายการ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              จัดการใบจัดส่งสินค้า การส่งมอบ และการโอนกรรมสิทธิ์ระหว่างองค์กรพร้อมบันทึกลง Smart Contract
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <PlusIcon className="w-4 h-4" />
            <span>สร้างการจัดส่งใหม่</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-start justify-between shadow-2xs">
            <div className="flex items-start gap-2.5">
              <CheckIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">{successMessage.title}</div>
                <div className="text-xs mt-0.5">{successMessage.details}</div>
                {successMessage.txHash && (
                  <div className="mt-2 text-xs font-mono text-blue-700 break-all">
                    Tx: {successMessage.txHash}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start justify-between shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">เกิดข้อผิดพลาดในการดำเนินการ</div>
                <div className="text-xs mt-0.5">{errorMessage}</div>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-red-100 transition cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Create Shipment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    สร้างการจัดส่งใหม่ (Create Shipment)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    บันทึกข้อมูลการจัดส่งและผูกโยงกับบล็อกเชน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  aria-label="ปิดหน้าต่าง"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateShipment} className="space-y-4 text-xs">
                {/* Select Product */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลือกสินค้าที่ต้องการจัดส่ง <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="">-- เลือกสินค้า --</option>
                    {products.filter((p) => p.status === 'QUALITY_CHECKED' || p.status === 'STORED').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productCode} — {p.name} [{THAI_PRODUCT_STATUS[p.status] || p.status}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Owner Info Card */}
                {selectedProduct && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-600 font-medium">ผู้ส่ง (เจ้าของสินค้าปัจจุบัน):</span>
                      <strong className="font-semibold text-blue-900">
                        {selectedProduct.currentOwner?.name ||
                          selectedProduct.manufacturer?.name ||
                          'Apex Tech Manufacturing'}
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      การจัดส่งจะโอนสิทธิ์ไปยังองค์กรคู่ค้าปลายทาง กรุณาเลือก <strong>องค์กรผู้รับ</strong> ที่เป็นคนละองค์กรกับผู้ส่ง
                    </p>
                  </div>
                )}

                {/* Receiver Org */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    องค์กรผู้รับสินค้า (Receiver) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={receiverOrgId}
                    onChange={(e) => setReceiverOrgId(e.target.value)}
                    required
                    className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="">-- เลือกองค์กรผู้รับสินค้าปลายทาง --</option>
                    {organizations.map((org) => {
                      const isCurrentOwner =
                        selectedProduct &&
                        (org.id === selectedProduct.currentOwnerId ||
                          org.id === selectedProduct.manufacturerId);
                      return (
                        <option
                          key={org.id}
                          value={org.id}
                          disabled={isCurrentOwner}
                          className={isCurrentOwner ? 'text-slate-400 bg-slate-50' : ''}
                        >
                          {org.name} [{org.code}] — {org.type}
                          {isCurrentOwner ? ' (เจ้าของปัจจุบัน - ไม่สามารถเลือกได้)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    เลือกคู่ค้าปลายทาง เช่น ผู้แทนจำหน่าย (Distributor) หรือ คลังสินค้า (Warehouse)
                  </p>
                </div>

                {/* Carrier Org */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผู้ให้บริการขนส่ง (Carrier) (ไม่บังคับ)
                  </label>
                  <select
                    value={carrierOrgId}
                    onChange={(e) => setCarrierOrgId(e.target.value)}
                    className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- ไม่มี / ส่งมอบโดยตรง --</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} [{org.code}] — {org.type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Origin & Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สถานที่ต้นทาง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      required
                      placeholder="เช่น โรงงานชลบุรี"
                      className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สถานที่ปลายทาง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      placeholder="เช่น คลังสินค้ากรุงเทพฯ"
                      className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Custom Shipment Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสการจัดส่ง (ไม่บังคับ - สร้างอัตโนมัติหากเว้นว่าง)
                  </label>
                  <input
                    type="text"
                    value={customShipmentCode}
                    onChange={(e) => setCustomShipmentCode(e.target.value)}
                    placeholder="เช่น SHP-2026-001"
                    className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? 'กำลังบันทึกลง Blockchain...' : 'สร้างใบจัดส่งสินค้า &rarr;'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl text-xs shadow-2xs">
          <span className="text-slate-500 font-medium">กรองตามสถานะ:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'ALL · ทั้งหมด' },
              { id: 'PENDING', label: 'PENDING · รอการจัดส่ง' },
              { id: 'SHIPPED', label: 'SHIPPED · จัดส่งแล้ว' },
              { id: 'DELIVERED', label: 'DELIVERED · ส่งมอบสำเร็จ' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shipments Table */}
        <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <span>รายการการจัดส่งสินค้า (Shipments)</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              แสดง {filteredShipments.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
              กำลังโหลดข้อมูลการจัดส่งและบล็อกเชน...
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              ยังไม่มีข้อมูลการจัดส่งสินค้าในระบบ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3">รหัสการจัดส่ง</th>
                    <th scope="col" className="px-4 py-3">สินค้า</th>
                    <th scope="col" className="px-4 py-3">ผู้ส่ง</th>
                    <th scope="col" className="px-4 py-3">ผู้รับ</th>
                    <th scope="col" className="px-4 py-3">เส้นทาง</th>
                    <th scope="col" className="px-4 py-3">สถานะ</th>
                    <th scope="col" className="px-4 py-3">Blockchain</th>
                    <th scope="col" className="px-4 py-3 text-right">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShipments.map((shp) => {
                    const badge = getShipmentStatusBadge(shp.status);
                    const isActing = actionInProgressId === shp.id;

                    return (
                      <tr key={shp.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-blue-600">
                          {shp.shipmentCode}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">
                            {shp.product?.name || 'สินค้า'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {shp.product?.productCode}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">
                          {shp.sender?.name || '-'}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">
                          {shp.receiver?.name || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          <div>{shp.origin}</div>
                          <div className="text-slate-400">&darr; {shp.destination}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                            <span>{badge.text}</span>
                            <span className="text-[10px] font-mono opacity-75">({shp.status})</span>
                            <span className="sr-only">{shp.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[10px] text-slate-500">
                          {shp.blockchainTxHash ? (
                            <span className="text-blue-600" title={shp.blockchainTxHash}>
                              {shp.blockchainTxHash.slice(0, 8)}...{shp.blockchainTxHash.slice(-6)}
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5">
                          {shp.status === 'PENDING' && (
                            <button
                              onClick={() => shp.id && handleShip(shp.id)}
                              disabled={isActing}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] disabled:opacity-50 transition cursor-pointer"
                            >
                              {isActing ? 'กำลังจัดส่ง...' : 'จัดส่งสินค้า'}
                            </button>
                          )}
                          {shp.status === 'SHIPPED' && (
                            <button
                              onClick={() => shp.id && handleInTransit(shp.id)}
                              disabled={isActing}
                              className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold text-[11px] disabled:opacity-50 cursor-pointer"
                            >
                              ระหว่างขนส่ง
                            </button>
                          )}
                          {(shp.status === 'SHIPPED' || shp.status === 'IN_TRANSIT') && (
                            <button
                              onClick={() => setConfirmReceiveShipment(shp)}
                              disabled={isActing}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] disabled:opacity-50 transition cursor-pointer"
                            >
                              {isActing ? 'กำลังบันทึก...' : 'ยืนยันรับสินค้า'}
                            </button>
                          )}
                          {shp.status === 'DELIVERED' && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>รับสินค้าแล้ว</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confirmation Modal for Receiving Shipment */}
        {confirmReceiveShipment && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                  <CheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ยืนยันการรับสินค้า
                  </h3>
                  <p className="text-xs text-slate-500">
                    รหัสการจัดส่ง: <span className="font-mono font-semibold text-slate-800">{confirmReceiveShipment.shipmentCode}</span>
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div>
                  <span className="text-slate-500">สินค้า: </span>
                  <span className="font-semibold text-slate-900">{confirmReceiveShipment.product?.name || 'สินค้า'}</span>
                  <span className="font-mono text-slate-500 ml-1">({confirmReceiveShipment.product?.productCode})</span>
                </div>
                <div>
                  <span className="text-slate-500">เส้นทาง: </span>
                  <span className="text-slate-700">{confirmReceiveShipment.origin} &rarr; {confirmReceiveShipment.destination}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
                  หลังจากดำเนินการแล้ว สถานะจะถูกเปลี่ยนเป็น &ldquo;ส่งมอบสำเร็จ (DELIVERED)&rdquo; และบันทึกยืนยันลงบน Blockchain ทันที
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmReceiveShipment(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sid = confirmReceiveShipment.id;
                    setConfirmReceiveShipment(null);
                    if (sid) handleReceive(sid);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  ยืนยันการรับสินค้า
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">กำลังโหลด...</div>}>
      <ShipmentsPageContent />
    </Suspense>
  );
}
