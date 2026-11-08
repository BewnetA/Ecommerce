import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  X,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { authApi } from '../../services/api';
import logoImg from '../../assets/Adiss_Repairs.png';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotNotice, setForgotNotice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError('');
    setSuccessMessage('');
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

  const openForgotModal = () => {
    setForgotStep(1);
    setForgotEmail(email.trim());
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotNotice('');
    setIsForgotModalOpen(true);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }

    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await authApi.sendPasswordResetOtp(forgotEmail.trim());
      setForgotNotice(res.message);
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send recovery OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }

    setForgotError('');
    setForgotLoading(true);
    try {
      const isValid = await authApi.verifyPasswordResetOtp(forgotEmail.trim(), forgotOtp.trim());
      if (!isValid) {
        setForgotError('Invalid code. Please check your email or enter 123456.');
        return;
      }
      setForgotNotice('');
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.message || 'Verification failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotError('');
    setForgotLoading(true);
    try {
      await authApi.resetPasswordWithOtp(forgotEmail.trim(), forgotOtp.trim(), newPassword);
      setIsForgotModalOpen(false);
      setEmail(forgotEmail.trim());
      setPassword('');
      setSuccessMessage('Password reset successfully! You can now log in with your new password.');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to update password.');
    } finally {
      setForgotLoading(false);
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
                alt="Addis Repairs logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Addis Repairs Portal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to access your Addis Repairs account
          </p>
        </div>

        {successMessage && (
          <div className="relative z-10 flex items-center gap-2.5 p-3 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="relative z-10 flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Login Form */}
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
                placeholder="name@example.com"
                className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30 placeholder-slate-600 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={openForgotModal}
                className="text-[11px] text-lime-400 hover:text-lime-300 hover:underline transition font-medium"
              >
                Forgot Password?
              </button>
            </div>
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

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#15181f] border border-[#262f3f] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Password</h3>
                <p className="text-[11px] text-slate-400">
                  Step {forgotStep} of 3: {forgotStep === 1 ? 'Verify Email' : forgotStep === 2 ? 'Enter Code' : 'Set New Password'}
                </p>
              </div>
            </div>

            {forgotNotice && (
              <div className="mb-4 p-3 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-300 text-xs">
                {forgotNotice}
              </div>
            )}

            {forgotError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Step 1: Request OTP */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered account email. We will send you a 6-digit verification code to recover your account.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30 placeholder-slate-600 transition"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-[#1e232e] hover:bg-[#252b38] text-slate-300 text-xs font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-4 bg-lime-400 hover:bg-lime-300 text-[#0c0e12] font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter the 6-digit recovery code sent to <strong className="text-lime-400">{forgotEmail}</strong>.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full py-3 text-center text-lg tracking-[0.4em] font-mono bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30 transition"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={forgotLoading}
                    className="text-lime-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-[#1e232e] hover:bg-[#252b38] text-slate-300 text-xs font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || forgotOtp.length < 6}
                    className="flex-1 py-2.5 px-4 bg-lime-400 hover:bg-lime-300 text-[#0c0e12] font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Verification successful. Enter your new password below.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30 placeholder-slate-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30 placeholder-slate-600 transition"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-[#1e232e] hover:bg-[#252b38] text-slate-300 text-xs font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-4 bg-lime-400 hover:bg-lime-300 text-[#0c0e12] font-black text-xs uppercase tracking-wider rounded-xl transition disabled:opacity-50"
                  >
                    {forgotLoading ? 'Updating...' : 'Set Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
