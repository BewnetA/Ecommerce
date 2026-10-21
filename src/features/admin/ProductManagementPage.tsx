import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Edit3,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { productApi, categoryApi } from '../../services/api';
import type { Product, ProductStatus } from '../../types';
import type { CategoryWithCount } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const ProductManagementPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Actions
  const [rejectTarget, setRejectTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [list, cats] = await Promise.all([
        productApi.getAllProductsAdmin({
          status: statusFilter,
          categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
          search: search || undefined,
        }),
        categoryApi.getCategories(),
      ]);
      setProducts(list);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load products for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter, categoryFilter, search]);

  const handleApprove = async (id: string) => {
    try {
      await productApi.approveProduct(id);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!rejectTarget || !reason) return;
    try {
      await productApi.rejectProduct(rejectTarget.id, reason);
      setRejectTarget(null);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
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
    setEditCategory(p.categoryId);
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
        categoryId: editCategory,
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
          <h2 className="text-xl font-bold text-slate-900">Platform Product Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer all marketplace submissions, verify compliance, or remove inappropriate listings
          </p>
        </div>

        <Link
          to="/admin/products/approvals"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          View Pending Product Queue
        </Link>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => (
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

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
                  <th className="py-3 px-4">Product & Category</th>
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
                            {p.categoryName} • ID: {p.id}
                          </span>
                          {p.rejectionReason && (
                            <span className="text-[10px] text-rose-600 block truncate">
                              Rejection note: {p.rejectionReason}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">{p.sellerName}</td>

                    <td className="py-3 px-4 font-bold text-slate-900">${p.price}</td>

                    <td className="py-3 px-4 font-semibold text-slate-800">{p.quantity}</td>

                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'approved' && (
                          <Link
                            to={`/products/${p.id}`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                            title="View Public Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}

                        {p.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(p.id)}
                            className="px-2 py-1 bg-emerald-600 text-white font-semibold text-[11px] rounded-lg"
                          >
                            Approve
                          </button>
                        )}

                        {p.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => setRejectTarget(p)}
                            className="px-2 py-1 bg-rose-50 text-rose-700 font-semibold text-[11px] rounded-lg border border-rose-200"
                          >
                            Reject
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
                          title="Delete Product"
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
      </div>

      {/* Admin Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Admin Edit Product</h3>
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
                    Price ($)
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                  {isUpdating ? 'Saving...' : 'Save Product Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <ConfirmDialog
        isOpen={Boolean(rejectTarget)}
        title="Reject Product Listing"
        message={`Provide a reason for rejecting "${rejectTarget?.name}".`}
        confirmLabel="Reject"
        requiresReason
        reasonPlaceholder="Enter reason..."
        isDestructive
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Delete Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Inappropriate Product"
        message={`Are you sure you want to completely remove "${deleteTarget?.name}" from the platform?`}
        confirmLabel="Delete Forever"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
