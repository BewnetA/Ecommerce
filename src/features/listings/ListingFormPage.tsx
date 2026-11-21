import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, LocateFixed, MapPin, Trash2, UploadCloud } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { productApi } from '../../services/api';
import type { CreateProductInput } from '../../services/api';
import { getSupabase } from '../../services/supabaseClient';
import type { ListingType, ProductCondition, ServiceCoverage } from '../../types';
import {
  ADDIS_ABABA_AREAS,
  ETHIOPIAN_CITIES,
  LISTING_TYPES,
  defaultConditionFor,
  formatEthiopianPhone,
  isModeratedStatus,
  isProductListing,
  isServiceListing,
  isValidEthiopianMobile,
} from '../../utils/members';

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-[#75C96B] focus:outline-none transition';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5';

const TYPE_HINTS: Record<ListingType, string> = {
  'New spares': 'Product / spare part for sale',
  'Used spares': 'Used spare part',
  'Repair tools': 'Repair tools & equipment',
  Services: 'Repair service',
  Posts: 'Community post (parts wanted, questions)',
};

const COVERAGE_OPTIONS: { value: ServiceCoverage; label: string }[] = [
  { value: 'atLocation', label: 'At my shop / workshop' },
  { value: 'travelsToCustomer', label: 'I travel to the customer' },
  { value: 'selectedAreas', label: 'Selected areas / neighborhoods' },
];

/**
 * The single Post Ad flow used by every approved member (and for editing).
 * New ads are published immediately — there is no admin approval step.
 */
export const ListingFormPage: React.FC = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user, memberProfile } = useAuth();
  const navigate = useNavigate();

  const [listingType, setListingType] = useState<ListingType>('New spares');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isStartingPrice, setIsStartingPrice] = useState(true);
  const [condition, setCondition] = useState<ProductCondition | undefined>('new');
  const [quantity, setQuantity] = useState('1');
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [serviceCoverage, setServiceCoverage] = useState<ServiceCoverage>('atLocation');
  const [serviceCoverageNote, setServiceCoverageNote] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [subCity, setSubCity] = useState('Bole');
  const [addressDescription, setAddressDescription] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [geoState, setGeoState] = useState<'idle' | 'requesting' | 'denied'>('idle');
  const [contactPhone, setContactPhone] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(isEditing);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isProduct = isProductListing(listingType);
  const isService = isServiceListing(listingType);
  const isPost = listingType === 'Posts';

  // New ad: defaults come from the member's shop / work location.
  useEffect(() => {
    if (isEditing || !memberProfile) return;
    setCity(memberProfile.city || 'Addis Ababa');
    setSubCity(memberProfile.subCity || 'Bole');
    setAddressDescription(memberProfile.addressDescription || '');
    if (typeof memberProfile.latitude === 'number' && typeof memberProfile.longitude === 'number') {
      setCoordinates({ latitude: memberProfile.latitude, longitude: memberProfile.longitude });
    }
    setContactPhone(memberProfile.phone || user?.phone || '');
  }, [isEditing, memberProfile, user]);

  useEffect(() => {
    if (!isEditing && !memberProfile && user) setContactPhone(user.phone);
  }, [isEditing, memberProfile, user]);

  // Editing: load the existing ad (owners only).
  useEffect(() => {
    if (!isEditing || !id || !user) return;
    let cancelled = false;
    setIsLoadingListing(true);
    productApi
      .getOwnedListing(id, user)
      .then((p) => {
        if (cancelled) return;
        if (isModeratedStatus(p.status)) {
          setLoadError(`This ad was ${p.status} by the moderation team and cannot be edited.`);
          return;
        }
        setListingType(p.listingType);
        setName(p.name);
        setDescription(p.description);
        setPrice(String(p.price));
        setIsStartingPrice(Boolean(p.isStartingPrice));
        setCondition(p.condition ?? defaultConditionFor(p.listingType));
        setQuantity(String(p.quantity));
        setIsSoldOut(Boolean(p.isSoldOut));
        setServiceCoverage(p.serviceCoverage || 'atLocation');
        setServiceCoverageNote(p.serviceCoverageNote || '');
        setCity(p.locationCity);
        setSubCity(p.locationSubCity);
        setAddressDescription(p.addressDescription || '');
        setCoordinates(
          typeof p.latitude === 'number' && typeof p.longitude === 'number'
            ? { latitude: p.latitude, longitude: p.longitude }
            : undefined
        );
        setContactPhone(p.sellerPhone);
        setImageUrls(p.images);
      })
      .catch((err: any) => {
        if (!cancelled) setLoadError(err.message || 'Could not load this ad.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingListing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditing, id, user]);

  const handleTypeChange = (type: ListingType) => {
    setListingType(type);
    if (isProductListing(type)) {
      // Pre-select the condition the type suggests; the member can change it.
      setCondition(defaultConditionFor(type) ?? condition);
    } else {
      setCondition(undefined); // services and posts never have a condition
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('denied');
      return;
    }
    setGeoState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeoState('idle');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
            const { data: pubData } = supabase.storage.from('listing-images').getPublicUrl(fileName);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    setError('');

    if (!name.trim()) return setError('Please enter a title.');
    if (isProduct && !condition) return setError('Please choose the condition: New or Used.');
    if (!isPost && (price.trim() === '' || isNaN(Number(price)) || Number(price) < 0)) {
      return setError('Please enter a valid price in ETB.');
    }
    if (isProduct && (quantity.trim() === '' || isNaN(Number(quantity)) || Number(quantity) < 0)) {
      return setError('Please enter a valid quantity.');
    }
    if (description.trim().length < 15) return setError('Please enter a detailed description (at least 15 characters).');
    if (!isValidEthiopianMobile(contactPhone)) {
      return setError('Please enter a valid Ethiopian contact phone (e.g. +251 91 234 5678).');
    }
    // Images are required for physical products and posts, optional for services.
    if (!isService && imageUrls.length === 0) return setError('Please upload at least one image.');

    const input: CreateProductInput = {
      name: name.trim(),
      description: description.trim(),
      price: isPost ? 0 : Number(price),
      listingType,
      condition: isProduct ? condition : undefined,
      quantity: isProduct ? Number(quantity) : 1,
      isSoldOut: isProduct ? isSoldOut : false,
      images: imageUrls,
      contactPhone: formatEthiopianPhone(contactPhone),
      locationCity: city,
      locationSubCity: subCity,
      addressDescription: addressDescription.trim() || undefined,
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      isStartingPrice: isService ? isStartingPrice : false,
      serviceCoverage: isService ? serviceCoverage : undefined,
      serviceCoverageNote: isService ? serviceCoverageNote.trim() || undefined : undefined,
    };

    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await productApi.updateListing(id, user, input);
      } else {
        await productApi.createListing(user, input);
      }
      setSuccess(true);
      setTimeout(() => navigate('/account/ads'), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save your ad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingListing) {
    return <div className="max-w-3xl mx-auto p-12 text-center text-xs text-slate-400">Loading ad...</div>;
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center space-y-4 bg-white rounded-3xl border border-slate-200">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="text-sm text-slate-700">{loadError}</p>
        <Link to="/account/ads" className="text-xs font-semibold text-lime-700 hover:underline">
          Back to My Ads
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
        <CheckCircle2 className="w-12 h-12 text-lime-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Ad updated' : 'Ad published'}</h2>
        <p className="text-xs text-slate-500">
          {isEditing ? 'Your changes are saved.' : 'Your ad is now live in the marketplace.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/account/ads" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50" aria-label="Back to My Ads">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Ad' : 'Post Ad'}</h2>
          <p className="text-xs text-slate-500">
            {isEditing ? 'Update your ad details.' : 'Your ad goes live as soon as you publish it.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs" noValidate>
        {/* Listing type */}
        <div>
          <span className={labelClass}>Listing Type *</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LISTING_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={isEditing}
                onClick={() => handleTypeChange(t)}
                className={`text-left p-3 rounded-xl border text-xs transition disabled:cursor-not-allowed ${
                  listingType === t
                    ? 'border-[#75C96B] bg-lime-50 text-slate-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                } ${isEditing && listingType !== t ? 'opacity-40' : ''}`}
              >
                <span className="block">{t}</span>
                <span className="block text-[10px] font-normal text-slate-500 mt-0.5">{TYPE_HINTS[t]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="ad-title">{isService ? 'Service Title *' : isPost ? 'Post Title *' : 'Product Name *'}</label>
            <input
              id="ad-title"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isService ? 'e.g. iPhone screen & battery replacement' : 'e.g. Original Samsung A54 OLED display'}
              className={inputClass}
            />
          </div>

          {!isPost && (
            <div>
              <label className={labelClass} htmlFor="ad-price">
                {isService ? (isStartingPrice ? 'Starting Price (ETB) *' : 'Service Fee (ETB) *') : 'Price (ETB) *'}
              </label>
              <input id="ad-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 5000" className={inputClass} />
              {isService && (
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={isStartingPrice} onChange={(e) => setIsStartingPrice(e.target.checked)} className="accent-[#75C96B]" />
                  Price is a starting rate (shown as "From ETB …")
                </label>
              )}
            </div>
          )}
        </div>

        {/* Physical products only: condition, quantity, availability */}
        {isProduct && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className={labelClass}>Condition *</span>
              <div className="flex gap-2">
                {(['new', 'used'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      condition === c ? 'bg-[#75C96B] border-[#75C96B] text-[#202226]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {c === 'new' ? 'New' : 'Used'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="ad-qty">Quantity *</label>
              <input id="ad-qty" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <span className={labelClass}>Availability</span>
              <label className="flex items-center gap-2 text-xs text-slate-700 mt-2">
                <input type="checkbox" checked={!isSoldOut} onChange={(e) => setIsSoldOut(!e.target.checked)} className="accent-[#75C96B]" />
                Currently available
              </label>
            </div>
          </div>
        )}

        {/* Services only: coverage */}
        {isService && (
          <div className="space-y-3 p-4 rounded-2xl bg-teal-50/60 border border-teal-200">
            <span className={labelClass}>Service Coverage *</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {COVERAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setServiceCoverage(opt.value)}
                  className={`p-2.5 rounded-xl text-xs border transition ${
                    serviceCoverage === opt.value ? 'bg-white border-teal-500 text-teal-800 font-bold' : 'bg-white/60 border-slate-200 text-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={serviceCoverageNote}
              onChange={(e) => setServiceCoverageNote(e.target.value)}
              placeholder="Coverage details (optional), e.g. On-site visits within 15 km of Bole"
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="ad-description">Description *</label>
          <textarea
            id="ad-description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isService ? 'Describe the service, turnaround time, warranty on repairs...' : 'Describe model compatibility, quality, warranty...'}
            className={inputClass}
          />
        </div>

        {/* Images */}
        <div>
          <span className={labelClass}>{isService ? 'Photos (Optional)' : 'Photos *'}</span>
          <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#75C96B] bg-slate-50 cursor-pointer transition">
            <UploadCloud className="w-7 h-7 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{isUploading ? 'Uploading…' : 'Click to upload images'}</span>
            <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" disabled={isUploading} />
          </label>
          {imageUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {imageUrls.map((url, index) => (
                <div key={`${url.slice(0, 40)}-${index}`} className="relative group">
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-xl border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <span className={labelClass}>
            <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            {isService ? 'Provider Location *' : 'Item Location *'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} aria-label="City">
              {ETHIOPIAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {!ETHIOPIAN_CITIES.includes(city) && <option value={city}>{city}</option>}
            </select>
            <select value={subCity} onChange={(e) => setSubCity(e.target.value)} className={inputClass} aria-label="Area / neighborhood">
              {ADDIS_ABABA_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              {!ADDIS_ABABA_AREAS.includes(subCity) && <option value={subCity}>{subCity}</option>}
            </select>
          </div>
          <input
            type="text"
            value={addressDescription}
            onChange={(e) => setAddressDescription(e.target.value)}
            placeholder="Address description / landmark (optional)"
            className={inputClass}
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <span className="flex-1 text-slate-600">
              {coordinates
                ? `Map pin: ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
                : 'No map pin — members find this ad by city and area. (Optional)'}
              {geoState === 'denied' && <span className="block text-rose-600">Location access was not available.</span>}
            </span>
            {coordinates ? (
              <button type="button" onClick={() => setCoordinates(undefined)} className="px-3 py-1.5 font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg">
                Clear pin
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geoState === 'requesting'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg disabled:opacity-50"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                {geoState === 'requesting' ? 'Locating…' : 'Use current location'}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="ad-phone">Contact Phone *</label>
          <input id="ad-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+251 91 234 5678" className={inputClass} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="w-full py-3 px-4 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Publish Ad'}
        </button>
      </form>
    </div>
  );
};
