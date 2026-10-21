import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShieldCheck, HeartHandshake, Truck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export const Footer: React.FC = () => {
  const { resetAllDemoData } = useAuth();

  const handleReset = async () => {
    if (window.confirm('Reset all demo data back to default initial seed?')) {
      await resetAllDemoData();
      window.location.reload();
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      {/* Value props banner */}
      <div className="border-b border-slate-800/80 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Admin-Moderated Quality</h4>
              <p className="text-xs text-slate-400 mt-0.5">Every seller & product is thoroughly vetted</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Direct Seller Interaction</h4>
              <p className="text-xs text-slate-400 mt-0.5">Call or message merchants directly with 1 click</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-600/10 text-amber-400 border border-amber-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Location-Based Delivery</h4>
              <p className="text-xs text-slate-400 mt-0.5">Coordinate delivery points using geolocation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-base font-bold">AgoraHub Marketplace</span>
          </div>
          <p className="mt-3 text-xs text-slate-400 leading-relaxed">
            A centralized digital marketplace connecting verified sellers with local buyers. Focused on simplicity, safety, and streamlined communication.
          </p>
          <div className="mt-4">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Demo Seed Data
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Marketplace</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/products" className="hover:text-white transition">All Products</Link></li>
            <li><Link to="/categories" className="hover:text-white transition">Browse Categories</Link></li>
            <li><Link to="/products?condition=new" className="hover:text-white transition">Brand New Arrivals</Link></li>
            <li><Link to="/products?sortBy=popular" className="hover:text-white transition">Most Popular</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Merchant & Buyers</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/register/seller" className="hover:text-white transition">Apply as Seller</Link></li>
            <li><Link to="/seller/dashboard" className="hover:text-white transition">Seller Portal</Link></li>
            <li><Link to="/buyer/dashboard" className="hover:text-white transition">Buyer Account</Link></li>
            <li><Link to="/login" className="hover:text-white transition">Account Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Administration</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/admin" className="hover:text-white transition">Admin Dashboard</Link></li>
            <li><Link to="/admin/sellers/approvals" className="hover:text-white transition">Seller Approval Queue</Link></li>
            <li><Link to="/admin/products/approvals" className="hover:text-white transition">Product Moderation</Link></li>
            <li><Link to="/admin/reports" className="hover:text-white transition">Safety & Reports</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Agora Marketplace Prototype. Fully functional frontend implementation following PRD specifications.</p>
      </div>
    </footer>
  );
};
