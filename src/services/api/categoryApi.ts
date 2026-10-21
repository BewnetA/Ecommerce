import type { Category } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';

export interface CategoryWithCount extends Category {
  productCount: number;
}

export const categoryApi = {
  async getCategories(): Promise<CategoryWithCount[]> {
    const data = loadStorageData();
    const approvedProducts = data.products.filter((p) => p.status === 'approved');

    const result = data.categories.map((cat) => ({
      ...cat,
      productCount: approvedProducts.filter((p) => p.categoryId === cat.id).length,
    }));

    return simulateLatency(result, 100);
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const data = loadStorageData();
    const found = data.categories.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
    return simulateLatency(found || null, 80);
  },

  async createCategory(input: {
    name: string;
    slug?: string;
    description: string;
    iconName?: string;
    imageUrl?: string;
  }): Promise<Category> {
    const data = loadStorageData();

    if (!input.name.trim()) {
      throw new Error('Category name is required.');
    }

    const slug = (input.slug?.trim() || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    if (data.categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase())) {
      throw new Error(`Category with slug "${slug}" already exists.`);
    }

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: input.name.trim(),
      slug,
      description: input.description.trim(),
      iconName: input.iconName || 'Package',
      imageUrl: input.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
    };

    data.categories.push(newCategory);

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'CREATE_CATEGORY',
      details: `Created new category: "${newCategory.name}"`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(newCategory, 150);
  },

  async updateCategory(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'createdAt'>>
  ): Promise<Category> {
    const data = loadStorageData();
    const index = data.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Category not found.');

    const current = data.categories[index];
    const updated: Category = {
      ...current,
      ...updates,
    };

    data.categories[index] = updated;

    // If name changed, update product categoryName in cache
    if (updates.name && updates.name !== current.name) {
      data.products.forEach((p) => {
        if (p.categoryId === id) {
          p.categoryName = updates.name!;
        }
      });
    }

    saveStorageData(data);
    return simulateLatency(updated, 150);
  },

  async deleteCategory(id: string): Promise<void> {
    const data = loadStorageData();
    const index = data.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Category not found.');

    const productsCount = data.products.filter((p) => p.categoryId === id).length;
    if (productsCount > 0) {
      throw new Error(
        `Cannot delete category "${data.categories[index].name}" because ${productsCount} products are assigned to it. Reassign or remove the products first.`
      );
    }

    const removedName = data.categories[index].name;
    data.categories.splice(index, 1);

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'DELETE_CATEGORY',
      details: `Deleted category: "${removedName}"`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(undefined, 150);
  },
};
