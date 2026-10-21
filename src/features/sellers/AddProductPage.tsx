import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { productApi, categoryApi } from '../../services/api';
import type { CategoryWithCount } from '../../services/api';
import type { ProductCondition } from '../../types';

export const AddProductPage: React.FC = () => {
  const { user, sellerProfile } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState<ProductCondition>('new');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
  ]);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    categoryApi.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });

    if (sellerProfile) {
      setLocation(sellerProfile.location || 'Addis Ababa');
      setContactPhone(sellerProfile.phone || user?.phone || '');
    }
  }, [sellerProfile, user]);

  const isApprovedSeller = sellerProfile?.status === 'approved';

  const handleAddImage = () => {
    if (customImageUrl.trim()) {
      setImageUrls([...imageUrls, customImageUrl.trim()]);
      setCustomImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    if (!name.trim() || !price || Number(price) <= 0 || !categoryId) {
      setError('Please provide a valid product title, positive price, and category.');
      return;
    }

    if (imageUrls.length === 0) {
      setError('At least one product image is required.');
      return;
    }

    setIsLoading(true);
    try {
      await productApi.createProduct(user.id, {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId,
        condition,
        quantity: Number(quantity) || 1,
        images: imageUrls,
        location: location.trim(),
        contactPhone: contactPhone.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/seller/products');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit product.');
    } finally {
      setIsLoading(false);
    }
  };

  // If seller is not approved (Rule enforcement: PRD Sec 2 & 11)
  if (!isApprovedSeller) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Seller Approval Required</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your seller account status is currently <strong>{sellerProfile?.status || 'pending'}</strong>.
          Under platform safety rules, only verified and approved merchants may submit products for public listing.
        </p>
        <div className="pt-2">
          <Link
            to="/seller/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Add New Product for Approval</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submitted products enter the administrator review queue before appearing publicly
          </p>
        </div>
        <Link
          to="/seller/products"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Cancel
        </Link>
      </div>

      {/* Moderation Policy Callout */}
      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex items-center gap-2">
        <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>Review Notice:</strong> Products are initially saved in <em>Pending</em> status and will be published once an administrator verifies catalog quality.
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Product Submitted for Moderation!</h3>
          <p className="text-xs text-slate-500">
            Your listing has been submitted to the administrator queue. Redirecting to My Products...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sony WH-1000XM5 Wireless Noise Cancelling Headphones"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="new">Brand New (Sealed)</option>
                <option value="like_new">Like New (Mint)</option>
                <option value="good">Good Condition</option>
                <option value="fair">Fair / Functional</option>
              </select>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Price (USD $) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 380"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Available Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 10"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Location & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Seller Pickup Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Addis Ababa, Kazanchis"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Direct Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+251 91 234 5678"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Product Description & Details *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State key features, packaging, warranty, accessories included..."
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Images Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Product Images (Preview & URLs)
            </label>

            {/* Current thumbnails */}
            <div className="flex flex-wrap gap-3 mb-3">
              {imageUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-md p-1 opacity-90 hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Image input */}
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste image URL (e.g. Unsplash URL)..."
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Add Image
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/seller/products"
              className="px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Product for Review'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
