"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice, SerializedProduct } from "@/lib/formatters";
import { ProductCard } from "@/components/ProductCard";

interface CartContentProps {
  recommendedProducts: SerializedProduct[];
}

export function CartContent({ recommendedProducts }: CartContentProps) {
  const {
    items,
    totalQuantity,
    totalAmount,
    isLoading,
    error,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleQuantityChange = async (productId: string, newQty: number) => {
    setBusyProductId(productId);
    await updateQuantity(productId, newQty);
    setBusyProductId(null);
  };

  const handleRemove = async (productId: string) => {
    setBusyProductId(productId);
    await removeItem(productId);
    setBusyProductId(null);
  };

  const handleClear = async () => {
    if (confirm("Вы уверены, что хотите очистить корзину?")) {
      setClearing(true);
      await clearCart();
      setClearing(false);
    }
  };

  // Calculate total original price to display total savings
  const originalTotalAmount = items.reduce((acc, item) => {
    return acc + item.quantity * item.product.price;
  }, 0);
  const totalSavings = Math.max(0, originalTotalAmount - totalAmount);

  if (isLoading && items.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Загрузка корзины...
        </p>
      </div>
    );
  }

  // 1. EMPTY CART STATE WITH RECOMMENDATIONS
  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div
          id="cart-empty-state"
          className="mx-auto max-w-2xl rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center shadow-lg shadow-emerald-500/5 mb-16"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 mb-6 shadow-inner">
            <ShoppingBag className="h-10 w-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Ваша корзина пуста
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Кажется, вы ещё ничего не добавили. Перейдите в каталог, чтобы выбрать
            отличные товары с быстрой доставкой!
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/catalog"
              id="empty-cart-go-to-catalog"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 transition-all duration-200 active:scale-95"
            >
              <span>Перейти в каталог</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Recommendations block */}
        {recommendedProducts && recommendedProducts.length > 0 && (
          <section id="cart-recommendations" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Популярный выбор</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Рекомендуем обратить внимание
                </h2>
              </div>
              <Link
                href="/catalog?sort=popular"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-500 hover:underline"
              >
                <span>Все хиты</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedProducts.map((prod) => (
                <ProductCard key={prod._id} product={prod} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // 2. FILLED CART STATE
  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span>Корзина покупок</span>
            <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {totalQuantity}{" "}
              {totalQuantity === 1
                ? "товар"
                : totalQuantity >= 2 && totalQuantity <= 4
                  ? "товара"
                  : "товаров"}
            </span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Проверьте состав заказа перед переходом к оформлению
          </p>
        </div>

        <button
          type="button"
          onClick={handleClear}
          disabled={clearing}
          id="cart-clear-button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Очистить корзину</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cart Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List (8 cols) */}
        <div className="lg:col-span-8 space-y-4" id="cart-items-list">
          {items.map((item) => {
            const isBusy = busyProductId === item.productId;
            const product = item.product;
            const isOutOfStock = product.stockQuantity <= 0;
            const hasDiscount =
              product.discountPrice !== null &&
              product.discountPrice < product.price;

            return (
              <article
                key={item.productId}
                className={`relative flex flex-col sm:flex-row items-stretch sm:items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5 transition-all shadow-xs ${
                  item.exceedsStock || isOutOfStock
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/80 hover:border-border"
                }`}
              >
                {/* Product Thumbnail */}
                <Link
                  href={`/product/${product.slug}`}
                  className="relative aspect-square w-24 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-muted/30 border border-border/50 self-center sm:self-auto"
                >
                  <Image
                    src={
                      product.images?.[0]?.url ||
                      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"
                    }
                    alt={product.images?.[0]?.alt || product.title}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </Link>

                {/* Info & Meta */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {product.brandTitle && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {product.brandTitle}
                      </span>
                    )}
                    <span className="font-mono text-[10px] uppercase opacity-75">
                      {product.sku}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 hover:text-emerald-600 transition-colors">
                    <Link href={`/product/${product.slug}`}>{product.title}</Link>
                  </h3>

                  {/* Stock notice / warning */}
                  {isOutOfStock ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Товар закончился на складе</span>
                    </div>
                  ) : item.exceedsStock ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>
                        Доступно только {product.stockQuantity} шт. Количество
                        скорректировано.
                      </span>
                    </div>
                  ) : product.stockQuantity <= 5 ? (
                    <span className="inline-block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Осталось мало: {product.stockQuantity} шт.
                    </span>
                  ) : null}

                  {/* Mobile unit price */}
                  <div className="sm:hidden pt-1 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {formatPrice(product.effectivePrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stepper & Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  {/* Stepper */}
                  <div className="flex items-center rounded-xl border border-border bg-background px-1.5 py-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(item.productId, item.quantity - 1)
                      }
                      disabled={isBusy || item.quantity <= 1}
                      aria-label="Уменьшить количество"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>

                    <span className="font-semibold text-xs sm:text-sm w-9 text-center select-none">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(item.productId, item.quantity + 1)
                      }
                      disabled={isBusy || item.quantity >= product.stockQuantity}
                      aria-label="Увеличить количество"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Subtotal for line */}
                  <div className="text-right min-w-[90px]">
                    <div className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                      {formatPrice(item.itemTotal)}
                    </div>
                    {item.quantity > 1 && (
                      <div className="hidden sm:block text-[11px] text-muted-foreground">
                        {formatPrice(product.effectivePrice)} / шт.
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId)}
                    disabled={isBusy}
                    aria-label="Удалить товар"
                    title="Удалить из корзины"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-destructive transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right: Order Summary Sidebar (4 cols) */}
        <aside className="lg:col-span-4 sticky top-20">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-lg shadow-emerald-500/5 space-y-6">
            <h2 className="text-lg font-bold tracking-tight text-foreground border-b border-border/60 pb-4">
              Детали заказа
            </h2>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Товары ({totalQuantity} шт.)</span>
                <span className="font-medium text-foreground">
                  {formatPrice(originalTotalAmount)}
                </span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Скидка на товары</span>
                  <span className="font-semibold">
                    -{formatPrice(totalSavings)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Доставка</span>
                <span className="text-xs text-muted-foreground">
                  рассчитывается на шаге оформления
                </span>
              </div>

              <div className="border-t border-border/80 pt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-base font-bold text-foreground block">
                    Итого к оплате
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    НДС включён
                  </span>
                </div>
                <span
                  id="cart-total-amount"
                  className="text-2xl font-extrabold text-foreground tracking-tight text-emerald-700 dark:text-emerald-400"
                >
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <Link
              href="/checkout"
              id="cart-checkout-button"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 transition-all duration-200 active:scale-[0.99]"
            >
              <span>Перейти к оформлению</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="text-center">
              <Link
                href="/catalog"
                className="text-xs font-medium text-muted-foreground hover:text-emerald-600 transition-colors"
              >
                Продолжить покупки в каталоге
              </Link>
            </div>

            {/* Guarantees and Perks */}
            <div className="space-y-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Быстрая курьерская доставка или самовывоз</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Безопасная онлайн-оплата картами любого банка</span>
              </div>
              <div className="flex items-center gap-2.5">
                <RotateCcw className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Простой возврат товара в течение 14 дней</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Recommendations at bottom of filled cart */}
      {recommendedProducts && recommendedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-border/60 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Вам также может понравиться
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Популярные товары магазина «Кабачок»
              </p>
            </div>
            <Link
              href="/catalog?sort=popular"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-500 hover:underline"
            >
              <span>В каталог</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedProducts.map((prod) => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
