import type {
  ListingStatus,
  ListingType,
  Product,
  ProductCondition,
  ProductFilters,
  ServiceCoverage,
  User,
} from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';
import {
  conditionToDb,
  coordinatesForArea,
  distanceKm,
  isModeratedStatus,
  isProductListing,
  isServiceListing,
  listingStatusToLegacyDb,
  normalizeCondition,
  normalizeListingStatus,
  normalizeListingType,
} from '../../utils/members';

/**
 * Listings service.
 *
 * - Every approved member can publish; ordinary listings go live immediately
 *   (status `active`) — there is NO per-listing admin approval.
 * - Owners can edit, hide/show and delete their own listings.
 * - Administrators hide, suspend, remove or restore listings only through
 *   report-driven moderation.
 *
 * The backend must enforce the same rules; the checks here mirror them so the
 * UI can show clear errors.
 */

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  listingType: ListingType;
  /** Required for physical products, ignored for services and posts. */
  condition?: ProductCondition;
  quantity: number;
  isSoldOut?: boolean;
  images: string[];
  contactPhone?: string;
  locationCity: string;
  locationSubCity: string;
  addressDescription?: string;
  latitude?: number;
  longitude?: number;
  isStartingPrice?: boolean;
  serviceCoverage?: ServiceCoverage;
  serviceCoverageNote?: string;
}

/** Statuses (new and legacy) that are publicly visible in the backend. */
const PUBLIC_DB_STATUSES = ['active', 'approved', 'pending'];

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

function mapSupabaseProduct(p: any): Product {
  const listingType = normalizeListingType(p.listing_type);
  const city = p.location_city || 'Addis Ababa';
  const subCity = p.location_sub_city || 'Bole';
  return {
    id: p.id,
    sellerId: p.seller_id,
    sellerName: p.seller_name,
    sellerPhone: p.seller_phone || '',
    sellerLocation: p.seller_location || `${subCity}, ${city}`,
    name: p.name || p.title,
    description: p.description || '',
    price: Number(p.price) || 0,
    listingType,
    condition: normalizeCondition(p.condition, listingType),
    quantity: p.quantity ?? 1,
    isSoldOut: p.is_sold_out === true,
    images: Array.isArray(p.images) ? p.images : p.images ? [p.images] : [],
    status: normalizeListingStatus(p.status),
    moderationNote: p.moderation_note || p.rejection_reason || undefined,
    isFeatured: p.is_featured || false,
    viewsCount: p.views_count || 0,
    locationCity: city,
    locationSubCity: subCity,
    addressDescription: p.address_description || undefined,
    latitude: typeof p.latitude === 'number' ? p.latitude : undefined,
    longitude: typeof p.longitude === 'number' ? p.longitude : undefined,
    isStartingPrice: p.is_starting_price === true,
    serviceCoverage: p.service_coverage || undefined,
    serviceCoverageNote: p.service_coverage_note || undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at || p.created_at,
  };
}

/**
 * Fixed value for the `products.category_id` column, which the current
 * database still requires. Categories are not shown or used anywhere.
 */
const STORAGE_CATEGORY_ID = 'cat-1';

function toSupabasePayload(product: Product): Record<string, any> {
  return {
    id: product.id,
    seller_id: product.sellerId,
    seller_name: product.sellerName,
    seller_phone: product.sellerPhone,
    seller_location: product.sellerLocation,
    name: product.name,
    description: product.description,
    price: product.price,
    category_id: STORAGE_CATEGORY_ID,
    listing_type: product.listingType,
    condition: conditionToDb(product.condition),
    quantity: product.quantity,
    images: product.images,
    location_city: product.locationCity,
    location_sub_city: product.locationSubCity,
    address_description: product.addressDescription ?? null,
    latitude: product.latitude ?? null,
    longitude: product.longitude ?? null,
    is_starting_price: product.isStartingPrice ?? false,
    service_coverage: product.serviceCoverage ?? null,
    service_coverage_note: product.serviceCoverageNote ?? null,
    status: product.status,
    is_sold_out: product.isSoldOut ?? false,
    is_available: true,
    views_count: product.viewsCount,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

/**
 * Writes with the unified-member values first; if the database still has the
 * legacy constraints, retries with legacy-compatible values (see
 * BACKEND_HANDOFF.md for the migration that removes this fallback).
 */
async function writeProduct(product: Product, mode: 'insert' | 'update'): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const run = async (payload: Record<string, any>) => {
    if (mode === 'insert') {
      return supabase.from('products').insert(payload);
    }
    const { id: _ignored, created_at: _created, ...updates } = payload;
    void _ignored;
    void _created;
    return supabase.from('products').update(updates).eq('id', product.id);
  };

  const payload = toSupabasePayload(product);
  let { error } = await run(payload);
  if (!error) return;

  console.warn('Listing write note, retrying legacy values:', error.message);
  const legacy = {
    ...payload,
    status: listingStatusToLegacyDb(product.status),
    listing_type: isServiceListing(product.listingType) ? 'service' : 'product',
  };
  ({ error } = await run(legacy));
  if (error) throw new Error(error.message);
}

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let results = products;

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.locationSubCity.toLowerCase().includes(q) ||
        p.locationCity.toLowerCase().includes(q)
    );
  }

  if (filters.kind === 'product') {
    results = results.filter((p) => isProductListing(p.listingType));
  } else if (filters.kind === 'service') {
    results = results.filter((p) => isServiceListing(p.listingType));
  }

  if (filters.listingType && filters.listingType !== 'all') {
    results = results.filter((p) => p.listingType === filters.listingType);
  }

  // New/Used applies to physical products only.
  if (filters.condition && filters.condition !== 'all') {
    results = results.filter((p) => isProductListing(p.listingType) && p.condition === filters.condition);
  }

  if (typeof filters.minPrice === 'number' && !isNaN(filters.minPrice)) {
    results = results.filter((p) => p.price >= filters.minPrice!);
  }

  if (typeof filters.maxPrice === 'number' && !isNaN(filters.maxPrice)) {
    results = results.filter((p) => p.price <= filters.maxPrice!);
  }

  if (filters.inStockOnly) {
    results = results.filter((p) => !p.isSoldOut && (!isProductListing(p.listingType) || p.quantity > 0));
  }

  if (filters.location && filters.location.trim()) {
    const loc = filters.location.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.sellerLocation.toLowerCase().includes(loc) ||
        p.locationCity.toLowerCase().includes(loc) ||
        p.locationSubCity.toLowerCase().includes(loc)
    );
  }

  // Distance is only computed when both the viewer and the listing have a
  // position; it is never invented. Listings without coordinates fall back
  // to their area centre, and otherwise stay in the results without distance.
  const hasReference = typeof filters.nearLatitude === 'number' && typeof filters.nearLongitude === 'number';
  results = results.map((p) => {
    if (!hasReference) return { ...p, distanceKm: undefined };
    const point =
      typeof p.latitude === 'number' && typeof p.longitude === 'number'
        ? { latitude: p.latitude, longitude: p.longitude }
        : coordinatesForArea(p.locationSubCity);
    return {
      ...p,
      distanceKm: point
        ? distanceKm(filters.nearLatitude!, filters.nearLongitude!, point.latitude, point.longitude)
        : undefined,
    };
  });

  const sorted = [...results];
  switch (filters.sortBy) {
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'popular':
      sorted.sort((a, b) => b.viewsCount - a.viewsCount);
      break;
    case 'nearest':
      sorted.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) return a.distanceKm - b.distanceKm;
        if (a.distanceKm !== undefined) return -1;
        if (b.distanceKm !== undefined) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }
  return sorted;
}

function assertCanPublish(member: User): void {
  if (member.role !== 'admin' && member.status !== 'approved') {
    throw new Error('Only verified members can publish listings. Your account verification is not approved.');
  }
}

function validateInput(input: CreateProductInput): void {
  if (!input.name.trim()) throw new Error('Please enter a title.');
  if (input.description.trim().length < 15) {
    throw new Error('Please enter a detailed description (at least 15 characters).');
  }
  if (isProductListing(input.listingType) && !input.condition) {
    throw new Error('Please choose the condition (New or Used) for this product.');
  }
  if (input.listingType !== 'Posts' && (isNaN(Number(input.price)) || Number(input.price) < 0)) {
    throw new Error('Please enter a valid price in ETB.');
  }
  if (!input.locationCity.trim() || !input.locationSubCity.trim()) {
    throw new Error('Please provide the city and area of this listing.');
  }
}

export const productApi = {
  /** Publicly visible listings: status `active` only. */
  async getPublicProducts(filters: ProductFilters = {}, limit: number = 50, offset: number = 0): Promise<Product[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('status', PUBLIC_DB_STATUSES)
          .or('is_available.eq.true,is_available.is.null')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase getPublicProducts error:', error);
          return [];
        }
        const all = (data || []).map(mapSupabaseProduct).filter((p) => p.status === 'active');
        return applyFilters(all, filters).slice(offset, offset + limit);
      } catch (err) {
        console.error('Supabase getPublicProducts exception:', err);
        return [];
      }
    }

    // Local storage fallback only if Supabase is unconfigured
    const data = loadStorageData();
    const visible = data.products.filter((p) => p.status === 'active');
    return simulateLatency(applyFilters(visible, filters).slice(offset, offset + limit), 120);
  },

  async getFeaturedProducts(): Promise<Product[]> {
    const publicProducts = await this.getPublicProducts();
    const featured = publicProducts.filter((p) => p.isFeatured);
    return simulateLatency(featured.length > 0 ? featured : publicProducts.slice(0, 4), 100);
  },

  async getRecentlyAddedProducts(limit = 4): Promise<Product[]> {
    const publicProducts = await this.getPublicProducts({ sortBy: 'newest' });
    return simulateLatency(publicProducts.slice(0, limit), 100);
  },

  async getPopularProducts(limit = 4): Promise<Product[]> {
    const publicProducts = await this.getPublicProducts({ sortBy: 'popular' });
    return simulateLatency(publicProducts.slice(0, limit), 100);
  },

  async getProductById(id: string): Promise<Product | null> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();

        if (error || !data) {
          return null;
        }

        try {
          await supabase.rpc('increment_product_views', { product_id_param: id });
        } catch {
          // Non-critical view counter increment
        }
        const mapped = mapSupabaseProduct(data);
        mapped.viewsCount = (mapped.viewsCount || 0) + 1;
        return mapped;
      } catch (err) {
        console.error('Supabase getProductById error:', err);
        return null;
      }
    }

    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) return simulateLatency(null, 100);

    data.products[index].viewsCount = (data.products[index].viewsCount || 0) + 1;
    saveStorageData(data);

    return simulateLatency(data.products[index], 100);
  },

  /**
   * Listings owned by a member. `publicOnly` limits the result to what other
   * members can see (used on public member pages); My Ads passes `false`.
   */
  async getMemberProducts(
    memberId: string,
    options: { publicOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<Product[]> {
    const { publicOnly = false, limit = 50, offset = 0 } = options;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', memberId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase getMemberProducts error:', error);
          return [];
        }
        const items = (data || []).map(mapSupabaseProduct).filter((p) => !publicOnly || p.status === 'active');
        return items.slice(offset, offset + limit);
      } catch (err) {
        console.error('Supabase getMemberProducts error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    const products = data.products
      .filter((p) => p.sellerId === memberId)
      .filter((p) => !publicOnly || p.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return simulateLatency(products.slice(offset, offset + limit), 120);
  },

  async getAllProductsAdmin(filters?: {
    status?: ListingStatus | 'all';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    const supabase = getSupabase();

    let all: Product[];
    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase getAllProductsAdmin error:', error);
          return [];
        }
        all = (data || []).map(mapSupabaseProduct);
      } catch (err) {
        console.error('Supabase getAllProductsAdmin error:', err);
        return [];
      }
    } else {
      all = [...loadStorageData().products].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    let results = all;
    if (filters?.status && filters.status !== 'all') {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    return supabase ? results.slice(offset, offset + limit) : simulateLatency(results.slice(offset, offset + limit), 150);
  },

  /** Publishes immediately for approved members (no admin approval). */
  async createListing(member: User, input: CreateProductInput): Promise<Product> {
    assertCanPublish(member);
    validateInput(input);

    const now = new Date().toISOString();
    const listingType = input.listingType;
    const isProduct = isProductListing(listingType);

    const supabase = getSupabase();
    // Local demo data is only read when no Supabase project is configured.
    const data = supabase ? null : loadStorageData();

    let ownerName = member.name;
    if (supabase) {
      const { data: business } = await supabase
        .from('seller_profiles')
        .select('store_name')
        .or(`user_id.eq.${member.id},id.eq.${member.id}`)
        .maybeSingle();
      if (business?.store_name) ownerName = business.store_name;
    } else if (data) {
      const profile = data.memberProfiles.find((m) => m.userId === member.id);
      if (profile?.businessName) ownerName = profile.businessName;
    }

    const product: Product = {
      id: `prod-${Date.now()}`,
      sellerId: member.id,
      sellerName: ownerName,
      sellerPhone: input.contactPhone?.trim() || member.phone,
      sellerLocation: `${input.locationSubCity}, ${input.locationCity}`,
      name: input.name.trim(),
      description: input.description.trim(),
      price: listingType === 'Posts' ? 0 : Number(input.price),
      listingType,
      condition: isProduct ? input.condition : undefined,
      quantity: isProduct ? Math.max(0, Number(input.quantity) || 0) : 1,
      isSoldOut: isProduct ? Boolean(input.isSoldOut) : false,
      images: input.images && input.images.length > 0 ? input.images : [DEFAULT_IMAGE],
      status: 'active',
      viewsCount: 0,
      locationCity: input.locationCity,
      locationSubCity: input.locationSubCity,
      addressDescription: input.addressDescription?.trim() || undefined,
      latitude: input.latitude,
      longitude: input.longitude,
      isStartingPrice: isServiceListing(listingType) ? Boolean(input.isStartingPrice) : false,
      serviceCoverage: isServiceListing(listingType) ? input.serviceCoverage || 'atLocation' : undefined,
      serviceCoverageNote: isServiceListing(listingType) ? input.serviceCoverageNote?.trim() || undefined : undefined,
      createdAt: now,
      updatedAt: now,
    };

    if (supabase) {
      await writeProduct(product, 'insert');
      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: member.name,
        actor_role: member.role,
        action: 'PUBLISH_LISTING',
        details: `Published listing "${product.name}" (ETB ${product.price}).`,
        created_at: now,
      });
      return product;
    }

    if (!data) throw new Error('Listing could not be saved.');
    data.products.unshift(product);
    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: member.name,
      actorRole: member.role,
      action: 'PUBLISH_LISTING',
      details: `Published listing "${product.name}" (ETB ${product.price}).`,
      createdAt: now,
    });
    saveStorageData(data);
    return simulateLatency(product, 200);
  },

  /** Owner edit. Keeps the listing's current status (no re-approval). */
  async updateListing(id: string, editor: User, input: CreateProductInput): Promise<Product> {
    assertCanPublish(editor);
    validateInput(input);
    const existing = await this.getOwnedListing(id, editor);
    if (isModeratedStatus(existing.status)) {
      throw new Error(`This listing was ${existing.status} by the moderation team and cannot be edited.`);
    }

    const isProduct = isProductListing(input.listingType);
    const updated: Product = {
      ...existing,
      name: input.name.trim(),
      description: input.description.trim(),
      price: input.listingType === 'Posts' ? 0 : Number(input.price),
      listingType: input.listingType,
      condition: isProduct ? input.condition : undefined,
      quantity: isProduct ? Math.max(0, Number(input.quantity) || 0) : 1,
      isSoldOut: isProduct ? Boolean(input.isSoldOut) : false,
      images: input.images && input.images.length > 0 ? input.images : existing.images,
      sellerPhone: input.contactPhone?.trim() || existing.sellerPhone,
      sellerLocation: `${input.locationSubCity}, ${input.locationCity}`,
      locationCity: input.locationCity,
      locationSubCity: input.locationSubCity,
      addressDescription: input.addressDescription?.trim() || undefined,
      latitude: input.latitude,
      longitude: input.longitude,
      isStartingPrice: isServiceListing(input.listingType) ? Boolean(input.isStartingPrice) : false,
      serviceCoverage: isServiceListing(input.listingType) ? input.serviceCoverage || 'atLocation' : undefined,
      serviceCoverageNote: isServiceListing(input.listingType) ? input.serviceCoverageNote?.trim() || undefined : undefined,
      updatedAt: new Date().toISOString(),
    };

    return this.saveListing(updated);
  },

  /** Owner can hide an active listing or show a hidden one again. */
  async setOwnerVisibility(id: string, editor: User, visible: boolean): Promise<Product> {
    assertCanPublish(editor);
    const existing = await this.getOwnedListing(id, editor);
    if (isModeratedStatus(existing.status)) {
      throw new Error(`This listing was ${existing.status} by the moderation team and cannot be changed.`);
    }
    if (existing.moderationNote && existing.status === 'hidden' && visible) {
      throw new Error('This listing was hidden by the moderation team. Please contact support.');
    }
    return this.saveListing({ ...existing, status: visible ? 'active' : 'hidden', updatedAt: new Date().toISOString() });
  },

  /** Owner marks a physical item as sold out / available again. */
  async setSoldOut(id: string, editor: User, soldOut: boolean): Promise<Product> {
    assertCanPublish(editor);
    const existing = await this.getOwnedListing(id, editor);
    if (isModeratedStatus(existing.status)) {
      throw new Error(`This listing was ${existing.status} by the moderation team and cannot be changed.`);
    }
    return this.saveListing({ ...existing, isSoldOut: soldOut, updatedAt: new Date().toISOString() });
  },

  /** Loads a listing and checks that `editor` owns it (admins may manage any). */
  async getOwnedListing(id: string, editor: User): Promise<Product> {
    const supabase = getSupabase();
    let existing: Product | null = null;
    if (supabase) {
      const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      existing = data ? mapSupabaseProduct(data) : null;
    } else {
      existing = loadStorageData().products.find((p) => p.id === id) || null;
    }
    if (!existing) throw new Error('Listing not found.');
    if (existing.sellerId !== editor.id && editor.role !== 'admin') {
      throw new Error('Unauthorized: You can only manage your own listings.');
    }
    return existing;
  },

  async saveListing(updated: Product): Promise<Product> {
    const supabase = getSupabase();
    if (supabase) {
      await writeProduct(updated, 'update');
      return updated;
    }
    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === updated.id);
    if (index === -1) throw new Error('Listing not found.');
    data.products[index] = updated;
    saveStorageData(data);
    return simulateLatency(updated, 150);
  },

  /** Administrator edit of listing details (moderation dashboard). */
  async adminUpdateProduct(id: string, updates: Partial<Product>, adminUser?: User): Promise<Product> {
    const supabase = getSupabase();
    let existing: Product | null = null;
    if (supabase) {
      const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      existing = data ? mapSupabaseProduct(data) : null;
    } else {
      existing = loadStorageData().products.find((p) => p.id === id) || null;
    }
    if (!existing) throw new Error('Listing not found.');
    const updated = await this.saveListing({ ...existing, ...updates, id, updatedAt: new Date().toISOString() });
    await logAdminAction(adminUser, 'ADMIN_UPDATE_LISTING', `Updated details of listing "${updated.name}".`);
    return updated;
  },

  // -------------------------------------------------------------------------
  // Report-driven moderation (administrators only)
  // -------------------------------------------------------------------------

  async moderateListing(
    id: string,
    status: ListingStatus,
    note: string | undefined,
    adminUser?: User
  ): Promise<Product> {
    if (adminUser && adminUser.role !== 'admin') {
      throw new Error('Only administrators can moderate listings.');
    }
    const supabase = getSupabase();
    let existing: Product | null = null;
    if (supabase) {
      const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      existing = data ? mapSupabaseProduct(data) : null;
    } else {
      existing = loadStorageData().products.find((p) => p.id === id) || null;
    }
    if (!existing) throw new Error('Listing not found.');

    const updated: Product = {
      ...existing,
      status,
      moderationNote: status === 'active' ? undefined : note?.trim() || existing.moderationNote,
      updatedAt: new Date().toISOString(),
    };

    if (supabase) {
      await writeProduct(updated, 'update');
      // Keep the moderation note in the current `rejection_reason` column.
      await supabase
        .from('products')
        .update({ rejection_reason: updated.moderationNote ?? null })
        .eq('id', id);
    } else {
      const data = loadStorageData();
      const index = data.products.findIndex((p) => p.id === id);
      data.products[index] = updated;
      saveStorageData(data);
    }

    const verb =
      status === 'active' ? 'restored' : status === 'hidden' ? 'hidden' : status === 'suspended' ? 'suspended' : 'removed';
    await notifyOwner(updated, verb, note);
    await logAdminAction(
      adminUser,
      `LISTING_${verb.toUpperCase()}`,
      `Listing "${updated.name}" ${verb}.${note ? ` Note: ${note}` : ''}`
    );
    return updated;
  },

  hideListing(id: string, note: string | undefined, adminUser?: User) {
    return this.moderateListing(id, 'hidden', note, adminUser);
  },

  suspendListing(id: string, note: string, adminUser?: User) {
    return this.moderateListing(id, 'suspended', note, adminUser);
  },

  /** Removes a listing from the marketplace (kept for the audit trail). */
  removeListing(id: string, note: string, adminUser?: User) {
    return this.moderateListing(id, 'removed', note, adminUser);
  },

  restoreListing(id: string, adminUser?: User) {
    return this.moderateListing(id, 'active', undefined, adminUser);
  },

  /** Permanently deletes a listing (owner, or administrator when necessary). */
  async deleteProduct(id: string, actorId: string, actorRole: string): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from('products').delete().eq('id', id);
      if (actorRole !== 'admin') query = query.eq('seller_id', actorId);
      const { error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Listing not found.');

    const product = data.products[index];
    if (actorRole !== 'admin' && product.sellerId !== actorId) {
      throw new Error('Unauthorized: You can only remove your own listings.');
    }

    data.products.splice(index, 1);
    saveStorageData(data);
    return simulateLatency(undefined, 150);
  },
};

async function notifyOwner(product: Product, verb: string, note?: string): Promise<void> {
  const now = new Date().toISOString();
  const type =
    verb === 'restored'
      ? 'listing_restored'
      : verb === 'hidden'
        ? 'listing_hidden'
        : verb === 'suspended'
          ? 'listing_suspended'
          : 'listing_removed';
  const title = `Your ad was ${verb}`;
  const message = `"${product.name}" was ${verb} by the moderation team.${note ? ` Reason: ${note}` : ''}`;
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('notifications').insert({
      id: `notif-${Date.now()}`,
      user_id: product.sellerId,
      title,
      message,
      type,
      is_read: false,
      link_to: '/account/ads',
      created_at: now,
    });
    return;
  }
  const data = loadStorageData();
  data.notifications.unshift({
    id: `notif-${Date.now()}`,
    userId: product.sellerId,
    title,
    message,
    type,
    isRead: false,
    linkTo: '/account/ads',
    createdAt: now,
  });
  saveStorageData(data);
}

async function logAdminAction(adminUser: User | undefined, action: string, details: string): Promise<void> {
  const now = new Date().toISOString();
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('activity_logs').insert({
      id: `act-${Date.now()}`,
      actor_name: adminUser?.name || 'Administrator',
      actor_role: 'admin',
      action,
      details,
      created_at: now,
    });
    return;
  }
  const data = loadStorageData();
  data.activityLogs.unshift({
    id: `act-${Date.now()}`,
    actorName: adminUser?.name || 'Administrator',
    actorRole: 'admin',
    action,
    details,
    createdAt: now,
  });
  saveStorageData(data);
}
