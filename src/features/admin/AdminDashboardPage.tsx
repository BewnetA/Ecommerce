import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Store,
  Package,
  Clock,
  CheckCircle2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { reportsApi, sellerApi, productApi } from '../../services/api';
import type { AdminStats, ActivityLog, Product } from '../../types';
import type { SellerWithDetails } from '../../services/api';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingSellers, setPendingSellers] = useState<SellerWithDetails[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Moderation action modals
  const [rejectSellerTarget, setRejectSellerTarget] = useState<SellerWithDetails | null>(null);
  const [rejectProductTarget, setRejectProductTarget] = useState<Product | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [adminStats, sellers, products, logs] = await Promise.all([
        reportsApi.getAdminStats(),
        sellerApi.getAllSellers('pending'),
        productApi.getAllProductsAdmin({ status: 'pending' }),
        reportsApi.getActivityLogs(),
      ]);

      setStats(adminStats);
      setPendingSellers(sellers);
      setPendingProducts(products);
      setActivityLogs(logs.slice(0, 8));
    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleApproveSeller = async (sellerId: string) => {
    try {
      await sellerApi.approveSeller(sellerId);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleRejectSellerConfirm = async (reason?: string) => {
    if (!rejectSellerTarget || !reason) return;
    try {
      await sellerApi.rejectSeller(rejectSellerTarget.userId, reason);
      setRejectSellerTarget(null);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    }
  };

  const handleApproveProduct = async (productId: string) => {
    try {
      await productApi.approveProduct(productId);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleRejectProductConfirm = async (reason?: string) => {
    if (!rejectProductTarget || !reason) return;
    try {
      await productApi.rejectProduct(rejectProductTarget.id, reason);
      setRejectProductTarget(null);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Metrics & Governance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time statistics calculated directly from local data storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/sellers/approvals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Clock className="w-4 h-4" />
            <span>Review Seller Queue ({stats?.pendingSellerApprovals || 0})</span>
          </Link>
          <Link
            to="/admin/products/approvals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Clock className="w-4 h-4" />
            <span>Review Products Queue ({stats?.pendingProductApprovals || 0})</span>
          </Link>
        </div>
      </div>

      {/* Primary Statistics Grid (Mandatory PRD Section 2.1) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Sellers</span>
            <Store className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-black text-slate-900">{stats?.totalSellers || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">Registered stores</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Buyers</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-slate-900">{stats?.totalBuyers || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">Active customer accounts</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">All Products</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-black text-slate-900">{stats?.totalProducts || 0}</span>
          <p className="text-[11px] text-slate-500 mt-1">Catalog submissions</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Sellers</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-600">
            {stats?.pendingSellerApprovals || 0}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting verification</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Products</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-600">
            {stats?.pendingProductApprovals || 0}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting moderation</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Approved Live</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600">
            {stats?.approvedProducts || 0}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Public on marketplace</p>
        </div>
      </div>

      {/* Moderation Queues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Sellers Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Seller Registration Approvals Queue
              </h3>
            </div>
            <Link
              to="/admin/sellers/approvals"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View Full Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingSellers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All seller registration requests are up to date.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSellers.slice(0, 3).map((seller) => (
                <div
                  key={seller.userId}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">
                      {seller.storeName}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Owner: {seller.userName} • {seller.phone}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{seller.location}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApproveSeller(seller.userId)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectSellerTarget(seller)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition border border-rose-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Products Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Product Moderation Approvals Queue
              </h3>
            </div>
            <Link
              to="/admin/products/approvals"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View Full Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All product submissions have been reviewed.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProducts.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.images[0]}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 block truncate">
                        {p.name}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ${p.price} • {p.categoryName} • Seller: {p.sellerName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApproveProduct(p.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectProductTarget(p)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition border border-rose-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Platform Activity Feed (Mandatory PRD Section 2.1) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Recent Platform Activity & Audit Log</h3>
          </div>
          <Link to="/admin/reports" className="text-xs text-indigo-600 hover:underline">
            View All Audit Logs
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {activityLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] uppercase font-bold shrink-0">
                  {log.action}
                </span>
                <span className="text-slate-800 truncate">{log.details}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {new Date(log.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Seller Rejection Reason Modal */}
      <ConfirmDialog
        isOpen={Boolean(rejectSellerTarget)}
        title="Reject Seller Application"
        message={`Please document the reason for rejecting "${rejectSellerTarget?.storeName}". The seller will receive this explanation.`}
        confirmLabel="Confirm Rejection"
        requiresReason
        reasonPlaceholder="e.g. Incomplete business documentation, invalid storefront address..."
        isDestructive
        onConfirm={handleRejectSellerConfirm}
        onCancel={() => setRejectSellerTarget(null)}
      />

      {/* Product Rejection Reason Modal */}
      <ConfirmDialog
        isOpen={Boolean(rejectProductTarget)}
        title="Reject Product Listing"
        message={`Please provide a rejection reason for "${rejectProductTarget?.name}".`}
        confirmLabel="Confirm Rejection"
        requiresReason
        reasonPlaceholder="e.g. Prohibited item category, suspected replica, copyright issue..."
        isDestructive
        onConfirm={handleRejectProductConfirm}
        onCancel={() => setRejectProductTarget(null)}
      />
    </div>
  );
};
