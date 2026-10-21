import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { messagingApi } from '../../services/api';
import type { Conversation } from '../../types';

export const ConversationListPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const isSeller = user?.role === 'seller';
  const basePath = isSeller ? '/seller/messages' : '/buyer/messages';

  const fetchConversations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await messagingApi.getConversations(user.id, user.role);
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isSeller ? 'Customer Inquiries' : 'My Product Messages'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Direct communication regarding product availability, price, and delivery
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
          Browse Products
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading messages...</div>
        ) : conversations.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No active conversations yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isSeller
                ? 'When customers inquire about your listings, their messages will appear here.'
                : 'Browse marketplace listings and click "Message Seller" to begin an inquiry.'}
            </p>
            {!isSeller && (
              <div className="pt-2">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  Explore Catalog
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map((c) => {
              const otherParty = isSeller ? c.buyerName : c.sellerName;
              const unread = isSeller ? c.unreadCountSeller : c.unreadCountBuyer;

              return (
                <Link
                  key={c.id}
                  to={`${basePath}/${c.id}`}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition block ${
                    unread > 0 ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <img
                      src={
                        c.productImage ||
                        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&auto=format&fit=crop&q=80'
                      }
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200/70 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {otherParty}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(c.lastMessageAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 truncate">
                        <span>{c.productName}</span>
                        <span className="text-slate-400">•</span>
                        <span>${c.productPrice}</span>
                      </div>

                      <p className="text-xs text-slate-500 truncate mt-1">
                        {c.lastMessage || 'No messages yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {unread > 0 && (
                      <span className="bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                        {unread} new
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
