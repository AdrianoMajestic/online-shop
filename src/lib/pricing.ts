/**
 * Pure business logic utility for order pricing, promo code validation, and discount calculations.
 * All monetary amounts are handled strictly as integer kopecks (копейки).
 * 
 * Rules & Assumptions:
 * - A-07: finalAmount = totalAmount - discountAmount + deliveryCost
 * - A-08: discountPrice ?? price is used for item pricing; promo code discount applies on top
 */

export interface PricingItem {
  price: number; // in kopecks
  discountPrice?: number | null; // in kopecks
  quantity: number;
}

export interface PromoCodeData {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number; // percentage (1-100) or fixed amount in kopecks
  minOrderAmount?: number; // in kopecks
  validFrom: Date | string;
  validTo: Date | string;
  usageLimit?: number; // 0 for unlimited
  usedCount?: number;
  isActive?: boolean;
}

export interface PromoValidationResult {
  valid: boolean;
  discountAmount: number; // in kopecks
  error?: string;
  errorCode?: "PROMO_INACTIVE" | "PROMO_NOT_STARTED" | "PROMO_EXPIRED" | "PROMO_LIMIT_REACHED" | "MIN_AMOUNT_NOT_MET";
}

export interface CalculateOrderPricesOptions {
  items: PricingItem[];
  promo?: PromoCodeData | null;
  deliveryCost?: number; // in kopecks
  now?: Date;
}

export interface PricingResult {
  totalAmount: number; // in kopecks (sum of items)
  discountAmount: number; // in kopecks (promo discount)
  deliveryCost: number; // in kopecks
  finalAmount: number; // in kopecks (totalAmount - discountAmount + deliveryCost)
  promoDiscount: number; // in kopecks (same as discountAmount)
  appliedPromo: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    discountAmount: number;
  } | null;
}

/**
 * Returns the effective unit price for a product (discountPrice ?? price) in kopecks
 */
export function calculateItemPrice(item: { price: number; discountPrice?: number | null }): number {
  if (
    item.discountPrice !== null &&
    item.discountPrice !== undefined &&
    item.discountPrice >= 0 &&
    item.discountPrice < item.price
  ) {
    return Math.round(item.discountPrice);
  }
  return Math.round(item.price);
}

/**
 * Returns total price for an item row (unitPrice * quantity) in kopecks
 */
export function calculateItemTotal(pricePerUnit: number, quantity: number): number {
  return Math.round(pricePerUnit) * Math.max(0, Math.floor(quantity));
}

/**
 * Calculates the total sum for all items before any order-level promo code is applied
 */
export function calculateItemsTotal(items: PricingItem[]): number {
  return items.reduce((sum, item) => {
    const unitPrice = calculateItemPrice(item);
    return sum + calculateItemTotal(unitPrice, item.quantity);
  }, 0);
}

/**
 * Validates a promo code against active status, valid date range, usage limit, and min order amount.
 * Returns whether it is valid, the calculated discount, or an error message.
 */
export function validatePromoCode(
  promo: PromoCodeData,
  totalAmount: number,
  now: Date = new Date()
): PromoValidationResult {
  // 1. Active status check
  if (promo.isActive === false) {
    return {
      valid: false,
      discountAmount: 0,
      error: "Промокод неактивен",
      errorCode: "PROMO_INACTIVE",
    };
  }

  // 2. Date range checks
  const fromTime = new Date(promo.validFrom).getTime();
  const toTime = new Date(promo.validTo).getTime();
  const currentTime = now.getTime();

  if (currentTime < fromTime) {
    return {
      valid: false,
      discountAmount: 0,
      error: "Срок действия промокода еще не начался",
      errorCode: "PROMO_NOT_STARTED",
    };
  }

  if (currentTime > toTime) {
    return {
      valid: false,
      discountAmount: 0,
      error: "Срок действия промокода истек",
      errorCode: "PROMO_EXPIRED",
    };
  }

  // 3. Usage limit check (0 means unlimited)
  const usageLimit = promo.usageLimit ?? 0;
  const usedCount = promo.usedCount ?? 0;
  if (usageLimit > 0 && usedCount >= usageLimit) {
    return {
      valid: false,
      discountAmount: 0,
      error: "Лимит использований промокода исчерпан",
      errorCode: "PROMO_LIMIT_REACHED",
    };
  }

  // 4. Minimum order amount check
  const minOrderAmount = promo.minOrderAmount ?? 0;
  if (minOrderAmount > 0 && totalAmount < minOrderAmount) {
    const minRub = (minOrderAmount / 100).toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return {
      valid: false,
      discountAmount: 0,
      error: `Минимальная сумма заказа для применения промокода — ${minRub} ₽`,
      errorCode: "MIN_AMOUNT_NOT_MET",
    };
  }

  // 5. Calculate discount amount in kopecks
  let discountAmount = 0;
  if (promo.discountType === "percentage") {
    // Percentage discount rounded to nearest kopeck
    const percentage = Math.min(100, Math.max(0, promo.discountValue));
    discountAmount = Math.round((totalAmount * percentage) / 100);
  } else if (promo.discountType === "fixed") {
    discountAmount = Math.max(0, Math.round(promo.discountValue));
  }

  // Discount cannot exceed totalAmount
  discountAmount = Math.min(totalAmount, Math.max(0, discountAmount));

  return {
    valid: true,
    discountAmount,
  };
}

/**
 * Calculates complete order financials:
 * totalAmount (items) - discountAmount (promo) + deliveryCost = finalAmount
 */
export function calculateOrderPrices(options: CalculateOrderPricesOptions): PricingResult {
  const { items, promo, deliveryCost = 0, now = new Date() } = options;

  const totalAmount = calculateItemsTotal(items);
  const normalizedDelivery = Math.max(0, Math.round(deliveryCost));

  let discountAmount = 0;
  let appliedPromo: PricingResult["appliedPromo"] = null;

  if (promo && totalAmount > 0) {
    const promoValidation = validatePromoCode(promo, totalAmount, now);
    if (promoValidation.valid) {
      discountAmount = promoValidation.discountAmount;
      appliedPromo = {
        code: promo.code.toUpperCase(),
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount,
      };
    }
  }

  // finalAmount = totalAmount - discountAmount + deliveryCost
  const finalAmount = Math.max(0, totalAmount - discountAmount) + normalizedDelivery;

  return {
    totalAmount,
    discountAmount,
    deliveryCost: normalizedDelivery,
    finalAmount,
    promoDiscount: discountAmount,
    appliedPromo,
  };
}
