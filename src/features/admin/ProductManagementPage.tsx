import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Edit3,
  Trash2,
  Loader2,
} from 'lucide-react';
import { productApi } from '../../services/api';
import type { ListingStatus, Product } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { formatETB } from '../../utils/members';

type ModerationTarget = { product: Product; action: 'hide' | 'suspend' | 'remove' } | null;
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ActionAlertModal, type ActionAlertState } from '../../components/common/ActionAlertModal';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';

/**
 * Listing oversight for administrators. Listings are published immediately
 * by verified members; moderation (hide / suspend / remove / restore) is used
 * when a listing is reported or otherwise needs attention.
 */
export const ProductManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Actions
  const [moderationTarget, setModerationTarget] = useState<ModerationTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<ActionAlertState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const fetchProductsBatch = useCallback(
    async (offset: number, limit: number) => {
      return productApi.getAllProductsAdmin({
        status: statusFilter,
        search: search || undefined,
        limit,
        offset,
      });
    },
    [statusFilter, search]
  );

  const {
    items: products,
    loading,
    loadingMore,
    hasMore,
    reload: fetchProducts,
    sentinelRef,
  } = useInfiniteList<Product>({
    fetchFn: fetchProductsBatch,
    limit: 50,
    deps: [statusFilter, search],
  });

  const renderListingTypeBadge = (type?: string) => {
    const t = type || 'New spares';
    let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (t === 'Posts') {
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (t === 'Services') {
      badgeStyle = 'bg-teal-50 text-teal-700 border-teal-200';
    } else if (t === 'Repair tools') {
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
    } else if (t === 'Used spares') {
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeStyle}`}>
        {t}
      </span>
    );
  };
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRestore = async (id: string) => {
    setProcessingId(id);
    try {
      await productApi.restoreListing(id, adminUser || undefined);
      await fetchProducts();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Listing Restored',
        message: 'The listing is visible in the marketplace again.',
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Restore Failed',
        message: err.message || 'An error occurred while restoring the listing.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleModerationConfirm = async (note?: string) => {
    if (!moderationTarget || !note) return;
    const { product, action } = moderationTarget;
    setProcessingId(product.id);
    try {
      if (action === 'hide') await productApi.hideListing(product.id, note, adminUser || undefined);
      if (action === 'suspend') await productApi.suspendListing(product.id, note, adminUser || undefined);
      if (action === 'remove') await productApi.removeListing(product.id, note, adminUser || undefined);
      setModerationTarget(null);
      await fetchProducts();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Listing Moderated',
        message: 'The owner has been notified with your note.',
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Moderation Failed',
        message: err.message || 'An error occurred while moderating the listing.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await productApi.deleteProduct(deleteTarget.id, 'admin', 'admin');
      setDeleteTarget(null);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Deletion failed.');
    }
  };

  const openEditModal = (p: Product) => {
    setEditTarget(p);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditQuantity(String(p.quantity));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setIsUpdating(true);
    try {
      await productApi.adminUpdateProduct(editTarget.id, {
        name: editName.trim(),
        price: Number(editPrice),
        quantity: Number(editQuantity),
      });
      setEditTarget(null);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Update failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Marketplace Listings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Listings publish immediately. Hide, suspend or remove a listing only when it is reported or needs attention.
          </p>
        </div>

        <Link
          to="/admin/reports/items"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          View Reported Listings
        </Link>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {(['all', 'active', 'hidden', 'suspended', 'removed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search by title, seller, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No products match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item & Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div className="min-w-0 max-w-xs">
                          <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                          <span className="text-[11px] text-slate-500">
                            ID: {p.id}
                          </span>
                          {p.moderationNote && (
                            <span className="text-[10px] text-rose-600 block truncate">
                              Moderation note: {p.moderationNote}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {renderListingTypeBadge(p.listingType)}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">{p.sellerName}</td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.listingType === 'Posts' ? (
                        <span className="text-slate-400 font-normal">No price (Post)</span>
                      ) : (
                        formatETB(p.price, { startingPrice: p.isStartingPrice })
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">{p.quantity}</td>

                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status !== 'active' && (
                          <button
                            type="button"
                            disabled={processingId === p.id}
                            onClick={() => handleRestore(p.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                          >
                            {processingId === p.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            Restore
                          </button>
                        )}

                        {p.status === 'active' && (
                          <>
                            <button
                              type="button"
                              disabled={processingId === p.id}
                              onClick={() => setModerationTarget({ product: p, action: 'hide' })}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-800 font-semibold text-[11px] rounded-lg border border-amber-200 transition-colors"
                            >
                              Hide
                            </button>
                            <button
                              type="button"
                              disabled={processingId === p.id}
                              onClick={() => setModerationTarget({ product: p, action: 'suspend' })}
                              className="px-2 py-1 bg-orange-50 hover:bg-orange-100 disabled:opacity-60 text-orange-800 font-semibold text-[11px] rounded-lg border border-orange-200 transition-colors"
                            >
                              Suspend
                            </button>
                          </>
                        )}

                        {p.status !== 'removed' && (
                          <button
                            type="button"
                            disabled={processingId === p.id}
                            onClick={() => setModerationTarget({ product: p, action: 'remove' })}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 font-semibold text-[11px] rounded-lg border border-rose-200 transition-colors"
                          >
                            Remove
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="Admin Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Permanently delete listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          itemCount={products.length}
        />
      </div>

      {/* Admin Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Admin Edit Listing</h3>
              <button onClick={() => setEditTarget(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Price (ETB)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                >
                  {isUpdating ? 'Saving...' : 'Save Listing Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Moderation Modal (hide / suspend / remove) */}
      <ConfirmDialog
        isOpen={Boolean(moderationTarget)}
        title={
          moderationTarget?.action === 'hide'
            ? 'Hide Listing'
            : moderationTarget?.action === 'suspend'
              ? 'Suspend Listing'
              : 'Remove Listing'
        }
        message={`Provide a note for the owner of "${moderationTarget?.product.name}".`}
        confirmLabel="Confirm"
        requiresReason
        reasonPlaceholder="Note shown to the listing owner..."
        isDestructive
        onConfirm={handleModerationConfirm}
        onCancel={() => setModerationTarget(null)}
      />

      {/* Delete Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Permanently Delete Listing"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This cannot be undone. Prefer "Remove" to keep an audit trail.`}
        confirmLabel="Delete Forever"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
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
