"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingBag, Check, Flame, AlertCircle } from "lucide-react";
import { formatPrice, getDiscountPercentage } from "@/lib/formatters";

export interface ProductCardData {
  _id: string;
  sku: string;
  title: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  stockQuantity: number;
  images: { url: string; alt: string }[];
  ratingAvg: number;
  reviewsCount: number;
  salesCount: number;
  categoryId?: { _id: string; title: string; slug: string } | string;
  brandId?: { _id: string; title: string; slug: string } | string;
}

interface ProductCardProps {
  product: ProductCardData;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [imgSrc, setImgSrc] = useState(
    product.images?.[0]?.url ||
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"
  );

  const discountPercent = getDiscountPercentage(product.price, product.discountPrice);
  const effectivePrice = product.discountPrice ?? product.price;
  const isOutOfStock = product.stockQuantity <= 0;
  const isBestseller = product.salesCount >= 30;

  const brandTitle =
    typeof product.brandId === "object" && product.brandId !== null
      ? product.brandId.title
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1">
      {/* Product Image & Badges */}
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-muted/30"
      >
        <Image
          src={imgSrc}
          alt={product.images?.[0]?.alt || product.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() =>
            setImgSrc("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600")
          }
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-1 pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            {discountPercent !== null && (
              <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                -{discountPercent}%
              </span>
            )}
            {isBestseller && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                <Flame className="h-3 w-3 fill-current" />
                Хит
              </span>
            )}
          </div>

          {isOutOfStock && (
            <span className="rounded-md bg-zinc-800/90 text-white dark:bg-zinc-700/90 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm shadow-sm">
              Нет в наличии
            </span>
          )}
        </div>
      </Link>

      {/* Product Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Brand & SKU header */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
          {brandTitle ? (
            <span className="font-medium text-emerald-700 dark:text-emerald-400 truncate max-w-[120px]">
              {brandTitle}
            </span>
          ) : (
            <span />
          )}
          <span className="font-mono text-[10px] tracking-wider uppercase opacity-75">
            {product.sku}
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          <Link href={`/product/${product.slug}`} title={product.title}>
            {product.title}
          </Link>
        </h3>

        {/* Rating & Reviews */}
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <div className="flex items-center text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="ml-1 font-semibold text-foreground">
              {product.ratingAvg.toFixed(1)}
            </span>
          </div>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-muted-foreground text-[11px]">
            {product.reviewsCount} {getReviewsDeclension(product.reviewsCount)}
          </span>
        </div>

        {/* Price & Cart footer */}
        <div className="mt-auto pt-4 flex items-end justify-between gap-2 border-t border-border/50">
          <div>
            {product.discountPrice !== null && (
              <span className="block text-xs text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {formatPrice(effectivePrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={
              isOutOfStock
                ? "Товар временно отсутствует"
                : isAdded
                  ? "Товар добавлен в корзину"
                  : "Добавить в корзину"
            }
            className={`flex h-10 w-10 sm:h-9 sm:w-auto sm:px-3.5 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
              isOutOfStock
                ? "bg-muted text-muted-foreground/50 cursor-not-allowed"
                : isAdded
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white"
            }`}
          >
            {isOutOfStock ? (
              <AlertCircle className="h-4 w-4" />
            ) : isAdded ? (
              <>
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Добавлено</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">В корзину</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function getReviewsDeclension(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "отзывов";
  if (mod10 === 1) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4) return "отзыва";
  return "отзывов";
}
