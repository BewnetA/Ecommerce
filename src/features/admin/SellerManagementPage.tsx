import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  Eye,
  Loader2,
} from 'lucide-react';
import { sellerApi } from '../../services/api';
import type { SellerWithDetails } from '../../services/api';
import type { SellerApprovalStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ActionAlertModal } from '../../components/common/ActionAlertModal';
import type { ActionAlertState } from '../../components/common/ActionAlertModal';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';

export const SellerManagementPage: React.FC = () => {
  const [filteredSellers, setFilteredSellers] = useState<SellerWithDetails[]>([]);
  const [statusFilter, setStatusFilter] = useState<SellerApprovalStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Dialog targets
  const [rejectTarget, setRejectTarget] = useState<SellerWithDetails | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<SellerWithDetails | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<SellerWithDetails | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<ActionAlertState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const fetchSellersBatch = useCallback(
    async (offset: number, limit: number) => {
      return sellerApi.getAllSellers(
        statusFilter !== 'all' ? statusFilter : undefined,
        limit,
        offset
      );
    },
    [statusFilter]
  );

  const {
    items: sellers,
    loading,
    loadingMore,
    hasMore,
    reload: fetchSellers,
    sentinelRef,
  } = useInfiniteList<SellerWithDetails>({
    fetchFn: fetchSellersBatch,
    limit: 50,
    deps: [statusFilter],
  });

  useEffect(() => {
    let result = [...sellers];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.storeName.toLowerCase().includes(q) ||
          s.userName.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      );
    }
    setFilteredSellers(result);
  }, [sellers, search]);

  const handleApprove = async (id: string) => {
    const targetSeller = sellers.find((s) => s.userId === id);
    try {
      setProcessingId(id);
      await sellerApi.approveSeller(id);
      await fetchSellers();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Seller Approved',
        message: `Seller "${targetSeller?.storeName || 'Merchant'}" has been approved successfully. They can now post and manage their listings.`,
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Unable to approve seller at this time.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!rejectTarget || !reason) return;
    const target = rejectTarget;
    try {
      setProcessingId(target.userId);
      await sellerApi.rejectSeller(target.userId, reason);
      setRejectTarget(null);
      await fetchSellers();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Seller Rejected',
        message: `Seller "${target.storeName}" has been rejected. Reason provided: "${reason}".`,
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Unable to reject seller.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspendConfirm = async (reason?: string) => {
    if (!suspendTarget || !reason) return;
    const target = suspendTarget;
    try {
      setProcessingId(target.userId);
      await sellerApi.suspendSeller(target.userId, reason);
      setSuspendTarget(null);
      await fetchSellers();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Store Suspended',
        message: `Store "${target.storeName}" has been suspended.`,
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Suspension Failed',
        message: err.message || 'Unable to suspend seller.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReinstate = async (id: string) => {
    const targetSeller = sellers.find((s) => s.userId === id);
    try {
      setProcessingId(id);
      await sellerApi.reinstateSeller(id);
      await fetchSellers();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Store Reinstated',
        message: `Store "${targetSeller?.storeName || 'Merchant'}" has been reinstated to active status.`,
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Reinstatement Failed',
        message: err.message || 'Unable to reinstate seller.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Registered Sellers & Merchants</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer merchant accounts, authorize storefronts, or apply suspensions
          </p>
        </div>

        <Link
          to="/admin/sellers/approvals"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs hover:bg-amber-600 transition"
        >
          View Pending Approvals Queue
        </Link>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'approved', 'pending', 'rejected', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {st} (
              {st === 'all'
                ? sellers.length
                : sellers.filter((s) => s.status === st).length}
              )
            </button>
          ))}
        </div>

        <div className="relative flex items-center max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search sellers or stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading sellers list...</div>
        ) : filteredSellers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No sellers match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Store & Owner</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSellers.map((s) => (
                  <tr key={s.userId} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.logoUrl}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div className="min-w-0 max-w-xs">
                          <span className="font-bold text-slate-900 block truncate">
                            {s.storeName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {s.userName} ({s.userEmail})
                          </span>
                          {s.rejectionReason && (
                            <span className="text-[10px] text-rose-600 block truncate">
                              Note: {s.rejectionReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{s.phone}</td>

                    <td className="py-3 px-4 max-w-[160px] truncate">{s.location}</td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {s.approvedProductCount} approved
                      </span>
                      <span className="text-slate-400 block text-[10px]">
                        ({s.productCount} total)
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={s.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailsTarget(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {s.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={processingId === s.userId}
                              onClick={() => handleApprove(s.userId)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                            >
                              {processingId === s.userId && <Loader2 className="w-3 h-3 animate-spin" />}
                              {processingId === s.userId ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={processingId === s.userId}
                              onClick={() => setRejectTarget(s)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 font-semibold text-[11px] rounded-lg border border-rose-200 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {s.status === 'approved' && (
                          <button
                            type="button"
                            disabled={processingId === s.userId}
                            onClick={() => setSuspendTarget(s)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-800 font-semibold text-[11px] rounded-lg border border-amber-200 transition-colors"
                          >
                            Suspend
                          </button>
                        )}

                        {s.status === 'suspended' && (
                          <button
                            type="button"
                            disabled={processingId === s.userId}
                            onClick={() => handleReinstate(s.userId)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-800 font-semibold text-[11px] rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                          >
                            {processingId === s.userId && <Loader2 className="w-3 h-3 animate-spin" />}
                            Reinstate
                          </button>
                        )}

                        {s.status === 'rejected' && (
                          <button
                            type="button"
                            disabled={processingId === s.userId}
                            onClick={() => handleApprove(s.userId)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 font-semibold text-[11px] rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                          >
                            {processingId === s.userId && <Loader2 className="w-3 h-3 animate-spin" />}
                            Re-approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 50-Item Infinite Scroll Sentinel */}
        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={hasMore}
          itemCount={sellers.length}
        />
      </div>

      {/* Details View Modal */}
      {detailsTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={detailsTarget.logoUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {detailsTarget.storeName}
                  </h3>
                  <StatusBadge status={detailsTarget.status} size="sm" />
                </div>
              </div>
              <button
                onClick={() => setDetailsTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                <strong>Owner:</strong> {detailsTarget.userName} ({detailsTarget.userEmail})
              </p>
              <p>
                <strong>Phone:</strong> {detailsTarget.phone}
              </p>
              <p>
                <strong>Store Location:</strong> {detailsTarget.location}
              </p>
              <p>
                <strong>Description:</strong> {detailsTarget.businessDescription}
              </p>
              {detailsTarget.rejectionReason && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
                  <strong>Moderation Feedback / Reason:</strong> {detailsTarget.rejectionReason}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <Link
                to={`/sellers/${detailsTarget.userId}`}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Public Storefront <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <ConfirmDialog
        isOpen={Boolean(rejectTarget)}
        title="Reject Seller Account"
        message={`Provide a reason for rejecting "${rejectTarget?.storeName}".`}
        confirmLabel="Reject"
        requiresReason
        reasonPlaceholder="Enter reason..."
        isDestructive
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Suspend Modal */}
      <ConfirmDialog
        isOpen={Boolean(suspendTarget)}
        title="Suspend Store Account"
        message={`Are you sure you want to suspend "${suspendTarget?.storeName}"? Their products will be hidden from the public marketplace.`}
        confirmLabel="Suspend Store"
        requiresReason
        reasonPlaceholder="e.g. Policy violation, counterfeit reports..."
        isDestructive
        onConfirm={handleSuspendConfirm}
        onCancel={() => setSuspendTarget(null)}
      />

      {/* Action Result Modal */}
      <ActionAlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
