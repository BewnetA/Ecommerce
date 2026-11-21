import React, { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { messagingApi } from '../../services/api';
import type { Conversation } from '../../types';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';
import { formatETB } from '../../utils/members';

/**
 * One inbox for every member: conversations about other members' ads and
 * inquiries about the member's own ads.
 */
export const ConversationListPage: React.FC = () => {
  const { user } = useAuth();

  const basePath = '/account/messages';

  const fetchConvsBatch = useCallback(
    async (offset: number, limit: number) => {
      if (!user) return [];
      return messagingApi.getConversations(user.id, limit, offset);
    },
    [user]
  );

  const {
    items: conversations,
    loading,
    loadingMore,
    hasMore,
    reload: fetchConversations,
    sentinelRef,
  } = useInfiniteList<Conversation>({
    fetchFn: fetchConvsBatch,
    limit: 50,
    deps: [user],
  });

  useEffect(() => {
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Messages
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Conversations about other members' ads and inquiries about your own ads
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
              Contact a member from any listing, or wait for members to ask about your ads — every conversation appears here.
            </p>
            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Explore Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map((c) => {
              // The member's side is decided per conversation, not per account.
              const isOwnAd = c.sellerId === user?.id;
              const otherParty = isOwnAd ? c.buyerName : c.sellerName;
              const unread = isOwnAd ? c.unreadCountSeller : c.unreadCountBuyer;

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
                        <span>{formatETB(c.productPrice)}</span>
                        {isOwnAd && <span className="text-[10px] font-bold text-lime-700 bg-lime-50 px-1.5 py-0.5 rounded">Your ad</span>}
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

        {/* 50-Item Infinite Scroll Sentinel */}
        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={hasMore}
          itemCount={conversations.length}
        />
      </div>
    </div>
  );
};
