import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import {
  createOrderSchema,
  validatePromoSchema,
  orderContactSchema,
  orderShippingAddressSchema,
} from "@/lib/validations/order";
import * as orderService from "@/services/order.service";
import * as dbModule from "@/lib/db";
import { auth } from "@/lib/auth";
import { Product } from "@/models/Product";
import { DeliveryMethod } from "@/models/DeliveryMethod";
import { PromoCode } from "@/models/PromoCode";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { GET as getDeliveryMethodsHandler } from "@/app/api/delivery-methods/route";
import { POST as postPromoValidateHandler } from "@/app/api/promo/validate/route";
import { POST as postOrdersHandler } from "@/app/api/orders/route";

describe("Order Business Logic, Creation & API (T06)", () => {
  const sampleProductId1 = "65a000000000000000000001";
  const sampleDeliveryId = "65a000000000000000000010";
  const samplePromoId = "65a000000000000000000020";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dbModule, "connectToDatabase").mockResolvedValue(mongoose);
    vi.spyOn(Order, "countDocuments").mockResolvedValue(0);
    vi.spyOn(Order, "findOne").mockResolvedValue(null);
  });

  describe("Validation Schemas", () => {
    it("validates valid order contact", () => {
      const valid = {
        fullName: "Иванов Иван",
        phone: "+79991234567",
        email: "ivan@example.com",
      };
      const parsed = orderContactSchema.parse(valid);
      expect(parsed.fullName).toBe("Иванов Иван");
      expect(parsed.email).toBe("ivan@example.com");
    });

    it("rejects invalid contact details", () => {
      expect(() =>
        orderContactSchema.parse({
          fullName: "A",
          phone: "123",
          email: "not-an-email",
        })
      ).toThrow();
    });

    it("validates valid shipping address", () => {
      const valid = {
        city: "Москва",
        street: "Тверская",
        house: "12",
        apartment: "45",
        postalCode: "125009",
        comment: "Код 123",
      };
      const parsed = orderShippingAddressSchema.parse(valid);
      expect(parsed.city).toBe("Москва");
      expect(parsed.postalCode).toBe("125009");
    });

    it("validates full createOrder payload", () => {
      const payload = {
        contact: {
          fullName: "Сергей Смирнов",
          phone: "+79998887766",
          email: "sergey@test.ru",
        },
        shippingAddress: {
          city: "Казань",
          street: "Баумана",
          house: "5",
          postalCode: "420111",
        },
        deliveryMethodId: sampleDeliveryId,
        paymentMethod: "card_online" as const,
        items: [{ productId: sampleProductId1, quantity: 2 }],
        customerComment: "Позвонить перед доставкой",
      };

      const parsed = createOrderSchema.parse(payload);
      expect(parsed.deliveryMethodId).toBe(sampleDeliveryId);
      expect(parsed.paymentMethod).toBe("card_online");
      expect(parsed.items.length).toBe(1);
    });

    it("validates promo code validation schema", () => {
      const parsed = validatePromoSchema.parse({
        code: " kabachok10 ",
        items: [{ productId: sampleProductId1, quantity: 1 }],
      });
      expect(parsed.code).toBe("kabachok10");
      expect(parsed.items?.length).toBe(1);
    });
  });

  describe("Order Service - createOrder", () => {
    it("successfully creates a guest order with card_online and generates Payment", async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(sampleProductId1),
        title: "Чайник электрический",
        sku: "KB-KETTLE-01",
        price: 300000,
        discountPrice: 250000,
        stockQuantity: 10,
        isPublished: true,
        deletedAt: null,
      };

      const mockDelivery = {
        _id: new mongoose.Types.ObjectId(sampleDeliveryId),
        code: "courier",
        title: "Курьерская доставка",
        price: 35000,
        isActive: true,
      };

      vi.spyOn(Product, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockProduct]),
      } as never);

      vi.spyOn(DeliveryMethod, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockDelivery),
      } as never);

      vi.spyOn(Product, "updateOne").mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      });

      const mockCreatedOrder = {
        _id: new mongoose.Types.ObjectId(),
        number: "KB-10001",
        userId: null,
        finalAmount: 285000, // 250000 + 35000
        paymentMethod: "card_online",
        status: "new",
      };

      vi.spyOn(Order, "create").mockResolvedValue(mockCreatedOrder as never);

      const mockCreatedPayment = {
        _id: new mongoose.Types.ObjectId(),
        status: "pending",
        amount: 285000,
        provider: "mock",
        method: "card_online",
      };
      vi.spyOn(Payment, "create").mockResolvedValue(mockCreatedPayment as never);

      // Force standalone compensation path for unit test predictability
      vi.spyOn(mongoose, "startSession").mockRejectedValue(
        new Error("Transactions not supported")
      );

      const orderInput = {
        contact: {
          fullName: "Гость Иванов",
          phone: "+79001112233",
          email: "guest@example.com",
        },
        shippingAddress: {
          city: "Москва",
          street: "Арбат",
          house: "1",
          postalCode: "119019",
        },
        deliveryMethodId: sampleDeliveryId,
        paymentMethod: "card_online" as const,
        items: [{ productId: sampleProductId1, quantity: 1 }],
      };

      const result = await orderService.createOrder(orderInput, null);

      expect(result.order).toBeDefined();
      expect(result.order.number).toBe("KB-10001");
      expect(result.payment).toBeDefined();
      expect(result.payment?.status).toBe("pending");
      expect(Product.updateOne).toHaveBeenCalledWith(
        { _id: sampleProductId1, stockQuantity: { $gte: 1 } },
        { $inc: { stockQuantity: -1 } }
      );
    });

    it("throws 409 OUT_OF_STOCK and does NOT alter stock when item is out of stock", async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(sampleProductId1),
        title: "Робот-пылесос",
        sku: "KB-VACUUM-01",
        price: 2000000,
        discountPrice: null,
        stockQuantity: 2, // only 2 in stock
        isPublished: true,
        deletedAt: null,
      };

      vi.spyOn(Product, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockProduct]),
      } as never);

      const updateSpy = vi.spyOn(Product, "updateOne");

      const orderInput = {
        contact: {
          fullName: "Иван",
          phone: "+79001112233",
          email: "ivan@example.com",
        },
        shippingAddress: {
          city: "Москва",
          street: "Арбат",
          house: "1",
          postalCode: "119019",
        },
        deliveryMethodId: sampleDeliveryId,
        paymentMethod: "cod" as const,
        items: [{ productId: sampleProductId1, quantity: 5 }], // requested 5 > 2
      };

      await expect(orderService.createOrder(orderInput, null)).rejects.toMatchObject({
        statusCode: 409,
        code: "OUT_OF_STOCK",
      });

      // Stock was never decremented
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("handles race condition: exactly one order succeeds when 2 orders race for last item", async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(sampleProductId1),
        title: "Последний смартфон",
        sku: "KB-PHONE-LAST",
        price: 5000000,
        discountPrice: null,
        stockQuantity: 1, // Only 1 left
        isPublished: true,
        deletedAt: null,
      };

      const mockDelivery = {
        _id: new mongoose.Types.ObjectId(sampleDeliveryId),
        title: "Самовывоз",
        price: 0,
        isActive: true,
      };

      vi.spyOn(Product, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockProduct]),
      } as never);

      vi.spyOn(DeliveryMethod, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockDelivery),
      } as never);

      vi.spyOn(mongoose, "startSession").mockRejectedValue(
        new Error("Transactions not supported")
      );

      // Simulate atomic conditional update: 1st caller gets modifiedCount: 1, 2nd gets modifiedCount: 0
      let callCount = 0;
      vi.spyOn(Product, "updateOne").mockImplementation((async () => {
        callCount++;
        if (callCount === 1) {
          return {
            acknowledged: true,
            matchedCount: 1,
            modifiedCount: 1,
            upsertedCount: 0,
            upsertedId: null,
          };
        }
        return {
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0,
          upsertedId: null,
        };
      }) as never);

      vi.spyOn(Order, "create").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        number: "KB-10001",
        finalAmount: 5000000,
      } as never);

      const orderPayload = {
        contact: {
          fullName: "Покупатель",
          phone: "+79001112233",
          email: "buyer@example.com",
        },
        shippingAddress: {
          city: "Москва",
          street: "Арбат",
          house: "1",
          postalCode: "119019",
        },
        deliveryMethodId: sampleDeliveryId,
        paymentMethod: "cod" as const,
        items: [{ productId: sampleProductId1, quantity: 1 }],
      };

      // Run two orders simultaneously
      const [firstResult, secondResult] = await Promise.allSettled([
        orderService.createOrder(orderPayload, null),
        orderService.createOrder(orderPayload, null),
      ]);

      // Exactly one must be fulfilled, exactly one must be rejected with 409
      expect(firstResult.status).toBe("fulfilled");
      expect(secondResult.status).toBe("rejected");

      if (secondResult.status === "rejected") {
        expect(secondResult.reason).toMatchObject({
          statusCode: 409,
          code: "OUT_OF_STOCK",
        });
      }
    });

    it("applies valid promo code and increments its usedCount", async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(sampleProductId1),
        title: "Телевизор",
        sku: "KB-TV-01",
        price: 4000000, // 40 000.00 ₽
        discountPrice: null,
        stockQuantity: 10,
        isPublished: true,
        deletedAt: null,
      };

      const mockDelivery = {
        _id: new mongoose.Types.ObjectId(sampleDeliveryId),
        title: "Курьер",
        price: 35000,
        isActive: true,
      };

      const mockPromo = {
        _id: new mongoose.Types.ObjectId(samplePromoId),
        code: "KABACHOK10",
        discountType: "percentage" as const,
        discountValue: 10, // 10% -> 400000 (4000.00 ₽)
        minOrderAmount: 100000,
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2027-12-31"),
        usageLimit: 100,
        usedCount: 2,
        isActive: true,
      };

      vi.spyOn(Product, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockProduct]),
      } as never);

      vi.spyOn(DeliveryMethod, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockDelivery),
      } as never);

      vi.spyOn(PromoCode, "findOne").mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockPromo),
      } as never);

      vi.spyOn(Product, "updateOne").mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      });

      const promoUpdateSpy = vi.spyOn(PromoCode, "updateOne").mockResolvedValue({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      });

      const orderCreateSpy = vi.spyOn(Order, "create").mockImplementation(async (doc: unknown) => {
        return {
          ...(doc as object),
          _id: new mongoose.Types.ObjectId(),
        } as never;
      });

      vi.spyOn(mongoose, "startSession").mockRejectedValue(
        new Error("Transactions not supported")
      );

      const orderInput = {
        contact: {
          fullName: "Анна",
          phone: "+79001112233",
          email: "anna@example.com",
        },
        shippingAddress: {
          city: "Москва",
          street: "Арбат",
          house: "1",
          postalCode: "119019",
        },
        deliveryMethodId: sampleDeliveryId,
        paymentMethod: "cod" as const,
        items: [{ productId: sampleProductId1, quantity: 1 }],
        promoCode: "KABACHOK10",
      };

      const result = await orderService.createOrder(orderInput, null);

      expect(promoUpdateSpy).toHaveBeenCalledWith(
        { _id: mockPromo._id, isActive: true, usedCount: { $lt: 100 } },
        { $inc: { usedCount: 1 } }
      );
      expect(orderCreateSpy).toHaveBeenCalled();
      const createdArgs = orderCreateSpy.mock.calls[0][0] as {
        totalAmount: number;
        discountAmount: number;
        finalAmount: number;
      };
      expect(createdArgs.totalAmount).toBe(4000000);
      expect(createdArgs.discountAmount).toBe(400000); // 10%
      expect(createdArgs.finalAmount).toBe(3635000); // 4000000 - 400000 + 35000
      expect(result.payment).toBeNull(); // cod has no online payment
    });
  });

  describe("API Route Handlers", () => {
    it("GET /api/delivery-methods returns active delivery methods", async () => {
      vi.spyOn(orderService, "getActiveDeliveryMethods").mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(sampleDeliveryId),
          code: "courier",
          title: "Курьер",
          price: 35000,
          description: "Быстро",
          isActive: true,
        } as never,
      ]);

      const res = await getDeliveryMethodsHandler();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deliveryMethods.length).toBe(1);
      expect(json.deliveryMethods[0].code).toBe("courier");
    });

    it("POST /api/promo/validate validates promo and returns discount", async () => {
      vi.spyOn(orderService, "validatePromoCodeService").mockResolvedValue({
        valid: true,
        promo: {
          code: "KABACHOK10",
          discountType: "percentage",
          discountValue: 10,
          minOrderAmount: 100000,
        },
        discountAmount: 15000,
        totalAmount: 150000,
        finalAmount: 135000,
      });

      const req = new NextRequest("http://localhost:3000/api/promo/validate", {
        method: "POST",
        body: JSON.stringify({
          code: "KABACHOK10",
          totalAmount: 150000,
        }),
      });

      const res = await postPromoValidateHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.valid).toBe(true);
      expect(json.discountAmount).toBe(15000);
    });

    it("POST /api/orders creates order via API endpoint", async () => {
      vi.spyOn(auth.api, "getSession").mockResolvedValue(null as never); // guest

      vi.spyOn(orderService, "createOrder").mockResolvedValue({
        order: {
          _id: new mongoose.Types.ObjectId(),
          number: "KB-10001",
          finalAmount: 250000,
        } as never,
        payment: null,
      });

      const req = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          contact: {
            fullName: "Иван Иванов",
            phone: "+79001234567",
            email: "ivan@example.com",
          },
          shippingAddress: {
            city: "Москва",
            street: "Ленина",
            house: "10",
            postalCode: "101000",
          },
          deliveryMethodId: sampleDeliveryId,
          paymentMethod: "cod",
          items: [{ productId: sampleProductId1, quantity: 1 }],
        }),
      });

      const res = await postOrdersHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.order.number).toBe("KB-10001");
    });
  });
});
