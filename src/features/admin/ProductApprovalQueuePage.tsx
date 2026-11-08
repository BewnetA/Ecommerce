import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { productApi } from '../../services/api';
import type { Product } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ActionAlertModal, type ActionAlertState } from '../../components/common/ActionAlertModal';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';

export const ProductApprovalQueuePage: React.FC = () => {
  const [rejectTarget, setRejectTarget] = useState<Product | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<ActionAlertState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const fetchProductsBatch = useCallback(async (offset: number, limit: number) => {
    return productApi.getAllProductsAdmin({
      status: 'pending',
      limit,
      offset,
    });
  }, []);

  const {
    items: pendingProducts,
    loading,
    loadingMore,
    hasMore,
    reload: fetchQueue,
    sentinelRef,
  } = useInfiniteList<Product>({
    fetchFn: fetchProductsBatch,
    limit: 50,
  });

  const handleApprove = async (productId: string) => {
    setProcessingId(productId);
    try {
      await productApi.approveProduct(productId);
      await fetchQueue();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Product Approved Successfully!',
        message: 'The listing has been approved and published to the marketplace for buyers.',
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'An error occurred while approving the product.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!rejectTarget || !reason) return;
    const targetId = rejectTarget.id;
    setProcessingId(targetId);
    try {
      await productApi.rejectProduct(targetId, reason);
      setRejectTarget(null);
      await fetchQueue();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Product Rejected',
        message: 'The listing submission has been rejected with documented feedback.',
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'An error occurred while rejecting the product.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/admin"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Product Approval Queue</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Pending Product Submissions ({pendingProducts.length})
          </h2>
          <p className="text-xs text-slate-500">
            Verify submitted item descriptions, pricing reasonableness, and image guidelines before publishing
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading product queue...</div>
      ) : pendingProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">All Product Submissions Moderated</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no pending products awaiting review. When merchants submit or edit items, they will queue here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                <img
                  src={p.images[0]}
                  alt=""
                  className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shrink-0"
                />

                <div className="space-y-2 flex-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                        {p.listingType || 'New spares'}
                      </span>
                      <span className="text-xs text-slate-400">ID: {p.id}</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mt-1">{p.name}</h3>
                    {p.listingType === 'Posts' ? (
                      <p className="text-sm font-bold text-purple-600">Free Community Post (No Price)</p>
                    ) : (
                      <p className="text-lg font-black text-indigo-600">ETB {p.price}</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {p.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span>
                      Seller: <strong>{p.sellerName}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {p.sellerLocation}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {p.sellerPhone}
                    </span>
                    <span>Stock: {p.quantity} units</span>
                    <span>Condition: {p.condition}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex md:flex-col gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  disabled={processingId === p.id}
                  onClick={() => handleApprove(p.id)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-60"
                >
                  {processingId === p.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Publish</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={processingId === p.id}
                  onClick={() => setRejectTarget(p)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition border border-rose-200 disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Submission</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 50-Item Infinite Scroll Sentinel */}
      <InfiniteScrollSentinel
        sentinelRef={sentinelRef}
        loadingMore={loadingMore}
        hasMore={hasMore}
        itemCount={pendingProducts.length}
      />

      {/* Reject Product Modal with Mandatory Reason */}
      <ConfirmDialog
        isOpen={Boolean(rejectTarget)}
        title="Reject Product Listing"
        message={`Please provide a reason for rejecting "${rejectTarget?.name}". This will be communicated to the seller.`}
        confirmLabel={processingId === rejectTarget?.id ? 'Rejecting...' : 'Reject Listing'}
        requiresReason
        reasonPlaceholder="e.g. Inappropriate item, counterfeit product, price gouging..."
        isDestructive
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Action Alert Confirmation Popup */}
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
