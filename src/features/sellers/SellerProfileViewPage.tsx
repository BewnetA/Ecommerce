import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Package,
  Calendar,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { sellerApi, productApi } from '../../services/api';
import type { SellerWithDetails } from '../../services/api';
import type { Product } from '../../types';
import { ProductCard } from '../../components/common/ProductCard';

export const SellerProfileViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [seller, setSeller] = useState<SellerWithDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const loadSellerData = async () => {
      try {
        setLoading(true);
        const [profile, allSellerProducts] = await Promise.all([
          sellerApi.getSellerById(id),
          productApi.getSellerProducts(id),
        ]);

        setSeller(profile);
        // Only public approved products are shown on public storefront
        setProducts(allSellerProducts.filter((p) => p.status === 'approved'));
      } catch (err) {
        console.error('Error fetching seller storefront:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSellerData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-slate-500">Loading seller storefront...</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Seller Not Found</h2>
        <p className="text-xs text-slate-500">
          This seller profile may be unavailable or under moderation.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalog
        </Link>
      </div>

      {/* Seller Header Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              <img
                src={
                  seller.logoUrl ||
                  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80'
                }
                alt={seller.storeName}
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{seller.storeName}</h1>
                {seller.status === 'approved' && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Store
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                {seller.businessDescription}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {seller.location}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {seller.phone}
                </span>
                {seller.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {seller.email}
                  </span>
                )}
                <span className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {new Date(seller.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action: Call Seller */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`tel:${seller.phone}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition"
            >
              <Phone className="w-4 h-4" />
              <span>Call Seller ({seller.phone})</span>
            </a>
          </div>
        </div>
      </div>

      {/* Catalog of approved products from this seller */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Approved Listings ({products.length})
          </h2>
          <span className="text-xs text-slate-400">
            All items verified by marketplace administration
          </span>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            This merchant does not currently have any active approved listings.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
