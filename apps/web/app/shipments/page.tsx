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

function ShipmentsPageContent() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('productId') || '';

  // Form states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(Boolean(preselectedProductId));
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
          const msg = err instanceof Error ? err.message : 'Failed to load shipments data';
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

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMessage('Please choose a product to ship.');
      return;
    }
    if (!receiverOrgId) {
      setErrorMessage('Please select a receiving organization.');
      return;
    }
    if (!origin.trim() || !destination.trim()) {
      setErrorMessage('Origin and destination locations are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await api.shipments.create({
        productId: selectedProductId,
        receiverOrganizationId: receiverOrgId,
        carrierOrganizationId: carrierOrgId || undefined,
        origin: origin.trim(),
        destination: destination.trim(),
        shipmentCode: customShipmentCode.trim() || undefined,
      });

      setSuccessMessage({
        title: 'Shipment Created on Blockchain!',
        details: `Shipment ${res.shipment.shipmentCode} created. Product state is now READY_TO_SHIP.`,
        txHash: res.blockchain?.txHash,
      });

      setShowCreateModal(false);
      setOrigin('');
      setDestination('');
      setCustomShipmentCode('');

      // Refresh shipments list
      const updated = await api.shipments.list({ limit: 50 }).catch(() => null);
      if (updated?.data) {
        setShipments(updated.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create shipment';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (shipmentId: string) => {
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await api.shipments.ship(shipmentId, {
        notes: 'Dispatched from sender facility via carrier fleet.',
      });

      setSuccessMessage({
        title: 'Shipment Dispatched On-Chain',
        details: `Status is now SHIPPED. Smart contract event ProductShipped emitted.`,
        txHash: res.blockchain?.txHash,
      });

      const updated = await api.shipments.list({ limit: 50 }).catch(() => null);
      if (updated?.data) {
        setShipments(updated.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dispatch operation failed';
      setErrorMessage(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReceive = async (shipmentId: string) => {
    try {
      setActionInProgressId(shipmentId);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await api.shipments.receive(shipmentId, {
        notes: 'Delivery received and inspected at recipient destination.',
      });

      setSuccessMessage({
        title: 'Receipt Confirmed & Ownership Transferred!',
        details: `Shipment marked DELIVERED. Product ownership has transferred to ${
          res.product?.currentOwner?.name || 'recipient'
        }.`,
        txHash: res.blockchain?.txHash,
      });

      const updated = await api.shipments.list({ limit: 50 }).catch(() => null);
      if (updated?.data) {
        setShipments(updated.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Receipt confirmation failed';
      setErrorMessage(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Header & New Shipment Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚢</span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Shipment & Logistics Operations
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Phase 9 — Multi-organization custody transfers, smart contract dispatch events, and cryptographic ownership transfers.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition self-start sm:self-auto"
          >
            + Create Shipment
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 text-xs space-y-1 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-300 text-sm flex items-center gap-1.5">
                <span>✓</span> {successMessage.title}
              </span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-400 hover:text-emerald-200"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-300">{successMessage.details}</p>
            {successMessage.txHash && (
              <p className="font-mono text-blue-400 break-all pt-1">
                Tx: {successMessage.txHash}
              </p>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold block mb-0.5">Error Occurred</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-sm ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Create Shipment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>📦</span> Create New Shipment Reference
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateShipment} className="space-y-4 text-xs">
                {/* Product Select */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Select Product <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Product to Ship --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.productCode}] {p.name} (Status: {p.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Products must be quality checked or stored to initiate transport.
                  </p>
                </div>

                {/* Receiver Org */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Receiver Organization (Consignee) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={receiverOrgId}
                    onChange={(e) => setReceiverOrgId(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Receiving Organization --</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} [{org.code}] — {org.type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Carrier Org */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Carrier / Logistics Provider (Optional)
                  </label>
                  <select
                    value={carrierOrgId}
                    onChange={(e) => setCarrierOrgId(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- None / Direct Transfer --</option>
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
                    <label className="block text-slate-300 font-medium mb-1">
                      Origin Facility <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      required
                      placeholder="e.g. Apex Chonburi Hub"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Destination Facility <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      placeholder="e.g. GFD Bangkok Warehouse"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Custom Shipment Code */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Shipment Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={customShipmentCode}
                    onChange={(e) => setCustomShipmentCode(e.target.value)}
                    placeholder="Auto-generated if empty (e.g. SHP-APEX-001)"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold shadow transition flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting On-Chain...</span>
                      </>
                    ) : (
                      <span>Create Shipment &rarr;</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center justify-between border border-slate-800 bg-slate-950/60 p-3 rounded-xl text-xs">
          <span className="text-slate-400 font-medium">Filter by Status:</span>
          <div className="flex items-center gap-1.5">
            {['ALL', 'PENDING', 'SHIPPED', 'DELIVERED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Shipments Table */}
        <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span>📋</span> Active & Completed Shipments
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Total: {filteredShipments.length}
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              Loading shipments and blockchain state...
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              No shipments found matching the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-medium">Shipment Code</th>
                    <th className="py-3 px-4 font-medium">Product</th>
                    <th className="py-3 px-4 font-medium">Route (Origin &rarr; Dest)</th>
                    <th className="py-3 px-4 font-medium">Parties</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Blockchain</th>
                    <th className="py-3 px-4 font-medium text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredShipments.map((shp) => (
                    <tr key={shp.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {shp.shipmentCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {shp.product?.productCode || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {shp.product?.name || 'Product'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="font-medium text-white">{shp.origin}</div>
                        <div className="text-[11px] text-slate-400">&darr; {shp.destination}</div>
                      </td>
                      <td className="py-3 px-4 space-y-0.5 text-[11px]">
                        <div>
                          <span className="text-slate-500">From:</span>{' '}
                          <span className="text-slate-300 font-medium">
                            {shp.sender?.name || shp.senderOrganizationId}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">To:</span>{' '}
                          <span className="text-slate-300 font-medium">
                            {shp.receiver?.name || shp.receiverOrganizationId}
                          </span>
                        </div>
                        {shp.carrier && (
                          <div>
                            <span className="text-slate-500">Via:</span>{' '}
                            <span className="text-slate-400">{shp.carrier.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                            shp.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : shp.status === 'SHIPPED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : shp.status === 'IN_TRANSIT'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              shp.status === 'DELIVERED'
                                ? 'bg-emerald-400'
                                : shp.status === 'SHIPPED'
                                ? 'bg-blue-400'
                                : shp.status === 'IN_TRANSIT'
                                ? 'bg-purple-400'
                                : 'bg-amber-400'
                            }`}
                          ></span>
                          {shp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {shp.blockchainTxHash ? (
                          <span
                            className="text-blue-400 cursor-pointer"
                            title={shp.blockchainTxHash}
                          >
                            {shp.blockchainTxHash.slice(0, 8)}...
                            {shp.blockchainTxHash.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-slate-500">On-Chain</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {shp.status === 'PENDING' && (
                            <button
                              onClick={() => handleDispatch(shp.id || '')}
                              disabled={actionInProgressId === shp.id}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-semibold transition"
                            >
                              {actionInProgressId === shp.id ? 'Shipping...' : 'Dispatch'}
                            </button>
                          )}
                          {(shp.status === 'SHIPPED' || shp.status === 'IN_TRANSIT') && (
                            <button
                              onClick={() => handleReceive(shp.id || '')}
                              disabled={actionInProgressId === shp.id}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-semibold transition"
                            >
                              {actionInProgressId === shp.id ? 'Receiving...' : 'Confirm Receipt'}
                            </button>
                          )}
                          {shp.productId && (
                            <Link
                              href={`/products/${shp.productId}`}
                              className="text-xs text-slate-400 hover:text-slate-200 transition font-medium"
                            >
                              View &rarr;
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Loading Shipment Dashboard...
          </div>
        </div>
      }
    >
      <ShipmentsPageContent />
    </Suspense>
  );
}
