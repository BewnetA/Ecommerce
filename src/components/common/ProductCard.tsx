import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, MessageSquare, ShieldCheck, Eye } from 'lucide-react';
import type { Product } from '../../types';
import { StatusBadge } from './StatusBadge';

interface ProductCardProps {
  product: Product;
  showStatus?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showStatus = false }) => {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const conditionLabels: Record<string, string> = {
    new: 'Brand New',
    like_new: 'Like New',
    good: 'Good Condition',
    fair: 'Fair',
  };

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-200">
      {/* Product Image */}
      <Link to={`/products/${product.id}`} className="relative aspect-4/3 overflow-hidden bg-slate-100 block">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80'}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
            {product.categoryName}
          </span>
          {product.condition && (
            <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
              {conditionLabels[product.condition] || product.condition}
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5">
          {showStatus ? (
            <StatusBadge status={product.status} size="sm" />
          ) : product.quantity > 0 ? (
            <span className="bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              In Stock ({product.quantity})
            </span>
          ) : (
            <span className="bg-rose-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              Out of Stock
            </span>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-xl font-bold text-slate-900">
              {formatPrice(product.price)}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Eye className="w-3 h-3" />
              <span>{product.viewsCount} views</span>
            </div>
          </div>

          <Link
            to={`/products/${product.id}`}
            className="font-semibold text-sm text-slate-800 hover:text-indigo-600 transition line-clamp-2 leading-snug"
            title={product.name}
          >
            {product.name}
          </Link>

          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Seller Info & Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <Link
              to={`/sellers/${product.sellerId}`}
              className="font-medium text-slate-700 hover:text-indigo-600 flex items-center gap-1 truncate"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{product.sellerName}</span>
            </Link>
            <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{product.sellerLocation.split(',')[0]}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <a
              href={`tel:${product.sellerPhone}`}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-medium transition"
              title={`Call seller at ${product.sellerPhone}`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Seller</span>
            </a>

            <Link
              to={`/products/${product.id}?contact=true`}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-medium transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Inquire</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
