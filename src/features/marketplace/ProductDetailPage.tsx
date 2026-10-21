import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Phone,
  MessageSquare,
  MapPin,
  ShieldCheck,
  Eye,
  ArrowLeft,
  Flag,
  AlertTriangle,
  Send,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import { productApi, messagingApi, reportsApi } from '../../services/api';
import type { Product, LocationSnippet } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, buyerProfile } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inquiry modal state
  const [inquiryModalOpen, setInquiryModalOpen] = useState(searchParams.get('contact') === 'true');
  const [messageText, setMessageText] = useState('Is this product still available?');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const item = await productApi.getProductById(id);
        if (!item) {
          setError('Product not found or has been removed.');
          return;
        }
        setProduct(item);
        setSelectedImage(item.images[0] || '');
      } catch (err: any) {
        setError(err.message || 'Error loading product details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const conditionLabels: Record<string, string> = {
    new: 'Brand New (Sealed)',
    like_new: 'Like New (Mint)',
    good: 'Good Condition',
    fair: 'Fair / Usable',
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!user) {
      navigate('/login', { state: { from: `/products/${product.id}?contact=true` } });
      return;
    }

    if (user.id === product.sellerId) {
      alert("You cannot message yourself about your own product.");
      return;
    }

    setIsSending(true);
    try {
      let locationSnippet: LocationSnippet | undefined = undefined;
      if (includeLocation && buyerProfile?.deliveryAddress) {
        locationSnippet = {
          address: buyerProfile.deliveryAddress,
          city: buyerProfile.deliveryCity || 'Addis Ababa',
          subcity: buyerProfile.deliverySubcity || '',
          notes: buyerProfile.deliveryNotes || '',
          coordinates: buyerProfile.locationCoordinates,
        };
      }

      const res = await messagingApi.startOrGetConversation({
        buyerId: user.id,
        buyerName: user.name,
        sellerId: product.sellerId,
        productId: product.id,
        initialMessage: messageText.trim(),
        locationSnippet,
      });

      setInquirySuccess(true);
      setTimeout(() => {
        setInquiryModalOpen(false);
        setInquirySuccess(false);
        navigate(`/buyer/messages/${res.conversation.id}`);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reportReason.trim()) return;

    try {
      await reportsApi.reportItem({
        targetType: 'product',
        targetId: product.id,
        targetName: product.name,
        reporterName: user?.name || 'Anonymous Visitor',
        reason: reportReason.trim(),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSuccess(false);
        setReportReason('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-slate-500">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{error || 'Product Not Found'}</h2>
        <p className="text-xs text-slate-500">
          This product may have been delisted, rejected, or awaiting moderation approval.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link to="/products" className="hover:text-indigo-600 flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalog
          </Link>
          <span>/</span>
          <Link to={`/products?categoryId=${product.categoryId}`} className="hover:text-indigo-600">
            {product.categoryName}
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate max-w-[200px]">
            {product.name}
          </span>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
          title="Report this listing to administrators"
        >
          <Flag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Report Listing</span>
        </button>
      </div>

      {/* Main product view grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-4/3 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
            <img
              src={selectedImage || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            {product.status !== 'approved' && (
              <div className="absolute top-4 left-4">
                <StatusBadge status={product.status} />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition ${
                    selectedImage === img ? 'border-indigo-600 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Contact (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                  {product.categoryName}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{product.viewsCount} views</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-black text-indigo-600">
                  {formatPrice(product.price)}
                </span>
                <span className="text-xs text-slate-500">Fixed/Direct Price</span>
              </div>
            </div>

            {/* Spec list */}
            <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Condition</span>
                <span className="font-semibold text-slate-800">
                  {conditionLabels[product.condition] || product.condition}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Availability</span>
                <span
                  className={`font-semibold ${
                    product.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {product.quantity > 0 ? `In Stock (${product.quantity} available)` : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                Description & Specifications
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Direct Contact Action Buttons (Mandatory PRD Section 6) */}
            <div className="pt-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`tel:${product.sellerPhone}`}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Seller</span>
                </a>

                <button
                  type="button"
                  onClick={() => setInquiryModalOpen(true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] font-bold text-xs sm:text-sm shadow-md shadow-[#75C96B]/20 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message Seller</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Direct peer-to-peer inquiry. No upfront payments or checkout commission required.
              </p>
            </div>
          </div>

          {/* Seller Profile Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Merchant Information
            </h3>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80"
                  alt={product.sellerName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-slate-900 truncate">
                    {product.sellerName}
                  </h4>
                  <span title="Verified Merchant">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  </span>
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{product.sellerLocation}</span>
                </p>

                <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{product.sellerPhone}</span>
                </p>

                <div className="mt-3">
                  <Link
                    to={`/sellers/${product.sellerId}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View All Storefront Listings →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      {inquiryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Message Seller Regarding Product
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
                  {product.name} • {formatPrice(product.price)}
                </p>
              </div>
              <button
                onClick={() => setInquiryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            {inquirySuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">Inquiry Sent Successfully!</h4>
                <p className="text-xs text-slate-500">Redirecting to your message thread...</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="mt-4 space-y-4">
                {/* Suggested prompt chips */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Quick Inquiries:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Is this product still available?',
                      'Can you deliver this product to my location?',
                      'Is the price negotiable?',
                      'What warranty comes with this item?',
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMessageText(prompt)}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition ${
                          messageText === prompt
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Your Message
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Ask about availability, delivery scheduling, or item details..."
                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Explicit Location Sharing Option (PRD Section 7 & 13) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLocation}
                      onChange={(e) => setIncludeLocation(e.target.checked)}
                      className="mt-0.5 rounded-sm text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                        Attach my delivery location with this inquiry
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {buyerProfile?.deliveryAddress
                          ? `Location: ${buyerProfile.deliveryAddress}, ${buyerProfile.deliveryCity || 'Addis Ababa'}`
                          : 'You can set your default delivery address in your Buyer Profile or enter it directly.'}
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setInquiryModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Sending...' : 'Send Inquiry to Seller'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Report Listing Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Report Inappropriate Listing</h3>
            <p className="text-xs text-slate-500 mt-1">
              Help maintain platform trust. Reports are forwarded to central administration.
            </p>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-800">
                  Thank you. Your report has been submitted for administrative review.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Reason for report *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="e.g. Suspected counterfeit, misleading pricing, unavailable item..."
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
