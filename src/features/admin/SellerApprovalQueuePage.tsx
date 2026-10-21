import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { sellerApi } from '../../services/api';
import type { SellerWithDetails } from '../../services/api';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const SellerApprovalQueuePage: React.FC = () => {
  const [pendingSellers, setPendingSellers] = useState<SellerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<SellerWithDetails | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const list = await sellerApi.getAllSellers('pending');
      setPendingSellers(list);
    } catch (err) {
      console.error('Failed to load seller approval queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (sellerId: string) => {
    try {
      await sellerApi.approveSeller(sellerId);
      await fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!rejectTarget || !reason) return;
    try {
      await sellerApi.rejectSeller(rejectTarget.userId, reason);
      setRejectTarget(null);
      await fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
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
            <span className="text-xs font-semibold text-slate-700">Seller Approval Queue</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Pending Seller Registrations ({pendingSellers.length})
          </h2>
          <p className="text-xs text-slate-500">
            Verify merchant credentials and physical storefront locations before authorizing publishing rights
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading queue...</div>
      ) : pendingSellers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Approval Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All submitted merchant accounts have been reviewed. New seller registrations will automatically populate here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingSellers.map((seller) => (
            <div
              key={seller.userId}
              className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="flex items-start gap-4 flex-1">
                <img
                  src={
                    seller.logoUrl ||
                    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&auto=format&fit=crop&q=80'
                  }
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                />

                <div className="space-y-2 flex-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">{seller.storeName}</h3>
                      <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                        Pending Verification
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Owner: {seller.userName} ({seller.userEmail})
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {seller.location}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {seller.phone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Applied on {new Date(seller.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <span className="font-bold text-slate-700 block mb-1">Business Description:</span>
                    <p className="leading-relaxed">{seller.businessDescription}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex md:flex-col gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => handleApprove(seller.userId)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Seller</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRejectTarget(seller)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition border border-rose-200"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Application</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject with Reason Modal */}
      <ConfirmDialog
        isOpen={Boolean(rejectTarget)}
        title="Reject Seller Application"
        message={`Please provide a documented reason for rejecting "${rejectTarget?.storeName}".`}
        confirmLabel="Reject Application"
        requiresReason
        reasonPlaceholder="e.g. Incomplete business documents, invalid storefront address..."
        isDestructive
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
};
