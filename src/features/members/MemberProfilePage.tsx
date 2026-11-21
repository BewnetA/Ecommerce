import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Package, PackagePlus, ShieldCheck, Store, User, AlertTriangle, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { memberApi, productApi } from '../../services/api';
import type { LocationSnippet, Product, ServiceCoverage } from '../../types';
import { LocationManager } from '../location/LocationManager';
import {
  ADDIS_ABABA_AREAS,
  ETHIOPIAN_CITIES,
  INDUSTRY_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  formatEthiopianPhone,
  isValidEthiopianMobile,
} from '../../utils/members';

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-[#75C96B] focus:outline-none transition';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5';

/**
 * The single member profile: member information, verification status,
 * My Ads, business / shop location and account settings.
 */
export const MemberProfilePage: React.FC = () => {
  const { user, memberProfile, refreshUser } = useAuth();

  // Member information
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  // Business / shop details (shown on ads)
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [subCity, setSubCity] = useState('Bole');
  const [addressDescription, setAddressDescription] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [serviceCoverage, setServiceCoverage] = useState<ServiceCoverage>('atLocation');
  const [geoState, setGeoState] = useState<'idle' | 'requesting' | 'denied'>('idle');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [ads, setAds] = useState<Product[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone);
  }, [user]);

  useEffect(() => {
    if (!memberProfile) return;
    setBio(memberProfile.bio || '');
    setBusinessName(memberProfile.businessName || '');
    setBusinessDescription(memberProfile.businessDescription || '');
    setCity(memberProfile.city || 'Addis Ababa');
    setSubCity(memberProfile.subCity || 'Bole');
    setAddressDescription(memberProfile.addressDescription || '');
    setCoordinates(
      typeof memberProfile.latitude === 'number' && typeof memberProfile.longitude === 'number'
        ? { latitude: memberProfile.latitude, longitude: memberProfile.longitude }
        : undefined
    );
    setServiceCoverage(memberProfile.serviceCoverage || 'atLocation');
  }, [memberProfile]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setAdsLoading(true);
    productApi
      .getMemberProducts(user.id)
      .then((items) => {
        if (!cancelled) setAds(items);
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      })
      .finally(() => {
        if (!cancelled) setAdsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    if (!isValidEthiopianMobile(phone)) return setError('Please enter a valid Ethiopian phone number.');

    setIsSaving(true);
    try {
      await memberApi.updateMemberProfile(user.id, {
        name: name.trim(),
        phone: formatEthiopianPhone(phone),
        bio: bio.trim(),
        businessName: businessName.trim() || name.trim(),
        businessDescription: businessDescription.trim(),
        city,
        subCity,
        addressDescription: addressDescription.trim(),
        latitude: coordinates ? coordinates.latitude : null,
        longitude: coordinates ? coordinates.longitude : null,
        serviceCoverage,
      });
      await refreshUser();
      toast.success('Profile saved.');
    } catch (err: any) {
      setError(err.message || 'Failed to save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCurrentLocation = async (loc: LocationSnippet) => {
    if (!user) return;
    try {
      await memberApi.updateMemberProfile(user.id, {
        currentAddress: loc.address,
        currentCity: loc.city,
        currentSubcity: loc.subcity,
        currentNotes: loc.notes,
        currentCoordinates: loc.coordinates,
      });
      await refreshUser();
      toast.success('Current location saved.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save your location.');
    }
  };

  if (!user) return null;

  const activeCount = ads.filter((a) => a.status === 'active').length;
  const hiddenCount = ads.filter((a) => a.status === 'hidden').length;
  const moderatedCount = ads.filter((a) => a.status === 'suspended' || a.status === 'removed').length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Verification status */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-lime-600" /> Verification
          </h2>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-800 bg-lime-50 px-2.5 py-1 rounded-full border border-lime-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {user.role === 'admin' ? 'Administrator' : MEMBER_STATUS_LABELS[user.status]}
          </span>
        </div>
        <p className="text-xs text-slate-600">
          Your account was verified once at registration. You never need to register again to post ads.
        </p>
        {user.verification && (
          <p className="text-xs text-slate-500">
            {INDUSTRY_ROLE_LABELS[user.verification.industryRole] || user.verification.industryRole} •{' '}
            {user.verification.yearsOfExperience} year(s) of experience
          </p>
        )}
      </section>

      {/* My Ads (part of the profile, not a separate seller dashboard) */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-lime-600" /> My Ads
          </h2>
          <div className="flex gap-2">
            <Link to="/account/ads" className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl">
              Manage My Ads
            </Link>
            <Link
              to="/account/ads/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#202226] bg-[#75C96B] hover:bg-[#65b85b] rounded-xl"
            >
              <PackagePlus className="w-3.5 h-3.5" /> Post Ad
            </Link>
          </div>
        </div>
        {adsLoading ? (
          <p className="text-xs text-slate-400">Loading your ads…</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active', value: activeCount, cls: 'text-lime-700' },
              { label: 'Hidden', value: hiddenCount, cls: 'text-slate-700' },
              { label: 'Moderated', value: moderatedCount, cls: 'text-rose-600' },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <p className={`text-xl font-black ${s.cls}`}>{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-500">Ads you publish go live in the marketplace immediately.</p>
      </section>

      {/* Member information + business / shop location */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6" noValidate>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-lime-600" /> Member Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="pf-name">Full Name *</label>
              <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-phone">Phone *</label>
              <input id="pf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Email</label>
              <input type="email" value={user.email} disabled className={`${inputClass} opacity-70 cursor-not-allowed`} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="pf-bio">About Me</label>
              <textarea id="pf-bio" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 pt-4">
            <Store className="w-5 h-5 text-lime-600" /> Shop / Work Details
          </h2>
          <p className="text-xs text-slate-500 -mt-2">Shown on your ads. The location is the default location for new ads.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="pf-business">Business / Display Name</label>
              <input id="pf-business" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-coverage">Service Coverage</label>
              <select id="pf-coverage" value={serviceCoverage} onChange={(e) => setServiceCoverage(e.target.value as ServiceCoverage)} className={inputClass}>
                <option value="atLocation">At my shop / workshop</option>
                <option value="travelsToCustomer">I travel to customers</option>
                <option value="selectedAreas">Selected areas</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="pf-desc">Description</label>
              <textarea id="pf-desc" rows={3} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-city">City *</label>
              <select id="pf-city" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
                {ETHIOPIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {!ETHIOPIAN_CITIES.includes(city) && <option value={city}>{city}</option>}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pf-area">Area / Neighborhood *</label>
              <select id="pf-area" value={subCity} onChange={(e) => setSubCity(e.target.value)} className={inputClass}>
                {ADDIS_ABABA_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
                {!ADDIS_ABABA_AREAS.includes(subCity) && <option value={subCity}>{subCity}</option>}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="pf-address">Address Description / Landmark</label>
              <input id="pf-address" type="text" value={addressDescription} onChange={(e) => setAddressDescription(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="flex-1 text-slate-600">
              {coordinates
                ? `Map pin: ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
                : 'No map pin (optional). Members find you by city and area.'}
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

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] font-bold text-sm rounded-xl transition disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Optional current location for nearby discovery and sharing in chats */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Current Location (Optional)</h2>
          <p className="text-xs text-slate-500">
            Used for nearby results and to share your location in a conversation when you choose to.
          </p>
        </div>
        <LocationManager
          initialAddress={memberProfile?.currentAddress}
          initialCity={memberProfile?.currentCity || 'Addis Ababa'}
          initialSubcity={memberProfile?.currentSubcity}
          initialNotes={memberProfile?.currentNotes}
          initialCoordinates={memberProfile?.currentCoordinates}
          onSaveLocation={handleSaveCurrentLocation}
        />
      </section>
    </div>
  );
};
