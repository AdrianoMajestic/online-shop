import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import {
  cartItemSchema,
  updateCartSchema,
  cartDetailsSchema,
} from "@/lib/validations/cart";
import * as cartService from "@/services/cart.service";
import * as rbacModule from "@/lib/rbac";
import * as dbModule from "@/lib/db";
import { Product } from "@/models/Product";
import { Cart } from "@/models/Cart";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  GET as getCartHandler,
  PUT as putCartHandler,
  DELETE as deleteCartHandler,
} from "@/app/api/cart/route";
import { POST as postCartDetailsHandler } from "@/app/api/cart/details/route";
import { POST as postCartMergeHandler } from "@/app/api/cart/merge/route";

describe("Cart Business Logic & API (T05)", () => {
  const sampleProductId1 = "65a000000000000000000001";
  const sampleProductId2 = "65a000000000000000000002";
  const sampleUserId = "test-user-id-32-chars-long-12345";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
  });

  describe("Cart Zod Validation Schemas", () => {
    it("validates correct cart item", () => {
      const valid = { productId: sampleProductId1, quantity: 3 };
      const parsed = cartItemSchema.parse(valid);
      expect(parsed.productId).toBe(sampleProductId1);
      expect(parsed.quantity).toBe(3);
    });

    it("fails validation on invalid ObjectId format", () => {
      const invalid = { productId: "invalid-id", quantity: 1 };
      expect(() => cartItemSchema.parse(invalid)).toThrow(
        "Некорректный идентификатор товара"
      );
    });

    it("fails validation on non-positive or floating point quantity", () => {
      expect(() =>
        cartItemSchema.parse({ productId: sampleProductId1, quantity: 0 })
      ).toThrow("Количество должно быть не менее 1");

      expect(() =>
        cartItemSchema.parse({ productId: sampleProductId1, quantity: -5 })
      ).toThrow("Количество должно быть не менее 1");

      expect(() =>
        cartItemSchema.parse({ productId: sampleProductId1, quantity: 2.5 })
      ).toThrow("Количество должно быть целым числом");
    });

    it("validates updateCartSchema with optional merge flag", () => {
      const parsed = updateCartSchema.parse({
        items: [{ productId: sampleProductId1, quantity: 2 }],
        merge: true,
      });
      expect(parsed.merge).toBe(true);
      expect(parsed.items).toHaveLength(1);
    });

    it("validates cartDetailsSchema", () => {
      const parsed = cartDetailsSchema.parse({
        items: [
          { productId: sampleProductId1, quantity: 1 },
          { productId: sampleProductId2, quantity: 4 },
        ],
      });
      expect(parsed.items).toHaveLength(2);
    });
  });

  describe("Cart Service Business Logic", () => {
    describe("updateUserCart — Server Stock Validation", () => {
      it("throws ConflictError (OUT_OF_STOCK, 409) if requested quantity exceeds physical stockQuantity", async () => {
        const mockProduct = {
          _id: new mongoose.Types.ObjectId(sampleProductId1),
          title: "Смартфон Apple iPhone 15 Pro",
          sku: "KB-APL-IP15P-128",
          stockQuantity: 3, // Only 3 items in stock
          price: 11999000,
          discountPrice: 10999000,
          isPublished: true,
          deletedAt: null,
        };

        vi.spyOn(Product, "find").mockReturnValue({
          lean: vi.fn().mockResolvedValue([mockProduct]),
        } as never);

        // Requested 5 items, but stock is only 3
        await expect(
          cartService.updateUserCart(sampleUserId, [
            { productId: sampleProductId1, quantity: 5 },
          ])
        ).rejects.toThrow(ConflictError);

        try {
          await cartService.updateUserCart(sampleUserId, [
            { productId: sampleProductId1, quantity: 5 },
          ]);
        } catch (err: unknown) {
          const conflict = err as ConflictError;
          expect(conflict.code).toBe("OUT_OF_STOCK");
          expect(conflict.statusCode).toBe(409);
          expect(conflict.message).toContain("Недостаточно товара");
          expect(conflict.details).toEqual({
            productId: sampleProductId1,
            availableStock: 3,
            requestedQuantity: 5,
          });
        }
      });

      it("throws NotFoundError if product is not found or not published", async () => {
        vi.spyOn(Product, "find").mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        } as never);

        await expect(
          cartService.updateUserCart(sampleUserId, [
            { productId: sampleProductId1, quantity: 1 },
          ])
        ).rejects.toThrow(NotFoundError);
      });

      it("successfully updates user cart in DB when requested quantity <= stockQuantity", async () => {
        const mockProduct = {
          _id: new mongoose.Types.ObjectId(sampleProductId1),
          title: "Apple iPhone 15 Pro",
          sku: "KB-APL-IP15P-128",
          slug: "apple-iphone-15-pro",
          stockQuantity: 10,
          price: 11999000,
          discountPrice: 10999000,
          isPublished: true,
          deletedAt: null,
          images: [{ url: "https://test.com/img.jpg", alt: "Apple" }],
        };

        vi.spyOn(Product, "find").mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockProduct]),
          }),
          lean: vi.fn().mockResolvedValue([mockProduct]),
        } as never);

        const findOneAndUpdateSpy = vi
          .spyOn(Cart, "findOneAndUpdate")
          .mockResolvedValue({} as never);

        vi.spyOn(Cart, "findOne").mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            userId: sampleUserId,
            items: [{ productId: new mongoose.Types.ObjectId(sampleProductId1), quantity: 2 }],
          }),
        } as never);

        const result = await cartService.updateUserCart(sampleUserId, [
          { productId: sampleProductId1, quantity: 2 },
        ]);

        expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
          { userId: sampleUserId },
          {
            $set: {
              items: [
                {
                  productId: new mongoose.Types.ObjectId(sampleProductId1),
                  quantity: 2,
                },
              ],
            },
          },
          { upsert: true, new: true }
        );

        expect(result.totalQuantity).toBe(2);
        // Effective price is 10999000 * 2 = 21998000 kopecks
        expect(result.totalAmount).toBe(21998000);
        expect(result.items[0].itemTotal).toBe(21998000);
      });
    });

    describe("mergeGuestCart — Cart Merging Logic", () => {
      it("sums existing user items and guest items, capping sum at physical stockQuantity", async () => {
        // User has 3 in DB, guest has 4 in localStorage, physical stock is 5
        // Expected: 3 + 4 = 7, but capped at 5!
        const mockProduct1 = {
          _id: new mongoose.Types.ObjectId(sampleProductId1),
          title: "Товар 1",
          sku: "KB-001",
          slug: "product-1",
          stockQuantity: 5, // Capping threshold
          price: 100000,
          discountPrice: null,
          isPublished: true,
          deletedAt: null,
        };

        // User does not have Product 2, guest has 2, stock is 10
        // Expected: added with quantity 2
        const mockProduct2 = {
          _id: new mongoose.Types.ObjectId(sampleProductId2),
          title: "Товар 2",
          sku: "KB-002",
          slug: "product-2",
          stockQuantity: 10,
          price: 50000,
          discountPrice: 40000,
          isPublished: true,
          deletedAt: null,
        };

        // Mock existing DB cart: product 1 has quantity 3
        vi.spyOn(Cart, "findOne").mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            userId: sampleUserId,
            items: [{ productId: new mongoose.Types.ObjectId(sampleProductId1), quantity: 3 }],
          }),
        } as never);

        vi.spyOn(Product, "find").mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockProduct1, mockProduct2]),
          }),
          lean: vi.fn().mockResolvedValue([mockProduct1, mockProduct2]),
        } as never);

        const findOneAndUpdateSpy = vi
          .spyOn(Cart, "findOneAndUpdate")
          .mockResolvedValue({} as never);

        // Guest brings Product 1 (4 pcs) and Product 2 (2 pcs)
        await cartService.mergeGuestCart(sampleUserId, [
          { productId: sampleProductId1, quantity: 4 },
          { productId: sampleProductId2, quantity: 2 },
        ]);

        expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
          { userId: sampleUserId },
          {
            $set: {
              items: expect.arrayContaining([
                // Product 1 capped to 5
                {
                  productId: new mongoose.Types.ObjectId(sampleProductId1),
                  quantity: 5,
                },
                // Product 2 added with 2
                {
                  productId: new mongoose.Types.ObjectId(sampleProductId2),
                  quantity: 2,
                },
              ]),
            },
          },
          { upsert: true, new: true }
        );
      });

      it("excludes out-of-stock products (stockQuantity <= 0) during merge", async () => {
        const outOfStockProduct = {
          _id: new mongoose.Types.ObjectId(sampleProductId1),
          title: "Закончившийся товар",
          stockQuantity: 0,
          price: 100000,
          discountPrice: null,
          isPublished: true,
          deletedAt: null,
        };

        vi.spyOn(Cart, "findOne").mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        } as never);

        vi.spyOn(Product, "find").mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([outOfStockProduct]),
          }),
          lean: vi.fn().mockResolvedValue([outOfStockProduct]),
        } as never);

        const findOneAndUpdateSpy = vi
          .spyOn(Cart, "findOneAndUpdate")
          .mockResolvedValue({} as never);

        await cartService.mergeGuestCart(sampleUserId, [
          { productId: sampleProductId1, quantity: 2 },
        ]);

        expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
          { userId: sampleUserId },
          { $set: { items: [] } },
          { upsert: true, new: true }
        );
      });
    });

    describe("enrichGuestCart — Fresh Prices from Server", () => {
      it("computes item totals and cart total using current DB prices, ignoring client data", async () => {
        const mockProduct = {
          _id: new mongoose.Types.ObjectId(sampleProductId1),
          title: "Товар со скидкой",
          sku: "KB-SALE-1",
          slug: "tovar-so-skidkoy",
          stockQuantity: 20,
          price: 100000, // 1000.00 ₽ original
          discountPrice: 80000, // 800.00 ₽ effective
          isPublished: true,
          deletedAt: null,
          images: [{ url: "https://test.com/1.jpg", alt: "1" }],
        };

        vi.spyOn(Product, "find").mockReturnValue({
          populate: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([mockProduct]),
          }),
          lean: vi.fn().mockResolvedValue([mockProduct]),
        } as never);

        // Guest only sent productId and quantity
        const result = await cartService.enrichGuestCart([
          { productId: sampleProductId1, quantity: 3 },
        ]);

        expect(result.totalQuantity).toBe(3);
        // 3 * 80000 = 240000 kopecks (2 400.00 ₽)
        expect(result.totalAmount).toBe(240000);
        expect(result.items[0].product.effectivePrice).toBe(80000);
        expect(result.items[0].itemTotal).toBe(240000);
        expect(result.items[0].isAvailable).toBe(true);
        expect(result.items[0].exceedsStock).toBe(false);
      });
    });
  });

  describe("Cart Route Handlers API", () => {
    describe("GET /api/cart", () => {
      it("returns 401 Unauthorized for unauthenticated requests", async () => {
        const req = new NextRequest("http://localhost:3000/api/cart");
        const res = await getCartHandler(req);

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error.code).toBe("UNAUTHORIZED");
      });

      it("returns enriched cart for authenticated user", async () => {
        vi.spyOn(rbacModule, "requireApiAuth").mockResolvedValue({
          session: { id: "s1", userId: sampleUserId } as never,
          user: { id: sampleUserId, email: "user@test.ru" } as never,
        });

        vi.spyOn(cartService, "getEnrichedCart").mockResolvedValue({
          items: [],
          totalQuantity: 0,
          totalAmount: 0,
        });

        const req = new NextRequest("http://localhost:3000/api/cart");
        const res = await getCartHandler(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.cart).toBeDefined();
        expect(data.cart.totalQuantity).toBe(0);
      });
    });

    describe("PUT /api/cart", () => {
      it("returns 401 Unauthorized if not authenticated", async () => {
        const req = new NextRequest("http://localhost:3000/api/cart", {
          method: "PUT",
          body: JSON.stringify({
            items: [{ productId: sampleProductId1, quantity: 1 }],
          }),
        });

        const res = await putCartHandler(req);
        expect(res.status).toBe(401);
      });

      it("calls mergeGuestCart when merge: true is passed", async () => {
        vi.spyOn(rbacModule, "requireApiAuth").mockResolvedValue({
          session: { id: "s1", userId: sampleUserId } as never,
          user: { id: sampleUserId, email: "user@test.ru" } as never,
        });

        const mergeSpy = vi
          .spyOn(cartService, "mergeGuestCart")
          .mockResolvedValue({
            items: [],
            totalQuantity: 2,
            totalAmount: 100000,
          });

        const req = new NextRequest("http://localhost:3000/api/cart", {
          method: "PUT",
          body: JSON.stringify({
            items: [{ productId: sampleProductId1, quantity: 2 }],
            merge: true,
          }),
        });

        const res = await putCartHandler(req);
        expect(res.status).toBe(200);
        expect(mergeSpy).toHaveBeenCalledWith(sampleUserId, [
          { productId: sampleProductId1, quantity: 2 },
        ]);
      });
    });

    describe("POST /api/cart/details", () => {
      it("allows guests without session to fetch fresh prices and stocks", async () => {
        vi.spyOn(cartService, "enrichGuestCart").mockResolvedValue({
          items: [],
          totalQuantity: 1,
          totalAmount: 50000,
        });

        const req = new NextRequest("http://localhost:3000/api/cart/details", {
          method: "POST",
          body: JSON.stringify({
            items: [{ productId: sampleProductId1, quantity: 1 }],
          }),
        });

        const res = await postCartDetailsHandler(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.cart.totalAmount).toBe(50000);
      });
    });

    describe("POST /api/cart/merge", () => {
      it("returns 401 when unauthenticated", async () => {
        const req = new NextRequest("http://localhost:3000/api/cart/merge", {
          method: "POST",
          body: JSON.stringify({
            items: [{ productId: sampleProductId1, quantity: 1 }],
          }),
        });

        const res = await postCartMergeHandler(req);
        expect(res.status).toBe(401);
      });

      it("merges guest items into user cart when authenticated", async () => {
        vi.spyOn(rbacModule, "requireApiAuth").mockResolvedValue({
          session: { id: "s1", userId: sampleUserId } as never,
          user: { id: sampleUserId, email: "user@test.ru" } as never,
        });

        const mergeSpy = vi
          .spyOn(cartService, "mergeGuestCart")
          .mockResolvedValue({
            items: [],
            totalQuantity: 5,
            totalAmount: 250000,
          });

        const req = new NextRequest("http://localhost:3000/api/cart/merge", {
          method: "POST",
          body: JSON.stringify({
            items: [{ productId: sampleProductId1, quantity: 3 }],
          }),
        });

        const res = await postCartMergeHandler(req);
        expect(res.status).toBe(200);
        expect(mergeSpy).toHaveBeenCalledWith(sampleUserId, [
          { productId: sampleProductId1, quantity: 3 },
        ]);
      });
    });

    describe("DELETE /api/cart", () => {
      it("clears user cart in DB", async () => {
        vi.spyOn(rbacModule, "requireApiAuth").mockResolvedValue({
          session: { id: "s1", userId: sampleUserId } as never,
          user: { id: sampleUserId, email: "user@test.ru" } as never,
        });

        const clearSpy = vi
          .spyOn(cartService, "clearUserCart")
          .mockResolvedValue({
            items: [],
            totalQuantity: 0,
            totalAmount: 0,
          });

        const req = new NextRequest("http://localhost:3000/api/cart", {
          method: "DELETE",
        });

        const res = await deleteCartHandler(req);
        expect(res.status).toBe(200);
        expect(clearSpy).toHaveBeenCalledWith(sampleUserId);
      });
    });
  });
});
