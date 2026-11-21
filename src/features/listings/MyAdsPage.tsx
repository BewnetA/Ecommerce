import React, { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, PackagePlus, Search, Edit3, Trash2, AlertCircle, EyeOff, Eye, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { productApi } from '../../services/api';
import type { ListingStatus, Product } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';
import { CONDITION_LABELS, formatETB, isModeratedStatus, isProductListing, isServiceListing } from '../../utils/members';

type StatusTab = 'all' | ListingStatus;

/**
 * My Ads — a normal part of the member profile (not a separate seller
 * dashboard). Ads publish immediately; owners can edit, hide/show, mark sold
 * and delete their own ads. Suspended/removed ads come from moderation.
 */
export const MyAdsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const fetchBatch = useCallback(
    async (offset: number, limit: number) => {
      if (!user) return [];
      return productApi.getMemberProducts(user.id, { limit, offset });
    },
    [user]
  );

  const {
    items: products,
    loading,
    loadingMore,
    hasMore,
    reload,
    sentinelRef,
  } = useInfiniteList<Product>({
    fetchFn: fetchBatch,
    limit: 50,
    deps: [user, location.key],
  });

  const filtered = useMemo(() => {
    let result = [...products];
    if (statusFilter !== 'all') result = result.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [products, statusFilter, search]);

  const runAction = async (product: Product, action: () => Promise<unknown>, success: string) => {
    setBusyId(product.id);
    try {
      await action();
      toast.success(success);
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Could not update this ad.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !user) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await runAction(target, () => productApi.deleteProduct(target.id, user.id, user.role), 'Ad deleted.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Ads</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your ads go live immediately. Edit, hide, mark sold or delete them here.
          </p>
        </div>
        <Link
          to="/account/ads/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] text-xs font-bold rounded-xl shadow-xs transition"
        >
          <PackagePlus className="w-4 h-4" />
          Post Ad
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'active', 'hidden', 'suspended', 'removed'] as const).map((st) => {
            const count = st === 'all' ? products.length : products.filter((p) => p.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                  statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative flex items-center max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Filter by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#75C96B]"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading your ads...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No ads in this view.</p>
            <Link to="/account/ads/new" className="inline-flex items-center gap-1.5 text-xs font-semibold text-lime-700 hover:text-lime-900">
              <PackagePlus className="w-3.5 h-3.5" /> Post your first ad
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ad</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const moderated = isModeratedStatus(p.status);
                  const busy = busyId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0" />
                          <div className="min-w-0 max-w-xs">
                            <Link to={`/products/${p.id}`} className="font-bold text-slate-900 block truncate hover:underline">
                              {p.name}
                            </Link>
                            <span className="text-[10px] text-slate-400 block">{p.locationSubCity}, {p.locationCity}</span>
                            {p.status !== 'active' && p.moderationNote && (
                              <div className="mt-1 flex items-start gap-1 text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>Moderation note: {p.moderationNote}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {p.listingType === 'Posts' ? '—' : formatETB(p.price, { startingPrice: p.isStartingPrice })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium whitespace-nowrap">
                          {isServiceListing(p.listingType)
                            ? 'Service'
                            : p.condition
                              ? `${CONDITION_LABELS[p.condition]} · ${p.listingType}`
                              : p.listingType}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isProductListing(p.listingType) ? (
                          p.isSoldOut ? (
                            <span className="font-semibold text-rose-600">Sold out</span>
                          ) : (
                            <span className="font-semibold text-slate-800">{p.quantity} available</span>
                          )
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!moderated && user && (
                            <>
                              {isProductListing(p.listingType) && p.status === 'active' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    runAction(
                                      p,
                                      () => productApi.setSoldOut(p.id, user, !p.isSoldOut),
                                      p.isSoldOut ? 'Marked as available.' : 'Marked as sold out.'
                                    )
                                  }
                                  className="p-1.5 text-slate-500 hover:text-lime-700 rounded-lg hover:bg-slate-100 transition disabled:opacity-40"
                                  title={p.isSoldOut ? 'Mark available' : 'Mark sold out'}
                                >
                                  {p.isSoldOut ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                </button>
                              )}
                              {(p.status === 'active' || (p.status === 'hidden' && !p.moderationNote)) && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    runAction(
                                      p,
                                      () => productApi.setOwnerVisibility(p.id, user, p.status === 'hidden'),
                                      p.status === 'hidden' ? 'Ad is visible again.' : 'Ad hidden from the marketplace.'
                                    )
                                  }
                                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition disabled:opacity-40"
                                  title={p.status === 'hidden' ? 'Show ad' : 'Hide ad'}
                                >
                                  {p.status === 'hidden' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              )}
                              <Link
                                to={`/account/ads/${p.id}/edit`}
                                className="p-1.5 text-slate-500 hover:text-lime-700 rounded-lg hover:bg-slate-100 transition"
                                title="Edit ad"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition disabled:opacity-40"
                            title="Delete ad"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <InfiniteScrollSentinel sentinelRef={sentinelRef} loadingMore={loadingMore} hasMore={hasMore} itemCount={products.length} />
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Ad"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This permanently removes the ad from the marketplace.`}
        confirmLabel="Delete Ad"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
