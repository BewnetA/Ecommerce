import type { Product, ProductFilters, ProductStatus, ProductCondition, User } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  condition: ProductCondition;
  quantity: number;
  images: string[];
  location?: string;
  contactPhone?: string;
}

export const productApi = {
  async getPublicProducts(filters: ProductFilters = {}): Promise<Product[]> {
    const data = loadStorageData();

    // Find all currently approved sellers
    const approvedSellerIds = new Set(
      data.sellerProfiles.filter((s) => s.status === 'approved').map((s) => s.userId)
    );

    // Rule: Only approved products belonging to approved sellers appear publicly
    let results = data.products.filter(
      (p) => p.status === 'approved' && approvedSellerIds.has(p.sellerId)
    );

    // Search by name / keyword
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filters.categoryId && filters.categoryId !== 'all') {
      results = results.filter((p) => p.categoryId === filters.categoryId);
    }

    // Condition filter
    if (filters.condition && filters.condition !== 'all') {
      results = results.filter((p) => p.condition === filters.condition);
    }

    // Min price
    if (typeof filters.minPrice === 'number' && !isNaN(filters.minPrice)) {
      results = results.filter((p) => p.price >= filters.minPrice!);
    }

    // Max price
    if (typeof filters.maxPrice === 'number' && !isNaN(filters.maxPrice)) {
      results = results.filter((p) => p.price <= filters.maxPrice!);
    }

    // In-stock only
    if (filters.inStockOnly) {
      results = results.filter((p) => p.quantity > 0);
    }

    // Location filter
    if (filters.location && filters.location.trim()) {
      const loc = filters.location.trim().toLowerCase();
      results = results.filter((p) => p.sellerLocation.toLowerCase().includes(loc));
    }

    // Sorting
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

    return simulateLatency(results, 120);
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
    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) return simulateLatency(null, 100);

    // Increment view count
    data.products[index].viewsCount = (data.products[index].viewsCount || 0) + 1;
    saveStorageData(data);

    return simulateLatency(data.products[index], 100);
  },

  async getSellerProducts(sellerId: string): Promise<Product[]> {
    const data = loadStorageData();
    const products = data.products
      .filter((p) => p.sellerId === sellerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return simulateLatency(products, 120);
  },

  async getAllProductsAdmin(filters?: {
    status?: ProductStatus | 'all';
    categoryId?: string;
    search?: string;
  }): Promise<Product[]> {
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
    return simulateLatency(results, 150);
  },

  async createProduct(sellerId: string, input: CreateProductInput): Promise<Product> {
    const data = loadStorageData();

    // Verify seller is approved
    const seller = data.sellerProfiles.find((s) => s.userId === sellerId || s.id === sellerId);
    if (!seller) {
      throw new Error('Seller profile not found.');
    }
    if (seller.status !== 'approved') {
      throw new Error(
        `Seller account status is "${seller.status}". Only approved sellers are authorized to publish products.`
      );
    }

    if (!input.name.trim() || input.price <= 0 || !input.categoryId) {
      throw new Error('Product title, a valid positive price, and category are required.');
    }

    const category = data.categories.find((c) => c.id === input.categoryId);
    const categoryName = category ? category.name : 'Other';

    const defaultImg =
      input.images && input.images.length > 0
        ? input.images
        : [
            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
          ];

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sellerId: seller.userId,
      sellerName: seller.storeName,
      sellerPhone: input.contactPhone || seller.phone,
      sellerLocation: input.location || seller.location,
      name: input.name.trim(),
      description: input.description.trim(),
      price: Number(input.price),
      categoryId: input.categoryId,
      categoryName,
      condition: input.condition,
      quantity: Number(input.quantity) || 1,
      images: defaultImg,
      status: 'pending', // Product begins in pending status!
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.products.unshift(newProduct);

    // Notify Administrator
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'user-admin',
      title: 'New Product Pending Approval',
      message: `Seller "${seller.storeName}" submitted a new product: "${newProduct.name}".`,
      type: 'system',
      isRead: false,
      linkTo: '/admin/products/approvals',
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: seller.storeName,
      actorRole: 'seller',
      action: 'SUBMIT_PRODUCT',
      details: `Submitted product "${newProduct.name}" ($${newProduct.price}) for admin approval.`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(newProduct, 200);
  },

  async updateProduct(
    id: string,
    sellerId: string,
    updates: Partial<Omit<Product, 'id' | 'sellerId' | 'sellerName' | 'createdAt'>>
  ): Promise<Product> {
    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    const current = data.products[index];
    if (current.sellerId !== sellerId) {
      throw new Error('Unauthorized: You can only edit your own products.');
    }

    // Business rule: Editing an approved product resets to 'pending' for re-moderation
    const requiresReapproval = current.status === 'approved';
    const newStatus: ProductStatus = requiresReapproval ? 'pending' : current.status;

    let categoryName = current.categoryName;
    if (updates.categoryId && updates.categoryId !== current.categoryId) {
      const cat = data.categories.find((c) => c.id === updates.categoryId);
      if (cat) categoryName = cat.name;
    }

    const updated: Product = {
      ...current,
      ...updates,
      categoryName,
      status: newStatus,
      rejectionReason: requiresReapproval ? undefined : current.rejectionReason,
      updatedAt: new Date().toISOString(),
    };

    data.products[index] = updated;

    if (requiresReapproval) {
      data.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: 'user-admin',
        title: 'Product Edited (Requires Re-approval)',
        message: `Product "${updated.name}" was modified by seller and needs re-approval.`,
        type: 'system',
        isRead: false,
        linkTo: '/admin/products/approvals',
        createdAt: new Date().toISOString(),
      });
    }

    saveStorageData(data);
    return simulateLatency(updated, 150);
  },

  async adminUpdateProduct(id: string, updates: Partial<Product>, adminUser?: User): Promise<Product> {
    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    const current = data.products[index];
    let categoryName = current.categoryName;
    if (updates.categoryId && updates.categoryId !== current.categoryId) {
      const cat = data.categories.find((c) => c.id === updates.categoryId);
      if (cat) categoryName = cat.name;
    }

    const updated: Product = {
      ...current,
      ...updates,
      categoryName,
      updatedAt: new Date().toISOString(),
    };

    data.products[index] = updated;

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_PRODUCT',
      details: `Admin updated details for product "${updated.name}"`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(updated, 150);
  },

  async approveProduct(id: string, adminUser?: User): Promise<Product> {
    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    data.products[index].status = 'approved';
    data.products[index].rejectionReason = undefined;
    data.products[index].updatedAt = new Date().toISOString();

    const product = data.products[index];

    // Notification to seller
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: product.sellerId,
      title: 'Product Approved!',
      message: `Your product "${product.name}" has been approved and is now live on the marketplace!`,
      type: 'product_approved',
      isRead: false,
      linkTo: `/products/${product.id}`,
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'APPROVE_PRODUCT',
      details: `Approved product "${product.name}" for public listing.`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(product, 150);
  },

  async rejectProduct(id: string, reason: string, adminUser?: User): Promise<Product> {
    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    if (!reason.trim()) {
      throw new Error('A reason for rejection must be provided.');
    }

    data.products[index].status = 'rejected';
    data.products[index].rejectionReason = reason.trim();
    data.products[index].updatedAt = new Date().toISOString();

    const product = data.products[index];

    // Notification to seller
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: product.sellerId,
      title: 'Product Rejected',
      message: `Your product "${product.name}" was rejected. Reason: ${reason}`,
      type: 'product_rejected',
      isRead: false,
      linkTo: '/seller/products',
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'REJECT_PRODUCT',
      details: `Rejected product "${product.name}". Reason: ${reason}`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(product, 150);
  },

  async deleteProduct(id: string, actorId: string, actorRole: string): Promise<void> {
    const data = loadStorageData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    const product = data.products[index];
    if (actorRole !== 'admin' && product.sellerId !== actorId) {
      throw new Error('Unauthorized: You can only remove your own products.');
    }

    data.products.splice(index, 1);

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: actorRole === 'admin' ? 'Administrator' : product.sellerName,
      actorRole: actorRole as any,
      action: 'DELETE_PRODUCT',
      details: `Removed product "${product.name}" (${id}) from platform.`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(undefined, 150);
  },
};
