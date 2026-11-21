import type { Product, User } from '../types';

/**
 * Frontend permission helpers for the unified-member marketplace.
 *
 * These only decide what the UI shows. The backend must enforce the same
 * rules (verification, publishing, editing own listings, reporting and admin
 * moderation) — the frontend is not the security boundary.
 */

export function isAdminUser(user: User | null): boolean {
  return user?.role === 'admin';
}

/** Approved members (and administrators) get full marketplace access. */
export function isApprovedMember(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.status === 'approved';
}

/** Members whose one-time verification is not (or no longer) approved. */
export function needsVerificationScreen(user: User | null): boolean {
  if (!user || user.role === 'admin') return false;
  return user.status !== 'approved';
}

/** Every approved member can publish listings — no separate seller role. */
export function canPostListings(user: User | null): boolean {
  return isApprovedMember(user);
}

/** Only the owner (or an administrator) can edit or delete a listing. */
export function canManageListing(user: User | null, product: Pick<Product, 'sellerId'>): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return isApprovedMember(user) && product.sellerId === user.id;
}

/** Approved members can report listings they do not own. */
export function canReportListing(user: User | null, product: Pick<Product, 'sellerId'>): boolean {
  if (!user || user.role === 'admin') return false;
  return isApprovedMember(user) && product.sellerId !== user.id;
}
