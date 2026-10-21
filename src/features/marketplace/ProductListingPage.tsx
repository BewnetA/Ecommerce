import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { productApi, categoryApi } from '../../services/api';
import type { Product, ProductCondition } from '../../types';
import type { CategoryWithCount } from '../../services/api';
import { ProductCard } from '../../components/common/ProductCard';

export const ProductListingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter state initialized from URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || 'all');
  const [condition, setCondition] = useState<ProductCondition | 'all'>(
    (searchParams.get('condition') as any) || 'all'
  );
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStockOnly') === 'true');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>(
    (searchParams.get('sortBy') as any) || 'newest'
  );

  // Sync category & categories
  useEffect(() => {
    categoryApi.getCategories().then(setCategories);
  }, []);

  // Update URL search params when filters change
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId);
    if (condition && condition !== 'all') params.set('condition', condition);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (inStockOnly) params.set('inStockOnly', 'true');
    if (location.trim()) params.set('location', location.trim());
    if (sortBy !== 'newest') params.set('sortBy', sortBy);

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    // When URL params change, update local states and fetch
    const qSearch = searchParams.get('search') || '';
    const qCat = searchParams.get('categoryId') || 'all';
    const qCond = (searchParams.get('condition') as any) || 'all';
    const qMin = searchParams.get('minPrice') || '';
    const qMax = searchParams.get('maxPrice') || '';
    const qStock = searchParams.get('inStockOnly') === 'true';
    const qLoc = searchParams.get('location') || '';
    const qSort = (searchParams.get('sortBy') as any) || 'newest';

    setSearch(qSearch);
    setCategoryId(qCat);
    setCondition(qCond);
    setMinPrice(qMin);
    setMaxPrice(qMax);
    setInStockOnly(qStock);
    setLocation(qLoc);
    setSortBy(qSort);

    const fetchFiltered = async () => {
      setLoading(true);
      try {
        const results = await productApi.getPublicProducts({
          search: qSearch || undefined,
          categoryId: qCat !== 'all' ? qCat : undefined,
          condition: qCond !== 'all' ? qCond : undefined,
          minPrice: qMin ? Number(qMin) : undefined,
          maxPrice: qMax ? Number(qMax) : undefined,
          inStockOnly: qStock,
          location: qLoc || undefined,
          sortBy: qSort,
        });
        setProducts(results);
      } catch (err) {
        console.error('Error fetching filtered products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiltered();
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('all');
    setCondition('all');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setLocation('');
    setSortBy('newest');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters =
    Boolean(search) ||
    categoryId !== 'all' ||
    condition !== 'all' ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    inStockOnly ||
    Boolean(location);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Marketplace Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing approved, verified listings from active merchants
          </p>
        </div>

        {/* Search & Mobile Filter Toggle */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center flex-1 sm:w-80">
            <input
              type="text"
              placeholder="Search by title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-16 py-2 text-xs bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <button
              type="submit"
              className="absolute right-1 px-2.5 py-1 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] text-xs font-bold rounded-lg transition"
            >
              Search
            </button>
          </form>

          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters (Desktop) */}
        <aside
          className={`${
            mobileFilterOpen ? 'block' : 'hidden'
          } md:block w-full md:w-64 shrink-0 space-y-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-fit`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter Products
            </h3>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                const p = new URLSearchParams(searchParams);
                if (e.target.value === 'all') p.delete('categoryId');
                else p.set('categoryId', e.target.value);
                setSearchParams(p);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.productCount})
                </option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Condition
            </label>
            <div className="space-y-1.5 text-xs text-slate-600">
              {[
                { id: 'all', label: 'All Conditions' },
                { id: 'new', label: 'Brand New' },
                { id: 'like_new', label: 'Like New' },
                { id: 'good', label: 'Good' },
                { id: 'fair', label: 'Fair' },
              ].map((cond) => (
                <label key={cond.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="condition"
                    value={cond.id}
                    checked={condition === cond.id}
                    onChange={(e) => {
                      setCondition(e.target.value as any);
                      const p = new URLSearchParams(searchParams);
                      if (e.target.value === 'all') p.delete('condition');
                      else p.set('condition', e.target.value);
                      setSearchParams(p);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{cond.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Price Range ($)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="mt-2 w-full py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Apply Price
            </button>
          </div>

          {/* Availability */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  const p = new URLSearchParams(searchParams);
                  if (e.target.checked) p.set('inStockOnly', 'true');
                  else p.delete('inStockOnly');
                  setSearchParams(p);
                }}
                className="rounded-sm text-indigo-600 focus:ring-indigo-500"
              />
              <span>In-Stock Only</span>
            </label>
          </div>

          {/* Location */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Seller Location / City
            </label>
            <input
              type="text"
              placeholder="e.g. Bole, Kazanchis..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </div>
        </aside>

        {/* Main Products Grid */}
        <div className="flex-1 space-y-6">
          {/* Sorting Bar & Results Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-xs text-slate-600">
              Showing <span className="font-bold text-slate-900">{products.length}</span> verified{' '}
              {products.length === 1 ? 'product' : 'products'}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  const p = new URLSearchParams(searchParams);
                  p.set('sortBy', e.target.value);
                  setSearchParams(p);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Active Filters:</span>
              {search && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                  Search: "{search}"
                  <button onClick={() => { setSearch(''); const p = new URLSearchParams(searchParams); p.delete('search'); setSearchParams(p); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {categoryId !== 'all' && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                  Category: {categories.find((c) => c.id === categoryId)?.name || categoryId}
                  <button onClick={() => { setCategoryId('all'); const p = new URLSearchParams(searchParams); p.delete('categoryId'); setSearchParams(p); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {condition !== 'all' && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                  Condition: {condition}
                  <button onClick={() => { setCondition('all'); const p = new URLSearchParams(searchParams); p.delete('condition'); setSearchParams(p); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                  In-Stock Only
                  <button onClick={() => { setInStockOnly(false); const p = new URLSearchParams(searchParams); p.delete('inStockOnly'); setSearchParams(p); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Products Grid or Empty / Loading State */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-slate-200/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No approved products match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try searching with different terms, selecting another category, or resetting your filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
