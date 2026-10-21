import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { categoryApi } from '../../services/api';
import type { CategoryWithCount } from '../../services/api';
import type { Category } from '../../types';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('Package');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const list = await categoryApi.getCategories();
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setIsSubmitting(true);
    try {
      await categoryApi.createCategory({
        name: name.trim(),
        description: description.trim(),
        iconName: iconName.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });

      setAddModalOpen(false);
      setName('');
      setDescription('');
      setIconName('Package');
      setImageUrl('');
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to create category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !name.trim()) return;

    setError('');
    setIsSubmitting(true);
    try {
      await categoryApi.updateCategory(editTarget.id, {
        name: name.trim(),
        description: description.trim(),
        iconName: iconName.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });

      setEditTarget(null);
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to update category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (c: Category) => {
    setEditTarget(c);
    setName(c.name);
    setDescription(c.description);
    setIconName(c.iconName || 'Package');
    setImageUrl(c.imageUrl || '');
    setError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await categoryApi.deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      await fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category.');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Category Taxonomy Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize retail departments, manage icons, and inspect product catalog distributions
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setDescription('');
            setIconName('Package');
            setImageUrl('');
            setError('');
            setAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            Loading categories...
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CategoryIcon name={c.slug} className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {c.productCount} {c.productCount === 1 ? 'product' : 'products'}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900">{c.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono block mb-1">
                  slug: {c.slug}
                </span>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                  title="Edit Category"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(c)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add New Category</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sports & Outdoors"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Items related to fitness, sports, camping..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                >
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Edit Category</h3>
              <button onClick={() => setEditTarget(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                >
                  {isSubmitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Category"
        message={`Are you sure you want to remove the category "${deleteTarget?.name}"? Deletion is only permitted if no active products are assigned to it.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
