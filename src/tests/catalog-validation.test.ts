import { describe, it, expect } from "vitest";
import { getProductsQuerySchema } from "@/lib/validations/catalog";

describe("Catalog Query Validation Schema", () => {
  it("parses valid empty query with defaults", () => {
    const parsed = getProductsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.sort).toBe("popular");
    expect(parsed.brand).toEqual([]);
    expect(parsed.category).toBeUndefined();
    expect(parsed.q).toBeUndefined();
    expect(parsed.priceMin).toBeUndefined();
    expect(parsed.priceMax).toBeUndefined();
  });

  it("parses comma-separated brands and array brands", () => {
    const parsedSingle = getProductsQuerySchema.parse({
      brand: "apple,samsung",
    });
    expect(parsedSingle.brand).toEqual(["apple", "samsung"]);

    const parsedArray = getProductsQuerySchema.parse({
      brand: ["apple", "xiaomi,bosch"],
    });
    expect(parsedArray.brand).toEqual(["apple", "xiaomi", "bosch"]);
  });

  it("validates priceMin and priceMax correctly", () => {
    const parsed = getProductsQuerySchema.parse({
      priceMin: "1000",
      priceMax: "5000",
    });
    expect(parsed.priceMin).toBe(1000);
    expect(parsed.priceMax).toBe(5000);

    // priceMin > priceMax should fail
    expect(() =>
      getProductsQuerySchema.parse({
        priceMin: "5000",
        priceMax: "1000",
      })
    ).toThrow();
  });

  it("validates sort options", () => {
    const validSorts = ["popular", "price_asc", "price_desc", "new", "rating"] as const;
    for (const sort of validSorts) {
      const parsed = getProductsQuerySchema.parse({ sort });
      expect(parsed.sort).toBe(sort);
    }

    expect(() =>
      getProductsQuerySchema.parse({
        sort: "unknown_sort",
      })
    ).toThrow();
  });

  it("limits pagination bounds", () => {
    const parsed = getProductsQuerySchema.parse({
      page: "3",
      limit: "50",
    });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(50);

    // Negative page
    expect(() =>
      getProductsQuerySchema.parse({
        page: "0",
      })
    ).toThrow();

    // Limit over 100
    expect(() =>
      getProductsQuerySchema.parse({
        limit: "150",
      })
    ).toThrow();
  });
});
