import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from './AuthContext';

export const LoginPage: React.FC = () => {
  const { login, demoUsers, switchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const loggedUser = await login({ email: email.trim(), password });
      if (from !== '/') {
        navigate(from, { replace: true });
      } else if (loggedUser.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (loggedUser.role === 'seller') {
        navigate('/seller/dashboard', { replace: true });
      } else {
        navigate('/buyer/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (userId: string, role: string) => {
    setError('');
    setIsLoading(true);
    try {
      await switchUser(userId);
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'seller') {
        navigate('/seller/dashboard', { replace: true });
      } else {
        navigate('/buyer/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </Link>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Welcome to AgoraHub
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Sign in to access your role-specific dashboard or explore as guest
          </p>
        </div>

        {/* Quick Demo Logins Section */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>1-Click Demo Accounts</span>
            <span className="text-[10px] text-indigo-600 font-semibold lowercase">Instant Evaluation</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoUsers.map((d) => (
              <button
                key={d.user.id}
                type="button"
                onClick={() => handleQuickLogin(d.user.id, d.user.role)}
                className="text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-xs transition text-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="font-semibold text-slate-900 truncate">
                    {d.user.name.split(' ')[0]}
                  </span>
                  {d.sellerStatus ? (
                    <span
                      className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                        d.sellerStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.sellerStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {d.sellerStatus}
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-bold text-slate-500">
                      {d.user.role}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 truncate mt-1">
                  {d.user.email}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Manual Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
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
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Need an account?{' '}
            <Link to="/register/buyer" className="text-indigo-600 font-semibold hover:underline">
              Register as Buyer
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            Want to sell products?{' '}
            <Link to="/register/seller" className="text-indigo-600 font-semibold hover:underline">
              Apply as Seller
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
