import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import type { Product, ProductCondition } from '../../types';

export const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [product, setProduct] = useState<Product | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState<ProductCondition>('new');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [cats, item] = await Promise.all([
          categoryApi.getCategories(),
          productApi.getProductById(id),
        ]);

        setCategories(cats);

        if (!item) {
          setError('Product not found.');
          return;
        }

        if (item.sellerId !== user.id && user.role !== 'admin') {
          setError('Unauthorized: You can only edit your own products.');
          return;
        }

        setProduct(item);
        setName(item.name);
        setDescription(item.description);
        setPrice(String(item.price));
        setCategoryId(item.categoryId);
        setCondition(item.condition);
        setQuantity(String(item.quantity));
        setLocation(item.sellerLocation);
        setContactPhone(item.sellerPhone);
        setImageUrls(item.images);
      } catch (err: any) {
        setError(err.message || 'Error loading product.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user]);

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
    if (!id || !user) return;
    setError('');

    if (!name.trim() || !price || Number(price) <= 0 || !categoryId) {
      setError('Please provide a valid product title, positive price, and category.');
      return;
    }

    if (imageUrls.length === 0) {
      setError('At least one product image is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await productApi.updateProduct(id, user.id, {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId,
        condition,
        quantity: Number(quantity) || 1,
        images: imageUrls,
        sellerLocation: location.trim(),
        sellerPhone: contactPhone.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/seller/products');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-xs text-slate-500">
        Loading product information...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{error || 'Product Not Found'}</h2>
        <Link
          to="/seller/products"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Edit Product Listing</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify specifications, pricing, stock levels, or images
          </p>
        </div>
        <Link
          to="/seller/products"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to List
        </Link>
      </div>

      {/* Moderation Re-approval Policy Banner */}
      {product.status === 'approved' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Re-moderation Policy:</strong> Modifying an approved product temporarily returns it to <em>Pending</em> status until an administrator reviews and verifies the changes.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Product Changes Saved!</h3>
          <p className="text-xs text-slate-500">Redirecting to My Products...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
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
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Location *
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Product Images
            </label>
            <div className="flex flex-wrap gap-3 mb-3">
              {imageUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-md p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste new image URL..."
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
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
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving changes...' : 'Save & Submit Updates'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
