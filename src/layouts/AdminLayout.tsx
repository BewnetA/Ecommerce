import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Layers,
  ShieldAlert,
  Clock,
  UserCheck,
  BarChart3,
  ExternalLink,
  PackagePlus,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { reportsApi } from '../services/api';
import type { AdminStats } from '../types';

export const AdminLayout: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);

  const fetchStats = async () => {
    try {
      const data = await reportsApi.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin badges:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900 font-sans antialiased">
      <Navbar />

      {/* Admin Subheader Bar */}
      <div className="bg-[#292C31] text-white border-b border-[#363A40]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Central Administration Console</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Platform governance, seller verification, catalog moderation & safety
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/seller/products/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#202226] bg-[#75C96B] hover:bg-[#65b85b] rounded-xl shadow-xs transition"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              Add Product
            </Link>
            <Link
              to="/seller/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#202226] hover:bg-[#1a1c1f] rounded-xl border border-slate-700 transition"
            >
              <Store className="w-3.5 h-3.5 text-[#75C96B]" />
              Seller Portal
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#202226] hover:bg-[#1a1c1f] rounded-xl border border-slate-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Market
            </Link>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto text-xs font-medium pt-2 pb-1 text-slate-400">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              Dashboard
            </NavLink>

            <NavLink
              to="/admin/sellers/approvals"
              className={({ isActive }) =>
                `flex items-center gap-1.5 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Seller Approvals
              {stats && stats.pendingSellerApprovals > 0 && (
                <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.pendingSellerApprovals}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/admin/products/approvals"
              className={({ isActive }) =>
                `flex items-center gap-1.5 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Product Approvals
              {stats && stats.pendingProductApprovals > 0 && (
                <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.pendingProductApprovals}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/admin/sellers"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Store className="w-4 h-4 text-indigo-400" />
              Sellers ({stats?.totalSellers || 0})
            </NavLink>

            <NavLink
              to="/admin/products"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Package className="w-4 h-4 text-indigo-400" />
              Products ({stats?.totalProducts || 0})
            </NavLink>

            <NavLink
              to="/admin/categories"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              Categories
            </NavLink>

            <NavLink
              to="/admin/buyers"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
              Buyers
            </NavLink>

            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Users className="w-4 h-4 text-indigo-400" />
              All Users
            </NavLink>

            <NavLink
              to="/admin/reports"
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Reports & Logs
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
