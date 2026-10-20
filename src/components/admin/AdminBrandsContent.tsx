"use client";

import { useState, useEffect, useCallback, useId } from "react";
import {
  Award,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
} from "lucide-react";
import { AdminBrandItem } from "@/services/admin-directory.service";

interface BrandFormData {
  title: string;
  slug: string;
  logoUrl: string;
  description: string;
}

const defaultFormData: BrandFormData = {
  title: "",
  slug: "",
  logoUrl: "",
  description: "",
};

export function AdminBrandsContent() {
  const [brands, setBrands] = useState<AdminBrandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<AdminBrandItem | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm state
  const [deletingBrand, setDeletingBrand] = useState<AdminBrandItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accessible element IDs
  const searchInputId = useId();
  const titleInputId = useId();
  const slugInputId = useId();
  const logoUrlInputId = useId();
  const descriptionInputId = useId();

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/brands?view=admin");
      if (!res.ok) {
        throw new Error("Не удалось загрузить список брендов");
      }
      const data = await res.json();
      setBrands(data.brands || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при загрузке");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const openCreateModal = () => {
    setEditingBrand(null);
    setFormData(defaultFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: AdminBrandItem) => {
    setEditingBrand(b);
    setFormData({
      title: b.title,
      slug: b.slug,
      logoUrl: b.logoUrl,
      description: b.description,
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
        logoUrl: formData.logoUrl.trim() || undefined,
        description: formData.description,
      };

      const url = editingBrand
        ? `/api/admin/brands/${editingBrand.id}`
        : "/api/admin/brands";
      const method = editingBrand ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Ошибка при сохранении бренда");
      }

      setIsModalOpen(false);
      setSuccessMessage(
        editingBrand
          ? `Бренд "${formData.title}" успешно обновлен`
          : `Бренд "${formData.title}" успешно создан`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchBrands();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBrand) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/brands/${deletingBrand.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Не удалось удалить бренд");
      }

      setDeletingBrand(null);
      setSuccessMessage(data.message || "Бренд успешно удален");
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
      setDeletingBrand(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBrands = brands.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            <span>Бренды товаров</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Справочник производителей, логотипы и привязка к каталогу
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="admin-add-brand-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Новый бренд</span>
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

      {/* Search and counters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor={searchInputId} className="sr-only">
            Поиск бренда
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Всего брендов: {filteredBrands.length}
        </span>
      </div>

      {/* Grid of Brand Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 border border-border rounded-2xl bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          <span className="text-sm">Загрузка брендов...</span>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-border rounded-2xl bg-card">
          <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm font-medium">Бренды не найдены</p>
          <p className="text-xs mt-1">Попробуйте изменить поисковый запрос или добавьте новый бренд</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4 hover:border-amber-500/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {b.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.logoUrl}
                        alt={b.title}
                        className="h-10 w-10 object-contain rounded-lg border border-border bg-white dark:bg-zinc-900 p-1 shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm shrink-0">
                        {b.title.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-tight">
                        {b.title}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {b.slug}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                    <Package className="h-3 w-3" />
                    <span>{b.productsCount}</span>
                  </span>
                </div>

                {b.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {b.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Создан: {b.createdAt ? new Date(b.createdAt).toLocaleDateString("ru-RU") : "—"}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                    title="Редактировать бренд"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingBrand(b)}
                    className="p-1.5 rounded-lg border border-border hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 transition-colors"
                    title="Удалить бренд"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <span>{editingBrand ? "Редактирование бренда" : "Новый бренд"}</span>
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
                  Название бренда *
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: Apple, Samsung, Bosch"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono text-xs"
                />
              </div>

              <div>
                <label htmlFor={logoUrlInputId} className="block text-xs font-semibold text-foreground mb-1">
                  Ссылка на логотип (URL)
                </label>
                <input
                  id={logoUrlInputId}
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs"
                />
              </div>

              <div>
                <label htmlFor={descriptionInputId} className="block text-xs font-semibold text-foreground mb-1">
                  Описание бренда
                </label>
                <textarea
                  id={descriptionInputId}
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткая информация о производителе, гарантии и продукции..."
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs"
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
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingBrand ? "Сохранить изменения" : "Создать бренд"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Удаление бренда</h3>
                <p className="text-xs text-muted-foreground">Это действие необратимо</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Вы уверены, что хотите удалить бренд{" "}
              <strong className="text-amber-600">«{deletingBrand.title}»</strong>?
            </p>

            {deletingBrand.productsCount > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
                Внимание: к этому бренду привязано {deletingBrand.productsCount} товаров. Сервер заблокирует
                удаление, пока товары не будут перемещены на другой бренд.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingBrand(null)}
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
                <span>Удалить бренд</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
