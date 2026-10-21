import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Menu,
  X,
  User,
  LayoutDashboard,
  PackagePlus,
  MessageSquare,
  Shield,
  LogOut,
  ChevronDown,
  Store,
} from 'lucide-react';
import logoImg from '../../assets/ec-logo.png';
import { useAuth } from '../../features/auth/AuthContext';
import { NotificationBell } from '../common/NotificationBell';
import { DemoSwitcher } from '../common/DemoSwitcher';
import { isApprovedSeller, isRejectedSeller } from '../../utils/permissions';

export const Navbar: React.FC = () => {
  const { user, sellerProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const canSell = isApprovedSeller(user, sellerProfile);
  const isRejected = isRejectedSeller(user, sellerProfile);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      {/* Top micro bar for demo controls & quick status */}
      <div className="bg-[#202226] text-slate-300 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-hidden text-[11px] truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-[#75C96B] animate-pulse" />
            <span className="font-semibold text-white">
              Addis Repair Platform
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-400">
              Verified local merchants, equipment & repair services
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <DemoSwitcher />
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-[#292C31] border border-slate-700/60 p-1 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src={logoImg}
                alt="Addis Repair logo"
                className="w-full h-full object-contain scale-140"
              />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-0.5">
                Addis<span className="text-[#23521d] font-extrabold">Repair</span>
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 -mt-1 tracking-wider uppercase">
                Marketplace
              </span>
            </div>
          </Link>

          {/* Search Bar (desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-lg relative items-center"
          >
            <input
              type="text"
              placeholder="Search products by title, category, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-sm bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 rounded-xl border border-transparent focus:border-[#75C96B] focus:outline-none focus:ring-2 focus:ring-[#75C96B]/20 transition-all placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] text-xs font-bold rounded-lg transition shadow-xs"
            >
              Search
            </button>
          </form>

          {/* Navigation Links (desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/products" className="hover:text-slate-900 transition">
              Explore Products
            </Link>
            <Link to="/categories" className="hover:text-slate-900 transition">
              Categories
            </Link>
            {canSell ? (
              <Link
                to="/seller/products/new"
                className="flex items-center gap-1.5 text-[#23521d] hover:text-[#163612] font-semibold"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Add Product</span>
              </Link>
            ) : user?.role === 'admin' ? null : (
              <Link to="/register/seller" className="hover:text-slate-900 transition">
                Sell on Addis Repair
              </Link>
            )}
          </nav>

          {/* User controls / Notifications */}
          <div className="flex items-center gap-2.5">
            {user && <NotificationBell />}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition border border-slate-200/60"
                >
                  <img
                    src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                      {user.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>

                    {/* Role specific links */}
                    {user.role === 'admin' && (
                      <>
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <Shield className="w-4 h-4 text-purple-600" />
                          Admin Console
                        </Link>
                        <Link
                          to="/admin/products/approvals"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-purple-600" />
                          Approval Queues
                        </Link>
                        <div className="border-t border-slate-100 my-1" />
                        <span className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Admin Selling Hub
                        </span>
                        <Link
                          to="/seller/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <Store className="w-4 h-4 text-indigo-600" />
                          Seller Dashboard
                        </Link>
                        <Link
                          to="/seller/products/new"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <PackagePlus className="w-4 h-4 text-indigo-600" />
                          Add Product
                        </Link>
                        <Link
                          to="/seller/products"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <ShoppingBag className="w-4 h-4 text-indigo-600" />
                          My Products
                        </Link>
                        <Link
                          to="/seller/messages"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <MessageSquare className="w-4 h-4 text-indigo-600" />
                          Customer Messages
                        </Link>
                      </>
                    )}

                    {user.role === 'seller' && !isRejected && (
                      <>
                        <Link
                          to="/seller/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                          Seller Dashboard
                        </Link>
                        <Link
                          to="/seller/products"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <ShoppingBag className="w-4 h-4 text-emerald-600" />
                          My Products
                        </Link>
                        <Link
                          to="/seller/messages"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          Customer Messages
                        </Link>
                        <Link
                          to="/seller/profile"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <User className="w-4 h-4 text-emerald-600" />
                          Store Profile
                        </Link>
                      </>
                    )}

                    {(user.role === 'buyer' || isRejected) && (
                      <>
                        <Link
                          to="/buyer/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-blue-600" />
                          Buyer Overview
                        </Link>
                        <Link
                          to="/buyer/messages"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          My Inquiries
                        </Link>
                        <Link
                          to="/buyer/profile"
                          className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                        >
                          <User className="w-4 h-4 text-blue-600" />
                          Profile & Delivery Location
                        </Link>
                      </>
                    )}

                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register/buyer"
                  className="px-3.5 py-1.5 text-xs font-bold text-[#202226] bg-[#75C96B] hover:bg-[#65b85b] rounded-xl shadow-xs transition"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-16 py-2 text-xs bg-slate-100 text-slate-800 rounded-xl border border-transparent focus:bg-white focus:border-[#75C96B] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <button
              type="submit"
              className="absolute right-1.5 px-2.5 py-1 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] text-xs font-bold rounded-lg"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top duration-150">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-50"
            >
              Explore Products
            </Link>
            <Link
              to="/categories"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-50"
            >
              All Categories
            </Link>
            {canSell ? (
              <Link
                to="/seller/products/new"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-50 text-[#23521d] font-semibold"
              >
                Add Product
              </Link>
            ) : user?.role === 'admin' ? null : (
              <Link
                to="/register/seller"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-50 text-[#23521d] font-semibold"
              >
                Sell on Addis Repair
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
