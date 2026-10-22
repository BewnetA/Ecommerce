import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import logoImg from '../../assets/ec-logo.png';

export const LoginPage: React.FC = () => {
  const { login, demoUsers, switchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Find admin demo account
  const adminDemo = demoUsers.find((d) => d.user.role === 'admin') || {
    user: {
      id: 'user-admin',
      name: 'Platform Administrator',
      email: 'admin@marketplace.com',
      role: 'admin' as const,
      status: 'active' as const,
      phone: '+251900000000',
      createdAt: '2026-01-01T00:00:00Z',
    },
    label: 'Platform Administrator',
    description: 'Full governance, moderation & administration privileges',
  };

  const handleAdminQuickLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await switchUser(adminDemo.user.id);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Admin sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

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
      if (loggedUser.role === 'admin' || from.startsWith('/admin')) {
        navigate('/admin', { replace: true });
      } else if (loggedUser.role === 'seller' && loggedUser.status !== 'rejected') {
        navigate('/seller/dashboard', { replace: true });
      } else {
        navigate('/admin', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-lime-400 selection:text-black">
      <div className="max-w-md w-full space-y-7 bg-[#15181f] p-8 sm:p-10 rounded-3xl border border-[#262f3f] shadow-2xl relative overflow-hidden">
        {/* Subtle Lime Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center relative z-10">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-16 h-16 rounded-2xl bg-[#1b202a] border border-lime-500/40 flex items-center justify-center p-2 shadow-lg shadow-lime-500/10 overflow-hidden">
              <img
                src={logoImg}
                alt="Addis Repair logo"
                className="w-full h-full object-contain scale-140"
              />
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Addis Repair Portal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to access the Central Administrator Governance Console
          </p>
        </div>

        {/* Top Prominent Admin Account Button (Requested: at the top ONLY make admin page account) */}
        <div className="relative z-10">
          <div className="p-1 rounded-2xl bg-gradient-to-r from-lime-400 via-lime-500 to-emerald-400 shadow-lg shadow-lime-500/20">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleAdminQuickLogin}
              className="w-full bg-[#111318] hover:bg-[#161a22] p-4 rounded-xl text-left transition-all flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-lime-400/15 border border-lime-400/40 flex items-center justify-center text-lime-400 group-hover:bg-lime-400 group-hover:text-black transition-colors shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white group-hover:text-lime-300 transition-colors">
                      Admin Page Account
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-lime-400 text-black">
                      1-Click
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click here to enter Administrator Console directly
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-lime-400/10 flex items-center justify-center text-lime-400 group-hover:translate-x-1 transition-transform shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="relative z-10 flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Manual Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@marketplace.com"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30 placeholder-slate-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30 placeholder-slate-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-lime-400 hover:bg-lime-300 text-[#0c0e12] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-lime-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In with Credentials'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-500 relative z-10">
          <p className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            <span>Dark & Lime Green Admin Console System</span>
          </p>
        </div>
      </div>
    </div>
  );
};
