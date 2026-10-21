import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  MessageSquare,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { messagingApi } from '../../services/api';
import type { Conversation } from '../../types';

export const BuyerDashboardPage: React.FC = () => {
  const { user, buyerProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    messagingApi
      .getConversations(user.id, 'buyer')
      .then((data) => {
        setConversations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load buyer conversations:', err);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Hello, {user?.name.split(' ')[0]}!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track inquiries, communicate with sellers, and manage your delivery details
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <ShoppingBag className="w-4 h-4" />
          Explore Marketplace
        </Link>
      </div>

      {/* Grid: Saved Location & Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Delivery Location Summary */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Default Delivery Destination
              </span>
              <Link
                to="/buyer/profile"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Edit Location
              </Link>
            </div>

            {buyerProfile?.deliveryAddress ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-semibold text-xs text-slate-900">
                  {buyerProfile.deliveryAddress}
                </p>
                <p className="text-xs text-slate-500">
                  {buyerProfile.deliverySubcity
                    ? `${buyerProfile.deliverySubcity}, `
                    : ''}
                  {buyerProfile.deliveryCity || 'Addis Ababa'}
                </p>
                {buyerProfile.deliveryNotes && (
                  <p className="text-[11px] text-slate-400 italic mt-1">
                    "{buyerProfile.deliveryNotes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800">
                You haven't set a default delivery address yet. Set it in your profile to share with sellers with 1 click.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Verified Phone: {user?.phone}</span>
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Buyer Account Active
            </span>
          </div>
        </div>

        {/* Quick Inquiries Metric */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Active Inquiries
            </span>
            <span className="text-3xl font-black text-slate-900">{conversations.length}</span>
            <p className="text-xs text-slate-500 mt-1">
              Conversations started with merchants regarding products
            </p>
          </div>

          <Link
            to="/buyer/messages"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between"
          >
            <span>Open Messages</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Inquiries List */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recent Product Conversations</h3>
          <Link
            to="/buyer/messages"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            All Messages <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading inquiries...</div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <Package className="w-8 h-8 mx-auto text-slate-300" />
            <p>You haven't initiated any inquiries yet.</p>
            <Link to="/products" className="text-indigo-600 font-semibold hover:underline">
              Browse products to contact sellers
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map((c) => (
              <Link
                key={c.id}
                to={`/buyer/messages/${c.id}`}
                className="py-3.5 block hover:bg-slate-50 rounded-2xl px-3 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{c.sellerName}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {c.productImage && (
                    <img
                      src={c.productImage}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-indigo-600 truncate">
                      {c.productName} • ${c.productPrice}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
