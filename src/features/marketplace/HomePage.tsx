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
import { productApi, categoryApi, sellerApi } from '../../services/api';
import type { Product } from '../../types';
import type { CategoryWithCount, SellerWithDetails } from '../../services/api';
import { ProductCard } from '../../components/common/ProductCard';
import { CategoryIcon } from '../../components/common/CategoryIcon';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<SellerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [cats, featured, recent, popular, sellersList] = await Promise.all([
          categoryApi.getCategories(),
          productApi.getFeaturedProducts(),
          productApi.getRecentlyAddedProducts(4),
          productApi.getPopularProducts(4),
          sellerApi.getAllSellers('approved'),
        ]);

        setCategories(cats);
        setFeaturedProducts(featured);
        setRecentProducts(recent);
        setPopularProducts(popular);
        setSellers(sellersList.slice(0, 3));
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
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Marketplace Connection</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Discover Verified Products from <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200">
              Trusted Local Sellers
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed">
            Browse administrator-approved listings, call sellers directly, and coordinate convenient location delivery without complex intermediaries.
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
                placeholder="Search laptops, headphones, footwear, apparel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none py-2"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl transition shadow-md shadow-indigo-600/30 shrink-0"
            >
              Search Marketplace
            </button>
          </form>

          {/* Quick trust metrics */}
          <div className="pt-6 flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Admin-Reviewed Products</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-sky-400" />
              <span>Direct Phone Contact</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Location-Based Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Explore by Category
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Curated categories vetted for quality and authenticity
            </p>
          </div>
          <Link
            to="/categories"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?categoryId=${cat.id}`}
              className="group flex flex-col items-center p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-lg transition text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                <CategoryIcon name={cat.slug} className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate w-full">
                {cat.name}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {cat.productCount} {cat.productCount === 1 ? 'item' : 'items'}
              </span>
            </Link>
          ))}
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
                Top recommendations approved by platform moderation
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
                Fresh inventory published by approved sellers
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
                Items receiving the highest views and buyer inquiries
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

      {/* Verified Sellers Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Verified Merchant Network
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Connect Directly with Top Rated Merchants
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every merchant on AgoraHub is verified by platform administrators. Transparent contact numbers and physical storefront addresses make local trade reliable and hassle-free.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {sellers.map((s) => (
              <Link
                key={s.userId}
                to={`/sellers/${s.userId}`}
                className="p-5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={s.logoUrl}
                      alt={s.storeName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-sm text-white">{s.storeName}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-400" />
                        <span className="truncate">{s.location}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {s.businessDescription}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-indigo-300 font-medium">
                  <span>{s.approvedProductCount} Approved Listings</span>
                  <span className="flex items-center gap-1">
                    Storefront <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Become a seller CTA */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Are you a merchant or store owner in Ethiopia?
            </span>
            <Link
              to="/register/seller"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Store className="w-4 h-4" />
              <span>Apply for Seller Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
