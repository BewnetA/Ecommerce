import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { productApi } from '../../services/api';
import { getSupabase } from '../../services/supabaseClient';
import type { ListingType } from '../../types';

export const AddProductPage: React.FC = () => {
  const { user, sellerProfile } = useAuth();
  const navigate = useNavigate();

  const [listingType, setListingType] = useState<ListingType>('New spares');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (sellerProfile) {
      setLocation(sellerProfile.location || 'Addis Ababa');
      setContactPhone(sellerProfile.phone || user?.phone || '');
    }
  }, [sellerProfile, user]);

  const isApprovedSeller = user?.role === 'admin' || sellerProfile?.status === 'approved';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError('');
    const supabase = getSupabase();
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

      if (supabase) {
        try {
          const { error: uploadErr } = await supabase.storage
            .from('listing-images')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });

          if (!uploadErr) {
            const { data: pubData } = supabase.storage
              .from('listing-images')
              .getPublicUrl(fileName);
            if (pubData?.publicUrl) {
              newUrls.push(pubData.publicUrl);
              continue;
            }
          }
        } catch (err) {
          console.warn('Storage upload error, using data URL fallback:', err);
        }
      }

      // Fallback: read file as base64 Data URL so it is fully self-contained
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newUrls.push(dataUrl);
    }

    setImageUrls((prev) => [...prev, ...newUrls]);
    setIsUploading(false);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    if (!name.trim()) {
      setError('Please provide a listing title.');
      return;
    }

    if (listingType !== 'Posts' && (!price || Number(price) <= 0)) {
      setError('Please provide a valid positive price.');
      return;
    }

    if (imageUrls.length === 0) {
      setError('Please upload at least one image from your files.');
      return;
    }

    setIsLoading(true);
    try {
      await productApi.createProduct(user.id, {
        name: name.trim(),
        description: description.trim(),
        price: listingType === 'Posts' ? 0 : Number(price),
        categoryId: 'cat-1',
        listingType,
        condition: listingType === 'Used spares' ? 'fair' : 'new',
        quantity: listingType === 'Posts' ? 1 : (Number(quantity) || 1),
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/seller/products"
          className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Create New Listing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Post new spares, used spares, repair tools, services, or technical posts to the marketplace.
          </p>
        </div>
      </div>

      {!isApprovedSeller && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p>
            <strong>Seller Approval Pending:</strong> You can draft and submit listings now, but they will be reviewed by admin moderation before being displayed publicly on the marketplace.
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
          <h3 className="text-lg font-bold text-slate-900">Listing Submitted Successfully!</h3>
          <p className="text-xs text-slate-500">
            Your listing has been submitted for review. Redirecting to My Products...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          {/* Listing Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Listing Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(['New spares', 'Used spares', 'Repair tools', 'Services', 'Posts'] as ListingType[]).map((type) => {
                const isSelected = listingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setListingType(type)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition text-center ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {listingType === 'Posts'
                ? 'Community discussions, questions, or part requests (free to publish without a price).'
                : listingType === 'Services'
                ? 'Repair, diagnostic, and technical service offerings.'
                : 'Physical components and tools with stock and location.'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {listingType === 'Posts' ? 'Post Title *' : 'Listing Title *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                listingType === 'Posts'
                  ? 'e.g. Looking for iPhone 13 Pro AMOLED screen or diagnostic help'
                  : 'e.g. Original Samsung OLED Screen Assembly'
              }
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Pricing & Stock - Not asked for Posts */}
          {listingType === 'Posts' ? (
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Community Post:</strong> No price is required for this post. Buyers and technicians can reach out directly via messaging or phone.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {listingType === 'Services' ? 'Service Fee (ETB) *' : 'Price (ETB) *'}
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 500"
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
          )}

          {/* Location & Contact Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Store Location: {sellerProfile?.location || location || 'Addis Ababa'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Auto-linked from store profile.{' '}
                  <Link to="/seller/profile" className="text-indigo-600 hover:underline">
                    Edit in profile
                  </Link>
                </div>
              </div>
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
              Description & Details *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State key features, packaging, warranty, symptoms, or diagnostic details..."
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Images Section - Upload from Files */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Listing Images (Upload from Files) *
            </label>

            {/* Current thumbnails */}
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {imageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-xs group"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg p-1 shadow-sm transition"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* File Upload Box */}
            <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <UploadCloud className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="text-xs font-bold text-slate-700">
                {isUploading ? 'Uploading file(s)...' : 'Choose images from your files'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Select PNG, JPG, or WEBP photos from your device
              </span>
            </label>
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
              disabled={isLoading || isUploading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Listing for Review'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
