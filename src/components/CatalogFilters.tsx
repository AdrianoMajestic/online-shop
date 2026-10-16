"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Filter,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Check,
  Search,
} from "lucide-react";
import { CategoryTreeNode } from "@/services/catalog.service";
import { formatPrice } from "@/lib/formatters";

interface BrandItem {
  _id: string;
  title: string;
  slug: string;
}

interface CatalogFiltersProps {
  categories: CategoryTreeNode[];
  brands: BrandItem[];
  currentCategory?: string;
  currentBrands: string[];
  currentPriceMin?: number; // in kopecks
  currentPriceMax?: number; // in kopecks
  currentSort?: string;
  currentQ?: string;
  totalProducts: number;
}

export function CatalogFilters({
  categories,
  brands,
  currentCategory,
  currentBrands,
  currentPriceMin,
  currentPriceMax,
  currentSort = "popular",
  currentQ,
  totalProducts,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Local state for price inputs in Rubles
  const [minRubles, setMinRubles] = useState<string>(
    currentPriceMin !== undefined ? (currentPriceMin / 100).toString() : ""
  );
  const [maxRubles, setMaxRubles] = useState<string>(
    currentPriceMax !== undefined ? (currentPriceMax / 100).toString() : ""
  );

  // Mobile drawer open state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Helper to push updated query params
  const applyParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    updater(params);
    // Always reset page to 1 when changing filters, unless page was explicitly set
    if (!params.has("page") || params.get("page") !== "1") {
      params.set("page", "1");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  // Category select
  const handleCategorySelect = (slug: string | null) => {
    applyParams((params) => {
      if (!slug) {
        params.delete("category");
      } else {
        params.set("category", slug);
      }
    });
    setIsMobileOpen(false);
  };

  // Brand toggle
  const handleBrandToggle = (slug: string) => {
    applyParams((params) => {
      const currentList = params.getAll("brand");
      params.delete("brand");

      if (currentList.includes(slug)) {
        currentList.filter((b) => b !== slug).forEach((b) => params.append("brand", b));
      } else {
        [...currentList, slug].forEach((b) => params.append("brand", b));
      }
    });
  };

  // Price apply
  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    applyParams((params) => {
      const minVal = parseFloat(minRubles);
      const maxVal = parseFloat(maxRubles);

      if (!isNaN(minVal) && minVal >= 0) {
        params.set("priceMin", Math.round(minVal * 100).toString());
      } else {
        params.delete("priceMin");
      }

      if (!isNaN(maxVal) && maxVal >= 0) {
        params.set("priceMax", Math.round(maxVal * 100).toString());
      } else {
        params.delete("priceMax");
      }
    });
    setIsMobileOpen(false);
  };

  // Price reset
  const handlePriceReset = () => {
    setMinRubles("");
    setMaxRubles("");
    applyParams((params) => {
      params.delete("priceMin");
      params.delete("priceMax");
    });
  };

  // Sort change
  const handleSortChange = (newSort: string) => {
    applyParams((params) => {
      params.set("sort", newSort);
    });
  };

  // Clear single search query
  const handleClearQ = () => {
    applyParams((params) => {
      params.delete("q");
    });
  };

  // Reset all filters
  const handleResetAll = () => {
    setMinRubles("");
    setMaxRubles("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
    setIsMobileOpen(false);
  };

  // Count active filters
  const activeFiltersCount =
    (currentCategory ? 1 : 0) +
    currentBrands.length +
    (currentPriceMin !== undefined ? 1 : 0) +
    (currentPriceMax !== undefined ? 1 : 0) +
    (currentQ ? 1 : 0);

  const filterContent = (
    <div className="space-y-6">
      {/* Categories block */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
          <span>Категории</span>
          {currentCategory && (
            <button
              type="button"
              onClick={() => handleCategorySelect(null)}
              className="text-[11px] font-normal lowercase text-emerald-600 hover:underline"
            >
              Сбросить
            </button>
          )}
        </h3>

        <div className="space-y-1 text-sm">
          <button
            type="button"
            onClick={() => handleCategorySelect(null)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
              !currentCategory
                ? "bg-emerald-600/10 font-semibold text-emerald-700 dark:text-emerald-400"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <span>Все категории</span>
            {!currentCategory && <Check className="h-3.5 w-3.5" />}
          </button>

          {categories.map((rootCat) => {
            const isRootActive = currentCategory === rootCat.slug;
            const hasChildren = rootCat.children && rootCat.children.length > 0;

            return (
              <div key={rootCat._id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleCategorySelect(rootCat.slug)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                    isRootActive
                      ? "bg-emerald-600/10 font-semibold text-emerald-700 dark:text-emerald-400"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{rootCat.title}</span>
                  {isRootActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>

                {/* Subcategories */}
                {hasChildren && (
                  <div className="pl-3.5 space-y-1 border-l border-border/60 ml-2.5">
                    {rootCat.children.map((subCat) => {
                      const isSubActive = currentCategory === subCat.slug;
                      return (
                        <button
                          key={subCat._id}
                          type="button"
                          onClick={() => handleCategorySelect(subCat.slug)}
                          className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors flex items-center justify-between ${
                            isSubActive
                              ? "bg-emerald-600/15 font-semibold text-emerald-700 dark:text-emerald-400"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="truncate">{subCat.title}</span>
                          {isSubActive && <Check className="h-3 w-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border/60 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
          <span>Бренды</span>
          {currentBrands.length > 0 && (
            <span className="text-[11px] font-semibold text-emerald-600">
              выбрано: {currentBrands.length}
            </span>
          )}
        </h3>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {brands.map((brand) => {
            const isChecked = currentBrands.includes(brand.slug);
            return (
              <label
                key={brand._id}
                className="flex items-center gap-2.5 text-sm cursor-pointer select-none py-0.5 hover:text-emerald-600 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleBrandToggle(brand.slug)}
                  className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <span className={isChecked ? "font-semibold text-foreground" : "text-foreground"}>
                  {brand.title}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price filter */}
      <div className="border-t border-border/60 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
          <span>Цена, ₽</span>
          {(currentPriceMin !== undefined || currentPriceMax !== undefined) && (
            <button
              type="button"
              onClick={handlePriceReset}
              className="text-[11px] font-normal lowercase text-emerald-600 hover:underline"
            >
              Сбросить
            </button>
          )}
        </h3>

        <form onSubmit={handlePriceApply} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="price-min" className="sr-only">
                Мин. цена
              </label>
              <input
                id="price-min"
                type="number"
                min="0"
                placeholder="от 0"
                value={minRubles}
                onChange={(e) => setMinRubles(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs placeholder:text-muted-foreground/60 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label htmlFor="price-max" className="sr-only">
                Макс. цена
              </label>
              <input
                id="price-max"
                type="number"
                min="0"
                placeholder="до 200 000"
                value={maxRubles}
                onChange={(e) => setMaxRubles(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs placeholder:text-muted-foreground/60 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-9 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Применить цену</span>
          </button>
        </form>
      </div>

      {/* Reset all button */}
      {activeFiltersCount > 0 && (
        <div className="border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={handleResetAll}
            className="w-full h-9 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Сбросить все фильтры</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Top Bar: Active filters, Sort & Mobile trigger */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Mobile Filter Toggle & Count */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
              aria-label="Открыть фильтры каталога"
            >
              <Filter className="h-4 w-4 text-emerald-600" />
              <span>Фильтры</span>
              {activeFiltersCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <span className="text-xs text-muted-foreground">
              Найдено: <strong className="text-foreground">{totalProducts}</strong>
            </span>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="catalog-sort" className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
              Сортировка:
            </label>
            <div className="relative">
              <select
                id="catalog-sort"
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="h-9 appearance-none rounded-xl border border-border bg-card pl-3 pr-8 text-xs font-medium text-foreground focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-sm cursor-pointer"
              >
                <option value="popular">По популярности</option>
                <option value="price_asc">Сначала дешевле</option>
                <option value="price_desc">Сначала дороже</option>
                <option value="new">Сначала новинки</option>
                <option value="rating">По рейтингу</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-muted-foreground text-[11px]">Применено:</span>

            {currentQ && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-800 dark:text-emerald-300">
                <Search className="h-3 w-3" />
                «{currentQ}»
                <button
                  type="button"
                  onClick={handleClearQ}
                  aria-label="Удалить поиск"
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {currentCategory && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-foreground shadow-xs">
                Категория: {currentCategory}
                <button
                  type="button"
                  onClick={() => handleCategorySelect(null)}
                  aria-label="Удалить фильтр категории"
                  className="hover:text-emerald-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {currentBrands.map((brandSlug) => (
              <span
                key={brandSlug}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-foreground shadow-xs"
              >
                Бренд: {brandSlug}
                <button
                  type="button"
                  onClick={() => handleBrandToggle(brandSlug)}
                  aria-label={`Удалить фильтр бренда ${brandSlug}`}
                  className="hover:text-emerald-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {(currentPriceMin !== undefined || currentPriceMax !== undefined) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-foreground shadow-xs">
                Цена:{" "}
                {currentPriceMin !== undefined ? `от ${formatPrice(currentPriceMin)}` : ""}{" "}
                {currentPriceMax !== undefined ? `до ${formatPrice(currentPriceMax)}` : ""}
                <button
                  type="button"
                  onClick={handlePriceReset}
                  aria-label="Сбросить диапазон цен"
                  className="hover:text-emerald-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-emerald-600 hover:underline font-medium ml-1"
            >
              Сбросить все
            </button>
          </div>
        )}
      </div>

      {/* Desktop Sidebar filter card */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border/60">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-foreground">Фильтры</h2>
          </div>
          {filterContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-background p-6 shadow-2xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-6">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                <h2 className="text-base font-bold text-foreground">Фильтры</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Закрыть фильтры"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {filterContent}

            <div className="mt-8 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="w-full h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
              >
                Показать товары ({totalProducts})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
