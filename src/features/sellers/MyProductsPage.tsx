import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  PackagePlus,
  Search,
  Edit3,
  Trash2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { productApi } from '../../services/api';
import type { Product, ProductStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const MyProductsPage: React.FC = () => {
  const { user, sellerProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Deletion modal state
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);

  const fetchProducts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await productApi.getSellerProducts(user.id);
      setProducts(list);
    } catch (err) {
      console.error('Failed to fetch seller products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  // Filtering
  useEffect(() => {
    let result = [...products];
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q)
      );
    }
    setFilteredProducts(result);
  }, [products, statusFilter, search]);

  const handleDeleteConfirm = async () => {
    if (!deleteProductTarget || !user) return;
    try {
      await productApi.deleteProduct(deleteProductTarget.id, user.id, user.role);
      setDeleteProductTarget(null);
      await fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to remove product.');
    }
  };

  const isApprovedSeller = sellerProfile?.status === 'approved';

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Product Inventory & Listings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your catalog items, check admin review status, and view rejection feedback
          </p>
        </div>

        {isApprovedSeller && (
          <Link
            to="/seller/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <PackagePlus className="w-4 h-4" />
            Add New Product
          </Link>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => {
            const count =
              st === 'all'
                ? products.length
                : products.filter((p) => p.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex items-center max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Filter by title..."
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
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No products found in this view.</p>
            {isApprovedSeller && (
              <Link
                to="/seller/products/new"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <PackagePlus className="w-3.5 h-3.5" /> Submit your first product
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
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
                          <span className="text-[10px] text-slate-400 block">ID: {p.id}</span>
                          {p.status === 'rejected' && p.rejectionReason && (
                            <div className="mt-1 flex items-start gap-1 text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>Reason: {p.rejectionReason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">${p.price}</td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {p.categoryName}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          p.quantity > 0 ? 'text-slate-800' : 'text-rose-600'
                        }`}
                      >
                        {p.quantity} units
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'approved' && (
                          <Link
                            to={`/products/${p.id}`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                            title="View Public Marketplace Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}

                        <Link
                          to={`/seller/products/edit/${p.id}`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                          title="Edit Product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeleteProductTarget(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteProductTarget)}
        title="Delete Product Listing"
        message={`Are you sure you want to delete "${deleteProductTarget?.name}"? This action will remove the product from the marketplace.`}
        confirmLabel="Delete Product"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteProductTarget(null)}
      />
    </div>
  );
};
