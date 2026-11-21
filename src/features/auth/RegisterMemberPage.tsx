import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Lock,
  Store,
  FileText,
  MapPin,
  ShieldCheck,
  BadgeCheck,
  AlertCircle,
  ArrowRight,
  Wrench,
  LocateFixed,
  Map as MapIcon,
} from 'lucide-react';
import logoImg from '../../assets/Adiss_Repairs.png';
import { PasswordVisibilityToggle } from '../../components/common/PasswordVisibilityToggle';
import { MapPointPicker } from '../../components/common/MapPointPicker';
import type { MapPoint } from '../../components/common/MapPointPicker';
import { useAuth } from './AuthContext';
import type { IndustryRole, VerificationIdType } from '../../types';
import {
  ADDIS_ABABA_AREAS,
  AREA_COORDINATES,
  ETHIOPIAN_CITIES,
  ID_TYPE_LABELS,
  coordinatesForArea,
  INDUSTRY_ROLE_LABELS,
  formatEthiopianPhone,
  isValidEthiopianMobile,
} from '../../utils/members';

const inputClass =
  'w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-[#75C96B] focus:outline-none transition';
const plainInputClass =
  'w-full px-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-[#75C96B] focus:outline-none transition';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5';

/**
 * One registration process for every member. Every new member completes a
 * one-time verification (connection to the mobile phone repair industry) and
 * starts in the `pending` state until the Addis Repair team approves them.
 */
export const RegisterMemberPage: React.FC = () => {
  const { registerMember } = useAuth();
  const navigate = useNavigate();

  // Personal & contact information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Repair-industry connection
  const [industryRole, setIndustryRole] = useState<IndustryRole | ''>('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industryDescription, setIndustryDescription] = useState('');

  // Verification details
  const [idType, setIdType] = useState<VerificationIdType>('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [referencePhone, setReferencePhone] = useState('');

  // Shop / work location (map coordinates are required)
  const [city, setCity] = useState('Addis Ababa');
  const [subCity, setSubCity] = useState('Bole');
  const [addressDescription, setAddressDescription] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [geoState, setGeoState] = useState<'idle' | 'requesting' | 'denied'>('idle');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationMissing, setLocationMissing] = useState(false);
  const closeMapPicker = useCallback(() => setShowMapPicker(false), []);

  const handleMapConfirm = (point: MapPoint) => {
    setCoordinates(point);
    setLocationMissing(false);
    setGeoState('idle');
    setShowMapPicker(false);
  };

  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // GPS is only requested when the member clicks the button; the map picker
  // is always available as an alternative.
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('denied');
      return;
    }
    setGeoState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationMissing(false);
        setGeoState('idle');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please enter your full name, email and phone number.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isValidEthiopianMobile(phone)) {
      setError('Please enter a valid Ethiopian mobile number (e.g. +251 91 234 5678).');
      return;
    }
    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!industryRole) {
      setError('Please select your role in the mobile phone repair industry.');
      return;
    }
    const years = Number(yearsOfExperience);
    if (yearsOfExperience.trim() === '' || isNaN(years) || years < 0 || years > 60) {
      setError('Please enter your years of experience (0–60).');
      return;
    }
    if (industryDescription.trim().length < 15) {
      setError('Please describe your work (at least 15 characters).');
      return;
    }
    if (idNumber.trim().length < 4) {
      setError('Please enter your ID number for verification.');
      return;
    }
    if (referencePhone.trim() && !isValidEthiopianMobile(referencePhone)) {
      setError('Please enter a valid Ethiopian phone number for your reference, or leave it empty.');
      return;
    }
    if (!coordinates) {
      setLocationMissing(true);
      setError('Please set your shop / work location on the map (or use your current location) before submitting.');
      return;
    }
    if (!confirmAccuracy) {
      setError('Please confirm that your details are accurate.');
      return;
    }

    setIsLoading(true);
    try {
      await registerMember({
        name: name.trim(),
        email: email.trim(),
        phone: formatEthiopianPhone(phone),
        password: password.trim(),
        businessName: businessName.trim() || undefined,
        businessDescription: industryDescription.trim(),
        city,
        subCity,
        addressDescription: addressDescription.trim() || undefined,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        verification: {
          industryRole,
          yearsOfExperience: years,
          workplaceName: businessName.trim() || undefined,
          industryDescription: industryDescription.trim(),
          idType,
          idNumber: idNumber.trim(),
          tradeLicenseNumber: tradeLicenseNumber.trim() || undefined,
          referenceName: referenceName.trim() || undefined,
          referencePhone: referencePhone.trim() ? formatEthiopianPhone(referencePhone) : undefined,
          submittedAt: new Date().toISOString(),
        },
      });
      navigate('/verification-status', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-[#292C31] border border-slate-700/80 flex items-center justify-center p-2 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
              <img src={logoImg} alt="Addis Repair logo" className="w-full h-full object-contain scale-140" />
            </div>
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Create Member Account</h2>
          <p className="mt-1 text-xs text-slate-500">
            One account to browse, contact members, post ads and offer repair services
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-lime-50 border border-lime-200 text-lime-900 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-lime-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>One-time verification:</strong> Addis Repair is for people in the mobile phone repair industry.
            New members start as <em>Pending</em> while our team confirms your details. Once approved you can post ads
            immediately — there is no separate seller registration.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* 1. Personal & contact information */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-slate-900 mb-2">1. Personal & Contact Information</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="reg-name">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dawit Haile" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-phone">Ethiopian Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251 91 234 5678" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-email">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-password">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className={inputClass.replace('pr-3', 'pr-10')}
                  />
                  <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                </div>
              </div>
            </div>
          </fieldset>

          {/* 2. Repair-industry connection */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-slate-900 mb-2">2. Repair-Industry Connection</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="reg-role">Your Role *</label>
                <div className="relative">
                  <Wrench className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <select id="reg-role" value={industryRole} onChange={(e) => setIndustryRole(e.target.value as IndustryRole)} className={inputClass}>
                    <option value="">Select your role</option>
                    {(Object.keys(INDUSTRY_ROLE_LABELS) as IndustryRole[]).map((r) => (
                      <option key={r} value={r}>
                        {INDUSTRY_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-years">Years of Experience *</label>
                <input id="reg-years" type="number" min={0} max={60} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} placeholder="e.g. 4" className={plainInputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="reg-business">Shop / Business / Workplace Name (Optional)</label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input id="reg-business" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Bole Mobile Repair Center" className={inputClass} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Shown on your ads. If empty, your own name is used.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="reg-description">Describe Your Work *</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <textarea id="reg-description" rows={3} value={industryDescription} onChange={(e) => setIndustryDescription(e.target.value)} placeholder="e.g. Screen, battery and motherboard repairs; I also sell spare parts..." className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-[#75C96B] focus:outline-none transition" />
              </div>
            </div>
          </fieldset>

          {/* 3. Verification details */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-slate-900 mb-1">3. Verification Details</legend>
            <p className="text-[11px] text-slate-500 -mt-2">
              Used once by the Addis Repair team to verify your account. Not shown to other members.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="reg-idtype">ID Document Type *</label>
                <div className="relative">
                  <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <select id="reg-idtype" value={idType} onChange={(e) => setIdType(e.target.value as VerificationIdType)} className={inputClass}>
                    {(Object.keys(ID_TYPE_LABELS) as VerificationIdType[]).map((t) => (
                      <option key={t} value={t}>
                        {ID_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-idnumber">ID Number *</label>
                <input id="reg-idnumber" type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="As printed on your document" className={plainInputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-license">Trade License Number (Optional)</label>
                <input id="reg-license" type="text" value={tradeLicenseNumber} onChange={(e) => setTradeLicenseNumber(e.target.value)} placeholder="If your shop is licensed" className={plainInputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-refname">Industry Reference (Optional)</label>
                <input id="reg-refname" type="text" value={referenceName} onChange={(e) => setReferenceName(e.target.value)} placeholder="A technician or shop who knows your work" className={plainInputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="reg-refphone">Reference Phone (Optional)</label>
                <input id="reg-refphone" type="tel" value={referencePhone} onChange={(e) => setReferencePhone(e.target.value)} placeholder="+251 9X XXX XXXX" className={plainInputClass} />
              </div>
            </div>
          </fieldset>

          {/* 4. Shop / work location */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-slate-900 mb-1">4. Shop / Work Location</legend>
            <p className="text-[11px] text-slate-500 -mt-2">
              Used as the default location of your ads so nearby members can find you.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="reg-city">City *</label>
                <select id="reg-city" value={city} onChange={(e) => setCity(e.target.value)} className={plainInputClass}>
                  {ETHIOPIAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="reg-area">Area / Neighborhood *</label>
                <select id="reg-area" value={subCity} onChange={(e) => setSubCity(e.target.value)} className={plainInputClass}>
                  {ADDIS_ABABA_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="reg-address">Address Description / Landmark (Optional)</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input id="reg-address" type="text" value={addressDescription} onChange={(e) => setAddressDescription(e.target.value)} placeholder="e.g. Near Edna Mall, Camera Building 2nd floor, Shop #12" className={inputClass} />
              </div>
            </div>
            <div
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3 ${
                coordinates
                  ? 'bg-lime-50/60 border-lime-300'
                  : locationMissing
                    ? 'bg-rose-50/60 border-rose-300'
                    : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex-1 text-xs text-slate-600">
                <span className="block font-bold text-slate-900 mb-0.5">Map Coordinates *</span>
                {coordinates ? (
                  <span className="text-lime-700 font-semibold">
                    Location set: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                  </span>
                ) : (
                  <span className={locationMissing ? 'text-rose-600' : undefined}>
                    Required — choose your shop / work location on the map or use your current location.
                  </span>
                )}
                {geoState === 'denied' && !coordinates && (
                  <span className="block text-rose-600 mt-1">Location access was not available — please choose your location on the map instead.</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#202226] bg-[#75C96B] rounded-lg hover:bg-[#65b85b]"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  {coordinates ? 'Adjust on Map' : 'Choose on Map'}
                </button>
                {coordinates ? (
                  <button type="button" onClick={() => setCoordinates(undefined)} className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50">
                    Clear
                  </button>
                ) : (
                  <button type="button" onClick={handleUseCurrentLocation} disabled={geoState === 'requesting'} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50">
                    <LocateFixed className="w-3.5 h-3.5" />
                    {geoState === 'requesting' ? 'Locating…' : 'Use My Current Location'}
                  </button>
                )}
              </div>
            </div>
            {showMapPicker && (
              <MapPointPicker
                initialPoint={coordinates || coordinatesForArea(subCity) || AREA_COORDINATES['Addis Ababa']}
                onCancel={closeMapPicker}
                onConfirm={handleMapConfirm}
              />
            )}
          </fieldset>

          <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={confirmAccuracy} onChange={(e) => setConfirmAccuracy(e.target.checked)} className="mt-0.5 accent-[#75C96B]" />
            <span>I confirm these details are accurate and agree to a one-time verification review by the Addis Repair team.</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Submitting…' : 'Submit for Verification'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-lime-700 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
