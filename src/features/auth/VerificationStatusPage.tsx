import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Hourglass, XCircle, Ban, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ID_TYPE_LABELS, INDUSTRY_ROLE_LABELS, MEMBER_STATUS_LABELS, maskIdNumber } from '../../utils/members';

/**
 * Shown to members whose one-time verification is pending, rejected or
 * suspended. These members cannot use approved-member marketplace features
 * (posting, messaging, reporting). This page only reads the status — it can
 * never approve an account.
 */
export const VerificationStatusPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [checkedMessage, setCheckedMessage] = useState('');
  const [checkError, setCheckError] = useState('');

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.status === 'approved') {
    return <Navigate to="/account/profile" replace />;
  }

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckedMessage('');
    setCheckError('');
    try {
      await refreshUser();
      setCheckedMessage('Status checked. We will let you know as soon as your account is reviewed.');
    } catch {
      setCheckError('Could not check your status. Please check your connection and try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const config = {
    pending: {
      icon: <Hourglass className="w-10 h-10 text-amber-500" />,
      ring: 'bg-amber-50 border-amber-200',
      title: 'Verification in progress',
      message:
        'Thanks for registering! Our team is reviewing your details to confirm your connection to the mobile phone repair industry. You will get full marketplace access — messaging, posting ads and reporting — as soon as your account is approved. This is a one-time check; you will never need to register again to post ads.',
    },
    rejected: {
      icon: <XCircle className="w-10 h-10 text-rose-500" />,
      ring: 'bg-rose-50 border-rose-200',
      title: 'Verification not approved',
      message:
        'We could not verify your account, so marketplace access is not available. If you believe this is a mistake, please contact Addis Repair support with your registered phone number.',
    },
    suspended: {
      icon: <Ban className="w-10 h-10 text-rose-600" />,
      ring: 'bg-rose-50 border-rose-200',
      title: 'Account suspended',
      message:
        'Your account has been suspended, so marketplace features are not available. Please contact Addis Repair support to resolve this.',
    },
  }[user.status];

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className={`w-20 h-20 rounded-full border flex items-center justify-center ${config.ring}`}>{config.icon}</div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {MEMBER_STATUS_LABELS[user.status]}
          </span>
          <h1 className="text-xl font-bold text-slate-900">{config.title}</h1>
          <p className="text-sm text-slate-600 leading-relaxed">{config.message}</p>
        </div>

        {user.verificationNote && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <p className="text-xs font-bold text-rose-800">Message from the review team</p>
            <p className="text-sm text-rose-900 mt-1">{user.verificationNote}</p>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm space-y-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Submitted details</p>
          <p><span className="text-slate-500">Name:</span> <span className="font-semibold text-slate-900">{user.name}</span></p>
          <p><span className="text-slate-500">Phone:</span> <span className="font-semibold text-slate-900">{user.phone}</span></p>
          <p><span className="text-slate-500">Email:</span> <span className="font-semibold text-slate-900">{user.email}</span></p>
          {user.verification && (
            <>
              <p>
                <span className="text-slate-500">Industry role:</span>{' '}
                <span className="font-semibold text-slate-900">{INDUSTRY_ROLE_LABELS[user.verification.industryRole] || user.verification.industryRole}</span>
              </p>
              <p>
                <span className="text-slate-500">Experience:</span>{' '}
                <span className="font-semibold text-slate-900">{user.verification.yearsOfExperience} year(s)</span>
              </p>
              <p>
                <span className="text-slate-500">{ID_TYPE_LABELS[user.verification.idType] || 'ID'}:</span>{' '}
                <span className="font-semibold text-slate-900">{maskIdNumber(user.verification.idNumber)}</span>
              </p>
            </>
          )}
        </div>

        {checkedMessage && <p className="text-xs text-lime-700 text-center">{checkedMessage}</p>}
        {checkError && <p className="text-xs text-rose-600 text-center">{checkError}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          {user.status === 'pending' && (
            <button
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] font-bold text-sm rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking…' : 'Check verification status'}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-sm rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          You can still browse public listings on the <Link to="/home" className="text-lime-700 font-semibold hover:underline">marketplace</Link>.
        </p>
      </div>
    </div>
  );
};
