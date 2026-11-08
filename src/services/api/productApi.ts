import type { Product, ProductFilters, ProductStatus, ProductCondition, ListingType, User } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  listingType?: ListingType;
  condition: ProductCondition;
  quantity: number;
  images: string[];
  location?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
}

function mapSupabaseProduct(p: any): Product {
  return {
    id: p.id,
    sellerId: p.seller_id,
    sellerName: p.seller_name,
    sellerPhone: p.seller_phone || '',
    sellerLocation: p.seller_location || `${p.location_sub_city || 'Bole'}, ${p.location_city || 'Addis Ababa'}`,
    name: p.name || p.title,
    description: p.description || '',
    price: Number(p.price) || 0,
    categoryId: p.category_id,
    categoryName: p.category_name || 'Other',
    listingType: (p.listing_type as ListingType) || 'New spares',
    condition: p.condition || 'new',
    quantity: p.quantity ?? 1,
    images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
    status: p.status as ProductStatus,
    rejectionReason: p.rejection_reason,
    isFeatured: p.is_featured || false,
    viewsCount: p.views_count || 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at || p.created_at,
  };
}

export const productApi = {
  async getPublicProducts(
    filters: ProductFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<Product[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        let query = supabase
          .from('products')
          .select('*')
          .eq('status', 'approved')
          .or('is_available.eq.true,is_available.is.null');

        if (filters.search && filters.search.trim()) {
          const q = filters.search.trim();
          query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,category_name.ilike.%${q}%`);
        }

        if (filters.categoryId && filters.categoryId !== 'all') {
          query = query.eq('category_id', filters.categoryId);
        }

        if (filters.condition && filters.condition !== 'all') {
          query = query.eq('condition', filters.condition);
        }

        if (typeof filters.minPrice === 'number' && !isNaN(filters.minPrice)) {
          query = query.gte('price', filters.minPrice);
        }

        if (typeof filters.maxPrice === 'number' && !isNaN(filters.maxPrice)) {
          query = query.lte('price', filters.maxPrice);
        }

        if (filters.inStockOnly) {
          query = query.gt('quantity', 0);
        }

        if (filters.location && filters.location.trim()) {
          const loc = filters.location.trim();
          query = query.or(`location_city.ilike.%${loc}%,location_sub_city.ilike.%${loc}%,seller_location.ilike.%${loc}%`);
        }

        switch (filters.sortBy) {
          case 'price_asc':
            query = query.order('price', { ascending: true });
            break;
          case 'price_desc':
            query = query.order('price', { ascending: false });
            break;
          case 'popular':
            query = query.order('views_count', { ascending: false });
            break;
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        const { data, error } = await query.range(offset, offset + limit - 1);
        if (error) {
          console.error('Supabase getPublicProducts error:', error);
          return [];
        }
        return (data || []).map(mapSupabaseProduct);
      } catch (err) {
        console.error('Supabase getPublicProducts exception:', err);
        return [];
      }
    }

    // Local storage fallback only if Supabase is unconfigured
    const data = loadStorageData();
    const approvedSellerIds = new Set(
      data.sellerProfiles.filter((s) => s.status === 'approved').map((s) => s.userId)
    );

    let results = data.products.filter(
      (p) => p.status === 'approved' && approvedSellerIds.has(p.sellerId)
    );

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    if (filters.categoryId && filters.categoryId !== 'all') {
      results = results.filter((p) => p.categoryId === filters.categoryId);
    }

    if (filters.condition && filters.condition !== 'all') {
      results = results.filter((p) => p.condition === filters.condition);
    }

    if (typeof filters.minPrice === 'number' && !isNaN(filters.minPrice)) {
      results = results.filter((p) => p.price >= filters.minPrice!);
    }

    if (typeof filters.maxPrice === 'number' && !isNaN(filters.maxPrice)) {
      results = results.filter((p) => p.price <= filters.maxPrice!);
    }

    if (filters.inStockOnly) {
      results = results.filter((p) => p.quantity > 0);
    }

    if (filters.location && filters.location.trim()) {
      const loc = filters.location.trim().toLowerCase();
      results = results.filter((p) => p.sellerLocation.toLowerCase().includes(loc));
    }

    switch (filters.sortBy) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        results.sort((a, b) => b.viewsCount - a.viewsCount);
        break;
      case 'newest':
      default:
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return simulateLatency(results.slice(offset, offset + limit), 120);
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
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

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

  async getSellerProducts(
    sellerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Product[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Supabase getSellerProducts error:', error);
          return [];
        }
        return (data || []).map(mapSupabaseProduct);
      } catch (err) {
        console.error('Supabase getSellerProducts error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    const products = data.products
      .filter((p) => p.sellerId === sellerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return simulateLatency(products.slice(offset, offset + limit), 120);
  },

  async getAllProductsAdmin(filters?: {
    status?: ProductStatus | 'all';
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    const supabase = getSupabase();

    if (supabase) {
      try {
        let query = supabase.from('products').select('*');

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        if (filters?.categoryId && filters.categoryId !== 'all') {
          query = query.eq('category_id', filters.categoryId);
        }

        if (filters?.search && filters.search.trim()) {
          const q = filters.search.trim();
          query = query.or(`name.ilike.%${q}%,seller_name.ilike.%${q}%,description.ilike.%${q}%`);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) {
          console.error('Supabase getAllProductsAdmin error:', error);
          return [];
        }
        return (data || []).map(mapSupabaseProduct);
      } catch (err) {
        console.error('Supabase getAllProductsAdmin error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    let results = [...data.products];

    if (filters?.status && filters.status !== 'all') {
      results = results.filter((p) => p.status === filters.status);
    }

    if (filters?.categoryId && filters.categoryId !== 'all') {
      results = results.filter((p) => p.categoryId === filters.categoryId);
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

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return simulateLatency(results.slice(offset, offset + limit), 150);
  },

  async createProduct(sellerId: string, input: CreateProductInput): Promise<Product> {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    const productId = `prod-${Date.now()}`;
    const defaultImg =
      input.images && input.images.length > 0
        ? input.images
        : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'];

    if (supabase) {
      // Fetch seller profile to get store name & location
      const { data: seller } = await supabase
        .from('seller_profiles')
        .select('*')
        .or(`user_id.eq.${sellerId},id.eq.${sellerId}`)
        .maybeSingle();

      const { data: userProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .maybeSingle();

      const isAdmin = userProf?.role === 'admin';
      const sellerName = seller?.store_name || userProf?.name || 'Merchant Store';
      const sellerPhone = input.contactPhone || seller?.phone || userProf?.phone || '+251911000000';
      const sellerLocation = input.location || seller?.location || 'Addis Ababa, Bole';

      // Fetch category name
      let categoryName = 'Other';
      if (input.categoryId) {
        const { data: cat } = await supabase.from('categories').select('name').eq('id', input.categoryId).maybeSingle();
        if (cat) categoryName = cat.name;
      }

      const listingType: ListingType = input.listingType || 'New spares';
      const effectivePrice = listingType === 'Posts' ? 0 : Number(input.price);

      const newProduct: Product = {
        id: productId,
        sellerId,
        sellerName,
        sellerPhone,
        sellerLocation,
        name: input.name.trim(),
        description: input.description.trim(),
        price: effectivePrice,
        categoryId: input.categoryId,
        categoryName,
        listingType,
        condition: input.condition,
        quantity: Number(input.quantity) || 1,
        images: defaultImg,
        status: 'pending',
        viewsCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const safeCategoryId = (!newProduct.categoryId || newProduct.categoryId === 'cat_electronics') ? 'cat-1' : newProduct.categoryId;

      let { error } = await supabase.from('products').insert({
        id: productId,
        seller_id: sellerId,
        seller_name: newProduct.sellerName,
        seller_phone: newProduct.sellerPhone,
        seller_location: newProduct.sellerLocation,
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        category_id: safeCategoryId,
        category_name: newProduct.categoryName,
        listing_type: listingType,
        condition: newProduct.condition,
        quantity: newProduct.quantity,
        images: newProduct.images,
        location_city: 'Addis Ababa',
        location_sub_city: 'Bole',
        latitude: input.latitude || 8.9950,
        longitude: input.longitude || 38.7880,
        status: newProduct.status,
        views_count: 0,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        console.warn('Initial product insert error, trying fallback:', error.message);
        // Fallback for databases with legacy listing_type check constraint ('product', 'service')
        const fallbackType = listingType === 'Services' ? 'service' : 'product';
        const fallbackRes = await supabase.from('products').insert({
          id: productId,
          seller_id: sellerId,
          seller_name: newProduct.sellerName,
          seller_phone: newProduct.sellerPhone,
          seller_location: newProduct.sellerLocation,
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          category_id: 'cat-1',
          category_name: newProduct.categoryName,
          listing_type: fallbackType,
          condition: newProduct.condition,
          quantity: newProduct.quantity,
          images: newProduct.images,
          location_city: 'Addis Ababa',
          location_sub_city: 'Bole',
          latitude: input.latitude || 8.9950,
          longitude: input.longitude || 38.7880,
          status: newProduct.status,
          views_count: 0,
          created_at: now,
          updated_at: now,
        });

        if (fallbackRes.error) {
          throw new Error(fallbackRes.error.message || error.message);
        }
      }

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: newProduct.sellerName,
        actor_role: isAdmin ? 'admin' : 'seller',
        action: 'SUBMIT_PRODUCT',
        details: `Submitted product "${newProduct.name}" ($${newProduct.price}) to Supabase.`,
        created_at: now,
      });

      return newProduct;
    }

    const data = loadStorageData();
    let seller = data.sellerProfiles.find((s) => s.userId === sellerId || s.id === sellerId);

    const category = data.categories.find((c) => c.id === input.categoryId);
    const categoryName = category ? category.name : 'Other';

    const newProduct: Product = {
      id: productId,
      sellerId,
      sellerName: seller?.storeName || 'Merchant Store',
      sellerPhone: input.contactPhone || seller?.phone || '+251911000000',
      sellerLocation: input.location || seller?.location || 'Addis Ababa',
      name: input.name.trim(),
      description: input.description.trim(),
      price: Number(input.price),
      categoryId: input.categoryId,
      categoryName,
      condition: input.condition,
      quantity: Number(input.quantity) || 1,
      images: defaultImg,
      status: 'pending',
      viewsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    data.products.unshift(newProduct);
    saveStorageData(data);
    return simulateLatency(newProduct, 200);
  },

  async updateProduct(
    id: string,
    sellerId: string,
    updates: Partial<Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'createdAt'>>
  ): Promise<Product> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      const payload: any = { updated_at: now };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
      if (updates.condition !== undefined) payload.condition = updates.condition;
      if (updates.quantity !== undefined) payload.quantity = updates.quantity;
      if (updates.images !== undefined) payload.images = updates.images;
      if (updates.listingType !== undefined) payload.listing_type = updates.listingType;
      if (updates.status !== undefined) payload.status = updates.status;

      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return mapSupabaseProduct(data);
    }

    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    const current = data.products[index];
    const user = data.users.find((u) => u.id === sellerId);
    const isAdmin = user?.role === 'admin';
    if (current.sellerId !== sellerId && !isAdmin) {
      throw new Error('Unauthorized: You can only edit your own products.');
    }

    const updated: Product = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    data.products[index] = updated;
    saveStorageData(data);
    return simulateLatency(updated, 150);
  },

  async adminUpdateProduct(id: string, updates: Partial<Product>, adminUser?: User): Promise<Product> {
    const updated = await this.updateProduct(id, updates.sellerId || '', updates);
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: adminUser?.name || 'Administrator',
        actor_role: 'admin',
        action: 'ADMIN_UPDATE_PRODUCT',
        details: `Admin updated details for product "${updated.name}" in Supabase.`,
        created_at: new Date().toISOString(),
      }).then(() => {});
    }
    return updated;
  },

  async approveProduct(id: string, adminUser?: User): Promise<Product> {
    const now = new Date().toISOString();
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .update({ status: 'approved', rejection_reason: null, updated_at: now })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: adminUser?.name || 'Administrator',
        actor_role: 'admin',
        action: 'APPROVE_PRODUCT',
        details: `Approved product ID "${id}" in Supabase.`,
        created_at: now,
      });

      return mapSupabaseProduct(data);
    }

    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    data.products[index].status = 'approved';
    data.products[index].rejectionReason = undefined;
    data.products[index].updatedAt = now;

    saveStorageData(data);
    return simulateLatency(data.products[index], 150);
  },

  async rejectProduct(id: string, reason: string, adminUser?: User): Promise<Product> {
    const now = new Date().toISOString();
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .update({ status: 'rejected', rejection_reason: reason.trim(), updated_at: now })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: adminUser?.name || 'Administrator',
        actor_role: 'admin',
        action: 'REJECT_PRODUCT',
        details: `Rejected product ID "${id}". Reason: ${reason}`,
        created_at: now,
      });

      return mapSupabaseProduct(data);
    }

    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    data.products[index].status = 'rejected';
    data.products[index].rejectionReason = reason.trim();
    data.products[index].updatedAt = now;

    saveStorageData(data);
    return simulateLatency(data.products[index], 150);
  },

  async deleteProduct(id: string, actorId: string, actorRole: string): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    const product = data.products[index];
    if (actorRole !== 'admin' && product.sellerId !== actorId) {
      throw new Error('Unauthorized: You can only remove your own products.');
    }

    data.products.splice(index, 1);
    saveStorageData(data);
    return simulateLatency(undefined, 150);
  },
};
