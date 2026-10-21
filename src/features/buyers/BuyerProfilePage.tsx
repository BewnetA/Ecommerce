import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { userApi } from '../../services/api';
import { LocationManager } from '../location/LocationManager';
import type { LocationSnippet } from '../../types';

export const BuyerProfilePage: React.FC = () => {
  const { user, buyerProfile, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setEmail(user.email);
    }
    if (buyerProfile) {
      setBio(buyerProfile.bio || '');
    }
  }, [user, buyerProfile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');

    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required.');
      return;
    }

    setIsSaving(true);
    try {
      await userApi.updateBuyerProfile(user.id, {
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLocation = async (loc: LocationSnippet) => {
    if (!user) return;
    try {
      await userApi.updateBuyerProfile(user.id, {
        deliveryAddress: loc.address,
        deliveryCity: loc.city,
        deliverySubcity: loc.subcity,
        deliveryNotes: loc.notes,
        locationCoordinates: loc.coordinates,
      });
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Failed to save delivery location.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Buyer Profile & Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal details and saved delivery coordinates for fast checkout inquiries
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Personal Info Form */}
      <form onSubmit={handleProfileSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          Personal Account Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              disabled
              value={email}
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Email address serves as your unique login identifier.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            About You / Profile Information
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell sellers a bit about yourself or preferences..."
              className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Personal Details'}
          </button>
        </div>
      </form>

      {/* Geolocation & Delivery Location Manager */}
      <LocationManager
        initialAddress={buyerProfile?.deliveryAddress}
        initialCity={buyerProfile?.deliveryCity || 'Addis Ababa'}
        initialSubcity={buyerProfile?.deliverySubcity}
        initialNotes={buyerProfile?.deliveryNotes}
        initialCoordinates={buyerProfile?.locationCoordinates}
        onSaveLocation={handleSaveLocation}
      />
    </div>
  );
};
