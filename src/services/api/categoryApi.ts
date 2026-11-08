import type { Category } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';

export interface CategoryWithCount extends Category {
  productCount: number;
}

export const categoryApi = {
  async getCategories(): Promise<CategoryWithCount[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: categoriesData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (catError) {
          console.error('Supabase getCategories error:', catError);
          return [];
        }

        const { data: productsData } = await supabase
          .from('products')
          .select('category_id')
          .eq('status', 'approved');

        const countsMap: Record<string, number> = {};
        (productsData || []).forEach((p: any) => {
          const cid = p.category_id;
          countsMap[cid] = (countsMap[cid] || 0) + 1;
        });

        return (categoriesData || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          iconName: cat.icon_name || 'Package',
          imageUrl: cat.image_url,
          createdAt: cat.created_at,
          productCount: countsMap[cat.id] || 0,
        }));
      } catch (err) {
        console.error('Supabase fetch failed:', err);
        return [];
      }
    }

    // Local storage fallback only if Supabase is unconfigured
    const data = loadStorageData();
    const approvedProducts = data.products.filter((p) => p.status === 'approved');

    const result = data.categories.map((cat) => ({
      ...cat,
      productCount: approvedProducts.filter((p) => p.categoryId === cat.id).length,
    }));

    return simulateLatency(result, 100);
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug.toLowerCase())
          .maybeSingle();

        if (error || !data) {
          return null;
        }

        return {
          id: data.id,
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          iconName: data.icon_name || 'Package',
          imageUrl: data.image_url,
          createdAt: data.created_at,
        };
      } catch (err) {
        console.error('Supabase getCategoryBySlug error:', err);
        return null;
      }
    }

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
    if (!input.name.trim()) {
      throw new Error('Category name is required.');
    }

    const slug = (input.slug?.trim() || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const categoryId = `cat-${Date.now()}`;
    const now = new Date().toISOString();

    const newCategory: Category = {
      id: categoryId,
      name: input.name.trim(),
      slug,
      description: input.description.trim(),
      iconName: input.iconName || 'Package',
      imageUrl: input.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
      createdAt: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('categories').insert({
        id: categoryId,
        name: newCategory.name,
        slug: newCategory.slug,
        description: newCategory.description,
        icon_name: newCategory.iconName,
        image_url: newCategory.imageUrl,
        created_at: now,
      });

      if (error) {
        console.error('Supabase createCategory error:', error);
        throw new Error(error.message);
      }

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: 'Administrator',
        actor_role: 'admin',
        action: 'CREATE_CATEGORY',
        details: `Created new category in Supabase: "${newCategory.name}"`,
        created_at: now,
      });

      return newCategory;
    }

    // Keep local storage updated only if Supabase not configured
    const data = loadStorageData();
    data.categories.push(newCategory);
    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'CREATE_CATEGORY',
      details: `Created new category: "${newCategory.name}"`,
      createdAt: now,
    });
    saveStorageData(data);

    return simulateLatency(newCategory, 150);
  },

  async updateCategory(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'createdAt'>>
  ): Promise<Category> {
    const supabase = getSupabase();

    if (supabase) {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.slug !== undefined) payload.slug = updates.slug;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.iconName !== undefined) payload.icon_name = updates.iconName;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;

      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        iconName: data.icon_name || 'Package',
        imageUrl: data.image_url,
        createdAt: data.created_at,
      };
    }

    const data = loadStorageData();
    const index = data.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Category not found.');

    const current = data.categories[index];
    const updated: Category = {
      ...current,
      ...updates,
    };

    data.categories[index] = updated;

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
    const supabase = getSupabase();

    if (supabase) {
      // Check products in Supabase
      const { data: attachedProducts } = await supabase
        .from('products')
        .select('id')
        .eq('category_id', id);

      if (attachedProducts && attachedProducts.length > 0) {
        throw new Error(
          `Cannot delete category because ${attachedProducts.length} product(s) in Supabase are assigned to it.`
        );
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: 'Administrator',
        actor_role: 'admin',
        action: 'DELETE_CATEGORY',
        details: `Deleted category: "${id}"`,
        created_at: new Date().toISOString(),
      });

      return;
    }

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
