import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  User,
  ShoppingBag,
  MapPin,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../features/auth/AuthContext';
import { isRejectedSeller } from '../utils/permissions';

export const BuyerLayout: React.FC = () => {
  const { user, buyerProfile, sellerProfile } = useAuth();
  const isRejected = isRejectedSeller(user, sellerProfile);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      {/* Rejected Seller Notification Banner */}
      {isRejected && (
        <div className="bg-rose-50 border-b border-rose-200/90 px-4 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="text-xs text-rose-900 leading-normal">
                <span className="font-bold">Seller Application Status: Rejected.</span>{' '}
                {sellerProfile?.rejectionReason ? (
                  <span>
                    Reason: <span className="font-medium">{sellerProfile.rejectionReason}</span>
                  </span>
                ) : (
                  <span>Your seller application was not approved by administration.</span>
                )}{' '}
                You can browse products and message sellers as an ordinary customer.
              </div>
            </div>
            <Link
              to="/register/seller"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reapply to Sell</span>
            </Link>
          </div>
        </div>
      )}

      {/* Buyer Account Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80'
                }
                alt={user?.name || 'Buyer'}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {user?.name || 'Customer Account'}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {buyerProfile?.deliverySubcity
                      ? `${buyerProfile.deliverySubcity}, ${buyerProfile.deliveryCity || 'Addis Ababa'}`
                      : 'Delivery location not set'}
                  </span>
                  <span>• {user?.phone}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#202226] bg-[#75C96B] hover:bg-[#65b85b] rounded-xl shadow-xs transition"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Browse Products
              </Link>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto text-xs font-semibold border-t border-slate-100 pt-2">
            <NavLink
              to="/buyer/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-[#75C96B] text-[#202226] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Account Overview
            </NavLink>

            <NavLink
              to="/buyer/messages"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <MessageSquare className="w-4 h-4" />
              My Inquiries & Messages
            </NavLink>

            <NavLink
              to="/buyer/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <User className="w-4 h-4" />
              Profile & Delivery Location
            </NavLink>
          </nav>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
