import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  MessageSquare,
  Store,
  ExternalLink,
  AlertTriangle,
  Clock,
  Ban,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../features/auth/AuthContext';

export const SellerLayout: React.FC = () => {
  const { user, sellerProfile } = useAuth();

  const status = user?.role === 'admin' ? 'approved' : (sellerProfile?.status || 'pending');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      {/* Seller Status Banners */}
      {status === 'pending' && (
        <div className="bg-amber-500 text-white px-4 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 shrink-0" />
              <span>
                <strong>Account Pending Approval:</strong> Your seller account is under review by the platform administrator. You will not be able to list products publicly until approved.
              </span>
            </div>
            <span className="hidden md:inline bg-black/20 px-2.5 py-1 rounded-full text-xs font-semibold">
              Pending Admin Review
            </span>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="bg-rose-600 text-white px-4 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5 shrink-0" />
              <span>
                <strong>Application Rejected:</strong> {sellerProfile?.rejectionReason || 'Your seller registration did not meet platform guidelines.'}
              </span>
            </div>
            <span className="hidden md:inline bg-black/20 px-2.5 py-1 rounded-full text-xs font-semibold">
              Action Required
            </span>
          </div>
        </div>
      )}

      {status === 'suspended' && (
        <div className="bg-red-800 text-white px-4 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                <strong>Store Suspended:</strong> {sellerProfile?.rejectionReason || 'Store suspended due to policy violations.'} Your listed products are currently hidden from public discovery.
              </span>
            </div>
            <span className="hidden md:inline bg-black/20 px-2.5 py-1 rounded-full text-xs font-semibold">
              Suspended
            </span>
          </div>
        </div>
      )}

      {/* Seller Header & Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={
                    sellerProfile?.logoUrl ||
                    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={sellerProfile?.storeName || 'Store'}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900">
                    {sellerProfile?.storeName || 'My Store'}
                  </h1>
                  {status === 'approved' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Verified Seller
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {sellerProfile?.location || 'Addis Ababa'} • Owner: {user?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  Admin Console
                </Link>
              )}
              {user && (
                <Link
                  to={`/sellers/${user.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Public Storefront
                </Link>
              )}
              <Link
                to="/seller/products/new"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs transition ${
                  status === 'approved'
                    ? 'bg-[#75C96B] hover:bg-[#65b85b] text-[#202226]'
                    : 'bg-slate-400 text-white cursor-not-allowed opacity-60'
                }`}
                title={status !== 'approved' ? 'Requires approved seller status' : 'Add product'}
              >
                <PackagePlus className="w-3.5 h-3.5" />
                Add Product
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 sm:space-x-6 overflow-x-auto text-xs font-semibold border-t border-slate-100 pt-2">
            <NavLink
              to="/seller/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-[#75C96B] text-[#202226] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </NavLink>

            <NavLink
              to="/seller/products"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Package className="w-4 h-4" />
              My Products
            </NavLink>

            <NavLink
              to="/seller/messages"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <MessageSquare className="w-4 h-4" />
              Inquiries & Messages
            </NavLink>

            <NavLink
              to="/seller/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Store className="w-4 h-4" />
              Store Settings
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
