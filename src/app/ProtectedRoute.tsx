import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import type { UserRole } from '../types';
import { isApprovedMember, needsVerificationScreen } from '../utils/permissions';
import logoImg from '../assets/Adiss_Repairs.png';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  /**
   * Requires a member whose one-time verification is approved. Pending,
   * rejected and suspended members are sent to the verification status page.
   */
  requireApprovedMember?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireApprovedMember = false,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1b202a] border border-lime-500/40 p-2 flex items-center justify-center shadow-lg overflow-hidden animate-pulse">
            <img src={logoImg} alt="Addis Repairs logo" className="w-full h-full object-contain" />
          </div>
          <div className="w-8 h-8 border-3 border-[#75C96B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role === 'admin' && user.status === 'suspended')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to={needsVerificationScreen(user) ? '/verification-status' : '/account/profile'} replace />;
  }

  if (requireApprovedMember && !isApprovedMember(user)) {
    return <Navigate to="/verification-status" replace />;
  }

  return <>{children}</>;
};
