'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { executeUserSignedAction } from '../../lib/blockchain/wallet';
import { getBlockchainErrorMessage, isBlockchainRejection } from '../../lib/blockchain/errors';
import {
  api,
  ProductItem,
  OrganizationItem,
  ShipmentItem,
} from '../../lib/api';
import {
  getShipmentStatusBadge,
  THAI_PRODUCT_STATUS,
} from '../../lib/thai-locale';
import {
  TruckIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  PlusIcon,
  SearchIcon,
} from '../../components/Icons';

function ShipmentsPageContent() {
  const { user } = useAuth({ requireAuth: true });
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('productId') || '';

  // Form states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(Boolean(preselectedProductId));
  const [confirmReceiveShipment, setConfirmReceiveShipment] = useState<ShipmentItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [organizationLoadError, setOrganizationLoadError] = useState<string | null>(null);
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
  const [blockchainCancelled, setBlockchainCancelled] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    details: string;
    txHash?: string;
  } | null>(null);

  // List & Filter states
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setOrganizationLoadError(null);
        const [prodRes, orgsRes, shpRes] = await Promise.allSettled([
          api.products.list({ limit: 50 }),
          api.organizations.shippingPartners().catch((cause: unknown) => {
            if (!ignore) {
              setOrganizationLoadError(
                cause instanceof Error ? cause.message : 'โหลดรายชื่อองค์กรผู้รับสินค้าไม่สำเร็จ',
              );
            }
            return [];
          }),
          api.shipments.list({ limit: 50 }),
        ]);

        if (!ignore) {
          if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
          if (orgsRes.status === 'fulfilled') setOrganizations(orgsRes.value || []);
          if (shpRes.status === 'fulfilled') setShipments(shpRes.value.data || []);
          if (prodRes.status === 'rejected' || shpRes.status === 'rejected') {
            setLoadError('โหลดข้อมูลบางส่วนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
          }
        }
      } catch {
        if (!ignore) {
          setLoadError('ไม่สามารถโหลดข้อมูลการจัดส่งได้ กรุณาลองใหม่อีกครั้ง');
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
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const receivedProduct = selectedProduct?.status === 'RECEIVED' ? selectedProduct : null;
  const ownerWallet = selectedProduct?.currentOwner?.walletAddress || selectedProduct?.manufacturer?.walletAddress;

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

  const refreshShipments = async () => {
    try {
      const response = await api.shipments.list({ limit: 50 });
      setShipments(response.data || []);
      setLoadError(null);
    } catch {
      setLoadError('บันทึกธุรกรรมสำเร็จแล้ว แต่โหลดรายการใหม่ไม่สำเร็จ กรุณารีเฟรชหน้า');
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
    const receiver = organizations.find((organization) => organization.id === receiverOrgId);
    if (ownerWallet && receiver?.walletAddress?.toLowerCase() === ownerWallet.toLowerCase()) {
      setErrorMessage('องค์กรผู้รับใช้ wallet เดียวกับเจ้าของสินค้าปัจจุบัน กรุณากำหนด wallet คนละ address ก่อนจัดส่ง');
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      setErrorMessage('กรุณากรอกสถานที่ต้นทางและปลายทาง');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setBlockchainCancelled(false);
      setSuccessMessage(null);

      const res = await executeUserSignedAction({
        action: 'createShipment',
        entityId: selectedProductId,
        receiverOrganizationId: receiverOrgId,
        carrierOrganizationId: carrierOrgId || undefined,
        origin: origin.trim(),
        destination: destination.trim(),
        shipmentCode: customShipmentCode.trim() || undefined,
      });

      setSuccessMessage({
        title: 'สร้างใบจัดส่งสินค้าเรียบร้อยแล้ว',
        details: `บันทึกบน Sepolia แล้ว (Shipment DB ID: ${res.shipmentDbId})`,
        txHash: res.transactionHash,
      });

      setShowCreateModal(false);
      setSelectedProductId('');
      setReceiverOrgId('');
      setCarrierOrgId('');
      setOrigin('');
      setDestination('');
      setCustomShipmentCode('');

      await refreshShipments();
    } catch (err: unknown) {
      setBlockchainCancelled(isBlockchainRejection(err));
      setErrorMessage(getBlockchainErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleShip = async (shipmentId: string) => {
    let progress = 'กำลังเตรียมธุรกรรม';
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      setBlockchainCancelled(false);
      setSuccessMessage(null);
      const res = await executeUserSignedAction(
        { action: 'shipProduct', entityId: shipmentId },
        (message) => { progress = message; },
      );

      setSuccessMessage({
        title: 'จัดส่งสินค้าเรียบร้อยแล้ว (Dispatched)',
        details: `สถานะสินค้าเปลี่ยนเป็น SHIPPED`,
        txHash: res.transactionHash,
      });

      await refreshShipments();
    } catch (err: unknown) {
      setBlockchainCancelled(isBlockchainRejection(err));
      setErrorMessage(`${getBlockchainErrorMessage(err)} (ขั้นตอน: ${progress})`);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReceive = async (shipmentId: string) => {
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      setBlockchainCancelled(false);
      setSuccessMessage(null);
      const res = await executeUserSignedAction({ action: 'receiveProduct', entityId: shipmentId });

      setSuccessMessage({
        title: 'รับมอบสินค้าและโอนกรรมสิทธิ์เรียบร้อยแล้ว (Delivered & Ownership Transferred)',
        details: `สถานะสินค้าเปลี่ยนเป็น RECEIVED และกรรมสิทธิ์ถูกโอนไปยังองค์กรผู้รับ`,
        txHash: res.transactionHash,
      });

      await refreshShipments();
    } catch (err: unknown) {
      setBlockchainCancelled(isBlockchainRejection(err));
      setErrorMessage(getBlockchainErrorMessage(err));
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleInTransit = async (shipmentId: string) => {
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      setBlockchainCancelled(false);
      setSuccessMessage(null);
      await executeUserSignedAction({ action: 'markInTransit', entityId: shipmentId });
      setSuccessMessage({
        title: 'อัปเดตสถานะระหว่างขนส่งสำเร็จ',
        details: 'บันทึกสถานะบน Sepolia เรียบร้อยแล้ว',
      });
      await refreshShipments();
    } catch (err: unknown) {
      setBlockchainCancelled(isBlockchainRejection(err));
      setErrorMessage(getBlockchainErrorMessage(err));
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredShipments = shipments.filter((shp) => {
    if (statusFilter !== 'ALL' && shp.status !== statusFilter) return false;
    const query = shipmentSearch.trim().toLocaleLowerCase();
    if (!query) return true;
    return [shp.shipmentCode, shp.product?.name, shp.product?.productCode, shp.sender?.name, shp.receiver?.name, shp.origin, shp.destination]
      .some((value) => value?.toLocaleLowerCase().includes(query));
  });
  const activeCount = shipments.filter((shipment) => shipment.status !== 'DELIVERED').length;
  const deliveredCount = shipments.filter((shipment) => shipment.status === 'DELIVERED').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><TruckIcon className="h-4 w-4" /> Shipments</div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                การจัดส่งและโลจิสติกส์
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              ติดตามการจัดส่ง สร้างใบจัดส่ง และยืนยันการรับสินค้าระหว่างองค์กร
            </p>
          </div>

          <button
            onClick={() => { setErrorMessage(null); setShowCreateModal(true); }}
            className="inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition cursor-pointer w-full sm:w-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <PlusIcon className="w-4 h-4" />
            <span>สร้างการจัดส่งใหม่</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="สรุปรายการจัดส่งล่าสุด">
          {[
            { label: 'รายการล่าสุด', count: shipments.length, color: 'text-slate-900' },
            { label: 'กำลังดำเนินการ', count: activeCount, color: 'text-blue-700' },
            { label: 'ส่งมอบแล้ว', count: deliveredCount, color: 'text-emerald-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
              <p className="text-xs sm:text-sm text-slate-500">{item.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${item.color}`}>{loading ? '–' : item.count}</p>
            </div>
          ))}
        </div>

        {loadError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError} <button type="button" onClick={() => window.location.reload()} className="font-semibold underline underline-offset-2">ลองใหม่</button></div>}

        {/* Success Alert */}
        {successMessage && (
          <div role="status" className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-start justify-between shadow-2xs">
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
        {errorMessage && !showCreateModal && (
          <div role={blockchainCancelled ? 'status' : 'alert'} className={`p-4 rounded-xl border text-sm flex items-start justify-between shadow-2xs ${blockchainCancelled ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <div className="flex items-start gap-2.5">
              <AlertTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">{blockchainCancelled ? 'ยกเลิกการทำรายการ' : 'เกิดข้อผิดพลาดในการดำเนินการ'}</div>
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
          <div role="presentation" className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
            <div role="dialog" aria-modal="true" aria-labelledby="create-shipment-title" onKeyDown={(event) => { if (event.key === 'Escape' && !submitting) setShowCreateModal(false); }} className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 sm:p-7 shadow-xl space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 id="create-shipment-title" className="text-lg font-bold text-slate-900">
                    สร้างการจัดส่งใหม่ (Create Shipment)
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    เลือกสินค้าและผู้รับ ระบุเส้นทาง แล้วลงนามเพื่อบันทึกการจัดส่ง
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

              {errorMessage && (
                <div role={blockchainCancelled ? 'status' : 'alert'} className={`rounded-lg border p-4 text-sm ${blockchainCancelled ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
                  <p className="font-semibold">{blockchainCancelled ? 'ยกเลิกการทำรายการ' : 'สร้างการจัดส่งไม่สำเร็จ'}</p>
                  <p className="mt-1">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleCreateShipment} className="space-y-5 text-sm">
                {/* Select Product */}
                <div>
                  <label htmlFor="shipment-product" className="block text-sm font-semibold text-slate-700 mb-2">
                    1. เลือกสินค้าที่พร้อมจัดส่ง <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="shipment-product"
                    autoFocus
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    required
                    className="w-full min-h-11 rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">-- เลือกสินค้า --</option>
                    {products.filter((p) => p.status === 'QUALITY_CHECKED' || p.status === 'STORED').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productCode} — {p.name} [{THAI_PRODUCT_STATUS[p.status] || p.status}]
                      </option>
                    ))}
                  </select>
                  {!loading && !loadError && products.every((product) => !['QUALITY_CHECKED', 'STORED'].includes(product.status)) && (
                    <p className="mt-2 text-sm text-slate-600">ยังไม่มีสินค้าที่พร้อมจัดส่ง <Link href="/products" className="font-semibold text-blue-700 underline underline-offset-2">ดูรายการสินค้า</Link></p>
                  )}
                  {selectedProduct && !['QUALITY_CHECKED', 'STORED'].includes(selectedProduct.status) && !receivedProduct && <p role="status" className="mt-2 text-sm text-amber-800">สินค้านี้ยังจัดส่งไม่ได้ ต้องผ่านการตรวจคุณภาพหรือจัดเก็บก่อน</p>}
                  {receivedProduct && (
                    <p role="status" className="mt-2 text-sm text-amber-800">
                      สินค้าที่เพิ่งรับยังจัดส่งต่อไม่ได้ ต้อง{' '}
                      <Link href={`/products/${receivedProduct.id}`} className="font-semibold underline underline-offset-2">
                        เปิดหน้าสินค้าแล้วกดจัดเก็บ
                      </Link>{' '}
                      ก่อน
                    </p>
                  )}
                </div>

                {/* Current Owner Info Card */}
                {selectedProduct && (
                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-sm space-y-1">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-600 font-medium">ผู้ส่ง (เจ้าของสินค้าปัจจุบัน):</span>
                      <strong className="font-semibold text-blue-900">
                        {selectedProduct.currentOwner?.name ||
                          selectedProduct.manufacturer?.name ||
                          'ไม่ระบุองค์กร'}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      การจัดส่งจะโอนสิทธิ์ไปยังองค์กรคู่ค้าปลายทาง กรุณาเลือก <strong>องค์กรผู้รับ</strong> ที่เป็นคนละองค์กรกับผู้ส่ง
                    </p>
                  </div>
                )}

                {/* Receiver Org */}
                <div>
                  <label htmlFor="shipment-receiver" className="block text-sm font-semibold text-slate-700 mb-2">
                    2. องค์กรผู้รับสินค้า <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="shipment-receiver"
                    value={receiverOrgId}
                    onChange={(e) => setReceiverOrgId(e.target.value)}
                    required
                    className="w-full min-h-11 rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">-- เลือกองค์กรผู้รับสินค้าปลายทาง --</option>
                    {organizations.map((org) => {
                      const isCurrentOwner =
                        selectedProduct &&
                        (org.id === selectedProduct.currentOwnerId ||
                          org.id === selectedProduct.manufacturerId);
                      const sharesOwnerWallet = Boolean(
                        ownerWallet && org.walletAddress?.toLowerCase() === ownerWallet.toLowerCase(),
                      );
                      const unavailable = Boolean(isCurrentOwner || sharesOwnerWallet);
                      return (
                        <option
                          key={org.id}
                          value={org.id}
                          disabled={unavailable}
                          className={unavailable ? 'text-slate-400 bg-slate-50' : ''}
                        >
                          {org.name} [{org.code}] — {org.type}
                          {isCurrentOwner
                            ? ' (เจ้าของปัจจุบัน - ไม่สามารถเลือกได้)'
                            : sharesOwnerWallet
                              ? ' (ใช้ wallet เดียวกับผู้ส่ง - ไม่สามารถเลือกได้)'
                              : ''}
                        </option>
                      );
                    })}
                  </select>
                  {organizationLoadError && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                      โหลดรายชื่อองค์กรผู้รับสินค้าไม่สำเร็จ: {organizationLoadError}
                    </p>
                  )}
                  {!organizationLoadError && organizations.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      ยังไม่มีองค์กรที่เปิดใช้งานและกำหนด wallet สำหรับรับสินค้า
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    เลือกคู่ค้าปลายทาง เช่น ผู้แทนจำหน่าย (Distributor) หรือ คลังสินค้า (Warehouse)
                  </p>
                </div>

                {/* Carrier Org */}
                <div>
                  <label htmlFor="shipment-carrier" className="block text-sm font-semibold text-slate-700 mb-2">
                    ผู้ให้บริการขนส่ง <span className="font-normal text-slate-500">(ไม่บังคับ)</span>
                  </label>
                  <select
                    id="shipment-carrier"
                    value={carrierOrgId}
                    onChange={(e) => setCarrierOrgId(e.target.value)}
                    className="w-full min-h-11 rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
                <p className="border-t border-slate-100 pt-4 text-sm font-semibold text-slate-700">3. เส้นทางการจัดส่ง</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="shipment-origin" className="block text-sm font-semibold text-slate-700 mb-2">
                      สถานที่ต้นทาง <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="shipment-origin"
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      required
                      placeholder="เช่น โรงงานชลบุรี"
                      className="w-full min-h-11 rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="shipment-destination" className="block text-sm font-semibold text-slate-700 mb-2">
                      สถานที่ปลายทาง <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="shipment-destination"
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      placeholder="เช่น คลังสินค้ากรุงเทพฯ"
                      className="w-full min-h-11 rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Custom Shipment Code */}
                <div>
                  <label htmlFor="shipment-code" className="block text-sm font-semibold text-slate-700 mb-2">
                    รหัสการจัดส่ง <span className="font-normal text-slate-500">(ไม่บังคับ)</span>
                  </label>
                  <input
                    id="shipment-code"
                    type="text"
                    value={customShipmentCode}
                    onChange={(e) => setCustomShipmentCode(e.target.value)}
                    placeholder="เช่น SHP-2026-001"
                    className="w-full min-h-11 rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">เว้นว่างเพื่อให้ระบบสร้างรหัสให้อัตโนมัติ</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-600 max-w-xs">ตรวจสอบข้อมูลก่อนบันทึก จากนั้นยืนยันธุรกรรมในกระเป๋าเงินของคุณ</p>
                  <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="min-h-11 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedProduct || !['QUALITY_CHECKED', 'STORED'].includes(selectedProduct.status) || !receiverOrgId || Boolean(organizationLoadError)}
                    className="min-h-11 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? 'กำลังบันทึกลง Blockchain...' : 'สร้างใบจัดส่งสินค้า'}
                  </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <section aria-labelledby="shipment-list-title" className="bg-white border border-slate-200 p-5 sm:p-7 rounded-2xl shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="shipment-list-title" className="text-lg font-bold text-slate-900 flex items-center gap-2"><TruckIcon className="h-5 w-5 text-blue-600" />รายการจัดส่งสินค้า</h2>
                <p className="mt-1 text-sm text-slate-500">แสดงรายการล่าสุดสูงสุด 50 รายการ</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-500 whitespace-nowrap">{filteredShipments.length} รายการ</span>
                <div role="group" aria-label="รูปแบบการแสดงผล" className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                    List
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${viewMode === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" /></svg>
                    Grid
                  </button>
                </div>
              </div>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <label htmlFor="shipment-search" className="sr-only">ค้นหารายการจัดส่ง</label>
              <SearchIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input id="shipment-search" type="search" value={shipmentSearch} onChange={(e) => setShipmentSearch(e.target.value)} placeholder="ค้นหารหัส สินค้า หรือองค์กร" className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
            </div>
          <div className="flex items-center gap-1.5 flex-wrap" aria-label="กรองตามสถานะ">
            {[
              { id: 'ALL', label: 'ALL · ทั้งหมด' },
              { id: 'PENDING', label: 'PENDING · รอการจัดส่ง' },
              { id: 'SHIPPED', label: 'SHIPPED · จัดส่งแล้ว' },
              { id: 'IN_TRANSIT', label: 'IN_TRANSIT · ระหว่างขนส่ง' },
              { id: 'DELIVERED', label: 'DELIVERED · ส่งมอบสำเร็จ' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                aria-pressed={statusFilter === st.id}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
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

          {loading ? (
            <div role="status" className="py-12 flex flex-col items-center justify-center text-slate-500 text-sm">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
              กำลังโหลดข้อมูลการจัดส่งและบล็อกเชน...
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              {shipments.length === 0 ? 'ยังไม่มีข้อมูลการจัดส่งสินค้าในระบบ' : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
            </div>
          ) : (
            <div role="list" aria-label={`รายการจัดส่งแบบ ${viewMode === 'list' ? 'List' : 'Grid'}`} className={`grid gap-4 pt-5 ${viewMode === 'grid' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                  {filteredShipments.map((shp) => {
                    const badge = getShipmentStatusBadge(shp.status);
                    const isActing = actionInProgressId === shp.id;
                    const wallet = user?.walletAddress?.toLowerCase();
                    const canShip = Boolean(
                      wallet &&
                      ['SUPER_ADMIN', 'MANUFACTURER', 'DISTRIBUTOR', 'WAREHOUSE'].includes(user?.role || '') &&
                      (shp.sender?.walletAddress?.toLowerCase() === wallet ||
                        shp.carrier?.walletAddress?.toLowerCase() === wallet),
                    );
                    const canReceive = Boolean(
                      wallet &&
                      ['SUPER_ADMIN', 'DISTRIBUTOR', 'WAREHOUSE', 'RETAILER'].includes(user?.role || '') &&
                      shp.receiver?.walletAddress?.toLowerCase() === wallet,
                    );

                    return (
                      <article role="listitem" key={shp.id || shp.shipmentCode} className={`rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs ${viewMode === 'grid' ? 'flex h-full flex-col' : ''}`}>
                        <div className={`flex gap-3 ${viewMode === 'grid' ? 'flex-col' : 'flex-col sm:flex-row sm:items-start sm:justify-between'}`}>
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold text-blue-700">{shp.shipmentCode}</p>
                            <p className="mt-1 text-base font-semibold text-slate-900">{shp.product?.name || 'สินค้า'}</p>
                            {shp.product?.productCode && <p className="mt-0.5 font-mono text-xs text-slate-500">{shp.product.productCode}</p>}
                          </div>
                          <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${badge.bg}`}>
                            {badge.text} <span className="font-mono opacity-75">(<span>{shp.status}</span>)</span>
                          </span>
                        </div>

                        <div className={`mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:gap-5 sm:p-4 ${viewMode === 'grid' ? 'xl:grid-cols-2' : 'sm:grid-cols-2'}`}>
                          <div>
                            <p className="text-xs font-medium text-slate-500">ผู้ส่ง · ต้นทาง</p>
                            <p className="mt-1 font-semibold text-slate-800">{shp.sender?.name || '-'}</p>
                            <p className="mt-0.5 text-slate-600">{shp.origin || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500">ผู้รับ · ปลายทาง</p>
                            <p className="mt-1 font-semibold text-slate-800">{shp.receiver?.name || '-'}</p>
                            <p className="mt-0.5 text-slate-600">{shp.destination || '-'}</p>
                          </div>
                        </div>

                        <div className={`flex flex-col gap-3 ${viewMode === 'grid' ? 'mt-auto pt-4' : 'mt-4 sm:flex-row sm:items-center sm:justify-between'}`}>
                          <div className="text-xs text-slate-500">
                            {shp.createdAt && <p>สร้างเมื่อ {new Date(shp.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                            {shp.blockchainTxHash && <p className="mt-1 font-mono text-blue-700" title={shp.blockchainTxHash}>Tx: {shp.blockchainTxHash.slice(0, 8)}...{shp.blockchainTxHash.slice(-6)}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                          {shp.status === 'PENDING' && canShip && (
                            <button
                              onClick={() => shp.id && handleShip(shp.id)}
                              disabled={isActing}
                              className="min-h-10 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                              {isActing ? 'กำลังจัดส่ง...' : 'จัดส่งสินค้า'}
                            </button>
                          )}
                          {shp.status === 'PENDING' && !canShip && canReceive && (
                            <span className="text-amber-700 text-sm">
                              รอ {shp.sender?.name || 'ผู้ส่ง'} จัดส่ง
                            </span>
                          )}
                          {shp.status === 'SHIPPED' && canShip && (
                            <button
                              onClick={() => shp.id && handleInTransit(shp.id)}
                              disabled={isActing}
                              className="min-h-10 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                            >
                              ระหว่างขนส่ง
                            </button>
                          )}
                          {(shp.status === 'SHIPPED' || shp.status === 'IN_TRANSIT') && canReceive && (
                            <button
                              onClick={() => setConfirmReceiveShipment(shp)}
                              disabled={isActing}
                              className="min-h-10 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-50 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                            >
                              {isActing ? 'กำลังบันทึก...' : 'ยืนยันรับสินค้า'}
                            </button>
                          )}
                          {shp.status === 'DELIVERED' && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-sm">
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>รับสินค้าแล้ว</span>
                            </span>
                          )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
            </div>
          )}
        </section>

        {/* Confirmation Modal for Receiving Shipment */}
        {confirmReceiveShipment && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="receive-shipment-title" onKeyDown={(event) => { if (event.key === 'Escape') setConfirmReceiveShipment(null); }} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                  <CheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="receive-shipment-title" className="text-lg font-bold text-slate-900">
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

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmReceiveShipment(null)}
                  className="min-h-11 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
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
                  className="min-h-11 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition cursor-pointer shadow-xs"
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
