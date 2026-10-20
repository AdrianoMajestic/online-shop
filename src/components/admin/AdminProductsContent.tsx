"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Package,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { slugify } from "@/lib/slug";

interface CategoryOption {
  _id: string;
  title: string;
  slug: string;
}

interface BrandOption {
  _id: string;
  title: string;
  slug: string;
}

interface ProductItem {
  _id: string;
  sku: string;
  title: string;
  slug: string;
  description: string;
  price: number; // in kopecks
  discountPrice: number | null; // in kopecks
  stockQuantity: number;
  isPublished: boolean;
  images: { url: string; alt: string }[];
  attributes: { key: string; value: string }[];
  categoryId?: { _id: string; title: string; slug: string } | string;
  brandId?: { _id: string; title: string; slug: string } | string;
  updatedAt?: string;
}

interface AdminProductsContentProps {
  userRole: string;
  assignedCategoryIds?: string[];
}

export function AdminProductsContent({
  userRole,
  assignedCategoryIds = [],
}: AdminProductsContentProps) {
  // Data state
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Loading & notification state
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formBrandId, setFormBrandId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriceRubles, setFormPriceRubles] = useState("");
  const [formDiscountRubles, setFormDiscountRubles] = useState("");
  const [formStock, setFormStock] = useState("0");
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formImages, setFormImages] = useState<{ url: string; alt: string }[]>([]);
  const [formAttributes, setFormAttributes] = useState<{ key: string; value: string }[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load categories and brands
  useEffect(() => {
    async function loadMeta() {
      try {
        const [catsRes, brandsRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch("/api/admin/brands"),
        ]);

        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData.categories || []);
        }

        if (brandsRes.ok) {
          const brandsData = await brandsRes.json();
          setBrands(brandsData.brands || []);
        }
      } catch (err) {
        console.error("Failed to load admin categories/brands:", err);
      }
    }
    loadMeta();
  }, []);

  // Fetch products callback
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterBrand) params.set("brandId", filterBrand);
      if (filterStatus !== "all") params.set("isPublished", filterStatus);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Не удалось загрузить список товаров");
      }

      setProducts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Ошибка при загрузке товаров");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterBrand, filterStatus, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle open create modal
  const openCreateModal = () => {
    setModalMode("create");
    setEditingProductId(null);
    setFormTitle("");
    setFormSku("");
    setFormSlug("");
    setFormCategoryId(categories[0]?._id || "");
    setFormBrandId(brands[0]?._id || "");
    setFormDescription("");
    setFormPriceRubles("");
    setFormDiscountRubles("");
    setFormStock("10");
    setFormIsPublished(true);
    setFormImages([]);
    setFormAttributes([]);
    setNewImageUrl("");
    setNewAttrKey("");
    setNewAttrValue("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (p: ProductItem) => {
    setModalMode("edit");
    setEditingProductId(p._id);
    setFormTitle(p.title);
    setFormSku(p.sku);
    setFormSlug(p.slug);

    const catId =
      p.categoryId && typeof p.categoryId === "object"
        ? p.categoryId._id
        : String(p.categoryId || "");
    setFormCategoryId(catId);

    const bId =
      p.brandId && typeof p.brandId === "object"
        ? p.brandId._id
        : String(p.brandId || "");
    setFormBrandId(bId);

    setFormDescription(p.description || "");
    setFormPriceRubles((p.price / 100).toFixed(2).replace(/\.00$/, ""));
    setFormDiscountRubles(
      p.discountPrice !== null && p.discountPrice !== undefined
        ? (p.discountPrice / 100).toFixed(2).replace(/\.00$/, "")
        : ""
    );
    setFormStock(String(p.stockQuantity ?? 0));
    setFormIsPublished(p.isPublished ?? true);
    setFormImages(p.images ? [...p.images] : []);
    setFormAttributes(p.attributes ? [...p.attributes] : []);
    setNewImageUrl("");
    setNewAttrKey("");
    setNewAttrValue("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Add image link to form
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setFormImages([...formImages, { url: newImageUrl.trim(), alt: formTitle || "Фото товара" }]);
    setNewImageUrl("");
  };

  // Remove image from form
  const handleRemoveImage = (index: number) => {
    setFormImages(formImages.filter((_, i) => i !== index));
  };

  // Add attribute to form
  const handleAddAttribute = () => {
    if (!newAttrKey.trim() || !newAttrValue.trim()) return;
    setFormAttributes([
      ...formAttributes,
      { key: newAttrKey.trim(), value: newAttrValue.trim() },
    ]);
    setNewAttrKey("");
    setNewAttrValue("");
  };

  // Remove attribute from form
  const handleRemoveAttribute = (index: number) => {
    setFormAttributes(formAttributes.filter((_, i) => i !== index));
  };

  // Auto-generate slug from title
  const handleGenerateSlug = () => {
    if (formTitle.trim()) {
      setFormSlug(slugify(formTitle.trim()));
    }
  };

  // Submit create or edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic frontend validations
    if (!formTitle.trim()) {
      setFormError("Укажите название товара");
      return;
    }
    if (!formSku.trim()) {
      setFormError("Укажите артикул (SKU)");
      return;
    }
    if (!formCategoryId) {
      setFormError("Выберите категорию товара");
      return;
    }
    if (!formBrandId) {
      setFormError("Выберите бренд товара");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("Заполните описание товара");
      return;
    }

    const priceNum = parseFloat(formPriceRubles.replace(",", "."));
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Укажите корректную базовую цену в рублях");
      return;
    }
    const priceKopecks = Math.round(priceNum * 100);

    let discountKopecks: number | null = null;
    if (formDiscountRubles.trim()) {
      const discountNum = parseFloat(formDiscountRubles.replace(",", "."));
      if (isNaN(discountNum) || discountNum < 0) {
        setFormError("Укажите корректную цену со скидкой в рублях");
        return;
      }
      discountKopecks = Math.round(discountNum * 100);
      if (discountKopecks >= priceKopecks) {
        setFormError("Цена со скидкой должна быть строго меньше базовой цены");
        return;
      }
    }

    const stockNum = parseInt(formStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError("Остаток на складе должен быть целым неотрицательным числом");
      return;
    }

    setFormLoading(true);

    try {
      const payload = {
        title: formTitle.trim(),
        sku: formSku.trim().toUpperCase(),
        slug: formSlug.trim() || undefined,
        categoryId: formCategoryId,
        brandId: formBrandId,
        description: formDescription.trim(),
        price: priceKopecks,
        discountPrice: discountKopecks,
        stockQuantity: stockNum,
        isPublished: formIsPublished,
        images: formImages,
        attributes: formAttributes,
      };

      let res: Response;
      if (modalMode === "create") {
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/products/${editingProductId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const resData = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(
            resData?.error?.message ||
              "Доступ запрещен: категория товара не назначена менеджеру"
          );
        }
        throw new Error(resData?.error?.message || "Ошибка при сохранении товара");
      }

      setSuccessMessage(
        modalMode === "create"
          ? `Товар «${formTitle}» успешно создан`
          : `Товар «${formTitle}» успешно обновлен`
      );
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Непредвиденная ошибка при сохранении");
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle or deactivate product
  const handleTogglePublish = async (p: ProductItem) => {
    setActionLoadingId(p._id);
    setGlobalError(null);

    try {
      const res = await fetch(`/api/admin/products/${p._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_publish" }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(
            data?.error?.message ||
              "Доступ запрещен: вы не можете менять статус товара чужой категории"
          );
        }
        throw new Error(data?.error?.message || "Не удалось изменить статус публикации");
      }

      setSuccessMessage(
        p.isPublished
          ? `Товар «${p.title}» снят с публикации`
          : `Товар «${p.title}» опубликован на витрине`
      );

      // Update locally
      setProducts((prev) =>
        prev.map((item) =>
          item._id === p._id ? { ...item, isPublished: !item.isPublished } : item
        )
      );
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Ошибка при смене статуса");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setFilterBrand("");
    setFilterStatus("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Управление товарами</span>
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              Всего: {total}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Просмотр, редактирование ассортимента, цен, остатков и статусов публикации.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          id="admin-add-product-button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm shadow-emerald-600/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить товар</span>
        </button>
      </div>

      {/* Global Alerts */}
      {globalError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-300 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Ошибка операции</p>
            <p className="text-xs mt-0.5">{globalError}</p>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 dark:border-emerald-900 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="font-medium flex-1">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              id="admin-products-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск по названию или SKU..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              id="admin-products-category-filter"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Все доступные категории</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.title}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <select
              id="admin-products-brand-filter"
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Все бренды</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="admin-products-status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Все статусы публикации</option>
              <option value="true">Только опубликованные</option>
              <option value="false">Только скрытые (деактивированные)</option>
            </select>
          </div>
        </div>

        {/* Action / Reset Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>
              Найдено: <strong>{total}</strong> товаров
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(searchQuery || filterCategory || filterBrand || filterStatus !== "all") && (
              <button
                onClick={handleResetFilters}
                className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
              >
                <X className="h-3.5 w-3.5" />
                <span>Сбросить фильтры</span>
              </button>
            )}
            <button
              onClick={() => fetchProducts()}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium px-2 py-1 rounded-md hover:bg-muted"
              title="Обновить список"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Обновить</span>
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm">Загрузка каталога товаров...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground text-base">Товары не найдены</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Попробуйте изменить поисковый запрос или сбросить фильтры.
              {userRole === "manager" && assignedCategoryIds.length === 0 && (
                <span className="block text-amber-600 dark:text-amber-400 mt-2 font-medium">
                  Внимание: вашей учетной записи менеджера еще не назначены категории. Обратитесь к главному администратору.
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4 w-14">Фото</th>
                  <th className="py-3 px-4">Товар / Артикул</th>
                  <th className="py-3 px-4">Категория</th>
                  <th className="py-3 px-4">Бренд</th>
                  <th className="py-3 px-4">Цена</th>
                  <th className="py-3 px-4">Остаток</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => {
                  const catTitle =
                    p.categoryId && typeof p.categoryId === "object"
                      ? p.categoryId.title
                      : "—";
                  const brandTitle =
                    p.brandId && typeof p.brandId === "object"
                      ? p.brandId.title
                      : "—";
                  const primaryImage = p.images?.[0]?.url;

                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-muted/30 transition-colors group"
                      id={`product-row-${p._id}`}
                    >
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="relative h-11 w-11 rounded-lg border border-border/80 bg-background overflow-hidden flex items-center justify-center shrink-0">
                          {primaryImage ? (
                            <Image
                              src={primaryImage}
                              alt={p.title}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                      </td>

                      {/* Title & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground line-clamp-1 max-w-[260px]">
                          {p.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                          <code className="px-1.5 py-0.2 rounded bg-muted text-[11px] font-mono text-muted-foreground font-semibold">
                            {p.sku}
                          </code>
                          <span className="text-muted-foreground/60 text-[11px]">
                            /{p.slug}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-xs font-medium text-foreground whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                          {catTitle}
                        </span>
                      </td>

                      {/* Brand */}
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {brandTitle}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground">
                          {p.discountPrice ? (
                            <div className="flex flex-col">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {formatPrice(p.discountPrice)}
                              </span>
                              <span className="text-[11px] line-through text-muted-foreground">
                                {formatPrice(p.price)}
                              </span>
                            </div>
                          ) : (
                            formatPrice(p.price)
                          )}
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.stockQuantity === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            0 шт. (нет)
                          </span>
                        ) : p.stockQuantity < 5 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            {p.stockQuantity} шт. (мало)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {p.stockQuantity} шт.
                          </span>
                        )}
                      </td>

                      {/* Publication Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {p.isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Опубликован
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            Снят с продажи
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            id={`edit-product-${p._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                            title="Редактировать товар"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Изменить</span>
                          </button>

                          <button
                            onClick={() => handleTogglePublish(p)}
                            disabled={actionLoadingId === p._id}
                            id={`toggle-publish-${p._id}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              p.isPublished
                                ? "border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                                : "border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}
                            title={
                              p.isPublished
                                ? "Снять товар с публикации (деактивировать)"
                                : "Опубликовать товар на витрине"
                            }
                          >
                            {actionLoadingId === p._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : p.isPublished ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5" />
                                <span>Скрыть</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                <span>Опубликовать</span>
                              </>
                            )}
                          </button>

                          <a
                            href={`/product/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Открыть на витрине"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Страница <strong>{page}</strong> из <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                ← Назад
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                Вперед →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {modalMode === "create" ? "Создание нового товара" : "Редактирование товара"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {modalMode === "create"
                      ? "Заполните реквизиты, установите цену, остаток и характеристики"
                      : `Редактирование: ${formSku || formTitle}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error in modal */}
            {formError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Не удалось сохранить товар:</p>
                  <p className="mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            {/* Form Body (Scrollable) */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* Basic Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Основные реквизиты
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Название товара <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      id="product-form-title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Например: Смартфон Apple iPhone 15 Pro 256GB"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Артикул (SKU) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      id="product-form-sku"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                      placeholder="KB-IPH15P-256"
                      className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-foreground">
                        URL Slug (идентификатор)
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateSlug}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Сгенерировать из названия
                      </button>
                    </div>
                    <input
                      type="text"
                      id="product-form-slug"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                      placeholder="apple-iphone-15-pro-256gb"
                      className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Категория товара <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      id="product-form-category"
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">-- Выберите категорию --</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Бренд <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      id="product-form-brand"
                      value={formBrandId}
                      onChange={(e) => setFormBrandId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">-- Выберите бренд --</option>
                      {brands.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing and Inventory Section */}
              <div className="space-y-4 pt-2 border-t border-border/70">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Цены, остаток и статус
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Базовая цена (₽) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      id="product-form-price"
                      value={formPriceRubles}
                      onChange={(e) => setFormPriceRubles(e.target.value)}
                      placeholder="129990.00"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      В базе сохраняется в копейках
                    </p>
                  </div>

                  {/* Discount Price */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Цена со скидкой (₽)
                    </label>
                    <input
                      type="text"
                      id="product-form-discount-price"
                      value={formDiscountRubles}
                      onChange={(e) => setFormDiscountRubles(e.target.value)}
                      placeholder="119990.00 (опционально)"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Оставьте пустым, если скидки нет
                    </p>
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Остаток на складе (шт.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      id="product-form-stock"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Списывается при создании заказов
                    </p>
                  </div>
                </div>

                {/* Is Published Toggle */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="product-form-is-published"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="product-form-is-published" className="text-xs font-medium text-foreground cursor-pointer select-none">
                    Опубликовать товар на витрине (если выключено, товар деактивирован и скрыт от покупателей)
                  </label>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <label className="block text-xs font-medium text-foreground">
                  Подробное описание товара <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  id="product-form-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Опишите ключевые преимущества, комплектацию и технические параметры товара..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Images Section */}
              <div className="space-y-3 pt-2 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    3. Ссылки на изображения
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Добавлено: {formImages.length}
                  </span>
                </div>

                {/* Add image row */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-3 py-1.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-medium text-foreground"
                  >
                    Добавить фото
                  </button>
                </div>

                {/* Images preview list */}
                {formImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {formImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl border border-border bg-muted/30 p-1 flex flex-col items-center"
                      >
                        <div className="relative h-20 w-full rounded-lg overflow-hidden bg-background">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.alt || "Preview"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // fallback on broken images
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="mt-1 text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Удалить</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attributes Section */}
              <div className="space-y-3 pt-2 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    4. Характеристики товара (A-16)
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Добавлено: {formAttributes.length}
                  </span>
                </div>

                {/* Add attribute row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAttrKey}
                    onChange={(e) => setNewAttrKey(e.target.value)}
                    placeholder="Параметр (напр. Цвет)"
                    className="w-1/3 px-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="text"
                    value={newAttrValue}
                    onChange={(e) => setNewAttrValue(e.target.value)}
                    placeholder="Значение (напр. Черный титан)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="px-3 py-1.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-medium text-foreground"
                  >
                    Добавить
                  </button>
                </div>

                {/* Attributes list */}
                {formAttributes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {formAttributes.map((attr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-border bg-muted/20 text-xs"
                      >
                        <span className="font-semibold text-foreground">{attr.key}:</span>
                        <span className="text-muted-foreground flex-1 mx-3 truncate">{attr.value}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(idx)}
                          className="text-rose-600 hover:text-rose-700 p-0.5"
                          title="Удалить характеристику"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium text-foreground transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  id="product-form-save-button"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{modalMode === "create" ? "Создать товар" : "Сохранить изменения"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
