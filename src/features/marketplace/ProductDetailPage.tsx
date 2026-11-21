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
import { productApi, messagingApi } from '../../services/api';
import type { Product, LocationSnippet } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ReportListingModal } from '../reports/ReportListingModal';
import { CONDITION_LABELS, formatETB, isProductListing, isServiceListing } from '../../utils/members';
import { isApprovedMember } from '../../utils/permissions';

const COVERAGE_LABELS: Record<string, string> = {
  atLocation: 'At provider location',
  travelsToCustomer: 'Travels to customer',
  selectedAreas: 'Serves selected areas',
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, memberProfile } = useAuth();

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

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const item = await productApi.getProductById(id);
        if (!item) {
          setError('Listing not found or has been removed.');
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

  const formatPrice = (amount: number) =>
    formatETB(amount, { startingPrice: Boolean(product && isServiceListing(product.listingType) && product.isStartingPrice) });

  const savedLocationText = memberProfile?.currentAddress || memberProfile?.addressDescription || memberProfile?.location;

  /** Contacting members and reporting are approved-member features. */
  const requireApprovedMember = (redirectTo: string): boolean => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: redirectTo } } });
      return false;
    }
    if (!isApprovedMember(user)) {
      navigate('/verification-status');
      return false;
    }
    return true;
  };

  const openInquiry = () => {
    if (!product || !requireApprovedMember(`/products/${product.id}`)) return;
    setInquiryModalOpen(true);
  };

  const openReport = () => {
    if (!product || !requireApprovedMember(`/products/${product.id}`)) return;
    if (user && user.id === product.sellerId) {
      alert('This is your own ad. You can edit, hide or delete it from My Ads.');
      return;
    }
    setReportModalOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!requireApprovedMember(`/products/${product.id}`) || !user) return;

    if (user.id === product.sellerId) {
      alert('You cannot message yourself about your own ad.');
      return;
    }

    setIsSending(true);
    try {
      let locationSnippet: LocationSnippet | undefined = undefined;
      if (includeLocation && savedLocationText) {
        locationSnippet = {
          address: savedLocationText,
          city: memberProfile?.currentCity || memberProfile?.city || 'Addis Ababa',
          subcity: memberProfile?.currentSubcity || memberProfile?.subCity || '',
          notes: memberProfile?.currentNotes || '',
          coordinates: memberProfile?.currentCoordinates,
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
        navigate(`/account/messages/${res.conversation.id}`);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
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

  // Only active listings are public; owners and admins can still open theirs.
  const canView =
    product && (product.status === 'active' || user?.role === 'admin' || user?.id === product.sellerId);

  if (error || !product || !canView) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{error || 'Listing Not Available'}</h2>
        <p className="text-xs text-slate-500">
          This listing may have been hidden or removed.
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
          <span className="text-slate-800 font-semibold truncate max-w-[200px]">
            {product.name}
          </span>
        </div>

        <button
          onClick={openReport}
          className="text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
          title="Report this listing to the moderation team"
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
            <div className="absolute top-4 left-4 flex gap-2">
              {isServiceListing(product.listingType) ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-600 text-white shadow">SERVICE</span>
              ) : product.condition ? (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black text-white shadow ${
                    product.condition === 'new' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                >
                  {CONDITION_LABELS[product.condition].toUpperCase()}
                </span>
              ) : null}
              {product.status !== 'active' && <StatusBadge status={product.status} />}
            </div>
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
                  {product.listingType}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{product.viewsCount} views</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {product.listingType !== 'Posts' ? (
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-3xl font-black text-indigo-600">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isServiceListing(product.listingType) && product.isStartingPrice ? 'Starting price' : 'Direct price'}
                  </span>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-sm font-bold">
                    Community Post • Free Inquiry
                  </span>
                </div>
              )}
            </div>

            {/* Spec list */}
            <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 text-xs">
              {isProductListing(product.listingType) ? (
                <>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Condition</span>
                    <span className="font-semibold text-slate-800">
                      {product.condition ? CONDITION_LABELS[product.condition] : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Availability</span>
                    <span
                      className={`font-semibold ${
                        !product.isSoldOut && product.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {!product.isSoldOut && product.quantity > 0
                        ? `In Stock (${product.quantity} available)`
                        : 'Sold Out'}
                    </span>
                  </div>
                </>
              ) : isServiceListing(product.listingType) ? (
                <>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Listing Type</span>
                    <span className="font-semibold text-teal-700">Repair Service</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Service Coverage</span>
                    <span className="font-semibold text-slate-800">
                      {COVERAGE_LABELS[product.serviceCoverage || 'atLocation']}
                    </span>
                  </div>
                  {product.serviceCoverageNote && (
                    <div className="col-span-2 text-slate-600">{product.serviceCoverageNote}</div>
                  )}
                </>
              ) : (
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-0.5">Listing Type</span>
                  <span className="font-semibold text-slate-800">{product.listingType}</span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Location</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {product.locationSubCity}, {product.locationCity}
                  {product.addressDescription ? ` • ${product.addressDescription}` : ''}
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
                  <span>Call</span>
                </a>

                <button
                  type="button"
                  onClick={openInquiry}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] font-bold text-xs sm:text-sm shadow-md shadow-[#75C96B]/20 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Direct member-to-member contact. No upfront payments or checkout.
              </p>
              <button
                type="button"
                onClick={openReport}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
              >
                <Flag className="w-3.5 h-3.5" /> Report this listing
              </button>
            </div>
          </div>

          {/* Seller Profile Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Posted By
            </h3>

            <div className="flex items-start gap-4">
              <Link
                to={`/members/${product.sellerId}`}
                className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 hover:opacity-90 transition"
              >
                <img
                  src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80"
                  alt={product.sellerName}
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/members/${product.sellerId}`}
                    className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition truncate"
                  >
                    {product.sellerName}
                  </Link>
                  <span title="Verified Member">
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
                    to={`/members/${product.sellerId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>View Profile & All Posts</span>
                    <span>→</span>
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
                  Message About This Listing
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
                      'Is this still available?',
                      'Where can I see it / where is your shop?',
                      'Is the price negotiable?',
                      'What warranty comes with this?',
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
                        Attach my saved location with this inquiry
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {savedLocationText
                          ? `Location: ${savedLocationText}`
                          : 'You can save your location in your Profile.'}
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
                    <span>{isSending ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Report Listing Modal (creates a moderation record only) */}
      {reportModalOpen && user && (
        <ReportListingModal product={product} reporter={user} onClose={() => setReportModalOpen(false)} />
      )}
    </div>
  );
};
