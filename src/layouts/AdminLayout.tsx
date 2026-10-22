import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Layers,
  Clock,
  UserCheck,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { reportsApi, userApi } from '../services/api';
import type { AdminStats } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import logoImg from '../assets/ec-logo.png';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [adminCount, setAdminCount] = useState<number>(1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await reportsApi.getAdminStats();
      setStats(data);
      const admins = await userApi.getAllAdmins();
      setAdminCount(admins.length);
    } catch (err) {
      console.error('Error fetching admin badges:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    {
      to: '/admin/sellers/approvals',
      label: 'Seller Approval',
      icon: Clock,
      badge: stats && stats.pendingSellerApprovals > 0 ? stats.pendingSellerApprovals : undefined,
      badgeColor: 'bg-amber-400 text-black',
      exact: true,
    },
    {
      to: '/admin/products/approvals',
      label: 'Product Approval',
      icon: Clock,
      badge: stats && stats.pendingProductApprovals > 0 ? stats.pendingProductApprovals : undefined,
      badgeColor: 'bg-amber-400 text-black',
      exact: true,
    },
    {
      to: '/admin/products',
      label: `Products (${stats?.totalProducts || 0})`,
      icon: Package,
      exact: true,
    },
    {
      to: '/admin/categories',
      label: 'Categories',
      icon: Layers,
      exact: true,
    },
    {
      to: '/admin/sellers',
      label: `Seller (${stats?.totalSellers || 0})`,
      icon: Store,
      exact: true,
    },
    {
      to: '/admin/buyers',
      label: 'Buyer',
      icon: UserCheck,
      exact: true,
    },
    {
      to: '/admin/admins',
      label: 'Admin',
      icon: Shield,
      badge: adminCount,
      badgeColor: 'bg-lime-500/20 text-lime-300 border border-lime-500/30',
      exact: true,
    },
    {
      to: '/admin/users',
      label: 'All Users',
      icon: Users,
      exact: true,
    },
    {
      to: '/admin/reports',
      label: 'Report & Audit',
      icon: BarChart3,
      exact: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0e12] text-slate-100 font-sans antialiased selection:bg-lime-400 selection:text-black">
      {/* Dedicated Admin Header Bar */}
      <header className="sticky top-0 z-40 bg-[#12151c]/95 backdrop-blur-md border-b border-[#232a37]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b202a] border border-lime-500/40 p-1 flex items-center justify-center shadow-lg shadow-lime-500/10 overflow-hidden shrink-0">
              <img
                src={logoImg}
                alt="Addis Repair logo"
                className="w-full h-full object-contain scale-125"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-white tracking-tight">
                  Addis Repair
                </span>
                <span className="text-[10px] uppercase font-black tracking-wider bg-lime-400 text-[#0c0e12] px-2 py-0.5 rounded-full shadow-sm shadow-lime-500/30">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Centralized Governance, Buyer/Seller Moderation & Platform Control
              </p>
            </div>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3 justify-between sm:justify-end">
            {user && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#181d27] border border-[#2a3243]">
                <img
                  src={
                    user.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                  }
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover border border-lime-500/50"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white truncate max-w-[140px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-lime-400 font-semibold font-mono">
                    Super Admin
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all active:scale-95"
              title="Sign out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Bar: Responsive Full-Width on Desktop/Laptop & Collapsible Drawer on Mobile */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#1e2430]">
          {/* Mobile Navigation Header & Toggle */}
          <div className="md:hidden flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-lime-400 uppercase font-black tracking-wider bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/30">
                Admin Menu
              </span>
              <span className="text-[11px] text-slate-400">Tap to browse sections</span>
            </div>

            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-1.5 px-3 rounded-xl bg-[#1c2230] text-slate-200 hover:text-white border border-[#2d3748] flex items-center gap-2 text-xs font-bold active:scale-95 transition"
            >
              <span>{mobileNavOpen ? 'Close Menu' : 'Menu'}</span>
              {mobileNavOpen ? (
                <X className="w-4 h-4 text-lime-400" />
              ) : (
                <Menu className="w-4 h-4 text-lime-400" />
              )}
            </button>
          </div>

          {/* Mobile Collapsible Drawer */}
          {mobileNavOpen && (
            <div className="md:hidden py-2.5 border-t border-[#1e2430] grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-lime-400 text-[#0c0e12] font-black shadow-md shadow-lime-500/20'
                          : 'bg-[#151922] text-slate-300 hover:text-white hover:bg-[#1c2230] border border-[#232b3a]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-amber-400 text-black'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* Desktop & Laptop Full-Width Proportional Tabs (Zero gaps on the right) */}
          <nav className="hidden md:flex w-full items-stretch gap-1 sm:gap-1.5 text-[11px] font-bold py-2 text-slate-400">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition whitespace-nowrap text-center ${
                      isActive
                        ? 'bg-lime-400 text-[#0c0e12] font-black shadow-md shadow-lime-500/20'
                        : 'hover:text-white hover:bg-[#1c2230]'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ${
                        item.badgeColor || 'bg-amber-400 text-black'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-[#1c2230] py-6 text-center text-xs text-slate-500 bg-[#0c0e12]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-400 inline-block animate-pulse" />
            <span className="font-semibold text-slate-300">Addis Repair Platform Console</span>
            <span>• System Operational</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Secure Administrator Session • Dark & Lime Green Governance Interface
          </div>
        </div>
      </footer>
    </div>
  );
};
