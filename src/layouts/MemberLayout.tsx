import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { User, Package, MessageSquare, Bell, PackagePlus, ExternalLink, Shield, CheckCircle2, MapPin } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../features/auth/AuthContext';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 py-2.5 px-3 border-b-2 transition whitespace-nowrap ${
    isActive ? 'border-[#75C96B] text-[#202226] font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
  }`;

/**
 * One member area for every approved member: Profile (with My Ads),
 * Post Ad, Messages and Notifications. There is no buyer or seller mode.
 */
export const MemberLayout: React.FC = () => {
  const { user, memberProfile } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  memberProfile?.logoUrl ||
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
                }
                alt={user?.name || 'Member'}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900 truncate">{user?.name || 'Member'}</h1>
                  {user?.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-lime-800 bg-lime-50 px-2 py-0.5 rounded-full border border-lime-200">
                      <CheckCircle2 className="w-3 h-3" /> Verified Member
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {memberProfile?.businessName && memberProfile.businessName !== user?.name
                      ? `${memberProfile.businessName} • `
                      : ''}
                    {memberProfile?.location || 'Addis Ababa'} • {user?.phone}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
                  to={`/members/${user.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Public Profile
                </Link>
              )}
              <Link
                to="/account/ads/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#202226] bg-[#75C96B] hover:bg-[#65b85b] rounded-xl shadow-xs transition"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                Post Ad
              </Link>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-6 overflow-x-auto text-xs font-semibold border-t border-slate-100 pt-2">
            <NavLink to="/account/profile" className={tabClass}>
              <User className="w-4 h-4" />
              Profile
            </NavLink>
            <NavLink to="/account/ads" end className={tabClass}>
              <Package className="w-4 h-4" />
              My Ads
            </NavLink>
            <NavLink to="/account/messages" className={tabClass}>
              <MessageSquare className="w-4 h-4" />
              Messages
            </NavLink>
            <NavLink to="/account/notifications" className={tabClass}>
              <Bell className="w-4 h-4" />
              Notifications
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
