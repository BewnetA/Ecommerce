import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  FileText,
  ArrowRight,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from './AuthContext';

export const RegisterSellerPage: React.FC = () => {
  const { registerSeller } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [location, setLocation] = useState('Addis Ababa, Bole');
  const [businessDescription, setBusinessDescription] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !phone.trim() || !storeName.trim() || !location.trim()) {
      setError('Owner name, phone number, store name, and location are required.');
      return;
    }

    setIsLoading(true);
    try {
      await registerSeller({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        storeName: storeName.trim(),
        location: location.trim(),
        businessDescription: businessDescription.trim(),
        password,
      });
      navigate('/seller/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Seller registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Store className="w-6 h-6" />
            </div>
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Apply as Seller / Merchant
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            List your products and connect directly with local customers
          </p>
        </div>

        {/* Notice of Admin Approval Requirement (from PRD Section 2 & 11) */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Platform Verification Policy:</strong> In accordance with marketplace quality rules, newly registered sellers begin in <em>Pending</em> status. An administrator must approve your application before product listings become visible.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Owner Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dawit Haile"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
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
                  placeholder="+251 91 234 5678"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Store / Business Name *
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. BlueNile Tech Hub"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="store@example.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Physical Store Location / City *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Addis Ababa, Kazanchis, Bloom Plaza"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Business Description & Products Sold
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <textarea
                rows={3}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Describe your merchandise, brand, and customer service approach..."
                className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Submitting Application...' : 'Submit Seller Application'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign in to Seller Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
