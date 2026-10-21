import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import type { UserRole } from '../types';
import { isRejectedSeller, isApprovedSeller } from '../utils/permissions';
import logoImg from '../assets/ec-logo.png';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireApprovedSeller?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireApprovedSeller = false,
}) => {
  const { user, sellerProfile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#292C31] border border-slate-700/80 p-2 flex items-center justify-center shadow-lg overflow-hidden animate-pulse">
            <img src={logoImg} alt="Addis Repair logo" className="w-full h-full object-contain scale-140" />
          </div>
          <div className="w-8 h-8 border-3 border-[#75C96B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isRejected = isRejectedSeller(user, sellerProfile);
  const isApproved = isApprovedSeller(user, sellerProfile);

  // If this route is specifically for sellers:
  if (allowedRoles && allowedRoles.includes('seller') && !allowedRoles.includes('buyer')) {
    // 1. Rejected seller applicants MUST NEVER access seller routes
    if (isRejected) {
      return <Navigate to="/buyer/dashboard" replace />;
    }

    // 2. If requireApprovedSeller is true (e.g. Add Product, Edit Product), non-approved sellers are redirected to seller dashboard
    if (requireApprovedSeller && !isApproved) {
      return <Navigate to="/seller/dashboard" replace />;
    }

    // 3. Regular role check (admin or seller allowed)
    if (user.role !== 'seller' && user.role !== 'admin') {
      return <Navigate to="/buyer/dashboard" replace />;
    }
  }

  // If this route is for buyers:
  if (allowedRoles && allowedRoles.includes('buyer')) {
    // Rejected applicants behave like ordinary buyers and are allowed
    if (isRejected) {
      return <>{children}</>;
    }

    // Admins and ordinary buyers are allowed
    if (user.role === 'admin' || user.role === 'buyer') {
      return <>{children}</>;
    }

    // If approved or pending seller visits buyer route, redirect to seller dashboard
    if (user.role === 'seller') {
      return <Navigate to="/seller/dashboard" replace />;
    }
  }

  // General allowedRoles fallback
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'seller') {
      return isRejected ? <Navigate to="/buyer/dashboard" replace /> : <Navigate to="/seller/dashboard" replace />;
    }
    return <Navigate to="/buyer/dashboard" replace />;
  }

  return <>{children}</>;
};
