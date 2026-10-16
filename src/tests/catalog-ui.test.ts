import { describe, it, expect } from "vitest";
import { formatPrice, getDiscountPercentage, serializeProduct } from "@/lib/formatters";

describe("Catalog UI Helpers & Formatters (T04)", () => {
  describe("formatPrice", () => {
    it("formats integer rubles from kopecks correctly", () => {
      // 109 990.00 ₽ -> 109 990 ₽ (or with non-breaking space depending on locale)
      const formatted = formatPrice(10999000);
      expect(formatted).toMatch(/109[\s\u00A0]990[\s\u00A0]₽/);
    });

    it("formats kopecks with decimals when present", () => {
      const formatted = formatPrice(123450);
      expect(formatted).toMatch(/1[\s\u00A0]234,50[\s\u00A0]₽/);
    });

    it("handles zero and negative or NaN gracefully", () => {
      expect(formatPrice(0)).toMatch(/0[\s\u00A0]₽/);
      expect(formatPrice(NaN)).toBe("0 ₽");
    });
  });

  describe("getDiscountPercentage", () => {
    it("calculates percentage discount correctly", () => {
      // 119990 -> 109990 (~8.33% -> 8%)
      const discount = getDiscountPercentage(11999000, 10999000);
      expect(discount).toBe(8);

      // 1000 -> 500 (50%)
      expect(getDiscountPercentage(1000, 500)).toBe(50);
    });

    it("returns null when no discount or discount price is higher than price", () => {
      expect(getDiscountPercentage(1000, null)).toBeNull();
      expect(getDiscountPercentage(1000, 1000)).toBeNull();
      expect(getDiscountPercentage(1000, 1200)).toBeNull();
      expect(getDiscountPercentage(0, 100)).toBeNull();
    });
  });

  describe("serializeProduct", () => {
    it("serializes Mongoose-like raw product object cleanly", () => {
      const raw = {
        _id: "65d4f3b123456789abcdef01",
        sku: "KB-TST-001",
        title: "Тестовый товар",
        slug: "test-product",
        description: "Описание",
        price: 500000,
        discountPrice: 450000,
        stockQuantity: 10,
        images: [{ url: "https://example.com/1.jpg", alt: "Фото" }],
        attributes: [{ key: "Цвет", value: "Белый" }],
        ratingAvg: 4.8,
        reviewsCount: 5,
        salesCount: 15,
        categoryId: {
          _id: "cat123",
          title: "Гаджеты",
          slug: "gadzhety",
        },
        brandId: {
          _id: "brand123",
          title: "Apple",
          slug: "apple",
        },
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };

      const serialized = serializeProduct(raw);
      expect(serialized._id).toBe("65d4f3b123456789abcdef01");
      expect(serialized.sku).toBe("KB-TST-001");
      expect(serialized.price).toBe(500000);
      expect(serialized.discountPrice).toBe(450000);
      expect(serialized.images).toHaveLength(1);
      expect(serialized.images[0].url).toBe("https://example.com/1.jpg");
      expect(serialized.attributes[0].value).toBe("Белый");
      expect(typeof serialized.categoryId).toBe("object");
      expect((serialized.categoryId as { title: string }).title).toBe("Гаджеты");
    });

    it("handles missing optional fields safely", () => {
      const minimal = {
        title: "Минимальный товар",
      };

      const serialized = serializeProduct(minimal);
      expect(serialized.title).toBe("Минимальный товар");
      expect(serialized._id).toBe("");
      expect(serialized.price).toBe(0);
      expect(serialized.discountPrice).toBeNull();
      expect(serialized.images).toEqual([]);
      expect(serialized.attributes).toEqual([]);
      expect(serialized.ratingAvg).toBe(5.0);
    });
  });
});
