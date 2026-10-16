"use client";

import React, { useState } from "react";
import { ShoppingBag, Plus, Minus, Check, AlertCircle } from "lucide-react";

interface AddToCartButtonProps {
  stockQuantity: number;
  productTitle: string;
}

export function AddToCartButton({ stockQuantity, productTitle }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const isOutOfStock = stockQuantity <= 0;

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(stockQuantity, prev + 1));
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    setIsAdded(true);
    setShowToast(true);

    setTimeout(() => {
      setIsAdded(false);
    }, 2500);

    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  if (isOutOfStock) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>К сожалению, данный товар закончился. Вы можете оформить предзаказ у менеджера.</span>
        </div>
        <button
          type="button"
          disabled
          className="w-full h-12 flex items-center justify-center rounded-xl bg-muted text-muted-foreground font-semibold cursor-not-allowed"
        >
          Нет в наличии
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quantity & CTA row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Counter */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm sm:w-36">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity <= 1}
            aria-label="Уменьшить количество"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-semibold text-sm w-10 text-center select-none">{quantity}</span>
          <button
            type="button"
            onClick={handleIncrement}
            disabled={quantity >= stockQuantity}
            aria-label="Увеличить количество"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md active:scale-[0.99] ${
            isAdded
              ? "bg-emerald-600 text-white shadow-emerald-600/30"
              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20"
          }`}
        >
          {isAdded ? (
            <>
              <Check className="h-5 w-5 animate-in zoom-in-50" />
              <span>Добавлено ({quantity} шт.)</span>
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              <span>В корзину</span>
            </>
          )}
        </button>
      </div>

      {/* Floating feedback message */}
      {showToast && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <strong>{productTitle}</strong> ({quantity} шт.) добавлен в корзину.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
