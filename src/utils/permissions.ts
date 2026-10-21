import type { User, SellerProfile } from '../types';

/**
 * Returns true if the user is an administrator.
 */
export function isAdminUser(user: User | null): boolean {
  return user?.role === 'admin';
}

/**
 * Returns true if the user has an approved seller status or is an admin.
 * Admins have full seller capabilities by default without needing separate approval.
 */
export function isApprovedSeller(user: User | null, sellerProfile: SellerProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'seller' && sellerProfile?.status === 'approved';
}

/**
 * Returns true if the user is a rejected seller applicant.
 */
export function isRejectedSeller(user: User | null, sellerProfile: SellerProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return false;
  return sellerProfile?.status === 'rejected' || user.status === 'rejected';
}

/**
 * Returns true if the user has a pending seller application.
 */
export function isPendingSeller(user: User | null, sellerProfile: SellerProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return false;
  return (user.role === 'seller' && sellerProfile?.status === 'pending') || user.status === 'pending';
}

/**
 * Determines if a user can access the seller layout and dashboard.
 * - Admins: Yes
 * - Approved Sellers: Yes
 * - Pending Applicants: Yes (to view pending status)
 * - Rejected Applicants: NO (must behave like ordinary buyers)
 * - Ordinary Buyers: NO
 */
export function canAccessSellerPortal(user: User | null, sellerProfile: SellerProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (isRejectedSeller(user, sellerProfile)) return false;
  return user.role === 'seller' && (sellerProfile?.status === 'approved' || sellerProfile?.status === 'pending');
}

/**
 * Determines if a user can add or edit products.
 * - Admins: Yes
 * - Approved Sellers: Yes
 * - Pending Applicants: NO
 * - Rejected Applicants: NO
 * - Ordinary Buyers: NO
 */
export function canAddOrEditProducts(user: User | null, sellerProfile: SellerProfile | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'seller' && sellerProfile?.status === 'approved';
}

/**
 * Determines if a user can access buyer routes and dashboards.
 * - Admins: Yes
 * - Ordinary Buyers: Yes
 * - Rejected Applicants: Yes (they behave like ordinary buyers)
 * - Approved / Pending Sellers: Yes (for their customer shopping/inquiry needs)
 */
export function canAccessBuyerPortal(user: User | null): boolean {
  return Boolean(user);
}
