import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Phone,
  MapPin,
  TrendingUp,
  Package,
  Store,
} from 'lucide-react';
import { productApi, memberApi } from '../../services/api';
import type { Product } from '../../types';
import type { MemberWithDetails } from '../../services/api';
import { ProductCard } from '../../components/common/ProductCard';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [featured, recent, popular, memberList] = await Promise.all([
          productApi.getFeaturedProducts(),
          productApi.getRecentlyAddedProducts(4),
          productApi.getPopularProducts(4),
          memberApi.getAllMembers('approved'),
        ]);

        setFeaturedProducts(featured);
        setRecentProducts(recent);
        setPopularProducts(popular);
        // Spotlight verified members who currently have active ads.
        setMembers(memberList.filter((m) => m.activeListingCount > 0).slice(0, 3));
      } catch (err) {
        console.error('Error loading homepage data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#202226] via-[#292C31] to-[#1a1c1f] text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#75C96B_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#75C96B]/15 border border-[#75C96B]/30 text-[#75C96B] text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Marketplace Connection</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Spare Parts, Tools & Repair Services from <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#75C96B] to-slate-200">
              Verified Repair Professionals
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            Browse listings from verified members of the mobile phone repair industry, contact them directly, and find what you need nearby.
          </p>

          {/* Hero Search Box */}
          <form
            onSubmit={handleHeroSearch}
            className="max-w-2xl mx-auto relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-white p-1.5"
          >
            <div className="flex-1 flex items-center pl-3">
              <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search laptops, headphones, footwear, equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] text-xs sm:text-sm font-bold px-6 py-3 rounded-xl transition shadow-md shadow-[#75C96B]/20 shrink-0"
            >
              Search Marketplace
            </button>
          </form>

          {/* Quick trust metrics */}
          <div className="pt-6 flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Repair-Industry Members</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-400" />
              <span>Direct Phone Contact</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Nearby Discovery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Featured Listings
              </h2>
              <p className="text-xs text-slate-500">
                Highlighted listings from verified members
              </p>
            </div>
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-slate-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm">
            No featured products available at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Added Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Recently Added
              </h2>
              <p className="text-xs text-slate-500">
                The latest ads published by verified members
              </p>
            </div>
          </div>
          <Link
            to="/products?sortBy=newest"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            See More <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Popular Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Popular & High Interest
              </h2>
              <p className="text-xs text-slate-500">
                Listings receiving the most views and inquiries
              </p>
            </div>
          </div>
          <Link
            to="/products?sortBy=popular"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            Explore Popular <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Verified Members Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#292C31] text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden border border-[#363A40]">
          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#75C96B]">
              Verified Member Network
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Connect Directly with Repair Technicians & Parts Suppliers
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every member of Addis Repair completes a one-time verification of their connection to the mobile phone repair industry. Contact numbers and shop locations make local trade reliable.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {members.map(({ profile: s, activeListingCount }) => (
              <Link
                key={s.userId}
                to={`/members/${s.userId}`}
                className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={s.logoUrl}
                      alt={s.businessName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-sm text-white">{s.businessName}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#75C96B]" />
                        <span className="truncate">{s.location}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {s.businessDescription}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-medium">
                  <span>{activeListingCount} Active Ads</span>
                  <span className="flex items-center gap-1 text-[#75C96B]">
                    Profile <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Join CTA: one registration for every member */}
          <div className="mt-8 pt-6 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Work in mobile phone repair? One verified account lets you buy, sell and offer services.
            </span>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] text-xs font-bold shadow-md transition"
            >
              <Store className="w-4 h-4" />
              <span>Create Member Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
