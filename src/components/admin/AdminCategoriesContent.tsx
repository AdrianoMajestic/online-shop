"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
} from "lucide-react";
import { AdminCategoryItem } from "@/services/admin-directory.service";

interface CategoryFormData {
  title: string;
  slug: string;
  parentId: string;
  description: string;
  isVisible: boolean;
  sortOrder: number;
}

const defaultFormData: CategoryFormData = {
  title: "",
  slug: "",
  parentId: "",
  description: "",
  isVisible: true,
  sortOrder: 0,
};

export function AdminCategoriesContent() {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingCategory, setDeletingCategory] = useState<AdminCategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accessible element IDs
  const searchInputId = useId();
  const titleInputId = useId();
  const slugInputId = useId();
  const parentSelectId = useId();
  const sortOrderInputId = useId();
  const descriptionInputId = useId();
  const isVisibleCheckboxId = useId();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories?view=admin");
      if (!res.ok) {
        throw new Error("Не удалось загрузить список категорий");
      }
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData(defaultFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: AdminCategoryItem) => {
    setEditingCategory(cat);
    setFormData({
      title: cat.title,
      slug: cat.slug,
      parentId: cat.parentId || "",
      description: cat.description || "",
      isVisible: cat.isVisible,
      sortOrder: cat.sortOrder,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: formData.title,
        slug: formData.slug.trim() || undefined,
        parentId: formData.parentId ? formData.parentId : null,
        description: formData.description,
        isVisible: formData.isVisible,
        sortOrder: formData.sortOrder,
      };

      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка при сохранении категории");
      }

      setIsModalOpen(false);
      setSuccessMessage(
        editingCategory
          ? `Категория "${formData.title}" успешно обновлена`
          : `Категория "${formData.title}" успешно создана`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (cat: AdminCategoryItem) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !cat.isVisible }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка обновления видимости");
      }
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isVisible: !c.isVisible } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка обновления видимости");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось удалить категорию");
      }

      setDeletingCategory(null);
      setSuccessMessage(data.message || "Категория успешно удалена");
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
      setDeletingCategory(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.parentTitle && c.parentTitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-indigo-600" />
            <span>Категории товаров</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Управление иерархией каталога, созданием, редактированием и видимостью
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="admin-add-category-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Новая категория</span>
        </button>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor={searchInputId} className="sr-only">
            Поиск категории
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Всего категорий: {filteredCategories.length}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="text-sm">Загрузка категорий...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FolderTree className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium">Категории не найдены</p>
            <p className="text-xs mt-1">Попробуйте изменить поисковый запрос или добавьте новую</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Категория</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Родитель</th>
                  <th className="py-3 px-4 text-center">Товаров</th>
                  <th className="py-3 px-4 text-center">Подкатегорий</th>
                  <th className="py-3 px-4 text-center">Порядок</th>
                  <th className="py-3 px-4 text-center">Видимость</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className={c.parentId ? "text-muted-foreground pl-3" : "font-semibold"}>
                          {c.parentId ? "↳ " : ""}
                          {c.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                      {c.slug}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {c.parentTitle ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          <Layers className="h-3 w-3" />
                          {c.parentTitle}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">— Корневая —</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                        {c.productsCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                        {c.childrenCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-mono text-muted-foreground">
                      {c.sortOrder}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleVisibility(c)}
                        title={c.isVisible ? "Скрыть из каталога" : "Показать в каталоге"}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          c.isVisible
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {c.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        <span>{c.isVisible ? "Видна" : "Скрыта"}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Редактировать категорию"
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCategory(c)}
                          title="Удалить категорию"
                          className="p-1.5 rounded-lg border border-border hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-indigo-600" />
                <span>{editingCategory ? "Редактирование категории" : "Новая категория"}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div>
                <label htmlFor={titleInputId} className="block text-xs font-semibold text-foreground mb-1">
                  Название категории *
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: Игровые мониторы"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label htmlFor={slugInputId} className="block text-xs font-semibold text-foreground mb-1">
                  URL-идентификатор (slug)
                </label>
                <input
                  id={slugInputId}
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Оставьте пустым для автогенерации из названия"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono text-xs"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Только латиница, цифры и дефисы
                </span>
              </div>

              <div>
                <label htmlFor={parentSelectId} className="block text-xs font-semibold text-foreground mb-1">
                  Родительская категория
                </label>
                <select
                  id={parentSelectId}
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">— Корневая категория (без родителя) —</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parentTitle ? `↳ ${c.parentTitle} / ${c.title}` : c.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={sortOrderInputId} className="block text-xs font-semibold text-foreground mb-1">
                    Порядок сортировки
                  </label>
                  <input
                    id={sortOrderInputId}
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label htmlFor={isVisibleCheckboxId} className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      id={isVisibleCheckboxId}
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Показывать в каталоге</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor={descriptionInputId} className="block text-xs font-semibold text-foreground mb-1">
                  Описание категории
                </label>
                <textarea
                  id={descriptionInputId}
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание категории для покупателей и SEO..."
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingCategory ? "Сохранить изменения" : "Создать категорию"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Удаление категории</h3>
                <p className="text-xs text-muted-foreground">Это действие необратимо</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Вы уверены, что хотите удалить категорию{" "}
              <strong className="text-indigo-600">«{deletingCategory.title}»</strong>?
            </p>

            {(deletingCategory.productsCount > 0 || deletingCategory.childrenCount > 0) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                Внимание: в этой категории находится {deletingCategory.productsCount} товаров и{" "}
                {deletingCategory.childrenCount} подкатегорий. Удаление будет заблокировано сервером, если
                категория не пуста. Вместо удаления рекомендуется скрыть категорию.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Удалить категорию</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
