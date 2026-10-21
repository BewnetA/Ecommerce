import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Send,
  ArrowLeft,
  Phone,
  ExternalLink,
  MapPin,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { messagingApi, productApi } from '../../services/api';
import type { Conversation, Message, Product, LocationSnippet } from '../../types';

export const ConversationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, buyerProfile } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [product, setProduct] = useState<Product | null>(null);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachLocation, setAttachLocation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSeller = user?.role === 'seller';
  const backPath = isSeller ? '/seller/messages' : '/buyer/messages';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChat = async () => {
    if (!id || !user) return;
    try {
      const res = await messagingApi.getConversationWithMessages(id, user.id);
      setConversation(res.conversation);
      setMessages(res.messages);

      // Load product details for context header
      if (!product && res.conversation.productId) {
        const prod = await productApi.getProductById(res.conversation.productId);
        setProduct(prod);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !user) return;
    if (!inputText.trim() && !attachLocation) return;

    setIsSending(true);
    try {
      let locationSnippet: LocationSnippet | undefined = undefined;
      if (attachLocation) {
        locationSnippet = {
          address: buyerProfile?.deliveryAddress || 'Addis Ababa, Bole',
          city: buyerProfile?.deliveryCity || 'Addis Ababa',
          subcity: buyerProfile?.deliverySubcity || 'Bole Sub-City',
          notes: buyerProfile?.deliveryNotes || '',
          coordinates: buyerProfile?.locationCoordinates,
        };
      }

      await messagingApi.sendMessage({
        conversationId: conversation.id,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        content: inputText.trim() || (locationSnippet ? 'Shared delivery location' : ''),
        locationSnippet,
      });

      setInputText('');
      setAttachLocation(false);
      await fetchChat();
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const otherPartyName = isSeller ? conversation?.buyerName : conversation?.sellerName;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-xs text-slate-500">
        Loading conversation thread...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Conversation Not Found</h3>
        <Link
          to={backPath}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inquiries
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top back bar */}
      <div className="flex items-center justify-between">
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Inquiries
        </Link>
        <span className="text-[11px] text-slate-400">
          Inquiry ID: {conversation.id}
        </span>
      </div>

      {/* Product Context Banner (Mandatory PRD Section 6) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={
              conversation.productImage ||
              'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&auto=format&fit=crop&q=80'
            }
            alt=""
            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Inquiring About Listing
            </span>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
              {conversation.productName}
            </h3>
            <p className="text-xs font-black text-indigo-600 mt-0.5">
              ${conversation.productPrice}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {product && (
            <>
              {product.sellerPhone && !isSeller && (
                <a
                  href={`tel:${product.sellerPhone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition border border-emerald-200"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Call Seller</span>
                </a>
              )}
              <Link
                to={`/products/${product.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View Item</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Chat Thread Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Chat header */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-xs">
              {otherPartyName?.charAt(0) || 'U'}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{otherPartyName}</h4>
              <p className="text-[10px] text-slate-500">
                {isSeller ? 'Customer / Buyer' : 'Merchant'}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            {messages.length} messages
          </span>
        </div>

        {/* Message bubbles list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30">
          {messages.map((m) => {
            const isMe = m.senderId === user?.id;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-700">
                    {isMe ? 'You' : m.senderName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-md rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>

                  {/* Attached Delivery Location Snippet (PRD Section 7) */}
                  {m.deliveryLocationSnippet && (
                    <div
                      className={`mt-2.5 p-3 rounded-xl text-xs space-y-1 ${
                        isMe
                          ? 'bg-indigo-700/60 text-indigo-100 border border-indigo-500/40'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Shared Delivery Destination</span>
                      </div>
                      <p className="font-semibold text-xs mt-0.5">
                        {m.deliveryLocationSnippet.address}
                      </p>
                      <p className="text-[11px] opacity-90">
                        {m.deliveryLocationSnippet.subcity
                          ? `${m.deliveryLocationSnippet.subcity}, `
                          : ''}
                        {m.deliveryLocationSnippet.city}
                      </p>
                      {m.deliveryLocationSnippet.notes && (
                        <p className="text-[11px] italic opacity-80 mt-1">
                          "{m.deliveryLocationSnippet.notes}"
                        </p>
                      )}
                      {m.deliveryLocationSnippet.coordinates && (
                        <p className="text-[10px] opacity-75 font-mono pt-1">
                          GPS: {m.deliveryLocationSnippet.coordinates.latitude.toFixed(4)},{' '}
                          {m.deliveryLocationSnippet.coordinates.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input & Quick Suggestions Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white space-y-2">
          {/* Preset quick response chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(isSeller
              ? [
                  'Yes, this item is available for immediate pickup or delivery.',
                  'Can you share your delivery location so we can calculate courier fees?',
                  'Price is firm, includes official warranty.',
                  'I have dispatched your item with courier.',
                ]
              : [
                  'Can you deliver this product to my location today?',
                  'Is the price negotiable for immediate cash purchase?',
                  'What warranty or guarantee is included?',
                ]
            ).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="space-y-2">
            {!isSeller && (
              <div className="flex items-center justify-between text-xs px-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={attachLocation}
                    onChange={(e) => setAttachLocation(e.target.checked)}
                    className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                  />
                  <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Attach my saved delivery address with this reply</span>
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  isSeller
                    ? 'Reply to customer inquiry...'
                    : 'Ask seller about availability or delivery...'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !attachLocation)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
