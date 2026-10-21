import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Clock,
  MessageSquare,
  PackagePlus,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { productApi, messagingApi } from '../../services/api';
import type { Product, Conversation } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const SellerDashboardPage: React.FC = () => {
  const { user, sellerProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const status = user?.role === 'admin' ? 'approved' : (sellerProfile?.status || 'pending');

  useEffect(() => {
    if (!user) return;
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [prodList, convList] = await Promise.all([
          productApi.getSellerProducts(user.id),
          messagingApi.getConversations(user.id, 'seller'),
        ]);
        setProducts(prodList);
        setConversations(convList);
      } catch (err) {
        console.error('Failed to load seller dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const approvedCount = products.filter((p) => p.status === 'approved').length;
  const pendingCount = products.filter((p) => p.status === 'pending').length;
  const rejectedCount = products.filter((p) => p.status === 'rejected').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {sellerProfile?.storeName || user?.name}!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Store Status:{' '}
            <span
              className={`font-semibold capitalize ${
                status === 'approved'
                  ? 'text-emerald-600'
                  : status === 'pending'
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {status}
            </span>{' '}
            • Manage your listings, inquiries, and customer interactions
          </p>
          {rejectedCount > 0 && (
            <p className="text-xs text-rose-600 font-medium mt-1">
              Notice: You have {rejectedCount} rejected {rejectedCount === 1 ? 'listing' : 'listings'} with moderation feedback in My Products.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === 'approved' ? (
            <Link
              to="/seller/products/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <PackagePlus className="w-4 h-4" />
              Add New Product
            </Link>
          ) : (
            <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Approval Required to Add Products
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Total Products</span>
            <span className="text-2xl font-black text-slate-900">{products.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Live & Approved</span>
            <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Pending Approval</span>
            <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Inquiries</span>
            <span className="text-2xl font-black text-slate-900">{conversations.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two columns: Recent Products & Recent Customer Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Product List (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Your Submitted Products</h3>
            <Link
              to="/seller/products"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View All ({products.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading dashboard...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No products created yet. Click "Add New Product" to submit your first listing for admin review.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {products.slice(0, 5).map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.images[0]}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        ${p.price} • {p.categoryName} • Stock: {p.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={p.status} size="sm" />
                    <Link
                      to={`/seller/products/edit/${p.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 hover:bg-slate-50 rounded-lg"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Inquiries (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Customer Inquiries</h3>
            <Link
              to="/seller/messages"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              All Messages <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No customer inquiries yet. When buyers message you from product detail pages, they will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  to={`/seller/messages/${c.id}`}
                  className="py-3 block hover:bg-slate-50 rounded-xl px-2 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{c.buyerName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-700 font-medium truncate mb-1">
                    Re: {c.productName}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1">{c.lastMessage}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
