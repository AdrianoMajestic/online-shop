import { describe, it, expect } from "vitest";
import {
  calculateItemPrice,
  calculateItemTotal,
  calculateItemsTotal,
  validatePromoCode,
  calculateOrderPrices,
  PromoCodeData,
  PricingItem,
} from "@/lib/pricing";

describe("Pricing and Promo Business Logic (T06)", () => {
  const basePromoPercentage: PromoCodeData = {
    code: "SAVE10",
    discountType: "percentage",
    discountValue: 10, // 10%
    minOrderAmount: 100000, // 1 000.00 ₽
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2026-12-31T23:59:59.000Z"),
    usageLimit: 100,
    usedCount: 5,
    isActive: true,
  };

  const basePromoFixed: PromoCodeData = {
    code: "FIXED500",
    discountType: "fixed",
    discountValue: 50000, // 500.00 ₽
    minOrderAmount: 200000, // 2 000.00 ₽
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: new Date("2026-12-31T23:59:59.000Z"),
    usageLimit: 50,
    usedCount: 10,
    isActive: true,
  };

  const currentDate = new Date("2026-06-15T12:00:00.000Z");

  describe("calculateItemPrice & calculateItemsTotal", () => {
    it("uses discountPrice when available and lower than regular price", () => {
      const item = { price: 250000, discountPrice: 199900 };
      expect(calculateItemPrice(item)).toBe(199900);
    });

    it("falls back to regular price when discountPrice is null or undefined", () => {
      expect(calculateItemPrice({ price: 150000, discountPrice: null })).toBe(150000);
      expect(calculateItemPrice({ price: 150000 })).toBe(150000);
    });

    it("correctly calculates row total and total items amount", () => {
      expect(calculateItemTotal(10000, 3)).toBe(30000);
      expect(calculateItemTotal(25000, 0)).toBe(0);

      const items: PricingItem[] = [
        { price: 10000, discountPrice: null, quantity: 3 }, // 30000
        { price: 50000, discountPrice: 40000, quantity: 2 }, // 80000
      ];
      expect(calculateItemsTotal(items)).toBe(110000);
    });
  });

  describe("validatePromoCode", () => {
    it("successfully applies percentage discount", () => {
      const res = validatePromoCode(basePromoPercentage, 150000, currentDate); // 1 500.00 ₽
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(15000); // 10% of 150000 = 15000 (150.00 ₽)
    });

    it("rounds percentage discount to nearest kopeck", () => {
      // 10% of 12345 kopecks = 1234.5 -> 1235
      const promo: PromoCodeData = {
        ...basePromoPercentage,
        minOrderAmount: 0,
      };
      const res = validatePromoCode(promo, 12345, currentDate);
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(1235);
    });

    it("successfully applies fixed discount", () => {
      const res = validatePromoCode(basePromoFixed, 300000, currentDate); // 3 000.00 ₽
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(50000); // 500.00 ₽
    });

    it("caps fixed discount to order totalAmount so total does not become negative", () => {
      const hugePromo: PromoCodeData = {
        ...basePromoFixed,
        discountValue: 500000, // 5000.00 ₽
        minOrderAmount: 0,
      };
      const res = validatePromoCode(hugePromo, 100000, currentDate); // 1 000.00 ₽
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(100000); // Capped at totalAmount
    });

    it("rejects promo code if totalAmount is below minOrderAmount", () => {
      const res = validatePromoCode(basePromoPercentage, 80000, currentDate); // 800.00 ₽ < 1000.00 ₽
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("MIN_AMOUNT_NOT_MET");
      expect(res.error).toContain("Минимальная сумма заказа");
    });

    it("rejects expired promo code", () => {
      const expiredDate = new Date("2027-01-01T00:00:00.000Z");
      const res = validatePromoCode(basePromoPercentage, 200000, expiredDate);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("PROMO_EXPIRED");
      expect(res.error).toBe("Срок действия промокода истек");
    });

    it("rejects promo code whose start date is in the future", () => {
      const earlyDate = new Date("2025-12-01T00:00:00.000Z");
      const res = validatePromoCode(basePromoPercentage, 200000, earlyDate);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("PROMO_NOT_STARTED");
      expect(res.error).toBe("Срок действия промокода еще не начался");
    });

    it("rejects promo code when usage limit is reached", () => {
      const exhaustedPromo: PromoCodeData = {
        ...basePromoPercentage,
        usageLimit: 10,
        usedCount: 10,
      };
      const res = validatePromoCode(exhaustedPromo, 200000, currentDate);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("PROMO_LIMIT_REACHED");
      expect(res.error).toBe("Лимит использований промокода исчерпан");
    });

    it("allows promo code when usage limit is 0 (unlimited)", () => {
      const unlimitedPromo: PromoCodeData = {
        ...basePromoPercentage,
        usageLimit: 0,
        usedCount: 99999,
      };
      const res = validatePromoCode(unlimitedPromo, 200000, currentDate);
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(20000);
    });

    it("rejects inactive promo code", () => {
      const inactivePromo: PromoCodeData = {
        ...basePromoPercentage,
        isActive: false,
      };
      const res = validatePromoCode(inactivePromo, 200000, currentDate);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("PROMO_INACTIVE");
      expect(res.error).toBe("Промокод неактивен");
    });
  });

  describe("calculateOrderPrices", () => {
    const items: PricingItem[] = [
      { price: 100000, discountPrice: null, quantity: 2 }, // 200000 (2000.00 ₽)
      { price: 60000, discountPrice: 50000, quantity: 1 }, // 50000 (500.00 ₽)
    ]; // total = 250000 (2500.00 ₽)

    it("calculates order totals without promo code and with delivery cost", () => {
      const result = calculateOrderPrices({
        items,
        promo: null,
        deliveryCost: 35000, // 350.00 ₽
        now: currentDate,
      });

      expect(result.totalAmount).toBe(250000);
      expect(result.discountAmount).toBe(0);
      expect(result.deliveryCost).toBe(35000);
      expect(result.finalAmount).toBe(285000); // 250000 + 35000
      expect(result.appliedPromo).toBeNull();
    });

    it("calculates order totals with percentage promo code and delivery cost", () => {
      const result = calculateOrderPrices({
        items,
        promo: basePromoPercentage, // 10% discount -> 25000
        deliveryCost: 35000,
        now: currentDate,
      });

      expect(result.totalAmount).toBe(250000);
      expect(result.discountAmount).toBe(25000);
      expect(result.deliveryCost).toBe(35000);
      // finalAmount = totalAmount - discountAmount + deliveryCost
      // 250000 - 25000 + 35000 = 260000
      expect(result.finalAmount).toBe(260000);
      expect(result.appliedPromo?.code).toBe("SAVE10");
      expect(result.appliedPromo?.discountAmount).toBe(25000);
    });

    it("calculates order totals with fixed promo code and delivery cost", () => {
      const result = calculateOrderPrices({
        items,
        promo: basePromoFixed, // 50000 discount
        deliveryCost: 19000, // 190.00 ₽
        now: currentDate,
      });

      expect(result.totalAmount).toBe(250000);
      expect(result.discountAmount).toBe(50000);
      expect(result.deliveryCost).toBe(19000);
      // 250000 - 50000 + 19000 = 219000
      expect(result.finalAmount).toBe(219000);
      expect(result.appliedPromo?.code).toBe("FIXED500");
    });

    it("does not apply invalid promo code and sets discount to 0", () => {
      const invalidPromo: PromoCodeData = {
        ...basePromoPercentage,
        minOrderAmount: 1000000, // 10 000.00 ₽ (above 2 500.00 ₽)
      };

      const result = calculateOrderPrices({
        items,
        promo: invalidPromo,
        deliveryCost: 35000,
        now: currentDate,
      });

      expect(result.totalAmount).toBe(250000);
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(285000);
      expect(result.appliedPromo).toBeNull();
    });
  });
});
